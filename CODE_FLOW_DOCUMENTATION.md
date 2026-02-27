# Viaggio Ferry API - Code Flow Documentation

## 1. API OVERVIEW

The Viaggio Ferry Trips & Availabilities API is a complete CRUD system for managing ferry trips and seat/capacity allocations across three categories:
- **Passenger** - Passenger cabin allocations
- **Cargo** - Cargo space allocations  
- **Vehicle** - Vehicle space allocations

---

## 2. SYSTEM ARCHITECTURE

### Technology Stack
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT Token-based
- **Authorization**: Role-based Permission System (RBAC)

### Core Components
```
server.js
├── Express app setup
├── CORS & Security middleware (helmet)
├── Routes initialization
└── Global error handling

src/
├── config/
│   └── db.js (MongoDB connection)
├── routes/
│   ├── tripRoutes.js
│   ├── tripAvailabilityRoutes.js
│   └── agentAllocationRoutes.js
├── controllers/
│   ├── tripController.js
│   ├── tripAvailabilityController.js
│   └── agentAllocationController.js
├── models/
│   ├── Trip.js
│   ├── TripAvailability.js
│   ├── AvailabilityAgentAllocation.js
│   ├── Ship.js
│   ├── Cabin.js
│   └── Company.js
├── middleware/
│   ├── authMiddleware.js
│   ├── permissionMiddleware.js
│   └── errorHandler.js
└── utils/
    └── Various helpers
```

---

## 3. REQUEST FLOW DIAGRAM

```
HTTP Request
    ↓
server.js (Express app)
    ↓
CORS & Security Middleware
    ↓
Route Handler (tripRoutes.js)
    ↓
Authentication Middleware (verifyToken)
    ↓
Company ID Extraction Middleware
    ↓
Permission Check Middleware (RBAC)
    ↓
Controller Logic (tripController.js)
    ↓
Database Query (Mongoose models)
    ↓
Response with Status & Data
    ↓
Error Handler (if error)
    ↓
HTTP Response
```

---

## 4. AUTHENTICATION & AUTHORIZATION FLOW

### Authentication (JWT)
1. **Token Verification** (`authMiddleware.js`)
   - Extracts JWT from Authorization header: `Bearer {{token}}`
   - Verifies token validity
   - Adds user info to request object

2. **Company ID Extraction** 
   - Extracts company ID from authenticated user
   - Adds `req.companyId` for company-scoped queries

3. **User ID Extraction**
   - Extracts user ID from token
   - Adds `req.userId` to request object

### Authorization (RBAC)
- **Permission System**: `checkPermission(module, feature, action)`
  - Module: `ship-trips` (for trip management)
  - Feature: `trips` or `availabilities`
  - Action: `read`, `write`, `edit`, `delete`

- **User Roles**: `company`, `user` (with layers)
  - Company: Full access to their trips
  - User: Role-based access based on permissions

---

## 5. TRIP MANAGEMENT FLOW

### 5.1 CREATE TRIP FLOW

**Endpoint**: `POST /api/trips`

**Request Body**:
```json
{
  "tripName": "Dubai to Muscat Express",
  "tripCode": "DXB-MSC-001",
  "ship": "{{ship_id}}",
  "departurePort": "{{port_id}}",
  "arrivalPort": "{{arrival_port_id}}",
  "departureDateTime": "2024-03-15T10:00:00Z",
  "arrivalDateTime": "2024-03-15T14:30:00Z",
  "status": "SCHEDULED",
  "bookingOpeningDate": "2024-02-15T00:00:00Z",
  "bookingClosingDate": "2024-03-15T08:00:00Z",
  "checkInOpeningDate": "2024-03-15T07:00:00Z",
  "checkInClosingDate": "2024-03-15T09:30:00Z",
  "boardingClosingDate": "2024-03-15T09:45:00Z"
}
```

**Processing Steps** (in `tripController.createTrip`):
1. Authenticate user and verify company ownership
2. Validate trip dates (departure < arrival, booking < departure, etc.)
3. Fetch ship details to get cabin capacities
4. Calculate remaining seats from ship capacities
5. Create Trip document with remaining seat counts
6. Store actor information (who created the trip)
7. Return trip with populated ship/port details

