# Trip Ticketing Rules API Documentation

## Overview

The Trip Ticketing Rules API allows you to assign and manage ticketing rules for specific ferry trips. This feature enables flexible rule management per trip, allowing different refund, void, and reissue policies for different trips.

---

## Base URL

```
http://localhost:5000/api/trips
```

## Authentication

All endpoints require JWT authentication via Bearer token.

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Assign Ticketing Rule to Trip

**Endpoint:** `POST /api/trips/{tripId}/ticketing-rules`

**Permission:** `sales-bookings:trip:write`

**Description:** Assign a ticketing rule to a trip.

**Request Body:**

```json
{
  "ruleType": "REFUND",
  "ticketingRule": "rule_id_here"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tripId | string | Yes | Trip ID (from URL path) |
| ruleType | enum | Yes | Rule type: VOID, REFUND, REISSUE |
| ticketingRule | ObjectId | Yes | TicketingRule ID to assign |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "message": "Rule assigned successfully",
  "data": {
    "_id": "rule_id",
    "company": "company_id",
    "trip": "trip_id",
    "ruleType": "REFUND",
    "ticketingRule": "ticketing_rule_id",
    "isActive": true,
    "isDeleted": false,
    "createdBy": {
      "id": "user_id",
      "name": "user@example.com",
      "type": "user",
      "layer": "admin"
    },
    "updatedBy": {
      "id": "user_id",
      "name": "user@example.com",
      "type": "user",
      "layer": "admin"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid input or validation failure
  - "Rule type mismatch"
  - "Duplicate rule type not allowed for trip"
  - "Cannot modify ticket rules after bookings exist"

- `404 Not Found` - Trip or TicketingRule not found

- `403 Forbidden` - Insufficient permissions

---

### 2. Get All Ticketing Rules for Trip

**Endpoint:** `GET /api/trips/{tripId}/ticketing-rules`

**Permission:** `sales-bookings:trip:read`

**Description:** Retrieve all ticketing rules assigned to a trip.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Rules retrieved successfully",
  "data": [
    {
      "_id": "rule_id_1",
      "company": "company_id",
      "trip": "trip_id",
      "ruleType": "REFUND",
      "ticketingRule": {
        "_id": "ticketing_rule_id",
        "ruleName": "Standard Refund Policy",
        "restrictedWindowHours": 48,
        "normalFee": {
          "type": "NONE",
          "value": 0
        },
        "restrictedPenalty": {
          "type": "FIXED",
          "value": 500
        },
        "noShowPenalty": {
          "type": "PERCENTAGE",
          "value": 10
        },
        "conditions": "Full refund allowed up to 48 hours before departure",
        "ruleType": "REFUND"
      },
      "isActive": true,
      "isDeleted": false,
      "createdBy": {
        "id": "user_id",
        "name": "user@example.com",
        "type": "user",
        "layer": "admin"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses:**

- `404 Not Found` - Trip not found

- `403 Forbidden` - Insufficient permissions

---

### 3. Update Ticketing Rule for Trip

**Endpoint:** `PUT /api/trips/{tripId}/ticketing-rules/{id}`

**Permission:** `sales-bookings:trip:edit`

**Description:** Update a ticketing rule assignment for a trip.

**Request Body:**

```json
{
  "isActive": false,
  "ruleType": "VOID",
  "ticketingRule": "new_rule_id"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tripId | string | Yes | Trip ID (from URL path) |
| id | string | Yes | Rule ID (from URL path) |
| isActive | boolean | No | Activate/deactivate the rule |
| ruleType | enum | No | New rule type |
| ticketingRule | ObjectId | No | New TicketingRule ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Rule updated successfully",
  "data": {
    "_id": "rule_id",
    "company": "company_id",
    "trip": "trip_id",
    "ruleType": "VOID",
    "ticketingRule": "ticketing_rule_id",
    "isActive": false,
    "isDeleted": false,
    "createdBy": {...},
    "updatedBy": {
      "id": "user_id",
      "name": "user@example.com",
      "type": "user",
      "layer": "admin"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Validation failure or booking exists

- `404 Not Found` - Rule not found

- `403 Forbidden` - Insufficient permissions

---

### 4. Delete Ticketing Rule from Trip

**Endpoint:** `DELETE /api/trips/{tripId}/ticketing-rules/{id}`

**Permission:** `sales-bookings:trip:delete`

**Description:** Delete (soft delete) a ticketing rule assignment from a trip.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Cannot modify after bookings exist

- `404 Not Found` - Rule not found

- `403 Forbidden` - Insufficient permissions

---

## Validation Rules

### 1. Trip Validation
- Trip must exist and belong to the same company
- Trip must not be deleted

### 2. TicketingRule Validation
- TicketingRule must exist and belong to the same company
- TicketingRule must be active (`isActive: true`)
- TicketingRule must not be deleted

### 3. Rule Type Validation
- Requested `ruleType` must match the `TicketingRule.ruleType`
- Error: "Rule type mismatch"

### 4. Duplicate Prevention
- Only one rule per `ruleType` per trip is allowed
- Error: "Duplicate rule type not allowed for trip"

### 5. Booking Constraints
- Cannot assign, update, or delete rules if trip has existing bookings
- Error: "Cannot modify ticket rules after bookings exist"

---

## Multi-Tenancy

All endpoints are company-scoped:
- Trips, TicketingRules, and TripTicketRules must belong to the authenticated user's company
- Cross-company access is prevented at the database level

---

## Soft Delete

- Rules are soft-deleted (isDeleted = true)
- Deleted rules are automatically excluded from queries
- Permanent deletion is not supported

---

## Audit Trail

All operations are tracked:

```json
{
  "createdBy": {
    "id": "user_id",
    "name": "user@example.com",
    "type": "user",
    "layer": "admin"
  },
  "updatedBy": {
    "id": "user_id",
    "name": "user@example.com",
    "type": "user",
    "layer": "admin"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**HTTP Status Codes:**

- `200 OK` - Request succeeded
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Example Workflow

### 1. Get All Tickets Rules for a Trip

```bash
curl -X GET http://localhost:5000/api/trips/trip_123/ticketing-rules \
  -H "Authorization: Bearer <token>"
```

### 2. Assign a New Rule

```bash
curl -X POST http://localhost:5000/api/trips/trip_123/ticketing-rules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ruleType": "REFUND",
    "ticketingRule": "rule_456"
  }'
```

### 3. Update the Rule

```bash
curl -X PUT http://localhost:5000/api/trips/trip_123/ticketing-rules/trip_rule_789 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### 4. Delete the Rule

```bash
curl -X DELETE http://localhost:5000/api/trips/trip_123/ticketing-rules/trip_rule_789 \
  -H "Authorization: Bearer <token>"
```

---

## Database Indexes

The TripTicketRule collection has the following indexes for optimal performance:

- `{ company: 1, trip: 1 }` - Find rules by company and trip
- `{ trip: 1, ruleType: 1 }` - Unique constraint to prevent duplicate ruleTypes per trip
- `{ company: 1, isDeleted: 1 }` - Filter deleted records by company

