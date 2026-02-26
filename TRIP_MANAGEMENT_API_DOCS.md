# Trip Management API - Complete Documentation

## Overview

The Trip Management system is a comprehensive module for managing ferry trips, their availability, and agent allocations. It follows a multi-tenant architecture with RBAC (Role-Based Access Control).

### Base URL
```
/api/trips
```

### Authentication
All endpoints require JWT authentication with header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
All API responses follow this standard format:
```json
{
  "success": true/false,
  "message": "descriptive message",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## TRIP ENDPOINTS

### 1. Create Trip
**POST** `/api/trips`

Creates a new trip and auto-generates availability records from ship capacities.

#### Permissions
- Required: `sales-bookings:trip:write`

#### Request Body
```json
{
  "tripName": "Ferry Route Mumbai - Goa",
  "tripCode": "MG001",
  "ship": "507f1f77bcf86cd799439011",
  "departurePort": "507f1f77bcf86cd799439012",
  "arrivalPort": "507f1f77bcf86cd799439013",
  "departureDateTime": "2025-03-15T08:00:00Z",
  "arrivalDateTime": "2025-03-15T16:00:00Z",
  "bookingOpeningDate": "2025-02-25T00:00:00Z",
  "bookingClosingDate": "2025-03-14T23:59:59Z",
  "checkInOpeningDate": "2025-03-15T06:00:00Z",
  "checkInClosingDate": "2025-03-15T07:30:00Z",
  "boardingClosingDate": "2025-03-15T07:45:00Z",
  "status": "SCHEDULED",
  "remarks": "Regular scheduled service",
  "promotion": "507f1f77bcf86cd799439014"
}
```

#### Required Fields
- `tripName` - String, non-empty
- `tripCode` - String, unique per company
- `ship` - Valid ObjectId, must be Active
- `departurePort` - Valid ObjectId
- `arrivalPort` - Valid ObjectId
- `departureDateTime` - ISO 8601 date, must be < arrivalDateTime
- `arrivalDateTime` - ISO 8601 date, must be > departureDateTime

#### Optional Fields
- `bookingOpeningDate` - ISO 8601 date
- `bookingClosingDate` - ISO 8601 date, must be >= bookingOpeningDate
- `checkInOpeningDate` - ISO 8601 date
- `checkInClosingDate` - ISO 8601 date
- `boardingClosingDate` - ISO 8601 date, must be <= departureDateTime
- `status` - Enum: SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED (default: SCHEDULED)
- `remarks` - String
- `promotion` - Valid ObjectId reference

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "trip": {
      "_id": "507f1f77bcf86cd799439015",
      "company": "507f1f77bcf86cd799439001",
      "tripName": "Ferry Route Mumbai - Goa",
      "tripCode": "MG001",
      "ship": "507f1f77bcf86cd799439011",
      "status": "SCHEDULED",
      "departureDateTime": "2025-03-15T08:00:00Z",
      "arrivalDateTime": "2025-03-15T16:00:00Z",
      "createdAt": "2025-02-25T10:00:00Z",
      "updatedAt": "2025-02-25T10:00:00Z"
    },
    "availabilities": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "trip": "507f1f77bcf86cd799439015",
        "availabilityType": "PASSENGER",
        "cabinId": "507f1f77bcf86cd799439021",
        "totalCapacity": 500,
        "bookedQuantity": 0,
        "remainingCapacity": 500
      }
    ]
  }
}
```

#### Error Cases
- `400` - Validation error (missing fields, invalid dates)
- `404` - Ship or port not found
- `409` - Trip code already exists for company

---

### 2. List Trips
**GET** `/api/trips`

Lists all trips for the company with pagination and filtering.

#### Permissions
- Required: `sales-bookings:trip:read`

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Records per page (default: 10, max: 100) |
| search | string | Search by tripName or tripCode |
| departurePort | ObjectId | Filter by departure port |
| arrivalPort | ObjectId | Filter by arrival port |
| status | string | Filter by status (SCHEDULED, OPEN, etc.) |
| startDate | ISO 8601 | Filter trips from this date |
| endDate | ISO 8601 | Filter trips until this date |

