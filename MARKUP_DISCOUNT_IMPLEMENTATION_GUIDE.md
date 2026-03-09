# Markup & Discount Rules - Implementation Guide

## Files Created

### 1. Controller: `/src/controllers/markupDiscountController.js`
- **Functions:**
  - `createMarkupDiscountRule()` - POST /api/markup-discounts
  - `listMarkupDiscountRules()` - GET /api/markup-discounts
  - `getMarkupDiscountRule()` - GET /api/markup-discounts/:id
  - `updateMarkupDiscountRule()` - PUT /api/markup-discounts/:id
  - `deleteMarkupDiscountRule()` - DELETE /api/markup-discounts/:id

**Features:**
- Full CRUD operations
- Company isolation (all queries filter by companyId)
- Relationship population (provider, partner, routes, user)
- Pagination support
- Filtering support (layer, routeFrom, serviceType, ruleType)
- Soft delete (sets isActive = false)

### 2. Validation Middleware: `/src/middleware/validateMarkupDiscount.js`
**Validates:**
- Required fields (ruleName, provider, appliedLayer, etc.)
- Enum values (ruleType, valueType, appliedLayer, etc.)
- Data types and ranges
- Business logic (routeFrom ≠ routeTo, partner required for SpecificPartner)
- Array validation for serviceTypes

### 3. Routes: `/src/routes/markupDiscountRoutes.js`
**Route Setup:**
- All routes protected with auth middleware
- Permission checks for each endpoint
- Validation middleware on POST and PUT
- Proper HTTP methods and status codes

### 4. Updated Files:
- `/src/routes/index.js` - Added markup discount routes registration
- `/src/utils/permissionMapper.js` - Added permission mappings for 5 endpoints

### 5. Documentation:
- `Postman_MarkupDiscountAPI_Collection.json` - Ready-to-import Postman collection
- `MARKUP_DISCOUNT_API_DOCS.md` - Complete API documentation
- `MARKUP_DISCOUNT_IMPLEMENTATION_GUIDE.md` - This file

## Database Model Reference

The `MarkupDiscountRule` model already exists at `/src/models/MarkupDiscountRule.js` with the following key fields:

```javascript
{
  company: ObjectId (indexed),
  ruleName: String,
  provider: ObjectId (ref: Partner),
  appliedToLayer: enum ["Company", "Marine Agent", "Commercial Agent", "Selling Agent"],
  partner: ObjectId (ref: Partner),
  ruleType: enum ["Markup", "Discount"],
  valueType: enum ["PERCENT", "AMOUNT"],
  value: Number,
  serviceTypes: [String],
  effectiveDate: Date,
  expiryDate: Date,
  status: enum ["Active", "Inactive"],
  isDeleted: Boolean,
  timestamps: true
}
```

**Note:** The existing model has slightly different field names. The API implementation maps between the requirements and existing model structure.

## Middleware Flow Diagram

```
Request
  ↓
verifyToken (auth/authMiddleware.js)
  ↓ 
extractCompanyId (auth/authMiddleware.js)
  ↓
extractUserId (auth/authMiddleware.js)
  ↓
checkPermission (middleware/permissionMiddleware.js)
  ↓
validateMarkupDiscount (middleware/validateMarkupDiscount.js) [POST/PUT only]
  ↓
Controller Action
  ↓
Response
```

## Permission Structure

### Module: `partners-management`
### Submodule: `markup-discounts`
### Actions:
- `read` - View rules (GET endpoints)
- `write` - Create rules (POST)
- `edit` - Modify rules (PUT)
- `delete` - Delete rules (DELETE)

## API Endpoint Reference

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | /api/markup-discounts | write | Create new rule |
| GET | /api/markup-discounts | read | List all rules |
| GET | /api/markup-discounts/:id | read | Get specific rule |
| PUT | /api/markup-discounts/:id | edit | Update rule |
| DELETE | /api/markup-discounts/:id | delete | Delete rule (soft) |

## Key Implementation Details

### 1. Company Isolation
Every query includes `{ company: companyId }` filter:
```javascript
const filter = { company: companyId, isActive: true }
const rules = await MarkupDiscountRule.find(filter)
```

### 2. Pagination
Built-in pagination with skip/limit:
```javascript
const skip = (page - 1) * limit
const rules = await MarkupDiscountRule.find(filter)
  .skip(skip)
  .limit(Number.parseInt(limit))
```

### 3. Relationship Population
References are populated for better data:
```javascript
.populate("provider", "name partnerName")
.populate("partner", "name partnerName")
.populate("routeFrom", "portName")
.populate("routeTo", "portName")
.populate("createdBy", "email name")
```

### 4. Soft Delete
Rules marked inactive instead of permanent deletion:
```javascript
rule.isActive = false
await rule.save()
```

