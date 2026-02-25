# Trip Management - Developer Quick Reference

## 📋 Core Files at a Glance

### Models
```
src/models/Trip.js                      - Trip entity with audit & status tracking
src/models/TripAvailability.js          - Capacity tracking per availability type
src/models/TripAgentAllocation.js       - Partner allocations with quantity breakdown
```

### Business Logic
```
src/services/tripService.js             - All validation, capacity calc, ship verification
```

### API Layer
```
src/controllers/tripController.js       - Trip CRUD + availability endpoint
src/controllers/allocationController.js - Allocation CRUD
src/middleware/tripValidationMiddleware.js - Input validation
src/routes/tripRoutes.js                - Route definitions with RBAC
```

---

## 🔄 Common Workflows

### Creating a Trip
```javascript
// POST /api/trips
{
  "tripName": "Morning Service",
  "tripCode": "MS001",
  "ship": "shipId",
  "departurePort": "portId1",
  "arrivalPort": "portId2",
  "departureDateTime": "2024-03-15T08:00:00Z",
  "arrivalDateTime": "2024-03-15T14:00:00Z",
  "bookingOpeningDate": "2024-02-15T00:00:00Z",
  "bookingClosingDate": "2024-03-14T23:59:59Z"
}

// AUTO: TripAvailability records created from Ship capacities
// Result: Trip + 3-10 Availability records created
```

### Allocating Capacity to Partners
```javascript
// POST /api/trips/{tripId}/allocations
{
  "partner": "partnerId",
  "allocations": [
    {
      "availabilityId": "availabilityId1",
      "quantity": 50  // 50 passenger seats allocated to partner
    }
  ]
}

// VALIDATION:
// - availabilityId must exist and belong to trip
// - quantity <= remainingCapacity
// - sum(all partner allocations) <= totalCapacity
```

### Getting Trip Availability
```javascript
// GET /api/trips/{tripId}/availability
// Returns all availability records with current capacity status
{
  "availabilityType": "PASSENGER",
  "cabinId": "cabinId",
  "totalCapacity": 200,
  "bookedQuantity": 45,
  "remainingCapacity": 105  // 200 - 45 - 50(allocated)
}
```

### Listing Trips with Filters
```javascript
// GET /api/trips?page=1&limit=10&status=OPEN&departurePort=portId&startDate=2024-03-01&endDate=2024-03-31

// Query Params:
// page, limit        - Pagination
// search             - tripName or tripCode (case-insensitive)
// status             - Filter by trip status
// departurePort      - Filter by departure
// arrivalPort        - Filter by arrival
// startDate, endDate  - Departure date range
```

---

## ⚠️ Key Constraints

| Constraint | Rule | Error |
|-----------|------|-------|
| **Date Validation** | departureDateTime < arrivalDateTime | 400 Bad Request |
| **Booking Window** | bookingOpeningDate <= bookingClosingDate | 400 Bad Request |
| **Boarding Window** | boardingClosingDate <= departureDateTime | 400 Bad Request |
| **Ship Availability** | status must be "Active", isDeleted false | 404 Not Found |
| **Allocation Limit** | Cannot exceed totalCapacity | 400 Bad Request |
| **Ship Change** | Not allowed if allocations exist | 400 Bad Request |
| **Trip Edit** | Not allowed if status = COMPLETED | 400 Bad Request |
| **Trip Delete** | Not allowed if allocations exist | 400 Bad Request |

---

## 🧮 Capacity Calculation

```
remainingCapacity = totalCapacity - bookedQuantity - totalAllocatedToAgents

Example:
- totalCapacity = 200 passengers
- bookedQuantity = 45 (direct bookings)
- Partner A allocated: 50
- Partner B allocated: 30
- remainingCapacity = 200 - 45 - (50 + 30) = 75
```

---

## 🛡️ RBAC Permissions

```javascript
// All trip endpoints require these permissions:

"sales-bookings" module
└── "trip" submodule
    ├── "read"   - GET endpoints
    ├── "write"  - POST endpoints (create)
    ├── "edit"   - PUT endpoints (update)
    └── "delete" - DELETE endpoints

// Example:
checkPermission("sales-bookings", "trip", "read")   // GET /api/trips
checkPermission("sales-bookings", "trip", "write")  // POST /api/trips
checkPermission("sales-bookings", "trip", "edit")   // PUT /api/trips/:id
checkPermission("sales-bookings", "trip", "delete") // DELETE /api/trips/:id
```

