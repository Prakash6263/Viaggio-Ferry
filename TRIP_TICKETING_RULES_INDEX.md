# Trip Ticketing Rules - Complete Index

## Project Overview

The Trip Ticketing Rules feature enables dynamic assignment of ticketing policies to individual ferry trips using a separate schema model. This allows flexible rule management without modifying the Trip model directly.

---

## Quick Navigation

### For Implementation
- **Start Here:** [Implementation Guide](./TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md)
- **Architecture:** See "Architecture Overview" section
- **Data Flow:** See "Data Flow Examples" section
- **Testing:** See "Testing Checklist" section

### For API Usage
- **Start Here:** [API Documentation](./TRIP_TICKETING_RULES_API_DOCS.md)
- **Endpoints:** See "Endpoints" section
- **Examples:** See "Example Workflow" section
- **Errors:** See "Error Handling" section

### For Quick Testing
- **Start Here:** [Quick Start Guide](./TRIP_TICKETING_RULES_QUICK_START.md)
- **Setup:** See "5-Minute Setup" section
- **cURL Examples:** See "Quick Test with cURL" section
- **Postman:** See "Using Postman" section

### For Project Status
- **Start Here:** [Delivery Summary](./TRIP_TICKETING_RULES_DELIVERY.md)
- **Deliverables:** See "Deliverables" section
- **Coverage:** See "Requirements Coverage" section
- **Checklist:** See "Deployment Checklist" section

---

## File Structure

### Source Code (5 Files)

```
src/
├── models/
│   └── TripTicketRule.js                    # Database schema
├── services/
│   └── tripTicketRuleService.js             # Business logic
├── controllers/
│   └── tripTicketRuleController.js          # HTTP handlers
├── middleware/
│   └── tripTicketRuleValidationMiddleware.js # Input validation
└── routes/
    └── tripRoutes.js                        # Updated with new endpoints
```

### Documentation (4 Files)

```
docs/
├── TRIP_TICKETING_RULES_API_DOCS.md                      # 388 lines
├── TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md          # 382 lines
├── TRIP_TICKETING_RULES_QUICK_START.md                   # 249 lines
└── TRIP_TICKETING_RULES_DELIVERY.md                      # 354 lines
```

### Testing (1 File)

```
tests/
└── Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json # 352 lines
```

---

## Feature Breakdown

### Model: TripTicketRule

**Purpose:** Store associations between Trips and TicketingRules

**Fields:**
- `company` - Company ownership (ObjectId, indexed)
- `trip` - Associated trip (ObjectId ref, indexed)
- `ruleType` - Rule type (enum: VOID, REFUND, REISSUE)
- `ticketingRule` - TicketingRule reference (ObjectId ref)
- `isActive` - Active status (Boolean, default true)
- `isDeleted` - Soft delete flag (Boolean, default false)
- `createdBy` - Creator info (Object with id, name, type, layer)
- `updatedBy` - Last updater info (Object with id, name, type, layer)
- `timestamps` - Created and updated timestamps

**Indexes:**
1. `{ company: 1, trip: 1 }` - Find rules by company and trip
2. `{ trip: 1, ruleType: 1 }` - Unique constraint per rule type per trip
3. `{ company: 1, isDeleted: 1 }` - Filter deleted by company

### Service: tripTicketRuleService

**9 Functions:**

1. `buildActor()` - Build audit trail actor object
2. `validateTripExists()` - Verify trip exists and belongs to company
3. `validateTicketingRuleExists()` - Verify rule exists, is active, belongs to company
4. `validateRuleTypeMatch()` - Ensure ruleType matches TicketingRule
5. `checkDuplicateRuleType()` - Prevent duplicate types per trip
6. `checkTripHasBookings()` - Check for any bookings on trip
7. `createTripTicketRule()` - Create with all validations
8. `updateTripTicketRule()` - Update with booking check
9. `deleteTripTicketRule()` - Soft delete with audit trail
10. `getTripTicketRules()` - Get all rules with populated details

