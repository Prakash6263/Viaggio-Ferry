# Trip Management System - Testing Guide

## Quick Start

1. Import Postman collection: `Viaggio-Ferry-Trip-Management-API.postman_collection.json`
2. Set environment variables
3. Run requests in order
4. Verify responses match expected format

---

## Test Scenarios

### Scenario 1: Complete Trip Workflow

**Objective:** Create a trip, allocate capacity, and update status

**Steps:**
```
1. POST /api/trips
   └─ Create a new trip (status: SCHEDULED)
   
2. GET /api/trips/{tripId}/availability
   └─ Verify availability records auto-generated (3-10 records)
   
3. GET /api/trips/{tripId}
   └─ Get trip details
   
4. POST /api/trips/{tripId}/allocations
   └─ Allocate capacity to first partner
   
5. POST /api/trips/{tripId}/allocations
   └─ Allocate capacity to second partner
   
6. GET /api/trips/{tripId}/allocations
   └─ List all allocations
   
7. PUT /api/trips/{tripId}
   └─ Update trip status to OPEN
   
8. GET /api/trips?status=OPEN
   └─ Filter trips by status
   
9. DELETE /api/trips/{tripId}/allocations/{allocationId}
   └─ Delete one allocation (capacity restored)
   
10. DELETE /api/trips/{tripId}
    └─ Delete trip (soft delete)
```

**Expected Results:**
- Trip created with SCHEDULED status
- 3+ availability records created from ship capacities
- Allocations created and reflect in remaining capacity
- Trip status updated to OPEN
- Filters work correctly
- Allocation deletion updates remaining capacity
- Trip deletion succeeds (if no allocations remain)

---

### Scenario 2: Capacity Validation

**Objective:** Test capacity constraints

**Setup:**
- Create trip with ship capacity = 200 passengers
- Get availability record (totalCapacity = 200)

**Test Cases:**

**Test 2.1:** Over-allocation prevention
```
1. Try to allocate 150 to Partner A
   ✅ Success (150 < 200)
   
2. Try to allocate 60 to Partner B
   ❌ Should fail (150 + 60 > 200)
   
Expected: 400 Bad Request
"Sum of allocations (150) + requested (60) exceeds capacity (200)"
```

**Test 2.2:** Exact allocation boundary
```
1. Allocate 200 to Partner A
   ✅ Success (exactly at limit)
   
2. Try to allocate 1 to Partner B
   ❌ Should fail (200 + 1 > 200)
   
Expected: 400 Bad Request
```

**Test 2.3:** Multiple partners
```
1. Allocate 70 to Partner A
2. Allocate 70 to Partner B
3. Allocate 60 to Partner C
   ✅ Success (70+70+60 = 200, exact limit)
   
4. Try to allocate to Partner D
   ❌ Should fail (no capacity left)
```

---

### Scenario 3: Date Validation

**Objective:** Test all date constraint validations

**Test Cases:**

**Test 3.1:** Departure after arrival
```json
{
  "departureDateTime": "2024-03-15T14:00:00Z",
  "arrivalDateTime": "2024-03-15T08:00:00Z"
}
```
Expected: 400 Bad Request
"Departure time must be before arrival time"

**Test 3.2:** Booking window ordering
```json
{
  "bookingOpeningDate": "2024-03-15T00:00:00Z",
  "bookingClosingDate": "2024-03-14T00:00:00Z"
}
```
Expected: 400 Bad Request
"Booking opening date must be before or equal to booking closing date"

**Test 3.3:** Boarding closing after departure
```json
{
  "departureDateTime": "2024-03-15T08:00:00Z",
  "boardingClosingDate": "2024-03-15T10:00:00Z"
}
```
Expected: 400 Bad Request
"Boarding closing date must be before or equal to departure time"

---

### Scenario 4: Edit Constraints

**Objective:** Test trip edit restrictions

**Test 4.1:** Cannot edit COMPLETED trip
```
1. Create trip with status = SCHEDULED
2. Update trip status to COMPLETED
   ✅ Success
   
3. Try to update trip details
   ❌ Should fail
   
Expected: 400 Bad Request
"Cannot edit completed trips"
```

