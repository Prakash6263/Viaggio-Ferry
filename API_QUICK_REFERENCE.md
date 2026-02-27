# Viaggio Ferry Trips API - Quick Reference Guide

## API Endpoints Overview

### TRIPS - Core Management

| Method | Endpoint | Permission | Purpose |
|--------|----------|-----------|---------|
| GET | `/api/trips` | read | List all trips with filters & pagination |
| GET | `/api/trips/:id` | read | Get single trip details |
| GET | `/api/trips/:id/availability` | read | Get trip capacity availability |
| POST | `/api/trips` | write | Create new trip |
| PUT | `/api/trips/:id` | edit | Update trip details |
| DELETE | `/api/trips/:id` | delete | Soft delete trip |

### AVAILABILITIES - Seat Allocation per Type

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/trips/:tripId/availabilities` | List all availabilities for trip |
| GET | `/api/trips/:tripId/availabilities/summary` | Get availability summary (total/remaining) |
| GET | `/api/trips/:tripId/availabilities/:id` | Get single availability |
| POST | `/api/trips/:tripId/availabilities` | Create availabilities (batch) |
| PUT | `/api/trips/:tripId/availabilities/:id` | Update availability |
| DELETE | `/api/trips/:tripId/availabilities/:id` | Delete availability & restore seats |

### AGENT ALLOCATIONS - Sub-allocation to Travel Agents

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/trips/:tripId/availabilities/:avId/agent-allocations/summary` | Get allocation summary |
| GET | `/api/trips/:tripId/availabilities/:avId/agent-allocations` | List agent allocations |
| GET | `/api/trips/:tripId/availabilities/:avId/agent-allocations/:id` | Get single allocation |
| POST | `/api/trips/:tripId/availabilities/:avId/agent-allocations` | Create agent allocation |
| PUT | `/api/trips/:tripId/availabilities/:avId/agent-allocations/:id` | Update allocation |
| DELETE | `/api/trips/:tripId/availabilities/:avId/agent-allocations/:id` | Delete allocation & restore |

---

## Request/Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP REQUEST                            │
├─────────────────────────────────────────────────────────────┤
│  Headers: Authorization: Bearer {{token}}                    │
│  Body: JSON payload                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   CORS & Security Checks     │
        │   (helmet, CORS middleware)  │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Route Matching (Express)    │
        │  /api/trips/:id/...          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  JWT Authentication          │
        │  (verifyToken middleware)    │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Extract Company ID          │
        │  (extractCompanyId)          │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  RBAC Permission Check       │
        │  (checkPermission)           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Controller Logic            │
        │  (tripController, etc.)      │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  MongoDB Query/Update        │
        │  (Mongoose models)           │
        └──────────────┬───────────────┘
                       │
           ┌───────────┴──────────────┐
           │                          │
      Success                      Error
           │                          │
           ▼                          ▼
    ┌────────────────┐    ┌──────────────────┐
    │  200/201/204   │    │  Error Handler   │
    │  Response      │    │  (middleware)    │
    │  with data     │    │  400/401/403/500 │
    └────────┬───────┘    └────────┬─────────┘
             │                     │
             └──────────┬──────────┘
                        │
                        ▼
        ┌──────────────────────────────┐
        │      HTTP RESPONSE            │
        │  (JSON + Status Code)         │
        └──────────────────────────────┘
