# Promotion Management Module Documentation

## Overview

The Promotion Management module is part of the Partner Management system and provides functionality to create, manage, and apply promotional discounts to passengers, cargo, and vehicle bookings.

## Architecture

The module follows the same architecture as the Markup/Discount module and includes:

- **Model**: `/src/models/Promotion.js` - Mongoose schema definition
- **Controller**: `/src/controllers/promotionController.js` - Business logic
- **Routes**: `/src/routes/promotionRoutes.js` - API endpoints
- **Validation Middleware**: `/src/middleware/validatePromotion.js` - Request validation
- **Permission Middleware**: Permission checks via RBAC

## Database Schema

### Promotion Fields

```javascript
{
  company: ObjectId (required, indexed),
  promotionName: String (required, max 200 chars),
  description: String (optional),
  promotionBasis: String (enum: ["Period", "Trip"], required),
  
  // Trip reference (required if basis = "Trip", null if basis = "Period")
  trip: ObjectId (ref: Trip),
  
  // Date range (required)
  startDate: Date (required),
  endDate: Date (required, must be > startDate),
  
  // Status
  status: String (enum: ["Active", "Inactive"], default: "Active"),
  
  // Benefits configuration
  passengerBenefit: {
    isEnabled: Boolean,
    valueType: String (enum: ["percentage", "fixed"]),
    value: Number (min: 0)
  },
  
  cargoBenefit: {
    isEnabled: Boolean,
    valueType: String (enum: ["percentage", "fixed"]),
    value: Number (min: 0)
  },
  
  vehicleBenefit: {
    isEnabled: Boolean,
    valueType: String (enum: ["percentage", "fixed"]),
    value: Number (min: 0)
  },
  
  // Additional service benefits (dynamic list)
  serviceBenefits: [
    {
      title: String (required),
      valueType: String (enum: ["percentage", "fixed"], required),
      value: Number (required, min: 0)
    }
  ],
  
  // Audit fields
  isDeleted: Boolean (default: false),
  createdBy: ObjectId (ref: User),
  updatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

- `company + status`
- `company + startDate + endDate`
- `company + isDeleted`
- `company + trip`

## API Endpoints

### 1. Create Promotion

**Endpoint**: `POST /api/promotions`

**Permission**: `partners_management.promotion.write`

**Request Body**:
```json
{
  "promotionName": "Summer Offer 2026",
  "description": "Discount for all trips during summer",
  "promotionBasis": "Period",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "status": "Active",
  "passengerBenefit": {
    "isEnabled": true,
    "valueType": "percentage",
    "value": 10
  },
  "cargoBenefit": {
    "isEnabled": false
  },
  "vehicleBenefit": {
    "isEnabled": false
  },
  "serviceBenefits": [
    {
      "title": "Free Meal",
      "valueType": "fixed",
      "value": 50
    }
  ]
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Promotion created successfully",
  "data": {
    "_id": "...",
    "company": { "_id": "...", "companyName": "..." },
    "promotionName": "Summer Offer 2026",
    ...
  }
}
```

### 2. List Promotions

**Endpoint**: `GET /api/promotions`

**Permission**: `partners_management.promotion.read`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `search` - Search by promotionName
- `status` - Filter by status (Active/Inactive)
- `basis` - Filter by basis (Period/Trip)

**Response** (200):
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3. Get Promotion by ID

**Endpoint**: `GET /api/promotions/:id`

**Permission**: `partners_management.promotion.read`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "company": {...},
    "promotionName": "Summer Offer 2026",
    ...
  }
}
```

### 4. Update Promotion

**Endpoint**: `PUT /api/promotions/:id`

**Permission**: `partners_management.promotion.edit`

**Request Body**: Same structure as create (all fields optional)

**Response** (200):
```json
{
  "success": true,
  "message": "Promotion updated successfully",
  "data": {...}
}
```

### 5. Delete Promotion

**Endpoint**: `DELETE /api/promotions/:id`

**Permission**: `partners_management.promotion.delete`

**Response** (200):
```json
{
  "success": true,
  "message": "Promotion deleted successfully"
}
```

### 6. Get Active Promotions

**Endpoint**: `GET /api/promotions/active/list`

**Permission**: `partners_management.promotion.read`

**Description**: Returns only promotions where:
- status = "Active"
- Current date is between startDate and endDate
- isDeleted = false

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)

