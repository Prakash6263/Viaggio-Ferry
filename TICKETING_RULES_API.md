# Ticketing Rules API - Implementation Guide

Production-ready Ticketing Rules API integrated into multi-tenant ferry ERP backend.

## Overview

The Ticketing Rules API manages refund, reissue, and void policies for tickets with sophisticated penalty calculation logic based on departure timing and ticket status.

## Architecture

```
src/
├── models/
│   └── TicketingRule.js              # Mongoose schema with auto-filter middleware
├── controllers/
│   └── ticketingRuleController.js    # CRUD endpoints with validation
├── routes/
│   └── ticketingRuleRoutes.js        # Express routes with permission checks
├── services/
│   └── ticketingRuleService.js       # Penalty calculation engine
└── utils/
    └── permissionMapper.js            # Added ticketing-rules permissions
```

## Database Model

### TicketingRule Schema

**Core Fields:**
- `company` (ObjectId, required, indexed) - Multi-tenant isolation
- `ruleType` (enum: VOID | REFUND | REISSUE, required) - Rule classification (NO_SHOW is NOT a ruleType)
- `ruleName` (String, required, max 150 chars) - Human-readable name

**Time Configuration:**
- `sameDayOnly` (Boolean, default: false) - Restrict to same calendar day
- `startOffsetDays` (Number, default: 0) - Rule effective after N days from issue
- `restrictedWindowHours` (Number, required) - Hours before ETD when penalties apply

**Penalty Configuration (All Optional):**
All penalty objects follow the structure: `{ type, value }`
- `normalFee` (Object) - Base fee when action is beyond restricted window
  - `type` (enum: NONE | FIXED | PERCENTAGE, default: NONE)
  - `value` (Number, default: 0)
- `restrictedPenalty` (Object) - Penalty when within restricted window or NO_SHOW mode
  - `type` (enum: NONE | FIXED | PERCENTAGE, default: NONE)
  - `value` (Number, default: 0)
- `noShowPenalty` (Object) - Penalty when ticket requested after ETD (NO_SHOW mode)
  - `type` (enum: NONE | FIXED | PERCENTAGE, default: NONE)
  - `value` (Number, default: 0)
- `conditions` (String, optional) - Descriptive conditions or notes for the rule
  - Max 1000 characters
  - Trimmed on storage
  - Default: empty string
  - Does NOT affect penalty calculations

**System Fields:**
- `isDeleted` (Boolean, default: false, indexed) - Soft delete
- `createdBy` (ObjectId ref User, required)
- `updatedBy` (ObjectId ref User, required)
- `timestamps` - Auto createdAt/updatedAt

**Indexes:**
```javascript
{ company: 1, ruleName: 1 }  // unique, sparse
{ company: 1, ruleType: 1 }
{ company: 1, isDeleted: 1 }
```

**Auto-filter Middleware:**
```javascript
TicketingRuleSchema.pre("find", function() { this.where({ isDeleted: false }) })
TicketingRuleSchema.pre("findOne", function() { this.where({ isDeleted: false }) })
```

## Penalty Calculation Engine

### Core Logic

The `calculateTicketPenalty()` service implements strict time-based eligibility and penalty configuration:

**Three Rule Types:**
1. **VOID** - Voids ticket on same day with sufficient hours before ETD
2. **REFUND** - Refunds after startOffsetDays with time-based penalties
3. **REISSUE** - Reissues after startOffsetDays with time-based penalties

**Three Operation Modes (returned):**
1. **ALLOWED** - Action permitted, no charge (or normalFee if configured)
2. **RESTRICTED** - Action permitted with penalty (within restrictedWindowHours of ETD)
3. **NO_SHOW** - Auto-applied when action requested after ETD (only for REFUND/REISSUE)

### Penalty Engine Logic

```
FOR VOID ruleType:
   IF sameDayOnly AND NOT same calendar day → NOT_ALLOWED
   IF hoursBeforeDeparture <= restrictedWindowHours → NOT_ALLOWED
   ELSE → ALLOWED (no charge)

FOR REFUND or REISSUE ruleType:
   Enforce startOffsetDays eligibility
   
   IF hoursBeforeDeparture > restrictedWindowHours:
       mode = ALLOWED
       baseCharge = normalFee (if configured)
       penaltyCharge = 0

   IF 0 <= hoursBeforeDeparture <= restrictedWindowHours:
       mode = RESTRICTED
       baseCharge = normalFee (if configured)
       penaltyCharge = restrictedPenalty

   IF hoursBeforeDeparture < 0:
       IF ticket NOT already refunded/reissued:
           mode = NO_SHOW
           baseCharge = 0
           penaltyCharge = noShowPenalty
       ELSE:
           mode = ALLOWED
           (no additional charge)
```

### Service Usage