### Controller: tripTicketRuleController

**4 Endpoints:**

1. `POST /api/trips/:tripId/ticketing-rules` → `assignRuleToTrip()`
2. `GET /api/trips/:tripId/ticketing-rules` → `getTripRules()`
3. `PUT /api/trips/:tripId/ticketing-rules/:id` → `updateTripRule()`
4. `DELETE /api/trips/:tripId/ticketing-rules/:id` → `removeTripRule()`

### Middleware: tripTicketRuleValidationMiddleware

**3 Validators:**

1. `validateCreatePayload()` - Validates POST body
2. `validateUpdatePayload()` - Validates PUT body
3. `validatePathParams()` - Validates URL parameters

### Routes: tripRoutes (Updated)

**New Endpoints:**

```javascript
POST   /api/trips/:tripId/ticketing-rules
GET    /api/trips/:tripId/ticketing-rules
PUT    /api/trips/:tripId/ticketing-rules/:id
DELETE /api/trips/:tripId/ticketing-rules/:id
```

---

## API Endpoints

### Assign Rule
```
POST /api/trips/{tripId}/ticketing-rules
Permission: sales-bookings:trip:write
Body: { ruleType: "REFUND", ticketingRule: "rule_id" }
Response: 201 Created { success: true, data: {...} }
```

### Get Rules
```
GET /api/trips/{tripId}/ticketing-rules
Permission: sales-bookings:trip:read
Response: 200 OK { success: true, data: [...], total: n }
```

### Update Rule
```
PUT /api/trips/{tripId}/ticketing-rules/{id}
Permission: sales-bookings:trip:edit
Body: { isActive: false } (optional fields)
Response: 200 OK { success: true, data: {...} }
```

### Delete Rule
```
DELETE /api/trips/{tripId}/ticketing-rules/{id}
Permission: sales-bookings:trip:delete
Response: 200 OK { success: true }
```

---

## Validation Rules

### 1. Trip Validation
- Trip must exist in database
- Trip must belong to authenticated user's company
- Trip must not be soft-deleted

### 2. TicketingRule Validation
- TicketingRule must exist
- TicketingRule must be active (isActive: true)
- TicketingRule must belong to same company
- TicketingRule must not be soft-deleted

### 3. Rule Type Match
- Requested ruleType must exactly match TicketingRule.ruleType
- Prevents assigning wrong policy type to trip
- Error: "Rule type mismatch"

### 4. Duplicate Prevention
- Only one rule per ruleType per trip allowed
- Unique index on (trip, ruleType)
- Error: "Duplicate rule type not allowed for trip"

### 5. Booking Constraint
- Cannot assign/update/delete rules if trip has bookings
- Checks PassengerBooking, CargoBooking, VehicleBooking
- Only counts non-cancelled bookings
- Error: "Cannot modify ticket rules after bookings exist"

---

## Response Format

### Success (All Operations)
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* response data */ },
  "total": 1  // for list endpoints only
}
```

### Error (All Operations)
```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes
- 200 OK - Request succeeded
- 201 Created - Resource created
- 400 Bad Request - Validation error
- 403 Forbidden - Permission denied
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error

---

## Multi-Tenancy & Security

### Multi-Tenancy
- All queries filtered by company
- Cross-company access prevented at database
- Company extracted from authenticated user
- No company parameter in request body

### RBAC
- read - Allows GET operations
- write - Allows POST operations
- edit - Allows PUT operations
- delete - Allows DELETE operations

### Soft Delete
- Records marked with isDeleted: true
- Auto-filtered at model level
- No permanent deletion
- Maintains audit trail