#### Example
```
GET /api/trips?page=1&limit=10&status=OPEN&startDate=2025-03-01&endDate=2025-03-31
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trips retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "tripName": "Ferry Route Mumbai - Goa",
      "tripCode": "MG001",
      "ship": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "MV Oceanic"
      },
      "status": "OPEN",
      "departureDateTime": "2025-03-15T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

---

### 3. Get Trip by ID
**GET** `/api/trips/:id`

Retrieves a specific trip with all its availability details.

#### Permissions
- Required: `sales-bookings:trip:read`

#### Path Parameters
- `id` - Valid ObjectId

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trip retrieved successfully",
  "data": {
    "trip": {
      "_id": "507f1f77bcf86cd799439015",
      "tripName": "Ferry Route Mumbai - Goa",
      "tripCode": "MG001",
      "status": "OPEN",
      "ship": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "MV Oceanic"
      },
      "departurePort": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Mumbai",
        "code": "BOM"
      },
      "arrivalPort": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Goa",
        "code": "GOA"
      }
    },
    "availabilities": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "availabilityType": "PASSENGER",
        "cabinId": {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Standard Cabin",
          "type": "passenger"
        },
        "totalCapacity": 500,
        "bookedQuantity": 250,
        "remainingCapacity": 250
      },
      {
        "_id": "507f1f77bcf86cd799439022",
        "availabilityType": "CARGO",
        "cabinId": {
          "_id": "507f1f77bcf86cd799439023",
          "name": "Cargo Hold",
          "type": "cargo"
        },
        "totalCapacity": 100,
        "bookedQuantity": 30,
        "remainingCapacity": 50
      }
    ]
  }
}
```

---

### 4. Update Trip
**PUT** `/api/trips/:id`

Updates trip details. Cannot change ship if allocations exist, cannot edit if COMPLETED.

#### Permissions
- Required: `sales-bookings:trip:edit`

#### Request Body
Any of the fields from Create Trip can be updated.

#### Restrictions
- Cannot change `ship` if agent allocations exist
- Cannot edit if `status` is COMPLETED
- Date validations apply (departureDateTime < arrivalDateTime, etc.)

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "tripName": "Ferry Route Mumbai - Goa",
    "status": "OPEN",
    "updatedAt": "2025-02-25T11:00:00Z"
  }
}
```

---

### 5. Delete Trip
**DELETE** `/api/trips/:id`

Soft deletes a trip (marks isDeleted = true). Also soft deletes associated availabilities.

#### Permissions
- Required: `sales-bookings:trip:delete`

#### Restrictions
- Cannot delete if agent allocations exist
- Soft delete preserves data for audit trails

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trip deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "deletedAt": "2025-02-25T11:05:00Z"
  }
}
```

---

### 6. Get Trip Availability
**GET** `/api/trips/:tripId/availability`

Gets detailed availability information for all capacity types of a trip.

#### Permissions
- Required: `sales-bookings:trip:read`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trip availability retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "trip": "507f1f77bcf86cd799439015",
      "availabilityType": "PASSENGER",
      "cabinId": {
        "_id": "507f1f77bcf86cd799439021",
        "name": "Standard Cabin",
        "type": "passenger"
      },
      "totalCapacity": 500,
      "bookedQuantity": 250,
      "remainingCapacity": 250,
      "createdAt": "2025-02-25T10:00:00Z"
    }
  ]
}
```

---

## AGENT ALLOCATION ENDPOINTS

### 1. Create Allocation
**POST** `/api/trips/:tripId/allocations`

Allocates capacity to a partner (agent) for a trip.

#### Permissions
- Required: `sales-bookings:trip:write`

#### Request Body
```json
{
  "partner": "507f1f77bcf86cd799439100",
  "allocations": [
    {
      "availabilityId": "507f1f77bcf86cd799439020",
      "quantity": 50,
      "soldQuantity": 0
    },
    {
      "availabilityId": "507f1f77bcf86cd799439022",
      "quantity": 30
    }
  ]
}
```

#### Rules
- One allocation per partner per trip
- Allocated quantity cannot exceed availabilityType total capacity
- Sum of all partner allocations per availabilityType cannot exceed totalCapacity

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Agent allocation created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439200",
    "trip": "507f1f77bcf86cd799439015",
    "partner": "507f1f77bcf86cd799439100",
    "allocations": [
      {
        "_id": "507f1f77bcf86cd799439201",
        "availabilityId": "507f1f77bcf86cd799439020",
        "quantity": 50,
        "soldQuantity": 0
      },
      {
        "_id": "507f1f77bcf86cd799439202",
        "availabilityId": "507f1f77bcf86cd799439022",
        "quantity": 30,
        "soldQuantity": 0
      }
    ],
    "createdAt": "2025-02-25T10:30:00Z"
  }
}
```