**Response** (200):
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

## Validation Rules

### Required Fields
- `promotionName` - Cannot be empty, max 200 chars
- `promotionBasis` - Must be "Period" or "Trip"
- `startDate` - Valid ISO date
- `endDate` - Valid ISO date, must be > startDate

### Conditional Validation
- **If promotionBasis = "Trip"**: `trip` field is REQUIRED
- **If promotionBasis = "Period"**: `trip` must be null

### Benefit Validation
- At least ONE benefit (passenger, cargo, or vehicle) must be enabled
- If enabled, `value` must be > 0
- `valueType` can be "percentage" or "fixed"

### Service Benefits
- Each item must have: `title`, `valueType`, `value`
- `value` must be >= 0

## RBAC Configuration

Module code: `partners_management`
Submodule code: `promotion`

### Permissions

| Action | Code | Description |
|--------|------|-------------|
| Read | `partners_management.promotion.read` | List and view promotions |
| Write | `partners_management.promotion.write` | Create promotions |
| Edit | `partners_management.promotion.edit` | Update promotions |
| Delete | `partners_management.promotion.delete` | Delete promotions |

### Example Usage

```javascript
// In routes
router.post(
  "/",
  checkPermission("partners_management", "promotion", "write"),
  createPromotion
)

// In middleware instantiation
const permission = checkPermission("partners_management", "promotion", "read")
```

## Promotion Calculation Flow

Promotions apply in the pricing calculation chain:

```
Base Price → Tax → Markup → Promotion → Commission
```

**Example**:
- Fare: 100
- Promotion: 10% discount
- Final: 90

### Key Rules

1. ✅ Promotion applies AFTER markup
2. ✅ Promotion applies BEFORE commission
3. ✅ Only ONE promotion applies per booking
4. ✅ Trip-based promotions OVERRIDE period-based promotions
5. ✅ Company isolation is enforced at all levels

## Company Isolation

- All queries filter by `company: companyId`
- Users can only access their company's promotions
- Soft delete prevents accidental data loss

## Postman Collection

A complete Postman collection is available at:
`/postman_collections/Promotion_APIs.postman_collection.json`

### Setup
1. Import the collection into Postman
2. Set variables:
   - `baseUrl`: http://localhost:3001/api
   - `token`: Your JWT token
3. Run requests

## Example Requests

### Period-based Promotion
```json
{
  "promotionName": "Summer Offer",
  "description": "Discount for all trips",
  "promotionBasis": "Period",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "status": "Active",
  "passengerBenefit": {
    "isEnabled": true,
    "valueType": "percentage",
    "value": 10
  }
}
```

### Trip-based Promotion
```json
{
  "promotionName": "Morning Express Offer",
  "promotionBasis": "Trip",
  "trip": "TRIP_ID_HERE",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "status": "Active",
  "passengerBenefit": {
    "isEnabled": true,
    "valueType": "percentage",
    "value": 15
  }
}
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error 1", "Specific error 2"]
}
```

### Common Error Codes

| Code | Message | Reason |
|------|---------|--------|
| 400 | Validation failed | Request body validation failed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Access denied | Insufficient permissions |
| 404 | Promotion not found | ID doesn't exist or belongs to different company |
| 500 | Internal server error | Server-side error |

## Testing

### Using Postman
1. Load the Postman collection
2. Set authentication token
3. Test each endpoint

### Using curl
```bash
# Create promotion
curl -X POST http://localhost:3001/api/promotions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# List promotions
curl http://localhost:3001/api/promotions \
  -H "Authorization: Bearer TOKEN"

# Get active promotions
curl http://localhost:3001/api/promotions/active/list \
  -H "Authorization: Bearer TOKEN"
```

## Integration Notes

### With Booking System
When processing a booking:
1. Check for active promotions (by trip or period)
2. Apply best matching promotion
3. Calculate discount based on service type (passenger/cargo/vehicle)
4. Deduct promotion benefit from subtotal before commission

### With Pricing Engine
- Promotions must be evaluated against current date
- Multiple promotion types should be ranked by benefit
- Only highest benefit should apply

## Future Enhancements

- Promotion analytics and reporting
- A/B testing framework
- Bulk promotion upload
- Automated promotion scheduling
- Promotional code management
- Usage tracking and metrics