### Audit Trail
```json
{
  "createdBy": {
    "id": "user_id",
    "name": "user@email.com",
    "type": "user",
    "layer": "admin"
  },
  "updatedBy": {...},
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## Performance Optimization

### Indexes
- Compound index on company + trip
- Unique constraint on trip + ruleType
- Separate index on company + isDeleted

### Query Optimization
- Lean queries where applicable
- Selective field population
- Auto-exclude deleted records

### Booking Check
- Separate queries per booking type
- Only checks non-cancelled bookings
- Can be cached if performance needed

---

## Testing

### Postman Collection
File: `Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json`

**Contains:**
- 4 CRUD operation requests
- 6 validation test cases
- Pre-configured variables
- Bearer token auth

### Test Cases

1. **Duplicate ruleType** - Should reject duplicate type per trip
2. **Rule Type Mismatch** - Should reject if types don't match
3. **Different Company** - Should reject cross-company rule
4. **After Booking** - Should reject if bookings exist
5. **Invalid Type** - Should reject invalid ruleType value
6. **Missing Field** - Should reject missing required fields

---

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Trip not found" | Invalid trip ID or wrong company | Verify trip ID exists in your company |
| "Ticketing rule not found" | Invalid rule ID or wrong company | Verify rule ID exists in your company |
| "Rule type mismatch" | ruleType doesn't match rule's type | Check TicketingRule.ruleType value |
| "Duplicate rule type" | Type already assigned to trip | Delete or update existing rule first |
| "Cannot modify after bookings" | Trip has existing bookings | Cannot modify rules for trip with bookings |
| "Invalid ruleType" | ruleType not VOID/REFUND/REISSUE | Use one of the valid enum values |
| "Missing required field" | ticketingRule field missing | Provide ticketingRule ID |

---

## Workflow Examples

### Assign New Rule
```
1. Get trip ID
2. Get available ticketing rules
3. Choose rule (get its ID)
4. POST /api/trips/:tripId/ticketing-rules
5. Provide ruleType and ticketingRule ID
```

### List Current Rules
```
1. Get trip ID
2. GET /api/trips/:tripId/ticketing-rules
3. Returns all assigned rules with details
```

### Update Rule
```
1. Get rule ID (from list endpoint)
2. PUT /api/trips/:tripId/ticketing-rules/:id
3. Provide fields to update (isActive, etc.)
```

### Remove Rule
```
1. Get rule ID (from list endpoint)
2. DELETE /api/trips/:tripId/ticketing-rules/:id
3. Rule soft-deleted
```

---

## Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| TRIP_TICKETING_RULES_API_DOCS.md | Complete API reference | Developers using API |
| TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md | Architecture & design | Developers implementing |
| TRIP_TICKETING_RULES_QUICK_START.md | Quick setup guide | Everyone starting |
| TRIP_TICKETING_RULES_DELIVERY.md | Project completion status | Project managers |
| TRIP_TICKETING_RULES_INDEX.md | Navigation & overview | Everyone (this file) |

---

## File Locations

```
/vercel/share/v0-project/
├── src/models/TripTicketRule.js
├── src/services/tripTicketRuleService.js
├── src/controllers/tripTicketRuleController.js
├── src/middleware/tripTicketRuleValidationMiddleware.js
├── src/routes/tripRoutes.js (updated)
├── TRIP_TICKETING_RULES_API_DOCS.md
├── TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md
├── TRIP_TICKETING_RULES_QUICK_START.md
├── TRIP_TICKETING_RULES_DELIVERY.md
├── TRIP_TICKETING_RULES_INDEX.md (this file)
└── Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json
```

---

## Next Steps

1. Review this index for overview
2. Read Quick Start Guide for 5-minute setup
3. Check API Documentation for endpoint details
4. Review Implementation Guide for architecture
5. Import Postman collection for testing
6. Run validation tests
7. Integrate with booking system
8. Deploy to staging
9. Integration testing
10. Deploy to production

---

## Support

For questions or issues:
1. Check API Documentation for endpoint details
2. Check Quick Start for common errors
3. Review Postman collection for examples
4. Check Implementation Guide for architecture

---

**Last Updated:** 2024-01-15
**Status:** Production Ready
**Version:** 1.0