#### Error Cases
- `409` - Allocation already exists for this partner on this trip
- `400` - Insufficient capacity or invalid allocation data

---

### 2. List Allocations
**GET** `/api/trips/:tripId/allocations`

Lists all allocations for a trip with partner details.

#### Permissions
- Required: `sales-bookings:trip:read`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Allocations retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439200",
      "trip": "507f1f77bcf86cd799439015",
      "partner": {
        "_id": "507f1f77bcf86cd799439100",
        "name": "Travel Partner Inc"
      },
      "allocations": [
        {
          "availabilityId": {
            "_id": "507f1f77bcf86cd799439020",
            "availabilityType": "PASSENGER",
            "totalCapacity": 500,
            "bookedQuantity": 100
          },
          "quantity": 50,
          "soldQuantity": 25
        }
      ]
    }
  ]
}
```

---

### 3. Update Allocation
**PUT** `/api/trips/:tripId/allocations/:allocationId`

Updates allocation quantities for a partner.

#### Permissions
- Required: `sales-bookings:trip:edit`

#### Request Body
```json
{
  "allocations": [
    {
      "availabilityId": "507f1f77bcf86cd799439020",
      "quantity": 60,
      "soldQuantity": 30
    },
    {
      "availabilityId": "507f1f77bcf86cd799439022",
      "quantity": 40,
      "soldQuantity": 10
    }
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Allocation updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439200",
    "allocations": [
      {
        "availabilityId": "507f1f77bcf86cd799439020",
        "quantity": 60,
        "soldQuantity": 30
      }
    ],
    "updatedAt": "2025-02-25T11:00:00Z"
  }
}
```

---

### 4. Delete Allocation
**DELETE** `/api/trips/:tripId/allocations/:allocationId`

Soft deletes an allocation, restoring capacity to available pool.

#### Permissions
- Required: `sales-bookings:trip:delete`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Allocation deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439200",
    "deletedAt": "2025-02-25T11:05:00Z"
  }
}
```

---

## CAPACITY MANAGEMENT

### Understanding Capacity

The system manages three types of capacity:

1. **PASSENGER** - Number of seats allocated
2. **CARGO** - Number of cargo spots allocated
3. **VEHICLE** - Number of vehicle spots allocated

### Remaining Capacity Calculation

```
remainingCapacity = totalCapacity - bookedQuantity - totalAllocatedToAgents
```

Where:
- `totalCapacity` - Physical capacity from ship
- `bookedQuantity` - Units already booked/confirmed
- `totalAllocatedToAgents` - Sum of all partner allocations

### Auto-Generation from Ship

When a trip is created, TripAvailability records are automatically generated from the ship's capacity arrays:

```
For each ship.passengerCapacity item:
  - Create PASSENGER availability with capacity = seats

For each ship.cargoCapacity item:
  - Create CARGO availability with capacity = spots

For each ship.vehicleCapacity item:
  - Create VEHICLE availability with capacity = spots
```

---

## DATA MODELS

