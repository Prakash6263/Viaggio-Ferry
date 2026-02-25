# Trip Management System - Deployment Notes

## Summary

This document outlines all changes made to implement the complete Trip Management flow for the Viaggio Ferry backend sales-bookings module.

---

## Files Created

### 1. Models

#### `src/models/TripAvailability.js` ✨ NEW
- Auto-generated availability tracking for trips
- Three availability types: PASSENGER, CARGO, VEHICLE
- Fields: company, trip, availabilityType, cabinId, totalCapacity, bookedQuantity, remainingCapacity
- Indexes: (company, trip), (trip, cabinId), (company, trip, availabilityType)

#### `src/models/TripAgentAllocation.js` ✨ NEW
- Agent/partner allocation to trip capacity
- One allocation record per partner per trip
- Nested allocations array for multiple availability items
- Unique compound index: (company, trip, partner)

### 2. Services

#### `src/services/tripService.js` ✨ NEW
- Business logic layer with 10+ utility functions
- Trip date validation
- Ship and port validation
- Auto-generate availability from ship capacities
- Capacity calculation and update functions
- Edit and delete constraint validation
- Helper for building actor objects

### 3. Controllers

#### `src/controllers/tripController.js` ✨ NEW
- 6 endpoints for trip management:
  - createTrip (POST) - Creates trip + auto-generates availabilities
  - listTrips (GET) - List with pagination/filtering
  - getTripById (GET) - Full trip with availability details
  - updateTrip (PUT) - Edit with constraint validation
  - deleteTrip (DELETE) - Soft delete with cascade
  - getTripAvailability (GET) - Availability breakdown

#### `src/controllers/allocationController.js` ✨ NEW
- 4 endpoints for allocation management:
  - createAllocation (POST) - Allocate capacity to partner
  - listAllocations (GET) - List all allocations for trip
  - updateAllocation (PUT) - Modify quantities
  - deleteAllocation (DELETE) - Remove allocation

### 4. Middleware

#### `src/middleware/tripValidationMiddleware.js` ✨ NEW
- validateTripPayload - Trip field validation
- validateAllocationPayload - Allocation structure validation
- validatePaginationParams - Pagination boundary checks
- validateDateRangeParams - Date range validation

### 5. Routes

#### `src/routes/tripRoutes.js` ✨ NEW
- 10 route definitions with permission middleware
- Trip CRUD endpoints
- Allocation management endpoints
- All endpoints have checkPermission("sales-bookings", "trip", action)

### 6. Documentation

#### `TRIP_MANAGEMENT_API_DOCS.md` ✨ NEW
- Comprehensive API reference (700+ lines)
- All endpoint specifications with examples
- Request/response formats
- Error handling guide
- Data models documentation
- Business rules and constraints
- Best practices

#### `TRIP_MANAGEMENT_IMPLEMENTATION.md` ✨ NEW
- Implementation architecture overview
- Key features explained
- Integration points
- Testing & deployment checklist
- Production considerations
- Future enhancement ideas

#### `QUICK_START.md` ✨ NEW
- Getting started guide
- Common workflows
- Testing scenarios
- Troubleshooting tips
- Performance optimization

#### `Viaggio-Ferry-Trip-Management-API.postman_collection.json` ✨ NEW
- Complete Postman collection
- 12 request examples
- Pre-configured variables
- Request/response examples

---

## Files Modified

### `src/models/Trip.js` 🔄 UPDATED
**Changes:**
- Added TRIP_STATUS export with enum: SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED
- Added CreatorSchema for audit tracking
- Renamed `vessel` field to `ship` (specification requirement)
- Changed status enum from ["Scheduled", "In Progress", "Completed", "Cancelled"] to ["SCHEDULED", "OPEN", "CLOSED", "COMPLETED", "CANCELLED"]
- Added proper indexes as per specification
- Export both Trip model and TRIP_STATUS for use in controllers
- Added audit fields: createdBy, updatedBy

**Why Changed:**
- Aligned with specification requirements
- Improved audit trail tracking
- Better enum standardization
- Consistent naming (vessel → ship)

### `src/routes/index.js` 🔄 UPDATED
**Changes:**
```javascript
// Added import
const tripRoutes = require("./tripRoutes")

// Added registration
app.use("/api/trips", tripRoutes)
```

**Why Changed:**
- Register new trip management routes
- Make endpoints accessible at /api/trips

