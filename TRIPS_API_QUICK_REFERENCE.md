# Trip API - Quick Reference Guide

## Quick Start

### 1. API Endpoints Summary

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/api/trips` | read | List all trips |
| GET | `/api/trips/:id` | read | Get trip details |
| GET | `/api/trips/:id/availability` | read | Get remaining capacity |
| POST | `/api/trips` | write | Create trip |
| PUT | `/api/trips/:id` | edit | Update trip |
| DELETE | `/api/trips/:id` | delete | Delete trip |

### 2. Authentication
All requests require JWT token in header:
```
Authorization: Bearer {token}
```

### 3. Create a Trip - Minimal Example
```json
{
  "tripName": "Dubai to Muscat",
  "tripCode": "DXB-MSC-001",
  "ship": "507f1f77bcf86cd799439012",
  "departurePort": "507f1f77bcf86cd799439013",
  "arrivalPort": "507f1f77bcf86cd799439014",
  "departureDateTime": "2024-03-15T10:00:00Z",
  "arrivalDateTime": "2024-03-15T14:30:00Z"
}
```

### 4. Create a Trip - Full Example (with all booking dates)
```json
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
  "remarks": "Peak season trip"
}
```

### 5. Trip Statuses
- `SCHEDULED` - Not yet open for bookings
- `OPEN` - Ready for bookings
- `CLOSED` - Bookings no longer accepted
- `COMPLETED` - Trip finished
- `CANCELLED` - Trip cancelled

### 6. Pagination
```
GET /api/trips?page=1&limit=10
```
- `page`: 1-based (default: 1)
- `limit`: Max 100 (default: 10)

### 7. Filtering
```
GET /api/trips?search=Dubai&status=OPEN&ship=<shipId>&departurePort=<portId>
```
- `search`: Trip name, code, or remarks
- `status`: SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED
- `ship`: Filter by ship ID
- `departurePort`: Filter by departure port ID
- `arrivalPort`: Filter by arrival port ID

### 8. Date Validation Rules
1. **Departure < Arrival** ✅
2. **Booking Close ≤ Departure** ✅
3. **Boarding Close ≤ Departure** ✅
4. **Check-in Open < Check-in Close** ✅

Example:
```
Departure: 2024-03-15 10:00 AM
Arrival: 2024-03-15 02:30 PM ✅
Booking Close: 2024-03-15 08:00 AM ✅
Boarding Close: 2024-03-15 09:45 AM ✅
```

### 9. Get Trip Availability (Remaining Seats)
```bash
GET /api/trips/507f1f77bcf86cd799439011/availability

Response:
{
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
```

### 10. Error Codes

| Code | Error | Cause |
|------|-------|-------|
| 400 | Bad Request | Invalid input data |
| 400 | Invalid trip ID format | Trip ID is not valid ObjectId |
| 400 | Missing required field | Required field not provided |
| 400 | Invalid status | Status not in valid list |
| 400 | Departure must be before arrival | Date logic error |
| 400 | Booking closing date must be ≤ departure | Date logic error |
| 400 | Duplicate trip code | Trip code already exists for company |
| 404 | Trip not found | Trip ID doesn't exist |
| 404 | Ship not found | Ship ID doesn't exist |
| 404 | Port not found | Port ID doesn't exist |
| 404 | Promotion not found | Promotion ID doesn't exist |

### 11. Common Use Cases

**Create and immediately open for bookings:**
```bash
1. POST /api/trips with status: "SCHEDULED"
2. PUT /api/trips/{id} with status: "OPEN"
```

**Search for all open trips from Dubai:**
```bash
GET /api/trips?status=OPEN&departurePort={dubai_port_id}
```

**Check capacity before accepting a booking:**
```bash
GET /api/trips/{id}/availability
```

**Update trip status workflow:**
```bash
1. SCHEDULED → OPEN (booking opens)
2. OPEN → CLOSED (booking closes)
3. CLOSED → COMPLETED (trip finished)
```

### 12. Postman Import
1. In Postman: Click "Import"
2. Select `/postman/Viaggio_Ferry_Trips_API.json`
3. Set environment variables:
   - `base_url`: http://localhost:5000
   - `token`: Your JWT token
   - `ship_id`: Ship ID from database
   - `port_id`: Port ID from database
   - `arrival_port_id`: Port ID from database

### 13. File Locations
- **Controller**: `src/controllers/tripController.js`
- **Routes**: `src/routes/tripRoutes.js`
- **Model**: `src/models/Trip.js` (already exists)
- **Postman**: `postman/Viaggio_Ferry_Trips_API.json`
- **Documentation**: `TRIPS_API_DOCUMENTATION.md`
- **Summary**: `TRIPS_API_IMPLEMENTATION.md`

### 14. Data Isolation
- All trips filtered by company
- Users see only their company's trips
- Super admin bypasses company filter

### 15. Audit Trail
Every trip tracks:
- `createdBy`: Who created the trip
- `updatedBy`: Who last updated the trip
- `createdAt`: When created
- `updatedAt`: When last updated
- `isDeleted`: Soft delete flag

---

**Version**: 1.0.0  
**Status**: Production Ready