```

---

## Data Flow: Create Trip → Allocate → Assign to Agents

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIP CREATION                                 │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/trips                                                  │
│ {tripName, ship, ports, dates}                                   │
│         │                                                         │
│         ▼                                                         │
│  ✓ Validate dates                                               │
│  ✓ Fetch ship details → get cabin capacities                   │
│  ✓ Calculate remaining seats from ship capacity                │
│  ✓ Create Trip document                                         │
│  ✓ Record actor (who created)                                  │
│         │                                                         │
│         ▼                                                         │
│ RESPONSE: Trip {status: "SCHEDULED", remaining: {}}            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
┌────────────────────────┴────────────────────────────────────────┐
│              AVAILABILITY ALLOCATION                             │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/trips/{tripId}/availabilities                         │
│ {                                                                │
│   availabilities: [                                              │
│     {type: "passenger", cabins: [{cabin_id, seats}]}           │
│     {type: "cargo", cabins: [{cabin_id, seats}]}               │
│   ]                                                              │
│ }                                                                │
│         │                                                         │
│         ▼                                                         │
│  ✓ Validate seats ≤ cabin capacity                            │
│  ✓ Validate total ≤ trip remaining                            │
│  ✓ Deduct from trip.remaining                                 │
│  ✓ Create TripAvailability documents                          │
│         │                                                         │
│         ▼                                                         │
│ RESPONSE: TripAvailability[] {type, cabins[]}                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │
┌────────────────────────┴────────────────────────────────────────┐
│           AGENT ALLOCATION (Sub-distribution)                    │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/trips/{tripId}/availabilities/{avId}/agent-allocations│
│ {                                                                │
│   agent: agent_id,                                              │
│   allocations: [                                                 │
│     {type: "passenger", cabins: [{cabin_id, allocatedSeats}]}  │
│   ]                                                              │
│ }                                                                │
│         │                                                         │
│         ▼                                                         │
│  ✓ Validate allocatedSeats ≤ availability.remaining           │
│  ✓ Deduct from availability.remaining                         │
│  ✓ Create AvailabilityAgentAllocation                         │
│         │                                                         │
│         ▼                                                         │
│ RESPONSE: AvailabilityAgentAllocation                          │
│           {agent, allocations[], remaining}                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Seat Capacity Hierarchy

```
SHIP LEVEL (Physical Capacity)
  └─ Cabin Type 1
     ├─ Passenger Cabin A: 100 seats
     ├─ Passenger Cabin B: 80 seats
     ├─ Cargo Hold: 50 slots
     └─ Vehicle Deck: 30 spaces

TRIP LEVEL (Offered for Trip)
  └─ Trip: DXB-MSC-001
     ├─ Passenger remaining: 150/180
     ├─ Cargo remaining: 40/50
     └─ Vehicle remaining: 25/30

AVAILABILITY LEVEL (By Type & Cabin)
  └─ Availability ID: AV-001 (type: passenger)
     ├─ Cabin A: 60 seats (20 allocated to agents)
     ├─ Cabin B: 40 seats (15 allocated to agents)
     └─ Total remaining: 65 seats

AGENT ALLOCATION LEVEL (Sub-distribution)
  └─ Allocation ID: AG-001
     ├─ Agent 1: 20 seats
     ├─ Agent 2: 15 seats
     └─ Total: 35 seats (30 remain available)

ACTUAL SALES (Bookings)
  └─ Passenger Bookings
     ├─ Agent 1: 15 tickets sold (5 remaining)
     ├─ Agent 2: 12 tickets sold (3 remaining)
     └─ Total: 27 sold (8 remain for agents)
```

---

## Date Validation Rules

```
Timeline:
  |
  ├─ Booking Opens (bookingOpeningDate)
  │  └─ Booking can be made from this point
  │
  ├─ Booking Closes (bookingClosingDate)
  │  └─ Must be BEFORE OR ON departure
  │
  ├─ Check-in Opens (checkInOpeningDate)
  │  └─ Passengers can check in
  │
  ├─ Check-in Closes (checkInClosingDate)
  │  └─ Last check-in time
  │
  ├─ Boarding Closes (boardingClosingDate)
  │  └─ Must be BEFORE OR ON departure
  │  └─ After this, no more passengers
  │
  ├─ DEPARTURE TIME (departureDateTime)
  │  └─ Ferry leaves
  │
  └─ ARRIVAL TIME (arrivalDateTime)
     └─ Must be AFTER departure

Validations:
  ✓ Departure < Arrival
  ✓ Booking Opening < Booking Closing
  ✓ Booking Closing ≤ Departure
  ✓ Check-in Opening < Check-in Closing
  ✓ Boarding Closing ≤ Departure
