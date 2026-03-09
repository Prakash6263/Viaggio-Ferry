# Markup & Discount Rules API Documentation

## Module Information
- **Module Code**: `partners-management`
- **Submodule Code**: `markup-discounts`
- **Frontend Routes**: `/company/markup`, `/company/markup/add-rule`

## Overview

The Markup & Discount Rules API allows companies to manage pricing rules across their partner hierarchy. Rules cascade through the partner structure (Company → Marine → Commercial → Selling) with support for different layers, scopes, and service types.

## Allowed Permissions
- `read` - View markup/discount rules
- `write` - Create new rules
- `edit` - Modify existing rules
- `delete` - Delete rules (soft delete)

## Authentication & Middleware Flow

All routes require the following middleware in order:
1. `verifyToken` - Validate JWT token
2. `extractCompanyId` - Extract company ID from token
3. `extractUserId` - Extract user ID from token
4. `checkPermission` - Verify required permissions

**Example:**
```javascript
router.post(
  "/",
  checkPermission("partners-management", "markup-discounts", "write"),
  validateMarkupDiscount,
  controller.createRule
)
```

## Database Schema

### MarkupDiscountRule Model

```javascript
{
  company: ObjectId (ref: Company, required)
  ruleName: String (required, max 100 chars)
  
  // Rule Configuration
  provider: ObjectId (ref: Company/Partner, required)
  providerType: enum ["Company", "Partner"] (required)
  appliedLayer: enum ["Marine", "Commercial", "Selling"] (required)
  
  // Partner Scope
  partnerScope: enum ["AllChildPartners", "SpecificPartner"] (required)
  partner: ObjectId (ref: Partner, required if SpecificPartner)
  
  // Rule Details
  ruleType: enum ["Markup", "Discount"] (required)
  ruleValue: Number (required, >= 0)
  valueType: enum ["percentage", "fixed"] (default: "percentage")
  
  // Payload & Cabin Configuration
  payloadTypes: Array of ObjectId (ref: PayloadType, required)
  cabins: Array of ObjectId (ref: Cabin, required)
  visaType: String (optional)
  
  // Route
  routeFrom: ObjectId (ref: Port, required)
  routeTo: ObjectId (ref: Port, required)
  
  // Metadata
  effectiveDate: Date (required)
  priority: Number (default: 1)
  isActive: Boolean (default: true)
  createdBy: ObjectId (ref: User, required)
  updatedBy: ObjectId (ref: User)
  
  timestamps: true (createdAt, updatedAt)
}
```

## API Endpoints

### 1. Create Markup/Discount Rule

**Endpoint:** `POST /api/markup-discounts`

**Permission:** `partners-management` > `markup-discounts` > `write`

**Request Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "ruleName": "Passenger Economy Marine Markup",
  "provider": "partnerId",
  "providerType": "Partner",
  "appliedLayer": "Commercial",
  "partnerScope": "AllChildPartners",
  "ruleType": "Markup",
  "ruleValue": 10,
  "valueType": "percentage",
  "payloadTypes": ["payloadTypeIdAdult"],
  "cabins": ["cabinIdEconomy"],
  "routeFrom": "portIdMuscat",
  "routeTo": "portIdDubai",
  "effectiveDate": "2026-03-01T00:00:00Z",
  "priority": 1,
  "visaType": "Standard"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Markup/Discount rule created successfully",
  "data": {
    "_id": "objectId",
    "company": "companyId",
    "ruleName": "Marine markup rule",
    "provider": {
      "_id": "providerId",
      "name": "Company Name"
    },
    "providerType": "Company",
    "appliedLayer": "Commercial",
    "partnerScope": "AllChildPartners",
    "ruleType": "Markup",
    "ruleValue": 10,
    "valueType": "percentage",
    "payloadTypes": [
      {
        "_id": "payloadTypeId",
        "name": "Adult",
        "code": "ADT",
        "category": "passenger"
      }
    ],
    "cabins": [
      {
        "_id": "cabinId",
        "name": "Economy Passenger Cabin",
        "type": "passenger"
      }
    ],
    "routeFrom": {
      "_id": "portId",
      "portName": "Muscat"
    },
    "routeTo": {
      "_id": "portId",
      "portName": "Port Name"
    },
    "effectiveDate": "2026-03-01T00:00:00Z",
    "priority": 1,
    "isActive": true,
    "createdBy": {
      "_id": "userId",
      "email": "user@example.com"
    },
    "createdAt": "2026-03-09T10:30:00Z",
    "updatedAt": "2026-03-09T10:30:00Z"
  }
}
```

### 2. List Markup/Discount Rules

**Endpoint:** `GET /api/markup-discounts`

**Permission:** `partners-management` > `markup-discounts` > `read`

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| page | number | Page number (default: 1) | 1 |
| limit | number | Items per page (default: 10) | 10 |
| search | string | Search by rule name | "marine" |
| layer | string | Filter by applied layer | "Company" |
| routeFrom | string | Filter by origin port ID | "portId" |
| payloadType | string | Filter by payload type ID | "payloadTypeId" |
| cabin | string | Filter by cabin ID | "cabinId" |
| ruleType | string | Filter by rule type | "Markup" |

**Request:**
```
GET /api/markup-discounts?page=1&limit=10&layer=Company&payloadType=payloadTypeId&cabin=cabinId
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "objectId",
      "ruleName": "Marine markup rule",
      "ruleType": "Markup",
      "ruleValue": 10,
      "valueType": "percentage",
      "appliedLayer": "Commercial",
      "payloadTypes": ["payloadTypeId"],
      "cabins": ["cabinId"],
      "effectiveDate": "2026-03-01T00:00:00Z",
      "priority": 1,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3. Get Rule By ID