```javascript
const { calculateTicketPenalty } = require("../services/ticketingRuleService")

const result = await calculateTicketPenalty({
  ticket: ticketObject,           // { status, createdAt, ... }
  trip: tripObject,               // { ETD, ... }
  ruleType: "REFUND",            // "VOID" | "REFUND" | "REISSUE"
  rule: ruleObject,              // TicketingRule from DB
  baseAmount: 1000               // original ticket price
})

// Returns:
// {
//   allowed: true/false,
//   mode: "ALLOWED" | "RESTRICTED" | "NO_SHOW",
//   baseCharge: 0 (or normalFee),
//   penaltyCharge: 0 (or restrictedPenalty/noShowPenalty),
//   totalCharge: sum,
//   hoursBeforeDeparture: number (can be negative)
// }
```

### Charge Calculation

**FIXED Type:**
- Charge = penalty.value (flat amount)

**PERCENTAGE Type:**
- Charge = (baseAmount × penalty.value) / 100

**NONE Type:**
- Charge = 0

## API Endpoints

All endpoints require:
- Authorization: Bearer token
- Company scope: Extracted from token
- Permission: RBAC via `checkPermission("sales-bookings", "ticketing-rules", action)`

### POST /api/ticketing-rules
Create new ticketing rule.

**Request Body:**
```json
{
  "ruleType": "REFUND",
  "ruleName": "Refund - Next Day 3 Hours Rule",
  "sameDayOnly": false,
  "startOffsetDays": 1,
  "restrictedWindowHours": 3,
  "normalFee": {
    "type": "NONE",
    "value": 0
  },
  "restrictedPenalty": {
    "type": "FIXED",
    "value": 50
  },
  "noShowPenalty": {
    "type": "PERCENTAGE",
    "value": 25
  },
  "conditions": "Refund allowed until 3 hours before departure"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ticketing rule created successfully",
  "data": { ...ruleObject }
}
```

### GET /api/ticketing-rules
List all rules with pagination, filtering, and search.

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Records per page
- `ruleType` (optional) - Filter by VOID | REFUND | REISSUE
- `search` (optional) - Search by ruleName (case-insensitive)

