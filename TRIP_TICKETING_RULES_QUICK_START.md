# Trip Ticketing Rules - Quick Start Guide

## 5-Minute Setup

### Step 1: Verify Files Created

All files have been created in the following locations:

```
src/models/TripTicketRule.js                              ✓
src/services/tripTicketRuleService.js                     ✓
src/controllers/tripTicketRuleController.js               ✓
src/middleware/tripTicketRuleValidationMiddleware.js      ✓
src/routes/tripRoutes.js                                  ✓ (updated)
Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json ✓
TRIP_TICKETING_RULES_API_DOCS.md                          ✓
TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md             ✓
```

### Step 2: No Additional Installation Required

- All dependencies already installed
- Follows existing architecture patterns
- Uses existing middleware and utilities

### Step 3: Import the Model

The model is automatically discovered by MongoDB/Mongoose if routes are loaded.

---

## Quick Test with cURL

### 1. List Rules for a Trip

```bash
curl -X GET http://localhost:5000/api/trips/trip_id_here/ticketing-rules \
  -H "Authorization: Bearer your_token_here"
```

### 2. Assign a New Rule

```bash
curl -X POST http://localhost:5000/api/trips/trip_id_here/ticketing-rules \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleType": "REFUND",
    "ticketingRule": "ticketing_rule_id_here"
  }'
```

### 3. Update a Rule

```bash
curl -X PUT http://localhost:5000/api/trips/trip_id_here/ticketing-rules/rule_id_here \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### 4. Delete a Rule

```bash
curl -X DELETE http://localhost:5000/api/trips/trip_id_here/ticketing-rules/rule_id_here \
  -H "Authorization: Bearer your_token_here"
```

---

## Using Postman

1. Import the collection: `Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json`
2. Set variables:
   - `baseUrl`: http://localhost:5000
   - `authToken`: Your JWT token
   - `tripId`: Valid trip ID
   - `ticketingRuleId`: Valid ticketing rule ID
3. Run requests in order

---

## Response Format

All responses follow the standard format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "total": 1 // for list endpoints
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Common Errors and Solutions

### 1. "Trip not found"
- Verify tripId is correct
- Ensure trip belongs to your company
- Check trip is not deleted

### 2. "Ticketing rule not found"
- Verify ticketingRuleId is correct
- Ensure rule belongs to your company
- Check rule is not deleted

### 3. "Rule type mismatch"
- The ruleType (VOID, REFUND, REISSUE) must match the TicketingRule's ruleType
- Get the rule first to check its ruleType

### 4. "Duplicate rule type not allowed for trip"
- Each ruleType can only be assigned once per trip
- Delete or update the existing rule first

### 5. "Cannot modify ticket rules after bookings exist"
- Trip already has bookings (passenger, cargo, or vehicle)
- Cannot assign/update/delete rules for trips with bookings

### 6. "Rule type mismatch" - 400 Bad Request
- ruleType must be one of: VOID, REFUND, REISSUE
- Check spelling and case

---

## Permission Requirements

To use these endpoints, your user role must have:

| Operation | Permission | Module | Submodule |
|-----------|-----------|--------|-----------|
| Create/Assign | write | sales-bookings | trip |
| Update | edit | sales-bookings | trip |
| Delete | delete | sales-bookings | trip |
| Read | read | sales-bookings | trip |

---

## Workflow Examples

### Example 1: Setup Rules for New Trip

```
1. Create a new trip
2. Get available ticketing rules
3. For each rule type (VOID, REFUND, REISSUE):
   - Assign the rule to the trip
4. View all assigned rules
```

### Example 2: Change Rule Policy

```
1. Get current rules for trip
2. Update isActive to false (disable)
3. Assign new rule
```

### Example 3: Clean Up Rules

```
1. Get current rules for trip
2. Delete unwanted rules
3. Verify remaining rules
```

---

## File Reference

### Model: TripTicketRule
- **Location:** `src/models/TripTicketRule.js`
- **Fields:** company, trip, ruleType, ticketingRule, isActive, isDeleted, createdBy, updatedBy
- **Indexes:** company+trip, trip+ruleType (unique), company+isDeleted
- **Soft Delete:** Yes (auto-filtered)

### Service Layer
- **Location:** `src/services/tripTicketRuleService.js`
- **Functions:** 9 functions for validation and CRUD
- **Validation:** Trip, TicketingRule, rule type, duplicates, bookings

### Controller
- **Location:** `src/controllers/tripTicketRuleController.js`
- **Endpoints:** 4 (POST, GET, PUT, DELETE)
- **Response Format:** Standard JSON with success flag

### Middleware
- **Location:** `src/middleware/tripTicketRuleValidationMiddleware.js`
- **Validators:** 3 (create payload, update payload, path params)
- **Validation:** ruleType enum, required fields, ObjectId format

### Routes
- **Location:** `src/routes/tripRoutes.js` (updated)
- **New Endpoints:** 4 routes for ticket rules
- **Middleware Chain:** RBAC → Validation → Controller

---

## Documentation

For detailed information, see:

1. **API Documentation** → `TRIP_TICKETING_RULES_API_DOCS.md`
   - All endpoints with examples
   - Validation rules
   - Error codes

2. **Implementation Guide** → `TRIP_TICKETING_RULES_IMPLEMENTATION_GUIDE.md`
   - Architecture overview
   - Data flow diagrams
   - Testing checklist

3. **Postman Collection** → `Viaggio-Ferry-Trip-Ticketing-Rules-API.postman_collection.json`
   - Ready-to-use test requests
   - Validation test cases

---

## Next Steps

1. ✓ Review the architecture
2. ✓ Test with Postman collection
3. ✓ Write unit/integration tests
4. ✓ Deploy to staging
5. ✓ Integration testing with booking system
6. ✓ Deploy to production

---

## Support

For issues or questions:
- Check error messages in responses
- Review API documentation
- Check implementation guide for architecture details
- Run Postman validation tests