**Endpoint:** `GET /api/markup-discounts/:id`

**Permission:** `partners-management` > `markup-discounts` > `read`

**Request:**
```
GET /api/markup-discounts/objectId
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "objectId",
    "company": "companyId",
    "ruleName": "Marine markup rule",
    "provider": { "_id": "providerId", "name": "Company Name" },
    "providerType": "Company",
    "appliedLayer": "Marine",
    "partnerScope": "AllChildPartners",
    "ruleType": "Markup",
    "ruleValue": 10,
    "valueType": "percentage",
    "serviceTypes": ["Passenger", "Cargo"],
    "routeFrom": { "_id": "portId", "portName": "Port A" },
    "routeTo": { "_id": "portId", "portName": "Port B" },
    "effectiveDate": "2026-03-01T00:00:00Z",
    "priority": 1,
    "isActive": true,
    "createdBy": { "_id": "userId", "email": "user@example.com" },
    "createdAt": "2026-03-09T10:30:00Z",
    "updatedAt": "2026-03-09T10:30:00Z"
  }
}
```

### 4. Update Markup/Discount Rule

**Endpoint:** `PUT /api/markup-discounts/:id`

**Permission:** `partners-management` > `markup-discounts` > `edit`

**Request Body:** (All fields optional, provide only what needs updating)
```json
{
  "ruleName": "Updated rule name",
  "ruleValue": 15,
  "priority": 2,
  "isActive": true,
  "effectiveDate": "2026-04-01T00:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Markup/Discount rule updated successfully",
  "data": {
    "_id": "objectId",
    "ruleName": "Updated rule name",
    "ruleValue": 15,
    "priority": 2,
    ...
  }
}
```

### 5. Delete Markup/Discount Rule

**Endpoint:** `DELETE /api/markup-discounts/:id`

**Permission:** `partners-management` > `markup-discounts` > `delete`

**Request:**
```
DELETE /api/markup-discounts/objectId
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Markup/Discount rule deleted successfully"
}
```

## Business Logic

### Rule Cascading Through Partner Hierarchy

Rules cascade through the following structure:
```
Company
├── Marine (Layer)
├── Commercial (Layer)
└── Selling (Layer)
```

**Example:**
- Provider = Company
- Applied Layer = Marine
- PartnerScope = AllChildPartners
- Meaning: This rule applies 10% markup to all Marine partner layers for the company

### Priority System

Rules are evaluated by priority (higher number = higher priority). If multiple rules match a transaction, the highest priority rule is applied.

## Validation Rules

### Create/Update Request Validation

