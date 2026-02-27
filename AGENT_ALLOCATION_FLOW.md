# Agent Allocation Flow - Complete Implementation

## Overview
When allocating seats to partners/agents from an availability, the system automatically deducts seats from the availability pool and tracks remaining capacity.

## Data Models

### TripAvailability Model
```
cabins: [
  {
    cabin: ObjectId (ref: Cabin),
    seats: Number (total seats available),
    allocatedSeats: Number (seats allocated to agents),
    _id: false
  }
]
```

### AvailabilityAgentAllocation Model
```
{
  company: ObjectId,
  trip: ObjectId,
  availability: ObjectId,
  agent: ObjectId (Partner/Agent),
  allocations: [
    {
      type: "passenger" | "cargo" | "vehicle",
      cabins: [
        {
          cabin: ObjectId,
          allocatedSeats: Number
        }
      ],
      totalAllocatedSeats: Number
    }
  ]
}
```

## Flow Diagrams

### CREATE ALLOCATION FLOW
```
1. Receive Request
   ├─ Validate input (agent ID, allocations array)
   ├─ Verify trip exists
   ├─ Verify availability exists and fetch cabin details
   ├─ Verify agent/partner is active
   
2. Validate Allocations
   ├─ For each allocation type (passenger/cargo/vehicle):
   │  ├─ Check type exists in availability
   │  ├─ For each cabin in allocation:
   │  │  ├─ Verify cabin exists and matches type
   │  │  ├─ Validate allocated seats > 0
   │  │  ├─ Check available seats: (total - allocated)
   │  │  └─ Ensure not exceeding trip capacity
   │  └─ Calculate total allocated per type
   
3. Create Allocation Record
   └─ Save AvailabilityAgentAllocation document

4. Deduct from Availability
   ├─ For each cabin in allocation:
   │  ├─ Find corresponding cabin in availability
   │  ├─ Increase allocatedSeats += allocated amount
   │  └─ Save TripAvailability
   
5. Deduct from Trip Capacity
   ├─ For each cabin:
   │  ├─ Find cabin in trip.tripCapacityDetails[type]
   │  ├─ Decrease remainingSeat -= allocated amount
   │  └─ Save Trip
   
6. Return Response
   ├─ Allocation created with agent details
   ├─ Available summary showing:
   │  ├─ Total seats per cabin
   │  ├─ Currently allocated seats
   │  └─ REMAINING SEATS (total - allocated)
   └─ Updated trip capacity details
```

### UPDATE ALLOCATION FLOW
```
1. Receive Request
   ├─ Validate allocation ID exists
   ├─ Fetch current allocation
   ├─ Fetch availability and trip
   
2. RESTORE Previous Allocation
   ├─ For each previous cabin allocation:
   │  ├─ Decrease availability.allocatedSeats
   │  ├─ Increase trip.remainingSeat
   │  └─ Prepare for new allocation
   
3. Validate New Allocations
   ├─ Same validation as CREATE
   ├─ Check against newly restored trip capacity
   
4. Apply New Allocations
   ├─ For each new cabin allocation:
   │  ├─ Increase availability.allocatedSeats
   │  ├─ Decrease trip.remainingSeat
   
5. Save All Changes
   ├─ Update allocation record
   ├─ Save availability with new allocatedSeats
   ├─ Save trip with new remainingSeat
   
6. Return Response
   └─ Same format as CREATE (with updated availability)
```

### DELETE ALLOCATION FLOW
```
1. Receive Request
   ├─ Validate allocation ID exists
   ├─ Fetch allocation, availability, and trip
   
2. RESTORE Seats to Availability
   ├─ For each cabin in allocation:
   │  ├─ Decrease availability.allocatedSeats -= allocated
   │  ├─ Increase trip.remainingSeat += allocated
   │  └─ Update capacity
   
3. Soft Delete
   ├─ Set allocation.isDeleted = true
   ├─ Update isDeleted timestamp
   ├─ Save allocation
   
4. Save Restored States
   ├─ Save availability
   ├─ Save trip
   
5. Return Response
   └─ Show restored availability with remaining seats
```

## Seat Calculation

### Available Seats Formula
```
remainingSeats = totalSeats - allocatedSeats
```

### Example Flow
```
Initial State:
- Cabin: Adult (passenger type)
- Total Seats: 5
- Allocated: 0
- Remaining: 5

ACTION: Allocate 3 seats to Partner A
- Cabin allocatedSeats: 0 + 3 = 3
- Trip remainingSeat: 5 - 3 = 2
- Remaining: 5 - 3 = 2 ✓

ACTION: Allocate 2 seats to Partner B
- Cabin allocatedSeats: 3 + 2 = 5
- Trip remainingSeat: 2 - 2 = 0
- Remaining: 5 - 5 = 0 ✓

ACTION: Try to allocate 1 seat to Partner C
- Required: 1, Available: 0
- Result: ERROR - Cannot allocate ✗

ACTION: Delete Partner A allocation (restore 3 seats)
- Cabin allocatedSeats: 5 - 3 = 2
- Trip remainingSeat: 0 + 3 = 3
- Remaining: 5 - 2 = 3 ✓
```

## API Responses

### Create Allocation Response
```json
{
  "success": true,
  "message": "Agent allocation created successfully",
  "data": {
    "allocation": {
      "_id": "...",
      "agent": { "name": "Partner Name", "code": "P001" },
      "allocations": [
        {
          "type": "passenger",
          "cabins": [
            {
              "cabin": { "_id": "...", "name": "Adult" },
              "allocatedSeats": 3
            }
          ],
          "totalAllocatedSeats": 3
        }
      ]
    },
    "availabilitySummary": {
      "type": "passenger",
      "cabins": [
        {
          "cabinName": "Adult",
          "totalSeats": 5,
          "allocatedSeats": 3,
          "remainingSeats": 2
        }
      ]
    },
    "updatedTrip": {
      "tripCapacityDetails": { ... }
    }
  }
}
```

## Validations Enforced

1. **Cabin Availability**: Cabin must exist in availability
2. **Cabin Type Match**: Cabin type must match allocation type
3. **Seat Availability**: Allocated seats ≤ (total - already allocated)
4. **Trip Capacity**: Total allocated ≤ remaining trip capacity
5. **Agent Status**: Partner must be Active
6. **Data Integrity**: All references (trip, availability, agent, cabin) must exist

## Affected APIs

All agent allocation operations properly update:
- ✓ TripAvailability.cabins[].allocatedSeats
- ✓ Trip.tripCapacityDetails[type][].remainingSeat
- ✓ AvailabilityAgentAllocation records
- ✓ Responses include updated availability summaries

No other APIs are broken - this is a complete implementation ensuring consistency across all operations.