### `src/constants/rbac.js` 🔄 UPDATED
**Changes:**
- Added new submodule to "sales-bookings" module:
```javascript
{
  code: "trip",
  label: "Trip Management",
  allowedPermissions: ["read", "write", "edit", "delete"]
}
```

**Why Changed:**
- Enable RBAC permission checking for trip endpoints
- Support fine-grained access control (read/write/edit/delete)

---

## Architecture Overview

```
Request → Route (tripRoutes.js)
    ↓
Permission Middleware (checkPermission)
    ↓
Validation Middleware (tripValidationMiddleware)
    ↓
Controller (tripController.js / allocationController.js)
    ↓
Service (tripService.js)
    ↓
Model (Trip.js / TripAvailability.js / TripAgentAllocation.js)
    ↓
MongoDB Database
```

---

## Key Features Implemented

✅ **Trip Management**
- Create trips with auto-generated availability
- List with pagination and advanced filtering
- Get individual trip details with availability
- Update trip details with validation
- Delete trips with constraint checking
- View availability breakdown

✅ **Agent Allocations**
- Allocate capacity to partners
- List all allocations for a trip
- Update allocation quantities
- Delete allocations with capacity restoration

✅ **Capacity Management**
- Auto-generate availability from ship capacities
- Track remaining capacity in real-time
- Prevent over-allocation across partners
- Calculate available seats after allocations

✅ **Data Validation**
- Date validations (departure < arrival, boarding < departure)
- Ship and port existence checks
- Unique trip code per company
- Capacity boundary checks
- Allocation constraint validation

✅ **Multi-Tenancy**
- Company-scoped data
- User company verification
- Secure data isolation

✅ **Audit Trail**
- createdBy and updatedBy tracking
- Soft delete preservation
- Timestamp tracking

✅ **RBAC Integration**
- Permission-based access control
- Four action levels: read, write, edit, delete
- Proper error responses on permission denial

---

## Database Indexes

Created indexes for optimal query performance:

**Trip Model:**
- (company, tripCode) - unique
- (company, departureDateTime)
- (company, ship)
- (company, departurePort, arrivalPort)
- (company, status)
- (company, isDeleted)

**TripAvailability Model:**
- (company, trip)
- (trip, cabinId)
- (company, trip, availabilityType)

**TripAgentAllocation Model:**
- (company, trip, partner) - unique
- (company, trip)
- (trip, partner)

---

## Data Flow Examples

### Trip Creation Flow
```
1. POST /api/trips with ship ID
2. Validate: ship exists, is Active, belongs to company
3. Validate: all dates pass business rules
4. Create Trip document
5. Fetch Ship document to get capacity arrays
6. For each capacity item:
   - Create TripAvailability record
   - Set remainingCapacity = totalCapacity
7. Return trip + auto-generated availabilities
```

### Allocation Flow
```
1. POST /api/trips/:tripId/allocations with partner ID
2. Verify: partner exists, trip exists, no duplicate allocation
3. For each allocation item:
   - Verify availability belongs to trip
   - Calculate total allocated from all partners
   - Check: new allocation + existing <= totalCapacity
4. Create TripAgentAllocation document
5. For each availability affected:
   - Recalculate remainingCapacity
   - Update TripAvailability record
6. Return created allocation
```

### Capacity Calculation
```
remainingCapacity = totalCapacity - bookedQuantity - totalAllocatedToAgents

Example:
Ship has 500 passenger seats (totalCapacity)
Already 100 booked by customers (bookedQuantity)
Partners allocated 200 seats total (totalAllocatedToAgents)
Remaining = 500 - 100 - 200 = 200 seats available
```

---

## API Endpoints Summary

### Trip Management (6 endpoints)
| Method | Path | Permission | Action |
|--------|------|-----------|--------|
| POST | /api/trips | write | Create trip |
| GET | /api/trips | read | List trips |
| GET | /api/trips/:id | read | Get trip |
| PUT | /api/trips/:id | edit | Update trip |
| DELETE | /api/trips/:id | delete | Delete trip |
| GET | /api/trips/:tripId/availability | read | Get availability |

### Agent Allocation (4 endpoints)
| Method | Path | Permission | Action |
|--------|------|-----------|--------|
| POST | /api/trips/:tripId/allocations | write | Create allocation |
| GET | /api/trips/:tripId/allocations | read | List allocations |
| PUT | /api/trips/:tripId/allocations/:id | edit | Update allocation |
| DELETE | /api/trips/:tripId/allocations/:id | delete | Delete allocation |