**Key Validation**:
- Departure must be before arrival
- Booking closing must be before or on departure
- Check-in closing must be after check-in opening
- Boarding closing must be before or on departure

### 5.2 LIST TRIPS FLOW

**Endpoint**: `GET /api/trips?page=1&limit=10&status=SCHEDULED`

**Processing Steps**:
1. Extract company ID from authenticated user
2. Build MongoDB query with filters:
   - Company match
   - Status filter (SCHEDULED/ONGOING/COMPLETED)
   - Ship filter
   - Port filters
   - Text search (tripName, tripCode, remarks)
3. Apply pagination (default: 10 per page, max: 100)
4. Populate ship details with full cabin information
5. Return paginated results with total count

### 5.3 UPDATE TRIP FLOW

**Endpoint**: `PUT /api/trips/{{trip_id}}`

**Request Body** (partial update):
```json
{
  "tripName": "Dubai to Muscat Express - Updated",
  "status": "ONGOING"
}
```

**Processing Steps**:
1. Verify trip belongs to company
2. Validate any date changes if provided
3. Update trip fields
4. Record actor information (who updated)
5. Return updated trip

**Important**: Remaining seats cannot be manually updated - they're auto-calculated from availabilities

### 5.4 DELETE TRIP FLOW

**Endpoint**: `DELETE /api/trips/{{trip_id}}`

**Processing Steps**:
1. Verify trip belongs to company
2. Perform soft delete (set `isDeleted: true`)
3. Record deletion actor
4. Return success response

---

## 6. TRIP AVAILABILITY MANAGEMENT FLOW

### 6.1 AVAILABILITY TYPES

Three types of availabilities can be managed per trip:
- **Passenger**: Passenger cabin allocations
- **Cargo**: Cargo space allocations
- **Vehicle**: Vehicle/vehicle space allocations

### 6.2 CREATE AVAILABILITY FLOW

**Endpoint**: `POST /api/trips/{{trip_id}}/availabilities`

**Request Body** (multi-type example):
```json
{
  "availabilities": [
    {
      "type": "passenger",
      "cabins": [
        {
          "cabin": "{{cabin_id_1}}",
          "seats": 30
        }
      ]
    },
    {
      "type": "cargo",
      "cabins": [
        {
          "cabin": "{{cabin_id_2}}",
          "seats": 50
        }
      ]
    }
  ]
}
```

**Processing Steps** (in `tripAvailabilityController.createAvailabilities`):
1. Verify trip exists and belongs to company
2. For each availability type:
   - Validate each cabin allocation ≤ cabin's capacity
   - Validate total allocation ≤ trip's remaining seats
   - Deduct allocated seats from trip's remaining counts
3. Create TripAvailability document(s)
4. Update Trip's remaining seat counts
5. Record actor information
6. Return created availabilities with cabin details

**Validation Logic**:
- Each cabin allocation must not exceed ship's cabin capacity
- Total allocation must not exceed trip's remaining seats
- Type-specific remaining seats are auto-managed

### 6.3 LIST AVAILABILITIES FLOW

**Endpoint**: `GET /api/trips/{{trip_id}}/availabilities?page=1&limit=10&type=passenger`

**Processing Steps**:
1. Verify trip exists
2. Build query with filters:
   - Trip ID match
   - Type filter (optional: passenger/cargo/vehicle)
   - Cabin name search
3. Populate cabin details
4. Apply pagination
5. Return availabilities with cabin info

### 6.4 AVAILABILITY SUMMARY

**Endpoint**: `GET /api/trips/{{trip_id}}/availabilities/summary`

**Returns**:
- Total availability per type (passenger/cargo/vehicle)
- Remaining capacity per cabin
- Total allocated seats per type

### 6.5 UPDATE AVAILABILITY FLOW

**Endpoint**: `PUT /api/trips/{{trip_id}}/availabilities/{{availability_id}}`

**Request Body**:
```json
{
  "cabins": [
    {
      "cabin": "{{cabin_id}}",
      "seats": 25,
      "allocatedSeats": 10
    }
  ],
  "allocatedAgent": "{{agent_id}}"
}
```

