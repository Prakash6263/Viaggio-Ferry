# Multi-Route Support Update - Markup/Discount & Commission Rules

## Overview

This update enhances both the **Markup/Discount Rules** and **Commission Rules** modules to support **multiple routes per rule**. This allows you to apply the same rule configuration to multiple shipping routes without creating separate rule entries.

## What Changed

### 1. Database Model Changes

#### CommissionRule Model (`src/models/CommissionRule.js`)
**Before:**
```javascript
routeFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Port", required: true },
routeTo: { type: mongoose.Schema.Types.ObjectId, ref: "Port", required: true },
```

**After:**
```javascript
routes: [
  {
    routeFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    routeTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Port",
      required: true,
    },
    _id: false,
  },
],
```

#### MarkupDiscountRule Model
Already supported multiple routes - no changes needed.

### 2. Middleware Changes

#### Commission Rule Validation (`src/middleware/validateCommissionRule.js`)
Updated validation to check the `routes` array instead of single `routeFrom` and `routeTo` fields:

```javascript
// Validate routes array
if (!routes) {
  errors.push("routes array is required")
} else if (!Array.isArray(routes)) {
  errors.push("routes must be an array")
} else if (routes.length === 0) {
  errors.push("At least one route is required")
} else {
  // Validates each route in the array
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    // Validation checks...
  }
}
```

### 3. Controller Changes

#### Commission Rule Controller (`src/controllers/commissionRuleController.js`)

**Create Operation:**
- Now accepts and validates `routes` array
- Validates that each route has unique `routeFrom` and `routeTo`
- Checks for duplicate rules across multiple routes
- Populates route references for response

**List Operation:**
- Enhanced filtering to support searching by individual routes
- Can filter by `routeFrom` OR `routeTo` OR both
- Added status filtering (active rules only, considering expiry date)

**Update Operation:**
- Can add or modify routes in existing rules
- Full validation of new routes before updating

## API Request/Response Format

### Create Commission Rule - Request Body

```json
{
  "ruleName": "10% Commission for Marine Agents",
  "provider": "{{providerId}}",
  "providerType": "Company",
  "appliedLayer": "Marine Agent",
  "partnerScope": "AllChildPartners",
  "commissionType": "percentage",
  "commissionValue": 10,
  "routes": [
    {
      "routeFrom": "{{portId1}}",
      "routeTo": "{{portId2}}"
    },
    {
      "routeFrom": "{{portId3}}",
      "routeTo": "{{portId4}}"
    },
    {
      "routeFrom": "{{portId5}}",
      "routeTo": "{{portId6}}"
    }
  ],
  "serviceDetails": {
    "passenger": [
      {
        "cabinId": "{{cabinId}}"
      }
    ],
    "cargo": [],
    "vehicle": []
  },
  "effectiveDate": "2024-01-15T00:00:00Z",
  "expiryDate": "2024-12-31T23:59:59Z",
  "priority": 1
}
```

### Create Commission Rule - Response

```json
{
  "success": true,
  "message": "Commission rule created successfully",
  "data": {
    "_id": "{{commissionRuleId}}",
    "ruleName": "10% Commission for Marine Agents",
    "company": "{{companyId}}",
    "providerType": "Company",
    "providerCompany": {
      "_id": "{{companyId}}",
      "companyName": "Main Company"
    },
    "appliedLayer": "Marine Agent",
    "partnerScope": "AllChildPartners",
    "commissionType": "percentage",
    "commissionValue": 10,
    "routes": [
      {
        "routeFrom": {
          "_id": "{{portId1}}",
          "portName": "Port A",
          "code": "PA"
        },
        "routeTo": {
          "_id": "{{portId2}}",
          "portName": "Port B",
          "code": "PB"
        }
      },
      {
        "routeFrom": {
          "_id": "{{portId3}}",
          "portName": "Port C",
          "code": "PC"
        },
        "routeTo": {
          "_id": "{{portId4}}",
          "portName": "Port D",
          "code": "PD"
        }
      }
    ],
    "serviceDetails": {
      "passenger": [
        {
          "cabinId": {
            "_id": "{{cabinId}}",
            "cabinName": "Standard",
            "cabinCode": "STD"
          }
        }
      ],
      "cargo": [],
      "vehicle": []
    },
    "effectiveDate": "2024-01-15T00:00:00Z",
    "expiryDate": "2024-12-31T23:59:59Z",
    "priority": 1,
    "isActive": true,
    "createdBy": {
      "_id": "{{userId}}",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "createdAt": "2024-01-10T10:30:00Z"
  }
}
```

## List Commission Rules - Query Parameters

```
GET /api/commission-rules?page=1&limit=10&layer=Marine Agent&routeFrom={{portId1}}&routeTo={{portId2}}&partnerScope=AllChildPartners
```

**Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)
- `search` - Search in rule name (optional)
- `layer` - Filter by applied layer (optional)
- `routeFrom` - Filter by departure port (optional)
- `routeTo` - Filter by destination port (optional)
- `partnerScope` - Filter by partner scope (optional)

**Note:** When both `routeFrom` and `routeTo` are provided, it returns rules that contain that specific route combination.

## Update Commission Rule

```json
{
  "ruleName": "Updated 15% Commission for Marine Agents",
  "commissionValue": 15,
  "routes": [
    {
      "routeFrom": "{{portId1}}",
      "routeTo": "{{portId2}}"
    },
    {
      "routeFrom": "{{portId3}}",
      "routeTo": "{{portId4}}"
    },
    {
      "routeFrom": "{{portId5}}",
      "routeTo": "{{portId6}}"
    }
  ],
  "effectiveDate": "2024-01-15T00:00:00Z",
  "expiryDate": "2024-12-31T23:59:59Z"
}
```

## Validation Rules

### Routes Array Validation
1. **Required:** At least one route must be present
2. **Format:** Each route must be an object with `routeFrom` and `routeTo` properties
3. **Port Validation:** Both ports must be valid MongoDB ObjectIds
4. **Uniqueness:** `routeFrom` and `routeTo` must be different ports for each route
5. **Index Validation:** All ports must exist in the database

### Commission Value Validation
1. **Type:** Must be a number
2. **Range:** Must be >= 0
3. **Decimal:** Supports decimal values (e.g., 2.5 for 2.5%)

### Service Details Validation
1. **Required:** At least one service type (passenger, cargo, or vehicle) must be included
2. **Cabin Validation:** Each cabin ID must exist and belong to the company
3. **Nested Structure:** Proper cabin ID references required

## Migration Notes

### For Existing Commission Rules

If you have existing commission rules with single `routeFrom` and `routeTo` fields, you'll need to migrate them. A migration script should:

1. Read each commission rule
2. Create a `routes` array with a single route object containing the existing `routeFrom` and `routeTo`
3. Remove the old `routeFrom` and `routeTo` fields
4. Save the updated document

Example migration:
```javascript
const CommissionRule = require("./models/CommissionRule")

const migrateCommissionRules = async () => {
  const rules = await CommissionRule.find({ routes: { $exists: false } })
  
  for (const rule of rules) {
    rule.routes = [
      {
        routeFrom: rule.routeFrom,
        routeTo: rule.routeTo,
      }
    ]
    // Remove old fields
    rule.routeFrom = undefined
    rule.routeTo = undefined
    await rule.save()
  }
  
  console.log(`Migrated ${rules.length} commission rules`)
}
```

## Postman Collection

A comprehensive Postman collection is available at: `/postman/shipment-backend-updated.postman_collection.json`

**To use:**
1. Import the collection into Postman
2. Set the following variables in your environment:
   - `baseUrl` - Your API base URL
   - `token` - Your authentication token
   - `providerId` - A valid provider ID
   - `portId1`, `portId2`, `portId3`, etc. - Valid port IDs
   - `cabinId` - A valid cabin ID
   - `commissionRuleId` - A commission rule ID for update/delete operations

## Backward Compatibility

- **Markup/Discount Rules:** Fully compatible, no changes to existing rules required
- **Commission Rules:** Old single-route rules will continue to work, but new rules must use the multi-route format

## Testing the API

### Test Case 1: Create Rule with Multiple Routes
```bash
curl -X POST http://localhost:3000/api/commission-rules \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleName": "Test Multi-Route Commission",
    "provider": "{{providerId}}",
    "providerType": "Company",
    "appliedLayer": "Marine Agent",
    "partnerScope": "AllChildPartners",
    "commissionType": "percentage",
    "commissionValue": 10,
    "routes": [
      {"routeFrom": "{{portId1}}", "routeTo": "{{portId2}}"},
      {"routeFrom": "{{portId3}}", "routeTo": "{{portId4}}"}
    ],
    "serviceDetails": {"passenger": [{"cabinId": "{{cabinId}}"}], "cargo": [], "vehicle": []},
    "effectiveDate": "2024-01-15T00:00:00Z"
  }'
```

### Test Case 2: List Rules by Route
```bash
curl -X GET "http://localhost:3000/api/commission-rules?routeFrom={{portId1}}&routeTo={{portId2}}" \
  -H "Authorization: Bearer {{token}}"
```

### Test Case 3: Update Rule Routes
```bash
curl -X PUT http://localhost:3000/api/commission-rules/{{commissionRuleId}} \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "routes": [
      {"routeFrom": "{{portId5}}", "routeTo": "{{portId6}}"}
    ]
  }'
```

## Support

For issues or questions about the multi-route update:
1. Check the validation errors in the API response
2. Ensure all port IDs and cabin IDs are valid
3. Verify the routes array format matches the examples
4. Check the Postman collection for reference implementations

