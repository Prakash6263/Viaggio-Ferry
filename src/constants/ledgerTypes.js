const LEDGER_TYPE_MAPPING = {
  "Property Plant & Equipments": {
    sequence: "11",
    category: "Asset",
  },
  "Furniture & Office Equipments": {
    sequence: "12",
    category: "Asset",
  },
  "Motor Vehicles": {
    sequence: "13",
    category: "Asset",
  },
  "Other Fixed Assets": {
    sequence: "14",
    category: "Asset",
  },
  "Cash & Banks": {
    sequence: "21",
    category: "Asset",
  },
  "Business Partners": {
    sequence: "22",
    category: "Asset",
  },
  "Salesmen Receivables": {
    sequence: "23",
    category: "Asset",
  },
  "Account Receivables": {
    sequence: "24",
    category: "Asset",
  },
  Prepayments: {
    sequence: "25",
    category: "Asset",
  },
  "Other Current Assets": {
    sequence: "26",
    category: "Asset",
  },
  "Account Payables": {
    sequence: "31",
    category: "Liability",
  },
  "Bank Borrowings": {
    sequence: "32",
    category: "Liability",
  },
  Accruals: {
    sequence: "33",
    category: "Liability",
  },
  Taxes: {
    sequence: "34",
    category: "Liability",
  },
  "Government Liabilities": {
    sequence: "35",
    category: "Liability",
  },
  "Share Capital": {
    sequence: "41",
    category: "Equity",
  },
  "Retained Earnings": {
    sequence: "42",
    category: "Equity",
  },
  Income: {
    sequence: "52",
    category: "Revenue",
  },
  "Cost of Income": {
    sequence: "61",
    category: "Expense",
  },
  "Selling Expenses": {
    sequence: "71",
    category: "Expense",
  },
  "General & Admin Expenses": {
    sequence: "81",
    category: "Expense",
  },
}

// Extract ledger types and sequences for validation
const LEDGER_TYPES = Object.keys(LEDGER_TYPE_MAPPING)
const LEDGER_SEQUENCES = Object.values(LEDGER_TYPE_MAPPING).map((item) => item.sequence)

module.exports = {
  LEDGER_TYPE_MAPPING,
  LEDGER_TYPES,
  LEDGER_SEQUENCES,
}
