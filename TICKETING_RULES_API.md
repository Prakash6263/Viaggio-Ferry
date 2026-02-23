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
- `ruleType` (enum: VOID | REFUND | REISSUE, required) - Rule classification
- `ruleName` (String, required, max 150 chars) - Human-readable name
- `payloadType` (enum: PASSENGER | CARGO | VEHICLE | ALL, default: ALL) - Applies to payload type

**Time Configuration:**
- `sameDayOnly` (Boolean, default: false) - Restrict to same calendar day
- `startOffsetDays` (Number, default: 0) - Rule effective after N days
- `restrictedWindowHours` (Number, required) - Hours before ETD when penalties apply

**Financial Configuration:**
- `normalFeeType` (enum: FIXED | PERCENTAGE) - Optional base fee when in restricted window
- `normalFeeValue` (Number) - Fee amount or percentage
- `restrictedPenalty` (Object, required) - Penalty when within restricted window
  - `feeType` (enum: FIXED | PERCENTAGE, required)
  - `feeValue` (Number, required)

**Flags:**
- `taxRefundable` (Boolean, default: false) - Tax included in refund
- `commissionReversal` (Boolean, default: true) - Reverse commission on charge

**System Fields:**
- `isDeleted` (Boolean, default: false, indexed) - Soft delete
- `createdBy` (ObjectId ref User, required)
- `updatedBy` (ObjectId ref User, required)
- `timestamps` - Auto createdAt/updatedAt

**Indexes:**
```javascript
{ company: 1, ruleName: 1 }  // unique, sparse
{ company: 1, ruleType: 1 }
{ company: 1, payloadType: 1 }
{ company: 1, isDeleted: 1 }
```

**Auto-filter Middleware:**
```javascript
TicketingRuleSchema.pre("find", function() { this.where({ isDeleted: false }) })
TicketingRuleSchema.pre("findOne", function() { this.where({ isDeleted: false }) })
```

## Penalty Calculation Engine

### Time-Based Logic

The `calculateTicketPenalty()` service implements strict NO_SHOW logic:

```
hoursBeforeDeparture = (trip.ETD - now) / (1000 * 60 * 60)

IF hoursBeforeDeparture > restrictedWindowHours
  → Mode: ALLOWED
  → baseCharge = 0, penaltyCharge = 0

IF 0 <= hoursBeforeDeparture <= restrictedWindowHours
  → Mode: RESTRICTED
  → baseCharge = normalFee (if configured)
  → penaltyCharge = restrictedPenalty

IF hoursBeforeDeparture < 0
  AND ticket.status NOT IN [REFUNDED, REISSUED]
  AND boardingStatus != BOARDED
  → Mode: NO_SHOW
  → baseCharge = 0
  → penaltyCharge = restrictedPenalty only
```

### Service Usage

```javascript
const { calculateTicketPenalty } = require("../services/ticketingRuleService")

const result = await calculateTicketPenalty({
  ticket: ticketObject,
  trip: tripObject,
  actionType: "REFUND",  // or "REISSUE"
  rule: ruleObject,
  baseAmount: 1000       // original ticket price
})

// Returns:
// {
//   mode: "ALLOWED" | "RESTRICTED" | "NO_SHOW",
//   baseCharge: number,
//   penaltyCharge: number,
//   totalCharge: number,
//   hoursBeforeDeparture: number
// }
```

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
  "ruleName": "Standard Refund Policy",
  "payloadType": "PASSENGER",
  "sameDayOnly": false,
  "startOffsetDays": 0,
  "restrictedWindowHours": 24,
  "normalFeeType": "FIXED",
  "normalFeeValue": 50,
  "restrictedPenalty": {
    "feeType": "PERCENTAGE",
    "feeValue": 10
  },
  "taxRefundable": false,
  "commissionReversal": true
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
- `payloadType` (optional) - Filter by PASSENGER | CARGO | VEHICLE | ALL
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
  "ruleName": "Updated Policy",
  "restrictedWindowHours": 48,
  "restrictedPenalty": {
    "feeType": "FIXED",
    "feeValue": 100
  }
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

**ruleName:**
- Required
- String, max 150 chars
- Unique per company (with payloadType context)

**payloadType:**
- Optional (defaults to ALL)
- Must be one of: PASSENGER | CARGO | VEHICLE | ALL

**restrictedWindowHours:**
- Required
- Non-negative number

**normalFeeType & normalFeeValue:**
- If feeType is provided, feeValue must be non-negative
- If feeType is null, feeValue must be null

**restrictedPenalty:**
- Required
- Must have feeType (FIXED | PERCENTAGE) and feeValue (non-negative)

## Financial Integration

When `totalCharge > 0` during refund/reissue:

1. **Deduct from Refund Amount:** If REFUND action, subtract charge
2. **Reverse Commission:** If `commissionReversal = true`, reverse applicable commission
3. **Maintain Debit = Credit:** Journal entries must balance
4. **Store Reference:** Maintain original invoice/ticket reference for audit trail
5. **Audit Trail:** Log all penalty applications with mode and breakdown

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
// Example: Create rule and calculate penalty
const rule = await TicketingRule.create({
  company: companyId,
  ruleType: "REFUND",
  ruleName: "Test Rule",
  restrictedWindowHours: 24,
  restrictedPenalty: { feeType: "FIXED", feeValue: 50 },
  createdBy: userId,
  updatedBy: userId
})

const penalty = await calculateTicketPenalty({
  ticket: { status: "ISSUED", boardingStatus: "NOT_BOARDED" },
  trip: { ETD: new Date(Date.now() + 12 * 60 * 60 * 1000) },
  actionType: "REFUND",
  rule,
  baseAmount: 1000
})

console.log(penalty)
// { mode: "RESTRICTED", baseCharge: 0, penaltyCharge: 50, totalCharge: 50, ... }
```

## Deployment Notes

- Models auto-indexed on deploy
- No migration scripts required (uses Mongoose auto-schema)
- Soft delete pattern ensures data recovery
- Company isolation prevents cross-tenant data leaks
- RBAC enforced before controller execution
- Service layer independent of HTTP concerns
