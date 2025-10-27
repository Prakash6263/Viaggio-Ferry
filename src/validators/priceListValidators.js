const { body, query, param } = require("express-validator")

const createPriceListValidator = [
  body("type")
    .notEmpty()
    .withMessage("Price list type is required")
    .isIn(["Passenger", "Vehicle", "Cargo"])
    .withMessage("Type must be Passenger, Vehicle, or Cargo"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Price list name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),
  body("effectiveDate")
    .notEmpty()
    .withMessage("Effective date is required")
    .isISO8601()
    .withMessage("Invalid date format"),
  body("taxBase").optional().isIn(["Fare Only", "Fare & Taxes"]).withMessage("Invalid tax base"),
  body("currency").optional().trim().isLength({ min: 2, max: 3 }).withMessage("Currency must be 2-3 characters"),
]

const updatePriceListValidator = [
  body("name").optional().trim().isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
  body("effectiveDate").optional().isISO8601().withMessage("Invalid date format"),
  body("taxBase").optional().isIn(["Fare Only", "Fare & Taxes"]).withMessage("Invalid tax base"),
  body("status").optional().isIn(["Active", "Inactive", "Draft"]).withMessage("Invalid status"),
]

const addPriceDetailValidator = [
  body("typeField")
    .notEmpty()
    .withMessage("Type field is required (e.g., Adult, Car, Pallet A)")
    .isLength({ min: 1 })
    .withMessage("Type field cannot be empty"),
  body("ticketType")
    .notEmpty()
    .withMessage("Ticket type is required")
    .isIn(["One Way", "Return"])
    .withMessage("Invalid ticket type"),
  body("cabin")
    .notEmpty()
    .withMessage("Cabin is required")
    .isIn(["Economy", "Business", "First Class", "Standard"])
    .withMessage("Invalid cabin"),
  body("originPort")
    .notEmpty()
    .withMessage("Origin port is required")
    .isMongoId()
    .withMessage("Invalid origin port ID"),
  body("destinationPort")
    .notEmpty()
    .withMessage("Destination port is required")
    .isMongoId()
    .withMessage("Invalid destination port ID"),
  body("visaType").optional().isIn(["Tourist", "Business", "Student", "N/A"]).withMessage("Invalid visa type"),
  body("basicPrice")
    .notEmpty()
    .withMessage("Basic price is required")
    .isFloat({ min: 0 })
    .withMessage("Basic price must be a positive number"),
  body("taxes").optional().isArray().withMessage("Taxes must be an array"),
  body("taxes.*.taxType")
    .optional()
    .isIn(["VAT", "Port Tax", "Security Fee", "Fuel Surcharge"])
    .withMessage("Invalid tax type"),
  body("taxes.*.amount").optional().isFloat({ min: 0 }).withMessage("Tax amount must be a positive number"),
  body("allowedLuggagePieces")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Allowed luggage pieces must be a non-negative integer"),
  body("allowedLuggageWeight")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Allowed luggage weight must be a positive number"),
  body("excessLuggagePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Excess luggage price must be a positive number"),
]

const calculatePriceValidator = [
  body("priceListId")
    .notEmpty()
    .withMessage("Price list ID is required")
    .isMongoId()
    .withMessage("Invalid price list ID"),
  body("typeField")
    .notEmpty()
    .withMessage("Type field is required (e.g., Adult, Car, Pallet A)")
    .isLength({ min: 1 })
    .withMessage("Type field cannot be empty"),
  body("ticketType")
    .notEmpty()
    .withMessage("Ticket type is required")
    .isIn(["One Way", "Return"])
    .withMessage("Invalid ticket type"),
  body("cabin")
    .notEmpty()
    .withMessage("Cabin is required")
    .isIn(["Economy", "Business", "First Class", "Standard"])
    .withMessage("Invalid cabin"),
  body("originPort")
    .notEmpty()
    .withMessage("Origin port is required")
    .isMongoId()
    .withMessage("Invalid origin port ID"),
  body("destinationPort")
    .notEmpty()
    .withMessage("Destination port is required")
    .isMongoId()
    .withMessage("Invalid destination port ID"),
  body("visaType").optional().isIn(["Tourist", "Business", "Student", "N/A"]).withMessage("Invalid visa type"),
]

module.exports = {
  createPriceListValidator,
  updatePriceListValidator,
  addPriceDetailValidator,
  calculatePriceValidator,
}
