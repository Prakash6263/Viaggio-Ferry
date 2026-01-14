/**
 * RBAC CONSTANTS
 * This file MUST stay in sync with frontend moduleSubmodules config
 * Source of truth: AddGroupPermission.jsx
 */

// ==============================
// MODULE CODES
// ==============================
const MODULE_CODES = [
  "settings",
  "administration",
  "ship-trips",
  "partners-management",
  "sales-bookings",
  "checkin-boardings",
  "finance",
  "website",
]

// ==============================
// LAYER CODES
// ==============================
const LAYER_CODES = [
  "company",
  "marine-agent",
  "commercial-agent",
  "selling-agent",
]

// ==============================
// MODULE → SUBMODULE → ALLOWED PERMISSIONS
// ==============================
const MODULE_SUBMODULES = {
  settings: [
    {
      code: "company-profile",
      label: "Company Profile",
      allowedPermissions: ["read", "write", "edit"],
    },
    {
      code: "roles-permissions",
      label: "Roles & Permissions",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "load-types",
      label: "Load Types",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "partners-classifications",
      label: "Partners Classifications",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "ports",
      label: "Ports",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "cabins",
      label: "Cabins",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "payload-type",
      label: "Payload Type",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
  ],

  administration: [
    {
      code: "users",
      label: "Users",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "currency",
      label: "Currency",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "taxes",
      label: "Taxes",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "promotions",
      label: "Promotions",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "contact-messages",
      label: "Contact Messages",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "terms-conditions",
      label: "Term & Conditions",
      allowedPermissions: ["read", "write", "edit"],
    },
  ],

  "ship-trips": [
    {
      code: "ships",
      label: "Ships",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "trips",
      label: "Trips",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
  ],

  "partners-management": [
    {
      code: "business-partners",
      label: "Business Partners",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "service-partners",
      label: "Service Partners",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "salesmen",
      label: "Salesmen",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "markup-discount-board",
      label: "Markup & Discount Board",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "commission-board",
      label: "Commission Board",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
  ],

  "sales-bookings": [
    {
      code: "price-list",
      label: "Price List",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "ticketing-rules",
      label: "Ticketing Rules",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "bookings-tickets",
      label: "Bookings & Tickets",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "excess-baggage-tickets",
      label: "Excess Baggage Tickets",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
  ],

  "checkin-boardings": [
    {
      code: "passenger-checking-in",
      label: "Passenger Checking In",
      allowedPermissions: ["read", "write"],
    },
    {
      code: "cargo-checking-in",
      label: "Cargo Checking In",
      allowedPermissions: ["read", "write"],
    },
    {
      code: "vehicle-checking-in",
      label: "Vehicle Checking In",
      allowedPermissions: ["read", "write"],
    },
    {
      code: "passenger-boarding",
      label: "Passenger Boarding",
      allowedPermissions: ["read", "write"],
    },
    {
      code: "vehicle-boarding",
      label: "Vehicle Boarding",
      allowedPermissions: ["read", "write"],
    },
    {
      code: "trip-completion-closure",
      label: "Trip Completion & Closure",
      allowedPermissions: ["read", "write"],
    },
  ],

  finance: [
    {
      code: "chart-of-accounts",
      label: "Chart of Accounts",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "bank-cash-accounts",
      label: "Bank & Cash Accounts",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "journal-entries",
      label: "Journal Entries",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "agent-topup-deposits",
      label: "Agent Top up Deposits",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "payments-receipts",
      label: "Payments & Receipts",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "general-ledger",
      label: "General Ledger",
      allowedPermissions: ["read"],
    },
    {
      code: "trial-balance",
      label: "Trial Balance",
      allowedPermissions: ["read"],
    },
    {
      code: "income-statement",
      label: "Income Statement",
      allowedPermissions: ["read"],
    },
    {
      code: "balance-sheet",
      label: "Balance Sheet",
      allowedPermissions: ["read"],
    },
  ],

   website: [
    {
      code: "issue-passenger-tickets",
      label: "Issue Passenger Tickets",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "issue-cargo-bills",
      label: "Issue Cargo Bills",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
    {
      code: "issue-vehicle-tickets",
      label: "Issue Vehicles Tickets",
      allowedPermissions: ["read", "write", "edit", "delete"],
    },
  ],
}


// ==============================
// ALL POSSIBLE PERMISSIONS
// ==============================
const PERMISSION_TYPES = ["read", "write", "edit", "delete"]

module.exports = {
  MODULE_CODES,
  LAYER_CODES,
  MODULE_SUBMODULES,
  PERMISSION_TYPES,
}
