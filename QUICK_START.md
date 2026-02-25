# Trip Management System - Quick Start Guide

## Files Overview

### Models (3 files)
| File | Purpose |
|------|---------|
| `src/models/Trip.js` | Main trip entity (refactored) |
| `src/models/TripAvailability.js` | Auto-generated capacity tracking |
| `src/models/TripAgentAllocation.js` | Partner allocations |

### Services (1 file)
| File | Purpose |
|------|---------|
| `src/services/tripService.js` | Business logic & validations |

### Controllers (2 files)
| File | Purpose |
|------|---------|
| `src/controllers/tripController.js` | Trip CRUD operations |
| `src/controllers/allocationController.js` | Allocation management |

### Middleware & Routes (2 files)
| File | Purpose |
|------|---------|
| `src/middleware/tripValidationMiddleware.js` | Input validation |
| `src/routes/tripRoutes.js` | API endpoint definitions |

### Configuration (1 file)
| File | Purpose |
|------|---------|
| `src/constants/rbac.js` | Updated with trip permissions |

### Documentation (3 files)
| File | Purpose |
|------|---------|
| `TRIP_MANAGEMENT_API_DOCS.md` | Complete API reference |
| `TRIP_MANAGEMENT_IMPLEMENTATION.md` | Implementation details |
| `Viaggio-Ferry-Trip-Management-API.postman_collection.json` | Postman tests |

---

## Getting Started

### 1. Database Setup

The system uses MongoDB/Mongoose with the following models:
- **Trip** - Main trip records
- **TripAvailability** - Capacity records (auto-generated)
- **TripAgentAllocation** - Partner allocations

No migration scripts needed - models auto-sync with database on first use.

### 2. API Endpoints

Base path: `/api/trips`

#### Trips
```bash
POST   /                          # Create trip
GET    /                          # List trips
GET    /:id                       # Get trip
PUT    /:id                       # Update trip
DELETE /:id                       # Delete trip
GET    /:tripId/availability      # Get availability breakdown
```

#### Allocations
```bash
POST   /:tripId/allocations              # Create allocation
GET    /:tripId/allocations              # List allocations
PUT    /:tripId/allocations/:id          # Update allocation
DELETE /:tripId/allocations/:id          # Delete allocation
```

### 3. Permission Requirements

All endpoints require RBAC permission: `sales-bookings:trip:[action]`

Actions: `read`, `write`, `edit`, `delete`

### 4. Testing with Postman

1. Import: `Viaggio-Ferry-Trip-Management-API.postman_collection.json`
2. Set variables:
   - `base_url`: Your API URL
   - `ship_id`: Valid ship ObjectId
   - `port_id_1`: Departure port ObjectId
   - `port_id_2`: Arrival port ObjectId
   - `partner_id`: Valid partner ObjectId
3. Run requests in order (create trip first, then allocations)

---

## Key Workflows

### Workflow 1: Create Trip with Availability

```javascript
// 1. POST /api/trips with ship and ports
{
  "tripName": "Mumbai - Goa",
  "tripCode": "MG001",
  "ship": "60d5ec49c1234567890ab001",
  "departurePort": "60d5ec49c1234567890ab002",
  "arrivalPort": "60d5ec49c1234567890ab003",
  "departureDateTime": "2025-03-15T08:00:00Z",
  "arrivalDateTime": "2025-03-15T16:00:00Z"
}

// Response includes:
// - Created trip with status "SCHEDULED"
// - Auto-generated availabilities from ship capacities
// - Each availability type (PASSENGER, CARGO, VEHICLE)
```

### Workflow 2: Allocate Capacity to Partner

```javascript
// 1. Get trip availabilities
GET /api/trips/{{trip_id}}/availability

// 2. Allocate to partner
POST /api/trips/{{trip_id}}/allocations
{
  "partner": "60d5ec49c1234567890ab100",
  "allocations": [
    {
      "availabilityId": "60d5ec49c1234567890ab020",
      "quantity": 50
    }
  ]
}

// Response: Created allocation tracking reserved seats
```

### Workflow 3: Update Trip Status

```javascript
// Change trip from SCHEDULED to OPEN
PUT /api/trips/{{trip_id}}
{
  "status": "OPEN"
}

// Trip now open for bookings
```

### Workflow 4: Manage Remaining Capacity

```javascript
// Get detailed availability with remaining capacity
GET /api/trips/{{trip_id}}/availability

// Response shows:
// - totalCapacity: 500 (from ship)
// - bookedQuantity: 100 (actual bookings)
// - remainingCapacity: 350 (500 - 100 - 50 allocated)
```

