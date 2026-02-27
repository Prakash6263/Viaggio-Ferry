# Agent Allocation - Cabin Mismatch Debugging

## Issue
The error `Cabin First Class Premium is not available in this availability for allocation` indicates a mismatch between:
1. The cabin IDs being sent in your request
2. The cabin IDs stored in the availability record

## What's Happening

### Flow:
1. **Trip Created** → Contains tripCapacityDetails with cabins
2. **Availability Created** → Stores references to cabins in `cabins` array with their available seats
3. **Agent Allocation Request** → Tries to allocate from available cabins

### The Problem:
When you send: 
```json
{
  "agent": "agent_id",
  "allocations": [
    {
      "type": "passenger",
      "cabins": [
        {
          "cabin": "First Class Premium",  // ❌ THIS IS A CABIN NAME, NOT AN ID!
          "allocatedSeats": 20
        }
      ]
    }
  ]
}
```

The system expects cabin ObjectIds like:
```json
{
  "cabin": "507f1f77bcf86cd799439011",  // ✅ MongoDB ObjectId
  "allocatedSeats": 20
}
```

## How to Fix

### Step 1: Find Cabin IDs
First, get the actual cabin IDs for your trip:

**GET** `/api/trips/{tripId}/availabilities/{availabilityId}`

This returns the availability with its cabins. The response will show cabin ObjectIds.

### Step 2: Use Correct Format
In your agent allocation request, use the cabin ObjectIds from the availability, not cabin names:

```json
{
  "agent": "agent_id_here",
  "allocations": [
    {
      "type": "passenger",
      "cabins": [
        {
          "cabin": "ObjectId_from_availability",
          "allocatedSeats": 20
        }
      ]
    }
  ]
}
```

## Debug Output
When you run the request again, check the server logs for `[v0]` debug messages:

```
[v0] Looking for cabin ID: ObjectId Type: object
[v0] Cabin Document found: { id: ..., name: 'First Class Premium', type: 'passenger' }
[v0] Available cabins in availability: [
  { id: '...', name: 'First Class Premium', seats: 100, allocatedSeats: 0 },
  { id: '...', name: 'Business Class', seats: 50, allocatedSeats: 0 }
]
[v0] Cabin not found in availability. Requested: ... Available: [...]
```

If the cabin IDs don't match, it means the cabin wasn't added to this specific availability.

## Verification Checklist

- [ ] Did you fetch the availability first to get the correct cabin IDs?
- [ ] Are you sending MongoDB ObjectIds, not cabin names?
- [ ] Are the cabin IDs from the same availability you're trying to allocate to?
- [ ] Does the cabin type in the allocation match the cabin's actual type?

## API Response Example

**GET** `/api/trips/69a17ddad8070997525f4e78/availabilities/69a17e92b94508a8d92e907a`

```json
{
  "success": true,
  "data": {
    "_id": "69a17e92b94508a8d92e907a",
    "type": "passenger",
    "cabins": [
      {
        "cabin": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "First Class Premium"
        },
        "seats": 100,
        "allocatedSeats": 0
      }
    ]
  }
}
```

**Use this ObjectId in your agent allocation request!**