**Test 4.2:** Cannot change ship with allocations
```
1. Create trip with Ship A
2. Create allocation (50 seats to Partner A)
3. Try to change ship to Ship B
   ❌ Should fail
   
Expected: 400 Bad Request
"Cannot change ship. Agent allocations exist."
```

---

### Scenario 5: Pagination & Filtering

**Objective:** Test list endpoint features

**Test 5.1:** Pagination
```
GET /api/trips?page=1&limit=5
✅ Returns first 5 trips

GET /api/trips?page=2&limit=5
✅ Returns next 5 trips

Response includes:
{
  "pagination": {
    "total": 25,
    "page": 2,
    "limit": 5,
    "totalPages": 5
  }
}
```

**Test 5.2:** Search by trip name
```
GET /api/trips?search=Morning
✅ Returns all trips with "morning" in name (case-insensitive)
```

**Test 5.3:** Search by trip code
```
GET /api/trips?search=MS001
✅ Returns trip with code "MS001"
```

**Test 5.4:** Filter by status
```
GET /api/trips?status=OPEN
✅ Returns only OPEN trips

GET /api/trips?status=CLOSED
✅ Returns only CLOSED trips
```

**Test 5.5:** Filter by ports
```
GET /api/trips?departurePort=portId1
✅ Returns trips departing from portId1

GET /api/trips?arrivalPort=portId2
✅ Returns trips arriving at portId2

GET /api/trips?departurePort=portId1&arrivalPort=portId2
✅ Returns specific route trips
```

**Test 5.6:** Date range filter
```
GET /api/trips?startDate=2024-03-01&endDate=2024-03-31
✅ Returns trips departing in March 2024
```

**Test 5.7:** Combined filters
```
GET /api/trips?status=OPEN&departurePort=portId1&page=1&limit=10&search=express
✅ Returns first 10 OPEN trips from portId1 with "express" in name
```

---

### Scenario 6: Multi-Tenancy

**Objective:** Test company isolation

**Setup:**
- Create 2 companies: CompanyA and CompanyB
- Create trip with CompanyA

**Test Cases:**

**Test 6.1:** Company A cannot see Company B trips
```
1. Login as CompanyA user
2. GET /api/trips
   ✅ Returns only CompanyA trips (our trip)
   
3. Try to GET /api/trips/{companyBTripId}
   ❌ Returns 404 (trip not found)
   
Expected: 404 Not Found
"Trip not found or belongs to different company"
```

**Test 6.2:** Company isolation in allocations
```
1. Create allocation for CompanyA trip
2. Try to access from CompanyB account
   ❌ Returns 404
```

---

### Scenario 7: RBAC Enforcement

**Objective:** Test permission-based access control

**Setup:**
- Create users with different roles
- Restrict trip module permissions

**Test Cases:**

**Test 7.1:** No read permission
```
User without "sales-bookings/trip:read" permission
GET /api/trips
❌ Returns 403 Forbidden
```

**Test 7.2:** No write permission
```
User without "sales-bookings/trip:write" permission
POST /api/trips
❌ Returns 403 Forbidden
```

**Test 7.3:** No edit permission
```
User without "sales-bookings/trip:edit" permission
PUT /api/trips/{tripId}
❌ Returns 403 Forbidden
```

**Test 7.4:** No delete permission
```
User without "sales-bookings/trip:delete" permission
DELETE /api/trips/{tripId}
❌ Returns 403 Forbidden
```

---

### Scenario 8: Error Handling

**Objective:** Test error responses

**Test Cases:**

**Test 8.1:** Invalid ObjectId
```
GET /api/trips/invalid-id
Response: 400 Bad Request
{
  "success": false,
  "message": "Invalid trip ID format"
}
```

**Test 8.2:** Non-existent resource
```
GET /api/trips/507f1f77bcf86cd799439011
Response: 404 Not Found
{
  "success": false,
  "message": "Trip not found..."
}
```

**Test 8.3:** Missing required field
```
POST /api/trips
Body: { "tripName": "Test" }  (missing tripCode, ship, etc.)

Response: 400 Bad Request
{
  "success": false,
  "message": "Missing required field: tripCode; Missing required field: ship..."
}
```

