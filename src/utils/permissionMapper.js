/**
 * Permission Mapping Utility
 * Maps routes to their required permissions (module, submodule, action)
 * This ensures consistency across all routes and makes permission requirements explicit
 */

const PERMISSION_MAPPING = {
  // ==================== ADMINISTRATION ====================
  "POST /api/users": {
    module: "administration",
    submodule: "users",
    action: "write",
    description: "Create new user",
  },
  "GET /api/users": {
    module: "administration",
    submodule: "users",
    action: "read",
    description: "List all users",
  },
  "GET /api/users/:userId": {
    module: "administration",
    submodule: "users",
    action: "read",
    description: "Get user details",
  },
  "PUT /api/users/:userId": {
    module: "administration",
    submodule: "users",
    action: "edit",
    description: "Update user information",
  },
  "DELETE /api/users/:userId": {
    module: "administration",
    submodule: "users",
    action: "delete",
    description: "Delete user",
  },
  "GET /api/users/by-status/:status": {
    module: "administration",
    submodule: "users",
    action: "read",
    description: "Get users by status",
  },
  "GET /api/users/salesman/list": {
    module: "administration",
    submodule: "users",
    action: "read",
    description: "Get salesman users",
  },

  // ==================== CURRENCY ====================
  "GET /api/currencies": {
    module: "administration",
    submodule: "currency",
    action: "read",
    description: "List currencies",
  },
  "GET /api/currencies/:code": {
    module: "administration",
    submodule: "currency",
    action: "read",
    description: "Get currency details",
  },
  "GET /api/currencies/codes": {
    module: "administration",
    submodule: "currency",
    action: "read",
    description: "Get global currency codes",
  },

  // ==================== COMPANY CURRENCY ====================
  "POST /api/companies/:companyId/currencies": {
    module: "settings",
    submodule: "company-profile",
    action: "write",
    description: "Add currency to company",
  },
  "GET /api/companies/:companyId/currencies": {
    module: "settings",
    submodule: "company-profile",
    action: "read",
    description: "List company currencies",
  },
  "PUT /api/companies/:companyId/currencies/:currencyCode": {
    module: "settings",
    submodule: "company-profile",
    action: "edit",
    description: "Update company currency",
  },
  "DELETE /api/companies/:companyId/currencies/:currencyCode": {
    module: "settings",
    submodule: "company-profile",
    action: "delete",
    description: "Remove currency from company",
  },

  // ==================== PARTNERS ====================
  "POST /api/partners": {
    module: "partners-management",
    submodule: "business-partners",
    action: "write",
    description: "Create new partner",
  },
  "GET /api/partners": {
    module: "partners-management",
    submodule: "business-partners",
    action: "read",
    description: "List partners",
  },
  "GET /api/partners/:id": {
    module: "partners-management",
    submodule: "business-partners",
    action: "read",
    description: "Get partner details",
  },
  "PUT /api/partners/:id": {
    module: "partners-management",
    submodule: "business-partners",
    action: "edit",
    description: "Update partner",
  },
  "PATCH /api/partners/:id/disable": {
    module: "partners-management",
    submodule: "business-partners",
    action: "edit",
    description: "Disable partner",
  },
  "PATCH /api/partners/:id/enable": {
    module: "partners-management",
    submodule: "business-partners",
    action: "edit",
    description: "Enable partner",
  },

  // ==================== TAXES ====================
  "POST /api/company/taxes": {
    module: "administration",
    submodule: "taxes",
    action: "write",
    description: "Create tax",
  },
  "GET /api/company/taxes": {
    module: "administration",
    submodule: "taxes",
    action: "read",
    description: "List taxes",
  },
  "GET /api/company/taxes/:id": {
    module: "administration",
    submodule: "taxes",
    action: "read",
    description: "Get tax details",
  },
  "PUT /api/company/taxes/:id": {
    module: "administration",
    submodule: "taxes",
    action: "edit",
    description: "Update tax",
  },
  "DELETE /api/company/taxes/:id": {
    module: "administration",
    submodule: "taxes",
    action: "delete",
    description: "Delete tax",
  },

  // ==================== BANK & CASH ACCOUNTS ====================
  "POST /api/bank-cash-accounts": {
    module: "finance",
    submodule: "bank-cash-accounts",
    action: "write",
    description: "Create bank/cash account",
  },
  "GET /api/bank-cash-accounts": {
    module: "finance",
    submodule: "bank-cash-accounts",
    action: "read",
    description: "List bank/cash accounts",
  },
  "GET /api/bank-cash-accounts/:id": {
    module: "finance",
    submodule: "bank-cash-accounts",
    action: "read",
    description: "Get bank/cash account details",
  },
  "PUT /api/bank-cash-accounts/:id": {
    module: "finance",
    submodule: "bank-cash-accounts",
    action: "edit",
    description: "Update bank/cash account",
  },
  "DELETE /api/bank-cash-accounts/:id": {
    module: "finance",
    submodule: "bank-cash-accounts",
    action: "delete",
    description: "Delete bank/cash account",
  },

  // ==================== TERMS & CONDITIONS ====================
  "GET /api/terms-and-conditions": {
    module: "administration",
    submodule: "terms-conditions",
    action: "read",
    description: "Get terms and conditions",
  },
  "POST /api/terms-and-conditions": {
    module: "administration",
    submodule: "terms-conditions",
    action: "write",
    description: "Create terms and conditions",
  },
  "PUT /api/terms-and-conditions/:id": {
    module: "administration",
    submodule: "terms-conditions",
    action: "edit",
    description: "Update terms and conditions",
  },

  // ==================== CONTACT MESSAGES ====================
  "GET /api/contact-messages": {
    module: "administration",
    submodule: "contact-messages",
    action: "read",
    description: "List contact messages",
  },
  "GET /api/contact-messages/:id": {
    module: "administration",
    submodule: "contact-messages",
    action: "read",
    description: "Get contact message",
  },
  "POST /api/contact-messages": {
    module: "administration",
    submodule: "contact-messages",
    action: "write",
    description: "Create contact message",
  },
  "DELETE /api/contact-messages/:id": {
    module: "administration",
    submodule: "contact-messages",
    action: "delete",
    description: "Delete contact message",
  },

  // ==================== ACCESS GROUPS ====================
  "POST /api/access-groups": {
    module: "settings",
    submodule: "roles-permissions",
    action: "write",
    description: "Create access group",
  },
  "GET /api/access-groups": {
    module: "settings",
    submodule: "roles-permissions",
    action: "read",
    description: "List access groups",
  },
  "GET /api/access-groups/:id": {
    module: "settings",
    submodule: "roles-permissions",
    action: "read",
    description: "Get access group details",
  },
  "PUT /api/access-groups/:id": {
    module: "settings",
    submodule: "roles-permissions",
    action: "edit",
    description: "Update access group",
  },
  "DELETE /api/access-groups/:id": {
    module: "settings",
    submodule: "roles-permissions",
    action: "delete",
    description: "Delete access group",
  },

  // ==================== USER ACCESS GROUPS ====================
  "POST /api/users/:userId/assign-access-group": {
    module: "settings",
    submodule: "roles-permissions",
    action: "edit",
    description: "Assign access group to user",
  },
  "GET /api/users/:userId/access-groups": {
    module: "settings",
    submodule: "roles-permissions",
    action: "read",
    description: "Get user access groups",
  },
  "GET /api/users/:userId/permissions/:moduleCode": {
    module: "settings",
    submodule: "roles-permissions",
    action: "read",
    description: "Get user permissions for module",
  },
  "DELETE /api/users/:userId/access-group/:moduleCode": {
    module: "settings",
    submodule: "roles-permissions",
    action: "delete",
    description: "Remove access group from user",
  },

  // ==================== EXCHANGE RATES ====================
  "POST /api/exchange-rates": {
    module: "administration",
    submodule: "currency",
    action: "write",
    description: "Create exchange rate",
  },
  "GET /api/exchange-rates": {
    module: "administration",
    submodule: "currency",
    action: "read",
    description: "List exchange rates",
  },
  "PUT /api/exchange-rates/:id": {
    module: "administration",
    submodule: "currency",
    action: "edit",
    description: "Update exchange rate",
  },
  "DELETE /api/exchange-rates/:id": {
    module: "administration",
    submodule: "currency",
    action: "delete",
    description: "Delete exchange rate",
  },

  // ==================== TICKETING RULES ====================
  "POST /api/ticketing-rules": {
    module: "sales-bookings",
    submodule: "ticketing-rules",
    action: "write",
    description: "Create ticketing rule",
  },
  "GET /api/ticketing-rules": {
    module: "sales-bookings",
    submodule: "ticketing-rules",
    action: "read",
    description: "List ticketing rules",
  },
  "GET /api/ticketing-rules/:id": {
    module: "sales-bookings",
    submodule: "ticketing-rules",
    action: "read",
    description: "Get ticketing rule details",
  },
  "PUT /api/ticketing-rules/:id": {
    module: "sales-bookings",
    submodule: "ticketing-rules",
    action: "edit",
    description: "Update ticketing rule",
  },
  "DELETE /api/ticketing-rules/:id": {
    module: "sales-bookings",
    submodule: "ticketing-rules",
    action: "delete",
    description: "Delete ticketing rule",
  },
}

