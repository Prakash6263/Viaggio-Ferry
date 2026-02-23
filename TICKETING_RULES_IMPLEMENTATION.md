# Ticketing Rules API - Production Implementation Summary

## Files Created

### 1. **Model** (`src/models/TicketingRule.js`)
- Mongoose schema with 13 fields covering rule configuration
- RestrictedPenalty nested schema
- Enums: RULE_TYPES, PAYLOAD_TYPES, FEE_TYPES
- 4 compound indexes for optimal query performance
- Pre-find/pre-findOne middleware auto-filters `isDeleted = false`
- Unique compound index on `{ company, ruleName }` (sparse)

### 2. **Service** (`src/services/ticketingRuleService.js`)
- `calculateTicketPenalty()` - Core penalty engine with strict NO_SHOW logic
- `getApplicableRule()` - Find rule with fallback to ALL payload type
- High-precision calculations with 2-decimal rounding
- Safe handling when rule not found
- Implements all 3 modes: ALLOWED, RESTRICTED, NO_SHOW

### 3. **Controller** (`src/controllers/ticketingRuleController.js`)
- `createTicketingRule()` - POST with full validation
- `listTicketingRules()` - GET with pagination, search, ruleType/payloadType filters
- `getTicketingRule()` - GET by ID with company isolation
- `updateTicketingRule()` - PUT with field-level validation
- `deleteTicketingRule()` - DELETE (soft, sets isDeleted=true)
- Standard response format: `{ success, message, data, pagination }`
- Company-scoped queries
- Input sanitization and type validation

### 4. **Routes** (`src/routes/ticketingRuleRoutes.js`)
- 5 endpoints with auth middleware chain
- `verifyToken` → `extractCompanyId` → `extractUserId` → `checkPermission`
- Permission checks for all CRUD operations
- Follows existing module architecture

### 5. **Permission Mapper** (`src/utils/permissionMapper.js`)
- Added 5 permission mappings for sales-bookings/ticketing-rules
- Actions: read, write, edit, delete
- Integrated into existing permission system

### 6. **Routes Index** (`src/routes/index.js`)
- Registered ticketing-rules routes at `/api/ticketing-rules`
- Follows existing pattern

### 7. **Postman Collection** (`postman/ticketing-rules.postman_collection.json`)
- v2.1 format, ready to import
- 5 request templates + penalty calculation reference
- Auth header with Bearer token
- Environment variables: base_url, token, company_id
- Query parameter examples for all filters

### 8. **Documentation** (`TICKETING_RULES_API.md`)
- Complete implementation guide
- Architecture overview
- Database schema reference
- Penalty calculation logic explained
- Endpoint specifications with examples
- RBAC integration details
- Error handling patterns
- Validation rules
- Financial integration requirements
- Testing examples

## Architecture Alignment

✅ **Follows Existing Patterns:**
- Model structure (CommissionRule reference)
- Controller response format (`{ success, message, data, pagination }`)
- Middleware chain (verifyToken → extractCompanyId → extractUserId → checkPermission)
- Soft delete pattern (`isDeleted` field + pre middleware)
- Company isolation (req.companyId filtering)
- RBAC integration (checkPermission middleware)
- Permission mapping registration

✅ **Multi-Tenant:**
- All queries filtered by `req.companyId`
- Unique indexes include company
- Cross-company access prevented

✅ **Production-Ready:**
- Comprehensive validation
- Error handling with HTTP status codes
- High-precision decimal calculations
- Safe null/undefined handling
- Audit trail fields (createdBy, updatedBy)
- Timestamps (createdAt, updatedAt)

## API Summary

```
POST   /api/ticketing-rules              (write permission)
GET    /api/ticketing-rules              (read permission)
GET    /api/ticketing-rules/:id          (read permission)
PUT    /api/ticketing-rules/:id          (edit permission)
DELETE /api/ticketing-rules/:id          (delete permission)
```

All endpoints:
- Require Bearer token authentication
- Enforce company scope via req.companyId
- Check RBAC permissions via checkPermission()
- Return standard response format

## Penalty Calculation

Three-mode system based on hours-to-departure:

| Scenario | Mode | Base Fee | Penalty |
|----------|------|----------|---------|
| > restricted window | ALLOWED | 0 | 0 |
| 0 to restricted window | RESTRICTED | normalFee | restrictedPenalty |
| < 0 (past ETD) | NO_SHOW | 0 | restrictedPenalty only |

- Handles FIXED and PERCENTAGE fee types
- Prevents double-application of penalties
- Respects ticket status and boarding status

## Database Indexes

```javascript
{ company: 1, ruleName: 1 }      // unique, sparse
{ company: 1, ruleType: 1 }      // query by rule type
{ company: 1, payloadType: 1 }   // query by payload
{ company: 1, isDeleted: 1 }     // query active rules
```

## Integration Testing

1. Create a rule via POST endpoint
2. Verify via GET all/by-id
3. Update via PUT endpoint
4. Call calculateTicketPenalty() with test scenarios
5. Verify penalty modes (ALLOWED, RESTRICTED, NO_SHOW)
6. Soft delete via DELETE endpoint
7. Confirm isDeleted filters in list queries

## Next Steps

1. Import Postman collection for API testing
2. Create access groups with ticketing-rules permissions
3. Integrate calculateTicketPenalty() into refund/reissue workflow
4. Set up financial journal entries for penalty charges
5. Configure commission reversal logic in financial module