**Processing Steps**:
1. Verify availability belongs to trip/company
2. Validate new allocations
3. Restore previous allocations to trip
4. Deduct new allocations from trip
5. Update availability record
6. Return updated availability

### 6.6 DELETE AVAILABILITY FLOW

**Endpoint**: `DELETE /api/trips/{{trip_id}}/availabilities/{{availability_id}}`

**Processing Steps**:
1. Get current availability details
2. Restore allocated seats back to trip's remaining
3. Delete availability record
4. Return success

---

## 7. AGENT ALLOCATION FLOW

Agent allocations manage sub-allocations - distributing available seats to travel agents.

### 7.1 CREATE AGENT ALLOCATION

**Endpoint**: `POST /api/trips/{{trip_id}}/availabilities/{{availability_id}}/agent-allocations`

**Request Body**:
```json
{
  "agent": "{{agent_id}}",
  "allocations": [
    {
      "type": "passenger",
      "cabins": [
        {
          "cabin": "{{cabin_id}}",
          "allocatedSeats": 20
        }
      ]
    }
  ]
}
```

**Processing Steps**:
1. Verify availability belongs to trip/company
2. Validate allocated seats ≤ availability's remaining capacity
3. Deduct from availability's remaining seats
4. Create AvailabilityAgentAllocation document
5. Return allocation with agent details

### 7.2 AVAILABILITY SUMMARY FOR ALLOCATION

**Endpoint**: `GET /api/trips/{{trip_id}}/availabilities/{{availability_id}}/agent-allocations/summary`

**Returns**:
- Total availability per cabin
- Remaining capacity per cabin after existing allocations
- Used capacity per cabin

### 7.3 UPDATE AGENT ALLOCATION

**Endpoint**: `PUT /api/trips/{{trip_id}}/availabilities/{{availability_id}}/agent-allocations/{{allocation_id}}`

**Processing Steps**:
1. Get current allocation
2. Restore previous allocation to availability
3. Apply new allocation
4. Update record
5. Return updated allocation

### 7.4 DELETE AGENT ALLOCATION

**Endpoint**: `DELETE /api/trips/{{trip_id}}/availabilities/{{availability_id}}/agent-allocations/{{allocation_id}}`

**Processing Steps**:
1. Get allocation details
2. Restore seats to availability's remaining
3. Delete allocation
4. Return success

---

## 8. DATA MODELS

### Trip Model
```javascript
{
  company: ObjectId,           // Company owner
  tripName: String,            // Trip name
  tripCode: String,            // Unique trip code
  ship: ObjectId,              // Ship reference
  departurePort: ObjectId,     // Departure port
  arrivalPort: ObjectId,       // Arrival port
  departureDateTime: Date,     // Departure time
  arrivalDateTime: Date,       // Arrival time
  
  // Booking/Check-in windows
  bookingOpeningDate: Date,
  bookingClosingDate: Date,
  checkInOpeningDate: Date,
  checkInClosingDate: Date,
  boardingClosingDate: Date,
  
  // Capacity tracking per type
  tripCapacityDetails: {
    passenger: [{cabin, total, remaining}],
    cargo: [{cabin, total, remaining}],
    vehicle: [{cabin, total, remaining}]
  },
  
  // Summary counts
  remainingPassengerSeats: Number,
  remainingCargoSeats: Number,
  remainingVehicleSeats: Number,
  
  status: String,              // SCHEDULED/ONGOING/COMPLETED
  isDeleted: Boolean,          // Soft delete flag
  
  // Audit
  createdBy: ActorSchema,
  updatedBy: ActorSchema,
  createdAt: Date,
  updatedAt: Date
}
```

### TripAvailability Model
```javascript
{
  company: ObjectId,
  trip: ObjectId,
  type: String,                // passenger/cargo/vehicle
  
  cabins: [{
    cabin: ObjectId,           // Cabin reference
    seats: Number,             // Total allocated to this cabin
    allocatedSeats: Number,    // Already allocated to agents
    remaining: Number          // Unallocated (seats - allocatedSeats)
  }],
  
  allocatedAgent: ObjectId,    // Agent this is allocated to
  isDeleted: Boolean,
  
  createdBy: ActorSchema,
  updatedBy: ActorSchema,
  createdAt: Date,
  updatedAt: Date
}
```

