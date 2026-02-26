# Trip Ticketing Rules Implementation Guide

## Architecture Overview

The Trip Ticketing Rules feature enables dynamic assignment of ticketing policies to individual trips. This feature is separate from the Trip model itself to maintain data normalization and flexibility.

---

## Files Added

### 1. Models

#### `src/models/TripTicketRule.js`
- Defines the TripTicketRule schema
- Fields: company, trip, ruleType, ticketingRule, isActive, isDeleted, createdBy, updatedBy, timestamps
- Indexes for performance and uniqueness constraints
- Pre-find middleware to auto-exclude deleted records

**Key Design Decision:** Separate schema (not embedded) allows:
- Flexible rule assignments
- Easy update/deletion without modifying trips
- Efficient querying of rules per trip
- Proper normalization

---

### 2. Services

#### `src/services/tripTicketRuleService.js`
Contains all business logic:

**Functions:**
1. `validateTripExists()` - Ensures trip exists and belongs to company
2. `validateTicketingRuleExists()` - Ensures rule exists, is active, and belongs to company
3. `validateRuleTypeMatch()` - Ensures ruleType matches ticketing rule
4. `checkDuplicateRuleType()` - Prevents multiple rules of same type per trip
5. `checkTripHasBookings()` - Checks PassengerBooking, CargoBooking, VehicleBooking
6. `createTripTicketRule()` - Creates new assignment with all validations
7. `updateTripTicketRule()` - Updates assignment with booking check
8. `deleteTripTicketRule()` - Soft deletes assignment
9. `getTripTicketRules()` - Retrieves rules with populated details

**All functions enforce:**
- Multi-tenancy (company-scoped)
- Booking constraints
- Soft delete consistency
- Audit trail tracking

---

### 3. Middleware

#### `src/middleware/tripTicketRuleValidationMiddleware.js`

Three validators:

1. **validateCreatePayload**
   - Checks ruleType: required, valid enum (VOID, REFUND, REISSUE)
   - Checks ticketingRule: required, non-empty string

2. **validateUpdatePayload**
   - Checks at least one field provided
   - Validates each field independently
   - Supports partial updates

3. **validatePathParams**
   - Validates tripId present
   - Validates id present (for PUT/DELETE)

---

### 4. Controller

#### `src/controllers/tripTicketRuleController.js`

Four endpoints:

1. **assignRuleToTrip()** - POST /trips/:tripId/ticketing-rules
2. **updateTripRule()** - PUT /trips/:tripId/ticketing-rules/:id
3. **removeTripRule()** - DELETE /trips/:tripId/ticketing-rules/:id
4. **getTripRules()** - GET /trips/:tripId/ticketing-rules

All controllers:
- Extract companyId and user from req
- Call service layer
- Return standardized JSON response

---

### 5. Routes

#### `src/routes/tripRoutes.js` (Updated)

Added 4 new endpoints:

```javascript
// POST /api/trips/:tripId/ticketing-rules
router.post(
  "/:tripId/ticketing-rules",
  checkPermission("sales-bookings", "trip", "write"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  tripTicketRuleValidationMiddleware.validateCreatePayload,
  assignRuleToTrip
)

// GET /api/trips/:tripId/ticketing-rules
router.get(
  "/:tripId/ticketing-rules",
  checkPermission("sales-bookings", "trip", "read"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  getTripRules
)

// PUT /api/trips/:tripId/ticketing-rules/:id
router.put(
  "/:tripId/ticketing-rules/:id",
  checkPermission("sales-bookings", "trip", "edit"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  tripTicketRuleValidationMiddleware.validateUpdatePayload,
  updateTripRule
)

// DELETE /api/trips/:tripId/ticketing-rules/:id
router.delete(
  "/:tripId/ticketing-rules/:id",
  checkPermission("sales-bookings", "trip", "delete"),
  tripTicketRuleValidationMiddleware.validatePathParams,
  removeTripRule
)
```

**Middleware Chain:**
1. RBAC check (checkPermission)
2. Path parameter validation
3. Payload validation (if applicable)
4. Controller

---

## RBAC Integration

All endpoints use existing RBAC permissions:

- **Write** (assign, create) → `checkPermission("sales-bookings", "trip", "write")`
- **Edit** (update) → `checkPermission("sales-bookings", "trip", "edit")`
- **Delete** → `checkPermission("sales-bookings", "trip", "delete")`
- **Read** (get) → `checkPermission("sales-bookings", "trip", "read")`

---

## Validation Rules Implemented

### 1. Trip Validation
```javascript
const trip = await Trip.findOne({
  _id: tripId,
  company: companyId,
  isDeleted: false,
})
```

### 2. TicketingRule Validation
```javascript
const rule = await TicketingRule.findOne({
  _id: ruleId,
  company: companyId,
  isDeleted: false,
})
```

