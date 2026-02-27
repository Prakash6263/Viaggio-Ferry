# Viaggio Ferry - Trips API Documentation

## Overview
The Trips API provides complete CRUD operations for managing ferry trips, including:
- Trip scheduling and details management
- Vessel (ship) assignment
- Port management (departure and arrival)
- Booking windows configuration
- Check-in and boarding management
- Availability tracking for passengers, cargo, and vehicles
- Status management (SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED)

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints require a valid JWT token passed in the `Authorization` header:
```
Authorization: Bearer {token}
```

## Data Structure

### Trip Schema
```javascript
{
  _id: ObjectId,
  company: ObjectId,                    // Company reference (auto from auth)
  tripName: String,                     // e.g., "Dubai to Muscat Express"
  tripCode: String,                     // Unique per company, uppercase
  ship: ObjectId,                       // Reference to Ship model
  departurePort: ObjectId,              // Reference to Port model
  arrivalPort: ObjectId,                // Reference to Port model
  departureDateTime: Date,              // Departure date/time
  arrivalDateTime: Date,                // Arrival date/time
  bookingOpeningDate: Date,             // When booking starts
  bookingClosingDate: Date,             // When booking closes
  checkInOpeningDate: Date,             // When check-in opens
  checkInClosingDate: Date,             // When check-in closes
  boardingClosingDate: Date,            // When boarding closes
  status: String,                       // SCHEDULED | OPEN | CLOSED | COMPLETED | CANCELLED
  promotion: ObjectId,                  // Optional promotion reference
  remarks: String,                      // Optional notes/remarks
  reportingStatus: String,              // NotStarted | InProgress | Verified | Completed
  tripReport: ObjectId,                 // Reference to TripReport model
  createdBy: Object,                    // Audit: who created
  updatedBy: Object,                    // Audit: who last updated
  isDeleted: Boolean,                   // Soft delete flag
  createdAt: Date,                      // Timestamp
  updatedAt: Date                       // Timestamp
}
```

### Valid Trip Statuses
- `SCHEDULED` - Trip is scheduled but not open for bookings
- `OPEN` - Trip is open for bookings
- `CLOSED` - Trip is closed for bookings
- `COMPLETED` - Trip has been completed
- `CANCELLED` - Trip has been cancelled

## Endpoints

### 1. List Trips
Get a paginated list of all trips for the company with optional filtering.

**Request**
```http
GET /trips?page=1&limit=10&search=&status=&ship=&departurePort=&arrivalPort=
Authorization: Bearer {token}
```

**Query Parameters**
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| page | number | Page number (default: 1) | No |
| limit | number | Items per page (default: 10, max: 100) | No |
| search | string | Search by trip name, code, or remarks | No |
| status | string | Filter by status (SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED) | No |
| ship | string | Filter by ship ID | No |
| departurePort | string | Filter by departure port ID | No |
| arrivalPort | string | Filter by arrival port ID | No |

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Trips retrieved successfully",
  "data": {
    "trips": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "tripName": "Dubai to Muscat",
        "tripCode": "DXB-MSC-001",
        "ship": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Example Ship 1"
        },
        "departurePort": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Dubai",
          "code": "DXB"
        },
        "arrivalPort": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Muscat",
          "code": "MSC"
        },
        "departureDateTime": "2024-03-15T10:00:00Z",
        "arrivalDateTime": "2024-03-15T14:30:00Z",
        "status": "SCHEDULED",
        "remarks": "Peak season trip"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

### 2. Get Trip by ID
Get detailed information about a specific trip.