---

## 📊 Trip Status Flow

```
SCHEDULED ─→ OPEN ─→ CLOSED ─→ COMPLETED
     ↓
  CANCELLED (from any state)

Allowed Status Transitions:
- Create: Always starts as SCHEDULED
- Edit: Can change to any status (except COMPLETED cannot be edited)
- Delete: Cannot delete if allocations exist
```

---

## 🔍 Availability Types

| Type | Source | Example | Unit |
|------|--------|---------|------|
| PASSENGER | Ship.passengerCapacity[] | Cabin seats | Seats |
| CARGO | Ship.cargoCapacity[] | Cargo spots | Spots |
| VEHICLE | Ship.vehicleCapacity[] | Vehicle spots | Spots |

---

## 📝 Response Format (All Endpoints)

```javascript
{
  success: true,
  message: "Operation successful",
  data: { /* entity or array */ },
  pagination: {    // Only in list endpoints
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10
  }
}
```

---

## 🚨 Common Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| "Company ID is required" | 400 | Missing middleware context | Check authentication |
| "Invalid ship ID format" | 400 | Invalid ObjectId | Verify ship ID |
| "Ship not found..." | 404 | Ship doesn't exist | Create/verify ship |
| "departureDateTime < arrivalDateTime" | 400 | Invalid date range | Swap dates |
| "Cannot over-allocate..." | 400 | Allocation exceeds capacity | Reduce quantity |
| "Cannot change ship..." | 400 | Allocations exist | Delete allocations first |
| "Cannot edit completed trips" | 400 | Trip status is COMPLETED | Cannot modify |

---

## 🔗 Important Relations

```
Trip
├── ship → Ship (required)
├── departurePort → Port (required)
├── arrivalPort → Port (required)
├── promotion → Promotion (optional)
├── tripReport → TripReport (optional)
└── TripAvailability[]
    ├── trip → Trip
    ├── cabinId → Cabin
    └── TripAgentAllocation[]
        ├── trip → Trip
        └── partner → Partner (Agent)
```

---

## 📌 Service Layer Methods

### tripService.js

```javascript
// Validation
validateTripDates(tripData)              // Throws on invalid dates
validateShip(shipId, companyId)          // Returns ship or throws
validatePort(portId, companyId)          // Returns port or throws
validateTripEdit(trip, updates)          // Throws if edit not allowed
validateCanDeleteTrip(tripId)            // Throws if cannot delete

// Capacity
getTotalAllocatedQuantity(availabilityId) // Sum of allocations
calculateRemainingCapacity(availability)  // Capacity - booked - allocated
updateRemainingCapacity(availabilityId)   // Updates DB

// Utility
buildActor(user)                         // Creates audit trail object
autoGenerateTripAvailability(trip, ship, companyId) // Creates availability
```

---

## 🧪 Testing with Postman

1. Import `Viaggio-Ferry-Trip-Management-API.postman_collection.json`
2. Set environment variables:
   - `{{companyId}}` - Your company ObjectId
   - `{{authToken}}` - JWT token with trip permissions
3. Run requests in order:
   - Create Trip
   - Get Trip Availability
   - Create Allocation
   - Update Trip Status
   - List Trips (with filters)
   - Delete Allocation
   - Delete Trip

---

## 💾 Database Indexes

All these indexes are automatically created:

```javascript
// Trip
company + tripCode (unique)
company + departureDateTime
company + ship
company + departurePort + arrivalPort
company + status
company + isDeleted

// TripAvailability
company + trip
trip + cabinId
company + trip + availabilityType

// TripAgentAllocation
company + trip + partner (unique)
company + trip
trip + partner
```

---

## 🎯 Best Practices

1. **Always filter by company** - Multi-tenancy is critical
2. **Use soft delete** - Never permanently delete trips
3. **Validate dates first** - Prevents cascade errors
4. **Check capacity before allocating** - Validates business rules
5. **Audit changes** - createdBy/updatedBy tracks all changes
6. **Use pagination** - Never fetch all records at once
7. **Handle errors gracefully** - Return meaningful error messages
8. **Test with Postman** - Use provided collection for validation

---

## 📞 Support

For issues or questions, see:
- `TRIP_MANAGEMENT_API_DOCS.md` - Complete API reference
- `QUICK_START.md` - Step-by-step setup
- `DEPLOYMENT_NOTES.md` - Deployment procedures
- `REQUIREMENTS_VERIFICATION.md` - Requirements checklist