```

---

## Status Values

### Trip Status
- `SCHEDULED` - Trip is scheduled, bookings open
- `ONGOING` - Trip is currently happening
- `COMPLETED` - Trip has completed

### Delete Type
- **Soft Delete** - Record marked with `isDeleted: true`
  - Data preserved in database
  - Excluded from queries by default
  - Recoverable if needed

---

## Sample Request/Response

### CREATE TRIP
```javascript
// REQUEST
POST http://localhost:5000/api/trips
Header: Authorization: Bearer <JWT_TOKEN>
Body: {
  "tripName": "Dubai to Muscat Express",
  "tripCode": "DXB-MSC-001",
  "ship": "507f1f77bcf86cd799439011",
  "departurePort": "507f1f77bcf86cd799439012",
  "arrivalPort": "507f1f77bcf86cd799439013",
  "departureDateTime": "2024-03-15T10:00:00Z",
  "arrivalDateTime": "2024-03-15T14:30:00Z",
  "status": "SCHEDULED"
}

// RESPONSE (201)
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "company": "507f1f77bcf86cd799439001",
    "tripName": "Dubai to Muscat Express",
    "tripCode": "DXB-MSC-001",
    "ship": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "MS Voyager",
      "cabins": [
        {"type": "passenger", "name": "Cabin A", "capacity": 100},
        {"type": "cargo", "name": "Hold 1", "capacity": 50}
      ]
    },
    "status": "SCHEDULED",
    "remainingPassengerSeats": 100,
    "remainingCargoSeats": 50,
    "remainingVehicleSeats": 0,
    "createdAt": "2024-02-15T10:00:00Z"
  }
}
```

### CREATE AVAILABILITY
```javascript
// REQUEST
POST http://localhost:5000/api/trips/507f1f77bcf86cd799439014/availabilities
Header: Authorization: Bearer <JWT_TOKEN>
Body: {
  "availabilities": [
    {
      "type": "passenger",
      "cabins": [
        {
          "cabin": "507f1f77bcf86cd799439015",
          "seats": 80
        }
      ]
    }
  ]
}

// RESPONSE (201)
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "type": "passenger",
      "cabins": [
        {
          "cabin": {
            "_id": "507f1f77bcf86cd799439015",
            "name": "Cabin A"
          },
          "seats": 80,
          "allocatedSeats": 0,
          "remaining": 80
        }
      ],
      "createdAt": "2024-02-15T10:10:00Z"
    }
  ]
}
```

---

## Error Response Examples

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Departure date/time must be before arrival date/time"
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "success": false,
  "error": "No token provided"
}
```

### 403 Forbidden - Permission Denied
```json
{
  "success": false,
  "error": "You don't have permission to write trips"
}
```

### 404 Not Found - Resource Missing
```json
{
  "success": false,
  "error": "Trip not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Environment Variables Required

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/viaggio

# Server
NODE_ENV=development
PORT=5000

# Authentication
JWT_SECRET=your-secret-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://voyagian.com
```

---

## Postman Setup

1. **Import Collection**: `postman/Viaggio_Ferry_Trips_API.json`
2. **Set Variables**:
   - `base_url`: `http://localhost:5000` or production URL
   - `token`: Your JWT token (get from login endpoint)
   - `trip_id`: Valid trip ID from your database
   - `availability_id`: Valid availability ID
   - `agent_id`: Valid agent/user ID
3. **Run Requests**: Execute in order for full flow test

---

## Debugging Checklist

- [ ] MongoDB running and connected
- [ ] JWT token valid and not expired
- [ ] Company ID matches authenticated user
- [ ] Required IDs exist in database
- [ ] Dates pass validation rules
- [ ] Seat allocations don't exceed capacity
- [ ] User has correct RBAC permissions
- [ ] All required fields provided in request body

---

## Summary

This API implements a **complete ferry booking management system** with:
- ✅ Trip CRUD operations
- ✅ Multi-type capacity allocation
- ✅ Agent sub-allocation system
- ✅ Automatic remaining seat calculation
- ✅ Date validation rules
- ✅ Role-based access control
- ✅ Audit trail (createdBy/updatedBy)
- ✅ Soft deletion for data preservation
