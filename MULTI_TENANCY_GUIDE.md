# Multi-Tenancy Implementation Guide

## Overview
This guide explains how to add company-based data isolation to all controllers and services in the shipment system.

## Pattern Applied

### 1. Models
All company-related models now have a `company` field:
\`\`\`javascript
company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  required: true,
  index: true,
}
\`\`\`

**Models Updated:**
- Agent ✓
- Ship ✓
- Trip ✓
- User ✓
- Cabin ✓
- Port ✓
- Promotion ✓
- B2CCustomer ✓

### 2. Services
All service methods now accept `companyId` as a parameter and filter queries by company:

**Pattern:**
\`\`\`javascript
// Before
async function listAgents(query) {
  const filter = { isDeleted: false }
  // ...
}

// After
async function listAgents(query, companyId) {
  const filter = { isDeleted: false, company: companyId }
  // ...
}
\`\`\`

**Apply to all services:**
- agentService ✓
- shipService
- tripService
- userService
- cabinService
- portService
- promotionService
- b2cCustomerService

### 3. Controllers
All controller methods now pass `req.companyId` to service methods:

**Pattern:**
\`\`\`javascript
// Before
async function index(req, res) {
  const result = await service.listAgents(req.query)
  res.json(result)
}

// After
async function index(req, res) {
  const result = await service.listAgents(req.query, req.companyId)
  res.json(result)
}
\`\`\`

**Apply to all controllers:**
- agentController ✓
- shipController
- tripController
- userController
- cabinController
- portController
- promotionController
- b2cCustomerController

### 4. Routes
All company-related routes must include authentication and company extraction middleware:

**Pattern:**
\`\`\`javascript
const { verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")

const router = express.Router()

// Apply middleware to all routes
router.use(verifyCompanyToken, extractCompanyId)

router.get("/", asyncHandler(controller.index))
router.post("/", asyncHandler(controller.create))
// ... other routes
\`\`\`

**Apply to all routes:**
- agentRoutes ✓
- shipRoutes
- tripRoutes
- userRoutes
- cabinRoutes
- portRoutes
- promotionRoutes
- b2cCustomerRoutes

## JWT Token Structure

Company login generates a token with `companyId`:
\`\`\`javascript
const token = jwt.sign(
  {
    id: company._id,
    companyId: company._id,  // <-- Used for data isolation
    companyName: company.companyName,
    role: "company",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" },
)
\`\`\`

## Data Isolation Verification

Each company can only access:
- Their own agents
- Their own ships
- Their own trips
- Their own users
- Their own cabins
- Their own ports
- Their own promotions
- Their own customers

All queries automatically filter by `company: req.companyId`.

## SuperAdmin Access

SuperAdmin routes do NOT use `extractCompanyId` middleware, allowing them to:
- View all companies
- Approve/reject companies
- Access company management endpoints

## Implementation Checklist

- [x] Add companyId to all models
- [x] Update Agent service and controller
- [x] Update Agent routes with middleware
- [ ] Update Ship service and controller
- [ ] Update Ship routes with middleware
- [ ] Update Trip service and controller
- [ ] Update Trip routes with middleware
- [ ] Update User service and controller
- [ ] Update User routes with middleware
- [ ] Update Cabin service and controller
- [ ] Update Cabin routes with middleware
- [ ] Update Port service and controller
- [ ] Update Port routes with middleware
- [ ] Update Promotion service and controller
- [ ] Update Promotion routes with middleware
- [ ] Update B2CCustomer service and controller
- [ ] Update B2CCustomer routes with middleware

## Testing

Test company isolation:
1. Login as Company A
2. Create an agent
3. Login as Company B
4. Verify Company B cannot see Company A's agent
5. Create an agent in Company B
6. Verify both companies see only their own agents