/**
 * Get permission requirement for a route
 * @param {string} method - HTTP method
 * @param {string} path - Route path (without query params)
 * @returns {Object|null} Permission requirement or null if no permission required
 */
const getPermissionForRoute = (method, path) => {
  const key = `${method.toUpperCase()} ${path}`
  return PERMISSION_MAPPING[key] || null
}

/**
 * Format route path to match permission mapping
 * Converts actual paths like /users/123 to /users/:userId
 * @param {string} path - Actual request path
 * @returns {string} Formatted path for permission mapping
 */
const formatPathForPermissionCheck = (path) => {
  // Remove query parameters
  let cleanPath = path.split("?")[0]

  // Replace UUIDs/IDs with parameter placeholders
  cleanPath = cleanPath.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, "/:id") // MongoDB ObjectId
  cleanPath = cleanPath.replace(/\/[a-f0-9-]{36}(?=\/|$)/gi, "/:id") // UUID
  cleanPath = cleanPath.replace(/\/\d+(?=\/|$)/gi, "/:id") // Numeric ID

  // Specific replacements for known patterns
  cleanPath = cleanPath.replace(/\/:id(?=\/access-group)/, "/:userId")
  cleanPath = cleanPath.replace(/\/:id(?=\/assign-access-group)/, "/:userId")
  cleanPath = cleanPath.replace(/\/:id(?=\/permissions)/, "/:userId")
  cleanPath = cleanPath.replace(/\/:id(?=\/access-groups)/, "/:userId")
  cleanPath = cleanPath.replace(/\/:id(?=\/by-module-layer)/, "/:userId")

  return cleanPath
}

module.exports = {
  PERMISSION_MAPPING,
  getPermissionForRoute,
  formatPathForPermissionCheck,
}