**Test 8.4:** Invalid enum value
```
POST /api/trips
Body: { "status": "INVALID" }

Response: 400 Bad Request
{
  "success": false,
  "message": "Status must be one of: SCHEDULED, OPEN, CLOSED, COMPLETED, CANCELLED"
}
```

---

## Manual Testing Workflow

### Setup Phase
```bash
# 1. Start API server
npm start

# 2. Open Postman
# 3. Import collection: Viaggio-Ferry-Trip-Management-API.postman_collection.json

# 4. Set environment variables
# - {{baseUrl}} = http://localhost:3000
# - {{authToken}} = your-jwt-token
# - {{companyId}} = your-company-id
# - {{shipId}} = valid-ship-id
# - {{portId1}} = valid-port-id
# - {{portId2}} = different-valid-port-id
```

### Test Execution
```bash
# Run in Postman collection in this order:
1. Create Trip
2. Get Trip by ID
3. List Trips
4. Get Trip Availability
5. Create Allocation (Partner 1)
6. Create Allocation (Partner 2)
7. List Allocations
8. Get Trip Availability (updated)
9. Update Trip Status
10. Update Allocation
11. Delete Allocation
12. Delete Trip
```

### Verification Checklist
- [ ] All endpoints return HTTP 200/201 or appropriate error code
- [ ] Response format includes: success, message, data, pagination
- [ ] Availability records created correctly from ship capacities
- [ ] Allocations reflected in remainingCapacity
- [ ] Filters and search work correctly
- [ ] Pagination info is accurate
- [ ] Soft delete doesn't show deleted records
- [ ] Company isolation enforced
- [ ] RBAC permissions respected
- [ ] Error messages are descriptive

---

## Load Testing

### Setup
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/trips

# Expected: All requests succeed within acceptable time
```

### Expected Performance
- Create Trip: < 500ms
- List Trips: < 200ms (pagination)
- Get Availability: < 300ms
- Create Allocation: < 400ms

---

## Edge Cases to Test

1. **Empty results**
   ```
   GET /api/trips?status=INVALID_STATUS
   ✅ Returns 200 with empty data array
   ```

2. **Boundary allocation**
   ```
   Trip capacity: 100
   Partner A allocation: 100
   Partner B allocation: 0 (edge case - is 0 allowed?)
   ```

3. **Deleted trip access**
   ```
   Create trip → Delete (soft delete) → Try to GET
   ❌ Returns 404
   ```

4. **Concurrent allocations**
   ```
   Partner A allocates 60 (simultaneously with)
   Partner B allocates 50
   Expected: One succeeds, other fails if exceeds
   ```

5. **Status transitions**
   ```
   SCHEDULED → OPEN → CLOSED → COMPLETED
   Try: COMPLETED → OPEN (should fail)
   ```

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request on create | Missing/invalid fields | Check required fields in request |
| 403 Forbidden | Insufficient permissions | Add trip permissions to user role |
| 404 Not Found | Trip doesn't exist | Verify tripId is correct |
| Capacity exceeded | Over-allocation | Reduce allocation quantity |
| Cannot delete trip | Allocations exist | Delete allocations first |
| Date validation error | Invalid date range | Ensure departure < arrival |

---

## Regression Testing

After each deployment, run:

1. **Smoke Tests** (5 min)
   - Create trip
   - Get trip
   - Delete trip

2. **Core Tests** (15 min)
   - Scenario 1: Complete workflow
   - Scenario 2: Capacity validation
   - Scenario 3: Date validation

3. **Full Test Suite** (30 min)
   - All scenarios 1-8
   - All edge cases
   - Performance tests

---

## Continuous Integration

```bash
# Suggested CI pipeline
1. Unit tests: tripService functions
2. Integration tests: API endpoints
3. Load tests: Capacity testing
4. Security tests: RBAC verification
5. Regression tests: All scenarios
```

---

**Testing Status:** Ready for deployment

**Last Updated:** 2026-02-25

**Maintainer:** Development Team