### 5. Lean Queries (Optional Optimization)
Can add `.lean()` for better performance if only reading:
```javascript
const rules = await MarkupDiscountRule.find(filter)
  .populate(...)
  .lean()
```

## Error Handling

All errors use HTTP status codes and consistent format:

```javascript
try {
  // Business logic
  throw createHttpError(400, "Validation error")
} catch (error) {
  next(error) // Passed to error handler middleware
}
```

Response format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Optional", "detailed", "errors"]
}
```

## Testing with Postman

### Setup Environment Variables:
1. Import `Postman_MarkupDiscountAPI_Collection.json`
2. Set these environment variables:
   - `base_url`: Your API base URL (e.g., http://localhost:5000)
   - `token`: Your Bearer token
   - `companyId`: Your company ID
   - `portId`: A valid port ID
   - `partnerId`: A valid partner ID

### Request Flow:
1. **Create Rule** - Creates a rule and stores ID in `ruleId`
2. **List Rules** - Shows all rules with pagination
3. **Get Rule** - Retrieves the created rule details
4. **Update Rule** - Modifies the rule
5. **Delete Rule** - Soft deletes the rule

## Common Query Examples

### List Marine Rules with Pagination
```
GET /api/markup-discounts?page=1&limit=10&layer=Marine
```

### Get Passenger Service Rules
```
GET /api/markup-discounts?serviceType=Passenger
```

### Search by Name
```
GET /api/markup-discounts?search=markup
```

### Filter Markup Rules
```
GET /api/markup-discounts?ruleType=Markup&layer=Commercial
```

## Performance Considerations

1. **Indexes:** The model has indexes on:
   - company
   - effectiveDate
   - serviceTypes
   - ruleName (text search)

2. **Lean Queries:** Use `.lean()` in list operations when projections are complex

3. **Pagination:** Always use page/limit for large datasets

4. **Field Selection:** Can add `.select()` to fetch only needed fields

## Extension Points

### Adding New Filters
In `listMarkupDiscountRules()` controller:
```javascript
if (newFilter) {
  filter.newField = newFilter
}
```

### Custom Validation Rules
In `validateMarkupDiscount.js`:
```javascript
if (ruleValue > 100 && valueType === "percentage") {
  errors.push("Percentage cannot exceed 100%")
}
```

### Additional Endpoints
- Active rules only: `GET /api/markup-discounts/active`
- Expiring soon: `GET /api/markup-discounts/expiring`
- By layer: `GET /api/markup-discounts/by-layer/:layer`

## Database Indexes

The existing model has comprehensive indexes:
```javascript
// Company + Status + Active check
MarkupDiscountRuleSchema.index({ 
  company: 1, 
  provider: 1, 
  status: 1, 
  isDeleted: 1 
})

// For layer-based queries
MarkupDiscountRuleSchema.index({ 
  company: 1, 
  appliedToLayer: 1, 
  partner: 1 
})

// For date-based queries
MarkupDiscountRuleSchema.index({ 
  company: 1, 
  effectiveDate: 1, 
  expiryDate: 1 
})

// For service type queries
MarkupDiscountRuleSchema.index({ 
  company: 1, 
  serviceTypes: 1 
})

// Text search on ruleName
MarkupDiscountRuleSchema.index({ 
  company: 1, 
  ruleName: "text" 
})
```

## Deployment Checklist

- [ ] Verify all files are created in correct locations
- [ ] Test authentication and permission flows
- [ ] Test CRUD operations with Postman
- [ ] Verify company isolation (cross-company attempts should fail)
- [ ] Test error scenarios (validation errors, not found, etc.)
- [ ] Test pagination and filtering
- [ ] Run load tests if high volume expected
- [ ] Verify soft delete vs hard delete behavior
- [ ] Check audit logs (createdBy/updatedBy tracking)
- [ ] Document any customizations or modifications

## Support & Troubleshooting

### 401 Unauthorized
- Verify token is valid
- Check token expiration
- Ensure token has companyId

### 403 Forbidden
- Verify user has correct access group
- Check permission configuration for module/submodule/action
- Ensure user belongs to the company

### 400 Bad Request
- Check required fields are provided
- Validate enum values
- Ensure ObjectIds are valid format
- Check routeFrom ≠ routeTo

### 404 Not Found
- Verify rule exists
- Check rule belongs to user's company
- Ensure rule is not deleted (isActive = true)

## Notes

- All timestamps are in UTC
- Soft deletes preserve audit trail
- Rules are sorted by priority (high to low) then date (recent first)
- The validation middleware prevents invalid data at entry point
- Company isolation is enforced at database query level
- All user actions are tracked (createdBy, updatedBy)
