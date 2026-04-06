/**
 * BASE LEDGERS MASTER CONFIGURATION
 *
 * This is the DEFINITIVE list of system-created base ledgers that are:
 * - Created at platform initialization (SuperAdminLedger)
 * - Copied to each company during registration (CompanyLedger)
 * - LOCKED and NOT EDITABLE (systemAccount = true, locked = true)
 * - MUST include fixed ledgerDescription values
 *
 * Descriptions come from the approved accounting chart and are NOT dynamic.
 * Changing these values requires careful audit and client approval.
 */

const BASE_LEDGERS = [
  // ===== PROPERTY PLANT & EQUIPMENTS (Type Code: 11) =====
  {
    ledgerCode: "11-00001",
    ledgerDescription: "Ships & Associated Equipments",
    ledgerType: "Property Plant & Equipments",
    typeSequence: "11",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "11-00002",
    ledgerDescription: "Loading & Offloading Equipments",
    ledgerType: "Property Plant & Equipments",
    typeSequence: "11",
    ledgerSequenceNumber: 2,
  },

  // ===== FURNITURE & OFFICE EQUIPMENTS (Type Code: 12) =====
  {
    ledgerCode: "12-00001",
    ledgerDescription: "IT Equipments",
    ledgerType: "Furniture & Office Equipments",
    typeSequence: "12",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "12-00002",
    ledgerDescription: "Furniture",
    ledgerType: "Furniture & Office Equipments",
    typeSequence: "12",
    ledgerSequenceNumber: 2,
  },
  {
    ledgerCode: "12-00003",
    ledgerDescription: "Office Equipments",
    ledgerType: "Furniture & Office Equipments",
    typeSequence: "12",
    ledgerSequenceNumber: 3,
  },

  // ===== MOTOR VEHICLES (Type Code: 13) =====
  {
    ledgerCode: "13-00001",
    ledgerDescription: "Heavy Vehicles",
    ledgerType: "Motor Vehicles",
    typeSequence: "13",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "13-00002",
    ledgerDescription: "Light Vehicles",
    ledgerType: "Motor Vehicles",
    typeSequence: "13",
    ledgerSequenceNumber: 2,
  },

  // ===== BUSINESS PARTNERS (Type Code: 22) =====
  {
    ledgerCode: "22-00001",
    ledgerDescription: "B2C Partners",
    ledgerType: "Business Partners",
    typeSequence: "22",
    ledgerSequenceNumber: 1,
  },

  // ===== ACCOUNT RECEIVABLES (Type Code: 24) =====
  {
    ledgerCode: "24-00001",
    ledgerDescription: "Customer A",
    ledgerType: "Account Receivables",
    typeSequence: "24",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "24-00002",
    ledgerDescription: "Customer B",
    ledgerType: "Account Receivables",
    typeSequence: "24",
    ledgerSequenceNumber: 2,
  },

  // ===== ACCOUNT PAYABLES (Type Code: 31) =====
  {
    ledgerCode: "31-00001",
    ledgerDescription: "Supplier A",
    ledgerType: "Account Payables",
    typeSequence: "31",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "31-00002",
    ledgerDescription: "Supplier B",
    ledgerType: "Account Payables",
    typeSequence: "31",
    ledgerSequenceNumber: 2,
  },

  // ===== TAXES (Type Code: 36) =====
  {
    ledgerCode: "36-00001",
    ledgerDescription: "Tax A",
    ledgerType: "Taxes",
    typeSequence: "36",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "36-00002",
    ledgerDescription: "Tax B",
    ledgerType: "Taxes",
    typeSequence: "36",
    ledgerSequenceNumber: 2,
  },
  {
    ledgerCode: "36-00003",
    ledgerDescription: "Tax C",
    ledgerType: "Taxes",
    typeSequence: "36",
    ledgerSequenceNumber: 3,
  },

  // ===== GOVERNMENT LIABILITIES (Type Code: 37) =====
  {
    ledgerCode: "37-00001",
    ledgerDescription: "Government Liabilities",
    ledgerType: "Government Liabilities",
    typeSequence: "37",
    ledgerSequenceNumber: 1,
  },

  // ===== SHARE CAPITAL (Type Code: 41) =====
  {
    ledgerCode: "41-00001",
    ledgerDescription: "Share Capital",
    ledgerType: "Share Capital",
    typeSequence: "41",
    ledgerSequenceNumber: 1,
  },

  // ===== RETURN EARNINGS (Type Code: 42) =====
  {
    ledgerCode: "42-00001",
    ledgerDescription: "Return Earnings",
    ledgerType: "Return Earnings",
    typeSequence: "42",
    ledgerSequenceNumber: 1,
  },

  // ===== INCOME (Type Code: 51) =====
  {
    ledgerCode: "51-00001",
    ledgerDescription: "Ticket Basic Price Income",
    ledgerType: "Income",
    typeSequence: "51",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "51-00002",
    ledgerDescription: "Markup Income",
    ledgerType: "Income",
    typeSequence: "51",
    ledgerSequenceNumber: 2,
  },
  {
    ledgerCode: "51-00003",
    ledgerDescription: "Commission Income",
    ledgerType: "Income",
    typeSequence: "51",
    ledgerSequenceNumber: 3,
  },
  {
    ledgerCode: "51-00004",
    ledgerDescription: "Void & Refund Surcharge",
    ledgerType: "Income",
    typeSequence: "51",
    ledgerSequenceNumber: 4,
  },

  // ===== COST OF INCOME (Type Code: 61) =====
  {
    ledgerCode: "61-00001",
    ledgerDescription: "Ship Licenses & Registrations",
    ledgerType: "Cost of Income",
    typeSequence: "61",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "61-00002",
    ledgerDescription: "Ship Repair & Maintenance",
    ledgerType: "Cost of Income",
    typeSequence: "61",
    ledgerSequenceNumber: 2,
  },
  {
    ledgerCode: "61-00003",
    ledgerDescription: "Trips Fuel & Charges",
    ledgerType: "Cost of Income",
    typeSequence: "61",
    ledgerSequenceNumber: 3,
  },

  // ===== SELLING EXPENSES (Type Code: 71) =====
  {
    ledgerCode: "71-00001",
    ledgerDescription: "Commission Expense",
    ledgerType: "Selling Expenses",
    typeSequence: "71",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "71-00002",
    ledgerDescription: "Discount Expense",
    ledgerType: "Selling Expenses",
    typeSequence: "71",
    ledgerSequenceNumber: 2,
  },

  // ===== GENERAL & ADMIN EXPENSES (Type Code: 81) =====
  {
    ledgerCode: "81-00001",
    ledgerDescription: "Employment Expenses",
    ledgerType: "General & Admin Expenses",
    typeSequence: "81",
    ledgerSequenceNumber: 1,
  },
  {
    ledgerCode: "81-00002",
    ledgerDescription: "Training & Capacity Building",
    ledgerType: "General & Admin Expenses",
    typeSequence: "81",
    ledgerSequenceNumber: 2,
  },
  {
    ledgerCode: "81-00003",
    ledgerDescription: "Transportation Expenditure",
    ledgerType: "General & Admin Expenses",
    typeSequence: "81",
    ledgerSequenceNumber: 3,
  },
]

module.exports = {
  BASE_LEDGERS,
}
