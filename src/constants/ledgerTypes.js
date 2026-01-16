// constants/ledgerTypes.js

const LEDGER_TYPES = [
  // ===== ASSETS =====
  "Property Plant & Equipments",
  "Furniture & Office Equipments",
  "Motor Vehicles",
  "Other Fixed Assets",

  "Cash & Banks",
  "Business Partners",
  "Salesmen",
  "Account Receivables",
  "Prepayments",
  "Other Current Assets",

  // ===== LIABILITIES =====
  "Account Payables",
  "Salesmen Payables",
  "Bank Overdrafts",
  "Bank Borrowings",
  "Accruals",
  "Taxes",
  "Government Liabilities",

  // ===== EQUITY =====
  "Share Capital",
  "Return Earnings",

  // ===== INCOME / EXPENSE =====
  "Income",
  "Cost of Income",
  "Selling Expenses",
  "General & Admin Expenses",
]

const LEDGER_TYPE_MAPPING = {
  // Assets
  "Property Plant & Equipments": "11",
  "Furniture & Office Equipments": "12",
  "Motor Vehicles": "13",
  "Other Fixed Assets": "14",

  "Cash & Banks": "21",
  "Business Partners": "22",
  "Salesmen": "23",
  "Account Receivables": "24",
  Prepayments: "25",
  "Other Current Assets": "26",

  // Liabilities
  "Account Payables": "31",
  "Salesmen Payables": "32",
  "Bank Overdrafts": "33",
  "Bank Borrowings": "34",
  Accruals: "35",
  Taxes: "36",
  "Government Liabilities": "37",

  // Equity
  "Share Capital": "41",
  "Return Earnings": "42",

  // Income / Expense
  Income: "51",
  "Cost of Income": "61",
  "Selling Expenses": "71",
  "General & Admin Expenses": "81",
}

const SYSTEM_ONLY_LEDGER_TYPES = [
  "Business Partners",
  "Salesmen",
  "Account Receivables",
  "Account Payables",
  "Cash & Banks", // Bank ledgers are now system-generated only as per Rule 4
]

const COMPANY_ALLOWED_LEDGER_TYPES = [
  "Cost of Income",
  "Selling Expenses",
  "General & Admin Expenses",
  "Taxes",
  "Other Current Assets", // Allow limited current assets for flexibility
]

const LEDGER_CREATED_BY = {
  SUPER_ADMIN: "super_admin",
  COMPANY: "company",
  SYSTEM: "system",
}

module.exports = {
  LEDGER_TYPES,
  LEDGER_TYPE_MAPPING,
  SYSTEM_ONLY_LEDGER_TYPES,
  COMPANY_ALLOWED_LEDGER_TYPES,
  LEDGER_CREATED_BY,
}