### Trip Model
```
{
  _id: ObjectId,
  company: ObjectId (indexed, required),
  tripName: String (required),
  tripCode: String (unique per company, required),
  ship: ObjectId (ref Ship, required),
  departurePort: ObjectId (ref Port, required),
  arrivalPort: ObjectId (ref Port, required),
  departureDateTime: Date (required),
  arrivalDateTime: Date (required),
  bookingOpeningDate: Date,
  bookingClosingDate: Date,
  checkInOpeningDate: Date,
  checkInClosingDate: Date,
  boardingClosingDate: Date,
  status: String (enum: SCHEDULED|OPEN|CLOSED|COMPLETED|CANCELLED),
  remarks: String,
  promotion: ObjectId (ref Promotion),
  reportingStatus: String,
  tripReport: ObjectId (ref TripReport),
  createdBy: Object (actor info),
  updatedBy: Object (actor info),
  isDeleted: Boolean (default false, indexed),
  timestamps: true
}
```

### TripAvailability Model
```
{
  _id: ObjectId,
  company: ObjectId (indexed, required),
  trip: ObjectId (ref Trip, required, indexed),
  availabilityType: String (enum: PASSENGER|CARGO|VEHICLE),
  cabinId: ObjectId (ref Cabin, required),
  totalCapacity: Number (required),
  bookedQuantity: Number (default 0),
  remainingCapacity: Number (calculated),
  isDeleted: Boolean (default false),
  timestamps: true
}
```

### TripAgentAllocation Model
```
{
  _id: ObjectId,
  company: ObjectId (indexed, required),
  trip: ObjectId (ref Trip, required),
  partner: ObjectId (ref Partner, required),
  allocations: [
    {
      availabilityId: ObjectId (ref TripAvailability),
      quantity: Number (required),
      soldQuantity: Number (default 0)
    }
  ],
  isDeleted: Boolean (default false),
  timestamps: true
}
```

---

## ERROR HANDLING

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry or constraint violation |

### Error Response Format
```json
{
  "success": false,
  "message": "Detailed error message"
}
```

---

## RBAC PERMISSIONS

The following RBAC permissions are used:

- `sales-bookings:trip:read` - View trips and availability
- `sales-bookings:trip:write` - Create trips and allocations
- `sales-bookings:trip:edit` - Update trips and allocations
- `sales-bookings:trip:delete` - Delete trips and allocations

---

## BUSINESS RULES

1. **Trip Dates Validation**
   - `departureDateTime < arrivalDateTime`
   - `bookingOpeningDate <= bookingClosingDate`
   - `boardingClosingDate <= departureDateTime`

2. **Ship Constraints**
   - Ship must be Active status
   - Ship must belong to same company
   - Cannot change ship if allocations exist

3. **Capacity Constraints**
   - Cannot allocate more than totalCapacity
   - Sum of all allocations cannot exceed totalCapacity

4. **Trip Status Rules**
   - Cannot edit trip if status = COMPLETED
   - Cannot delete trip if allocations exist

5. **Multi-Tenancy**
   - All operations are company-scoped
   - Users can only access their company's data

---

## BEST PRACTICES

1. Always validate dates before creating trips
2. Check remaining capacity before allocating to partners
3. Use soft delete (isDeleted flag) instead of hard delete
4. Keep audit trails with createdBy/updatedBy
5. Update remainingCapacity after each allocation change
6. Populate ship/port references for complete trip details

---

## EXAMPLES

### Complete Trip Creation Flow

1. Create a Ship with capacity details
2. Create Ports (departure and arrival)
3. Create Trip → Auto-generates TripAvailability
4. Create Allocations for each Partner
5. Update Trip status to OPEN when ready
6. Track bookings against allocations

### Capacity Flow

```
Ship has: 500 passenger seats in Cabin A
Trip created → TripAvailability created (totalCapacity: 500)
Partner1 allocated 200 seats
Partner2 allocated 150 seats
Remaining available: 150 seats

remainingCapacity = 500 - 0 (booked) - 350 (allocated)
                 = 150
```