### AvailabilityAgentAllocation Model
```javascript
{
  company: ObjectId,
  trip: ObjectId,
  availability: ObjectId,
  agent: ObjectId,
  
  allocations: [{
    type: String,              // passenger/cargo/vehicle
    cabins: [{
      cabin: ObjectId,
      allocatedSeats: Number
    }]
  }],
  
  isDeleted: Boolean,
  createdBy: ActorSchema,
  updatedBy: ActorSchema,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 9. ERROR HANDLING

### Error Handler Middleware
Located in `src/middleware/errorHandler.js`

**Global Error Handling**:
1. Catches all thrown errors
2. Logs error details
3. Returns standardized error response with status code
4. Prevents server crash from uncaught exceptions

### Common Error Scenarios

| Error | Status | Cause |
|-------|--------|-------|
| 400 Bad Request | Validation fails (dates, capacity, etc.) |
| 401 Unauthorized | Missing/invalid JWT token |
| 403 Forbidden | User lacks required permissions |
| 404 Not Found | Resource doesn't exist or belongs to different company |
| 500 Server Error | Database error or unhandled exception |

---

## 10. KEY BUSINESS RULES

### Seat Management
- **Remaining seats auto-calculated** from ship capacities
- **Cannot manually update** remaining seats - only via availability allocation
- **Allocation validation** ensures no overbooking

### Date Validations
- Departure < Arrival
- Booking closing ≤ Departure
- Booking opening < Booking closing
- Check-in opening < Check-in closing
- Boarding closing ≤ Departure

### Capacity Hierarchy
```
Ship Capacity (max for each cabin type)
    ↓
Trip Allocation (how many seats offered in trip)
    ↓
Availability Allocation (how many seats available per cabin)
    ↓
Agent Allocation (how many seats allocated to agents)
    ↓
Passenger Bookings (actual sales)
```

### Soft Deletion
- All deletes use soft delete (`isDeleted: true`)
- Data preserved for audit trails
- Queries exclude soft-deleted records by default

---

## 11. API POSTMAN COLLECTION

The `Viaggio_Ferry_Trips_API.json` Postman collection includes:
- **All endpoints** documented with examples
- **Request templates** with required fields
- **Variable placeholders** for easy parameter substitution
- **Base URL**: `{{base_url}}` (default: http://localhost:5000)
- **Authentication**: Bearer token in `{{token}}` variable

### Collection Structure
```
Trips (CRUD)
├── List Trips
├── Get Trip by ID
├── Create Trip
├── Update Trip
└── Delete Trip

Trip Availabilities
├── List Availabilities
├── Get Availability by ID
├── Get Availability Summary
├── Create Availabilities (all types)
├── Create Availability (passenger only)
├── Create Availability (cargo only)
├── Create Availability (vehicle only)
├── Update Availability
└── Delete Availability

Agent Allocations
├── Get Availability Summary for Allocation
├── List Agent Allocations
├── Get Agent Allocation by ID
├── Create Agent Allocation
├── Update Agent Allocation
└── Delete Agent Allocation
```

---

## 12. DEBUGGING TIPS

### Enable Debugging
- Use `console.log("[v0] ...")` for trace logs
- Check MongoDB connection in `src/config/db.js`
- Verify JWT tokens in auth middleware

### Common Issues
1. **404 on Trip/Availability**: Verify company ID matches
2. **403 Permission Denied**: Check user permissions in database
3. **400 Validation Error**: Review date/capacity validations
4. **Duplicate Index Warning**: See MongoDB schema index definitions

### Server Startup Checklist
- MongoDB connection active
- All required environment variables set
- JWT secret configured
- CORS origins whitelisted
- Routes properly initialized

---

## 13. SUMMARY

This system implements a **hierarchical seat allocation model** for ferry bookings:

1. **Create Trip** with ship, dates, and ports
2. **Allocate Availabilities** by type (passenger/cargo/vehicle)
3. **Allocate to Agents** for ticket sales
4. **Track Remaining Capacity** automatically

All operations are **company-scoped**, **permission-checked**, **date-validated**, and **audit-logged**.