**Request**
```http
GET /trips/{tripId}
Authorization: Bearer {token}
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| tripId | string | Trip ID (MongoDB ObjectId) |

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Trip retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "tripName": "Dubai to Muscat Express",
    "tripCode": "DXB-MSC-001",
    "ship": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Example Ship 1",
      "imoNumber": "1234567",
      "flagState": "UAE"
    },
    "departurePort": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Dubai",
      "code": "DXB",
      "country": "UAE"
    },
    "arrivalPort": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Muscat",
      "code": "MSC",
      "country": "Oman"
    },
    "departureDateTime": "2024-03-15T10:00:00Z",
    "arrivalDateTime": "2024-03-15T14:30:00Z",
    "bookingOpeningDate": "2024-02-15T00:00:00Z",
    "bookingClosingDate": "2024-03-15T08:00:00Z",
    "checkInOpeningDate": "2024-03-15T07:00:00Z",
    "checkInClosingDate": "2024-03-15T09:30:00Z",
    "boardingClosingDate": "2024-03-15T09:45:00Z",
    "status": "SCHEDULED",
    "promotion": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Early Bird Special",
      "discountType": "percentage",
      "discountValue": 10
    },
    "remarks": "Peak season trip with full capacity expected",
    "reportingStatus": "NotStarted",
    "createdBy": {
      "id": "507f1f77bcf86cd799439001",
      "name": "user@company.com",
      "type": "user",
      "layer": "commercial-agent"
    },
    "updatedBy": null,
    "createdAt": "2024-02-01T10:00:00Z",
    "updatedAt": "2024-02-01T10:00:00Z"
  }
}
```

### 3. Get Trip Availability
Get remaining capacity for passenger seats, cargo spots, and vehicle spots.

**Request**
```http
GET /trips/{tripId}/availability
Authorization: Bearer {token}
```

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Trip availability retrieved successfully",
  "data": {
    "tripId": "507f1f77bcf86cd799439011",
    "tripName": "Dubai to Muscat Express",
    "tripCode": "DXB-MSC-001",
    "capacity": {
      "passengerSeats": {
        "total": 500,
        "booked": 120,
        "remaining": 380
      },
      "cargoSpots": {
        "total": 50,
        "booked": 15,
        "remaining": 35
      },
      "vehicleSpots": {
        "total": 100,
        "booked": 45,
        "remaining": 55
      }
    }
  }
}
```

### 4. Create Trip
Create a new ferry trip.

**Request**
```http
POST /trips
Content-Type: application/json
Authorization: Bearer {token}

{
  "tripName": "Dubai to Muscat Express",
  "tripCode": "DXB-MSC-001",
  "ship": "507f1f77bcf86cd799439012",
  "departurePort": "507f1f77bcf86cd799439013",
  "arrivalPort": "507f1f77bcf86cd799439014",
  "departureDateTime": "2024-03-15T10:00:00Z",
  "arrivalDateTime": "2024-03-15T14:30:00Z",
  "status": "SCHEDULED",
  "bookingOpeningDate": "2024-02-15T00:00:00Z",
  "bookingClosingDate": "2024-03-15T08:00:00Z",
  "checkInOpeningDate": "2024-03-15T07:00:00Z",
  "checkInClosingDate": "2024-03-15T09:30:00Z",
  "boardingClosingDate": "2024-03-15T09:45:00Z",
  "promotion": "507f1f77bcf86cd799439015",
  "remarks": "Peak season trip with full capacity expected"
}
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tripName | string | Yes | Trip name/title |
| tripCode | string | Yes | Unique trip code (auto-uppercase, unique per company) |
| ship | string (ObjectId) | Yes | Ship ID |
| departurePort | string (ObjectId) | Yes | Departure port ID |
| arrivalPort | string (ObjectId) | Yes | Arrival port ID |
| departureDateTime | ISO 8601 | Yes | Departure date and time |
| arrivalDateTime | ISO 8601 | Yes | Arrival date and time (must be after departure) |
| status | string | No | SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED (default: SCHEDULED) |
| bookingOpeningDate | ISO 8601 | No | When booking opens |
| bookingClosingDate | ISO 8601 | No | When booking closes (must be ≤ departure time) |
| checkInOpeningDate | ISO 8601 | No | When check-in opens |
| checkInClosingDate | ISO 8601 | No | When check-in closes |
| boardingClosingDate | ISO 8601 | No | When boarding closes (must be ≤ departure time) |
| promotion | string (ObjectId) | No | Promotion ID (optional) |
| remarks | string | No | Additional notes or remarks |