| Field | Rules |
|-------|-------|
| ruleName | Required, String, max 200 chars |
| provider | Required, valid ObjectId |
| providerType | Required, must be "Company" or "Partner" |
| appliedLayer | Required, must be "Marine", "Commercial", or "Selling" |
| partnerScope | Required, must be "AllChildPartners" or "SpecificPartner" |
| partner | Required only if partnerScope = "SpecificPartner" |
| ruleType | Required, must be "Markup" or "Discount" |
| ruleValue | Required, must be >= 0 |
| valueType | Required, must be "percentage" or "fixed" |
| serviceTypes | Required, non-empty array of ["Passenger", "Cargo", "Vehicle"] |
| routeFrom | Required, valid ObjectId (must be different from routeTo) |
| routeTo | Required, valid ObjectId (must be different from routeFrom) |
| effectiveDate | Required, valid ISO date string |
| priority | Optional, number >= 1 |
| visaType | Optional, string |

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "ruleName is required",
    "ruleValue must be positive"
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Not allowed to 'write' in 'markup-discounts'"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Markup/Discount rule not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Code Examples

### JavaScript/Node.js

```javascript
const token = "your_bearer_token";
const baseUrl = "http://localhost:5000";

// Create a rule
async function createRule() {
  const response = await fetch(`${baseUrl}/api/markup-discounts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ruleName: "Marine markup rule",
      provider: "companyId",
      providerType: "Company",
      appliedLayer: "Marine",
      partnerScope: "AllChildPartners",
      ruleType: "Markup",
      ruleValue: 10,
      valueType: "percentage",
      serviceTypes: ["Passenger", "Cargo"],
      routeFrom: "portId1",
      routeTo: "portId2",
      effectiveDate: "2026-03-01T00:00:00Z"
    })
  });
  
  const data = await response.json();
  return data;
}

// List rules
async function listRules() {
  const response = await fetch(
    `${baseUrl}/api/markup-discounts?page=1&limit=10&layer=Marine`,
    {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data;
}

// Get rule by ID
async function getRule(ruleId) {
  const response = await fetch(
    `${baseUrl}/api/markup-discounts/${ruleId}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data;
}

// Update rule
async function updateRule(ruleId, updates) {
  const response = await fetch(
    `${baseUrl}/api/markup-discounts/${ruleId}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    }
  );
  
  const data = await response.json();
  return data;
}

// Delete rule
async function deleteRule(ruleId) {
  const response = await fetch(
    `${baseUrl}/api/markup-discounts/${ruleId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  return data;
}
```

### cURL Examples

```bash
# Create Rule
curl -X POST http://localhost:5000/api/markup-discounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleName": "Marine markup rule",
    "provider": "companyId",
    "providerType": "Company",
    "appliedLayer": "Marine",
    "partnerScope": "AllChildPartners",
    "ruleType": "Markup",
    "ruleValue": 10,
    "valueType": "percentage",
    "serviceTypes": ["Passenger", "Cargo"],
    "routeFrom": "portId1",
    "routeTo": "portId2",
    "effectiveDate": "2026-03-01T00:00:00Z"
  }'

# List Rules
curl -X GET "http://localhost:5000/api/markup-discounts?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Rule
curl -X GET http://localhost:5000/api/markup-discounts/RULE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update Rule
curl -X PUT http://localhost:5000/api/markup-discounts/RULE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ruleValue": 15, "priority": 2}'

# Delete Rule
curl -X DELETE http://localhost:5000/api/markup-discounts/RULE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Implementation Checklist

- [x] Mongoose model with proper schema and indexes
- [x] Express controller with CRUD operations
- [x] Request validation middleware
- [x] Express routes with permission checks
- [x] Middleware flow: verifyToken → extractCompanyId → extractUserId → checkPermission
- [x] Permission mapper entries
- [x] Company isolation enforcement
- [x] Soft delete implementation
- [x] Lean queries for performance
- [x] Response formatting (success/error)
- [x] Populated references in responses
- [x] Pagination support
- [x] Filtering support
- [x] Postman collection

## Notes

- All queries automatically filter by company ID for multi-tenant isolation
- Deleted rules are soft-deleted (isActive = false)
- Rules are sorted by priority (desc) then effectiveDate (desc)
- All timestamps are UTC
- User ID is captured in createdBy and updatedBy fields
- The MarkupDiscountRule model already exists in the codebase with additional fields not specified in the requirements