**Response (200):**
```json
{
  "success": true,
  "data": [ ...rules ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### GET /api/ticketing-rules/:id
Get single rule by ID.

**Response (200):**
```json
{
  "success": true,
  "data": { ...ruleObject }
}
```

### PUT /api/ticketing-rules/:id
Update rule (all fields optional).

**Request Body:** (Any subset of fields)
```json
{
  "ruleName": "Updated Refund - Next Day 4 Hours Rule",
  "restrictedWindowHours": 4,
  "normalFee": {
    "type": "FIXED",
    "value": 25
  },
  "restrictedPenalty": {
    "type": "PERCENTAGE",
    "value": 20
  },
  "noShowPenalty": {
    "type": "PERCENTAGE",
    "value": 30
  },
  "conditions": "Updated conditions: premium rates on holidays and peak seasons"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticketing rule updated successfully",
  "data": { ...updatedRuleObject }
}
```

### DELETE /api/ticketing-rules/:id
Soft delete rule (sets `isDeleted = true`).

**Response (200):**
```json
{
  "success": true,
  "message": "Ticketing rule deleted successfully"
}
```

## RBAC Integration

**Permission Mappings Added to `/src/utils/permissionMapper.js`:**

```javascript
"POST /api/ticketing-rules": {
  module: "sales-bookings",
  submodule: "ticketing-rules",
  action: "write"
},
"GET /api/ticketing-rules": {
  module: "sales-bookings",
  submodule: "ticketing-rules",
  action: "read"
},
"GET /api/ticketing-rules/:id": {
  module: "sales-bookings",
  submodule: "ticketing-rules",
  action: "read"
},
"PUT /api/ticketing-rules/:id": {
  module: "sales-bookings",
  submodule: "ticketing-rules",
  action: "edit"
},
"DELETE /api/ticketing-rules/:id": {
  module: "sales-bookings",
  submodule: "ticketing-rules",
  action: "delete"
}
```

**Access Control:**
- Users require `moduleAccess` for "sales-bookings" module
- Permission checks validate action (read/write/edit/delete) via `checkPermission()` middleware
- Company scope enforced via `companyId` from token

## Error Handling

Standard `createHttpError()` responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Status Codes:**
- 201 - Created
- 200 - Success
- 400 - Validation error
- 401 - Unauthorized
- 403 - Forbidden (permission denied)
- 404 - Not found
- 500 - Server error

## Validation Rules

**ruleType:**
- Required
- Must be one of: VOID | REFUND | REISSUE
- NO_SHOW is NOT a ruleType (it's a penalty mode in REFUND/REISSUE)

**ruleName:**
- Required
- String, max 150 chars
- Unique per company

**sameDayOnly:**
- Boolean, default false
- For VOID: restricts action to issue calendar day

**startOffsetDays:**
- Non-negative integer
- Default 0
- For REFUND/REISSUE: rule effective after N days from issue

**restrictedWindowHours:**
- Required
- Non-negative number (can be 0)
- Hours before ETD when penalties apply

**Penalty Config (normalFee, restrictedPenalty, noShowPenalty):**
- Each is optional (defaults to NONE)
- `type`: Must be NONE | FIXED | PERCENTAGE
- `value`: Must be non-negative number

**conditions:**
- Optional (defaults to empty string)
- String, max 1000 characters
- Descriptive field for rule applicability and notes
- Does NOT affect penalty calculation logic
- Trimmed on storage (leading/trailing whitespace removed)

## Financial Integration

**Important:** Ticketing Rule is a **time + penalty engine ONLY**. It returns penalty amounts but does NOT post to ledger.

Consuming systems must:

1. **Query Rule:** Call `getApplicableRule(companyId, ruleType)`
2. **Calculate Penalty:** Call `calculateTicketPenalty()` with ticket/trip/rule/baseAmount
3. **Handle Charge:** If `mode` is RESTRICTED or NO_SHOW and `totalCharge > 0`:
   - Deduct from refund amount
   - Journal appropriate entries (G/L accounts per company policy)
   - Store penalty details for audit trail
4. **Maintain Audit Trail:** Log all penalty calculations with:
   - Ticket reference
   - Rule applied
   - Mode (ALLOWED/RESTRICTED/NO_SHOW)
   - Charge breakdown (baseCharge vs penaltyCharge)
   - Timestamp

## Postman Collection

Import `/postman/ticketing-rules.postman_collection.json` for ready-to-use endpoints:
- Create Ticketing Rule
- Get All Ticketing Rules
- Get Ticketing Rule By ID
- Update Ticketing Rule
- Delete Ticketing Rule
- Penalty Calculation Reference

**Environment Variables:**
- `base_url` - API base URL (default: http://localhost:5000)
- `token` - Bearer token from login
- `company_id` - Company context

## Integration Checklist

- [x] Model created with proper indexes
- [x] Auto-filter middleware on find/findOne
- [x] Controller with full CRUD
- [x] Routes with auth middleware
- [x] Permission checks via checkPermission()
- [x] Penalty calculation service
- [x] Permission mappings added
- [x] Routes registered in index.js
- [x] Soft delete implemented
- [x] Company scope isolation
- [x] Standard response format
- [x] Comprehensive validation
- [x] Postman collection

## Testing

```javascript
// Example 1: VOID rule on same day with sufficient time
const voidRule = await TicketingRule.create({
  company: companyId,
  ruleType: "VOID",
  ruleName: "Test Void",
  sameDayOnly: true,
  restrictedWindowHours: 3,
  normalFee: { type: "NONE", value: 0 },
  restrictedPenalty: { type: "NONE", value: 0 },
  noShowPenalty: { type: "NONE", value: 0 },
  createdBy: userId,
  updatedBy: userId
})

// Ticket issued today, flight in 4 hours
const penalty = await calculateTicketPenalty({
  ticket: { status: "ISSUED", createdAt: new Date() },
  trip: { ETD: new Date(Date.now() + 4 * 60 * 60 * 1000) },
  ruleType: "VOID",
  rule: voidRule,
  baseAmount: 1000
})
// Result: { allowed: true, mode: "ALLOWED", charges: 0 }

// Example 2: REFUND rule with NO_SHOW after ETD
const refundRule = await TicketingRule.create({
  company: companyId,
  ruleType: "REFUND",
  ruleName: "Test Refund",
  startOffsetDays: 1,
  restrictedWindowHours: 3,
  normalFee: { type: "NONE", value: 0 },
  restrictedPenalty: { type: "FIXED", value: 50 },
  noShowPenalty: { type: "PERCENTAGE", value: 25 },
  createdBy: userId,
  updatedBy: userId
})

// Ticket issued yesterday, refund requested after ETD
const penalty = await calculateTicketPenalty({
  ticket: { status: "ISSUED", createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  trip: { ETD: new Date(Date.now() - 1 * 60 * 60 * 1000) }, // 1 hour past
  ruleType: "REFUND",
  rule: refundRule,
  baseAmount: 1000
})
// Result: { allowed: true, mode: "NO_SHOW", penaltyCharge: 250 (25% of 1000) }
```

## Deployment Notes

- Models auto-indexed on deploy
- No migration scripts required (uses Mongoose auto-schema)
- Soft delete pattern ensures data recovery
- Company isolation prevents cross-tenant data leaks
- RBAC enforced before controller execution
- Service layer independent of HTTP concerns