**Response (201 Created)**
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "tripName": "Dubai to Muscat Express",
    "tripCode": "DXB-MSC-001",
    "ship": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Example Ship 1"
    },
    // ... other fields
  }
}
```

**Error Responses**
- `400 Bad Request` - Invalid input data
- `404 Not Found` - Ship, port, or promotion not found
- `409 Conflict` - Duplicate trip code for the company

### 5. Update Trip
Update an existing trip. Send only the fields you want to update.

**Request**
```http
PUT /trips/{tripId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "tripName": "Dubai to Muscat Express - Updated",
  "status": "OPEN",
  "remarks": "Updated with new information"
}
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| tripId | string | Trip ID (MongoDB ObjectId) |

**Request Body** (All fields optional)
Same as Create Trip, all fields are optional. Send only the fields to update.

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "tripName": "Dubai to Muscat Express - Updated",
    "status": "OPEN",
    // ... updated fields
  }
}
```

**Error Responses**
- `400 Bad Request` - Invalid input data or date validation failed
- `404 Not Found` - Trip, ship, or port not found
- `409 Conflict` - Duplicate trip code for the company

### 6. Delete Trip
Soft delete a trip (marks as deleted, does not remove from database).

**Request**
```http
DELETE /trips/{tripId}
Authorization: Bearer {token}
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| tripId | string | Trip ID (MongoDB ObjectId) |

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Trip deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "deletedAt": "2024-02-01T15:30:00Z"
  }
}
```

**Error Responses**
- `400 Bad Request` - Invalid trip ID format
- `404 Not Found` - Trip not found

## Date Validation Rules
1. **Departure must be before Arrival**: `departureDateTime < arrivalDateTime`
2. **Booking closing must be before or on departure**: `bookingClosingDate ≤ departureDateTime`
3. **Check-in opening must be before check-in closing**: `checkInOpeningDate < checkInClosingDate`
4. **Boarding closing must be before or on departure**: `boardingClosingDate ≤ departureDateTime`

## Permission Requirements
All trip endpoints require the following permissions based on operation:
- **Read**: `ship-trips.trips.read`
- **Create**: `ship-trips.trips.write`
- **Update**: `ship-trips.trips.edit`
- **Delete**: `ship-trips.trips.delete`

## Data Isolation
- All trips are isolated by company (via `company` field)
- Users can only access trips from their company
- Super admin has full access across all companies

## Audit Trail
- All trips track who created them (`createdBy`)
- All updates track who made the change (`updatedBy`)
- Timestamps (`createdAt`, `updatedAt`) are automatically managed

## Soft Delete
- Deleted trips are marked with `isDeleted: true`
- Deleted trips are excluded from all queries
- Deleted trips cannot be permanently removed (database integrity)

## Related Endpoints
- **Ships**: `/api/ships` - Manage vessels
- **Ports**: `/api/ports` - Manage ports
- **Price Lists**: `/api/price-lists` - Manage pricing
- **Promotions**: `/api/administration/promotions` - Manage promotions

## Common Use Cases

### Create and Open a Trip for Booking
1. Create trip with `status: "SCHEDULED"`
2. Update trip to `status: "OPEN"` when ready

### Schedule Booking Windows
1. Set `bookingOpeningDate` and `bookingClosingDate`
2. System will automatically enforce booking windows

### Check Trip Capacity Before Booking
1. Call `GET /trips/{tripId}/availability`
2. Check remaining seats/spots for passengers, cargo, vehicles

### Search for Trips
1. Use `GET /trips?search=trip_name_or_code`
2. Or filter by status: `GET /trips?status=OPEN`
3. Or filter by ship/ports: `GET /trips?ship={shipId}&departurePort={portId}`