---

## Testing Strategy

### Unit Testing Points
- Trip date validation rules
- Capacity calculation logic
- Ship/port validation
- Allocation constraint checking

### Integration Testing Points
- Trip creation with auto-generated availability
- Allocation creation and capacity updates
- Trip edit constraints
- Permission enforcement

### Test Data Needed
- Valid company ID
- Active ship with capacity arrays
- Multiple ports
- Multiple partners/agents

### Postman Collection
- 12 pre-configured requests
- Example payloads
- Variable setup guide
- Error scenario examples

---

## Deployment Steps

### Step 1: Deploy Models
- Deploy Trip.js changes
- Deploy TripAvailability.js (new)
- Deploy TripAgentAllocation.js (new)
- MongoDB auto-creates collections on first insert

### Step 2: Deploy Services
- Deploy tripService.js

### Step 3: Deploy Controllers
- Deploy tripController.js
- Deploy allocationController.js

### Step 4: Deploy Middleware
- Deploy tripValidationMiddleware.js

### Step 5: Deploy Routes
- Deploy tripRoutes.js (new)
- Update src/routes/index.js with registration

### Step 6: Deploy Configuration
- Update src/constants/rbac.js with trip submodule

### Step 7: Verify
- Test endpoints with Postman collection
- Verify permissions working
- Check database indexes created
- Validate soft delete functionality

---

## Rollback Plan

If issues occur:

1. **Revert models**: Comment out exports, keep old Trip model
2. **Revert routes**: Remove tripRoutes from index.js
3. **Disable endpoints**: Keep files but don't register routes
4. **Restore RBAC**: Remove trip submodule from rbac.js

---

## Monitoring & Logging

Recommended monitoring:
- Track API endpoint usage
- Monitor allocation conflicts
- Log capacity overage attempts
- Watch soft delete patterns
- Monitor permission denials

Log points implemented:
- All validation failures
- Database operation errors
- Permission check failures

---

## Performance Considerations

### Query Optimization
- Indexes on frequently queried fields
- Lean queries (select only needed fields)
- Pagination limits (max 100 per page)
- Denormalization of remainingCapacity

### Caching Opportunities
- Cache trip availability (changes rarely)
- Cache ship capacity data
- Cache port lists
- Cache partner lists

### Scalability
- Compound indexes support sharding
- Company scoping enables multi-tenancy
- Soft delete doesn't affect query performance
- Allocation queries are O(1) with indexes

---

## Security Measures

✅ **Implemented:**
- Company-level data isolation
- Permission-based access control
- Input validation on all fields
- SQL injection prevention (using Mongoose)
- User authentication via JWT
- Audit trail tracking
- Soft delete for data preservation

✅ **Recommended:**
- Rate limiting on API endpoints
- API key rotation
- Audit log retention policy
- Data encryption at rest
- HTTPS enforcement

---

## Future Enhancements

### Phase 2
- Booking integration (update bookedQuantity)
- Revenue tracking per allocation
- Availability calendar view
- Notification system

### Phase 3
- Bulk operations (create multiple trips)
- Trip template system
- Advanced filtering/search
- Analytics dashboard

### Phase 4
- Pricing engine integration
- Commission tracking
- Revenue optimization
- Forecast modeling

---

## Support & Documentation

### Documentation Files
- `TRIP_MANAGEMENT_API_DOCS.md` - Complete API reference
- `TRIP_MANAGEMENT_IMPLEMENTATION.md` - Architecture details
- `QUICK_START.md` - Quick reference guide
- `Viaggio-Ferry-Trip-Management-API.postman_collection.json` - Postman tests

### Code Documentation
- JSDoc comments on all functions
- Inline comments for complex logic
- Clear variable naming
- Error messages are descriptive

### Troubleshooting
- Check validation middleware output
- Review permission middleware logs
- Examine error response messages
- Verify request payload format

---

## Sign-Off

**Implementation Status:** ✅ COMPLETE

**All requirements implemented:**
- ✅ Trip model with all fields
- ✅ TripAvailability auto-generation
- ✅ TripAgentAllocation management
- ✅ Controllers with full CRUD
- ✅ Services layer with business logic
- ✅ Validation middleware
- ✅ Routes with permission checking
- ✅ RBAC configuration
- ✅ API documentation
- ✅ Postman collection
- ✅ Multi-tenancy support
- ✅ Soft delete implementation
- ✅ Audit trail

**Ready for:** Production deployment