### 3. Rule Type Match
```javascript
if (ruleType !== ticketingRule.ruleType) {
  throw createHttpError(400, "Rule type mismatch")
}
```

### 4. Duplicate Prevention
```javascript
const existing = await TripTicketRule.findOne({
  trip: tripId,
  ruleType: ruleType,
  isDeleted: false,
})
```

### 5. Booking Constraints
```javascript
// Checks all three booking types
const hasBookings = await checkTripHasBookings(tripId, companyId)
if (hasBookings) {
  throw createHttpError(400, "Cannot modify ticket rules after bookings exist")
}
```

---

## Data Flow Examples

### Create Workflow
```
POST /api/trips/trip_123/ticketing-rules
  ↓
Auth Check (RBAC write)
  ↓
Path Validation (tripId)
  ↓
Payload Validation (ruleType, ticketingRule)
  ↓
Controller (assignRuleToTrip)
  ↓
Service (createTripTicketRule)
  ├─ Validate trip exists
  ├─ Validate ticketing rule exists
  ├─ Check rule type match
  ├─ Check duplicate ruleType
  ├─ Check bookings exist
  └─ Create record
  ↓
Response 201 Created
```

### Update Workflow
```
PUT /api/trips/trip_123/ticketing-rules/rule_456
  ↓
Auth Check (RBAC edit)
  ↓
Path Validation (tripId, ruleId)
  ↓
Payload Validation (update fields)
  ↓
Controller (updateTripRule)
  ↓
Service (updateTripTicketRule)
  ├─ Validate trip exists
  ├─ Check bookings exist
  ├─ Get existing rule
  ├─ Validate new rule if provided
  ├─ Check duplicate if ruleType changed
  └─ Update record
  ↓
Response 200 OK
```

### Delete Workflow
```
DELETE /api/trips/trip_123/ticketing-rules/rule_456
  ↓
Auth Check (RBAC delete)
  ↓
Path Validation (tripId, ruleId)
  ↓
Controller (removeTripRule)
  ↓
Service (deleteTripTicketRule)
  ├─ Validate trip exists
  ├─ Check bookings exist
  └─ Set isDeleted = true
  ↓
Response 200 OK
```

---

## Testing Checklist

### Unit Tests Required
- [ ] Trip validation (exists, belongs to company)
- [ ] TicketingRule validation (exists, active, belongs to company)
- [ ] Rule type match validation
- [ ] Duplicate rule type prevention
- [ ] Booking existence check
- [ ] Soft delete functionality
- [ ] Audit trail tracking

### Integration Tests Required
- [ ] Create with valid data
- [ ] Create with invalid trip
- [ ] Create with invalid rule
- [ ] Create with rule type mismatch
- [ ] Create duplicate rule type
- [ ] Create when bookings exist
- [ ] Update assignment
- [ ] Delete assignment
- [ ] Get all rules for trip

### Postman Tests
- [ ] All 4 CRUD operations
- [ ] 6 validation test cases (see Postman collection)

---

## Performance Considerations

### Indexes
```javascript
tripTicketRuleSchema.index({ company: 1, trip: 1 })
tripTicketRuleSchema.index({ trip: 1, ruleType: 1 }, { unique: true })
tripTicketRuleSchema.index({ company: 1, isDeleted: 1 })
```

### Query Optimization
- Use `.lean()` when not modifying documents
- Populate ticketingRule with selected fields only
- Auto-filter deleted records at model level

### Booking Check Optimization
- Query only non-cancelled bookings
- Use separate queries for each booking type (or consider compound query)
- Could be optimized with caching if performance needed

---

## Security Considerations

### Multi-Tenancy
- All queries filtered by company
- Cross-company access prevented at database level
- Company ID extracted from authenticated user

### RBAC
- All endpoints protected by permission checks
- Permissions enforced at controller level
- Three permission types: read, write, edit, delete

### Input Validation
- All inputs validated before processing
- Enum validation for ruleType
- ObjectId format validation
- Required field checks

### Soft Delete
- Records never permanently deleted
- Audit trail maintained for compliance
- Auto-filtered at model level

---

## Postman Collection

File: `Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json`

Contains:
- 4 CRUD operations
- 6 validation test cases
- Pre-configured variables
- Bearer token auth

---

## Documentation Files

1. **TRIP_TICKETING_RULES_API_DOCS.md** - Complete API reference
2. **TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md** - This file
3. **Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json** - Test collection

---

## Future Enhancements

1. **Batch Operations**
   - Assign same rule to multiple trips
   - Update multiple rules at once

2. **Rule Templates**
   - Create rule templates for common scenarios
   - Apply templates to trips

3. **Historical Tracking**
   - Audit log for all rule changes
   - Ability to view rule history

4. **Advanced Search**
   - Filter rules by date range
   - Search by rule name or conditions

5. **Performance Optimization**
   - Cache booking count per trip
   - Pre-compute available rules per trip