---

## Common Scenarios

### Scenario 1: Booking Flow

```
1. Partner A allocated 100 seats
2. Partner B allocated 50 seats
3. Remaining for others: 350 seats

Total = 500 (ship capacity)
Allocated = 150
Remaining = 350
```

### Scenario 2: Capacity Validation

```javascript
// Try to allocate 200 seats when only 150 available
// System will return 400 error:
// "Allocation exceeds capacity. Total: 500, Allocated: 150, Requested: 200"
```

### Scenario 3: Trip Edit Restrictions

```javascript
// Cannot change ship if allocations exist
PUT /api/trips/{{trip_id}}
{ "ship": "different_ship_id" }
// Error: "Cannot change ship. Agent allocations exist."

// Cannot edit if COMPLETED
// Error: "Cannot edit completed trips"
```

---

## Data Validation

### Trip Creation Validates
- ✅ tripName and tripCode required and unique
- ✅ Ship exists and is Active
- ✅ Ports exist and belong to company
- ✅ departureDateTime < arrivalDateTime
- ✅ boardingClosingDate <= departureDateTime
- ✅ All dates are valid ISO 8601

### Allocation Validates
- ✅ Partner exists and belongs to company
- ✅ No duplicate allocations per partner per trip
- ✅ Requested quantity <= available capacity
- ✅ Sum of all allocations <= totalCapacity

---

## Troubleshooting

### Problem: "Trip code already exists"
**Solution:** Use a unique tripCode for your company

### Problem: "Ship not found or inactive"
**Solution:** Verify ship exists, belongs to your company, and status = "Active"

### Problem: "Allocation exceeds capacity"
**Solution:** Check remaining capacity with GET /availability, reduce allocation quantity

### Problem: "Cannot change ship - allocations exist"
**Solution:** Delete allocations first, then update ship, then recreate allocations

### Problem: "User does not have permission"
**Solution:** Verify user has access group with sales-bookings:trip:[action] permission

---

## Performance Tips

1. **Pagination** - Use `?page=1&limit=10` for large datasets
2. **Filtering** - Filter by status/dates to reduce result set
3. **Indexes** - System has compound indexes on:
   - (company, tripCode) - for unique checks
   - (company, trip) - for availability queries
   - (trip, partner) - for allocation lookups
4. **Caching** - Cache trip availability as it doesn't change frequently

---

## Security Considerations

1. **Company Scoping** - All operations verified against user's company
2. **Permission Checks** - RBAC enforced on every endpoint
3. **Soft Delete** - Data preserved for audit trail
4. **User Tracking** - createdBy/updatedBy tracks all changes
5. **Input Validation** - All fields validated before processing

---

## Architecture Decisions

### Why Auto-Generated Availability?
- Ensures consistency between trip capacity and ship specs
- Automatically creates records during trip creation
- Reduces manual data entry errors
- One source of truth (ship capacity)

### Why Separate Models?
- **Trip** - Core trip information
- **TripAvailability** - Denormalized for fast capacity lookups
- **TripAgentAllocation** - Efficient allocation tracking

### Why Soft Delete?
- Preserves audit trail
- Allows data recovery
- Supports analytics on historical data

---

## Next Steps

1. ✅ Deploy models to database
2. ✅ Start using API endpoints
3. ✅ Import Postman collection for testing
4. ✅ Integrate with booking system
5. ✅ Set up notifications for allocations
6. ✅ Monitor capacity usage

---

## Support

For issues:
1. Check `TRIP_MANAGEMENT_API_DOCS.md` for endpoint details
2. Review error messages in response
3. Verify user permissions and company scope
4. Check validation middleware for input requirements
5. Review business rules in implementation guide

---

## API Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "trip": { /* trip data */ },
    "availabilities": [ /* availability records */ ]
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed; departureDateTime must be before arrivalDateTime"
}
```

### List Response with Pagination
```json
{
  "success": true,
  "message": "Trips retrieved successfully",
  "data": [ /* array of trips */ ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Code Quality

All code includes:
- ✅ JSDoc comments for functions
- ✅ Input validation at middleware layer
- ✅ Error handling with descriptive messages
- ✅ Proper HTTP status codes
- ✅ Transaction support for atomic operations
- ✅ Audit fields (createdBy, updatedBy)
- ✅ Soft delete capability

---

## Version Information

- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT with permission middleware
- **Architecture:** MVC with Services layer
- **Module:** sales-bookings
- **Submodule:** trip
