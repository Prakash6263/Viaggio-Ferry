const { body, param, query } = require("express-validator")
const { SHIP_STATUS, SHIP_TYPES, CABIN_TYPES, CARGO_TYPES, VEHICLE_TYPES } = require("../models/Ship")

const commonFields = [
  body("name").optional().isString().trim().notEmpty().withMessage("name required"),
  body("imoNumber").optional().isString().trim().notEmpty().withMessage("imoNumber required"),
  body("mmsiNumber").optional().isString().trim().notEmpty().withMessage("mmsiNumber required"),
  body("flagState").optional().isString().trim().notEmpty().withMessage("flagState required"),
  body("shipType")
    .optional()
    .isIn(SHIP_TYPES)
    .withMessage(`shipType must be one of: ${SHIP_TYPES.join(", ")}`),
  body("yearBuilt")
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("yearBuilt must be valid"),
  body("classificationSociety").optional().isString().trim(),
  body("status")
    .optional()
    .isIn(SHIP_STATUS)
    .withMessage(`status must be one of: ${SHIP_STATUS.join(", ")}`),
  body("remarks").optional().isString().isLength({ max: 2000 }),
  body("grossTonnage").optional().isFloat({ min: 0 }).withMessage("grossTonnage must be >= 0"),
  body("netTonnage").optional().isFloat({ min: 0 }).withMessage("netTonnage must be >= 0"),
  body("lengthOverall").optional().isFloat({ min: 0 }).withMessage("lengthOverall must be >= 0"),
  body("beam").optional().isFloat({ min: 0 }).withMessage("beam must be >= 0"),
  body("draft").optional().isFloat({ min: 0 }).withMessage("draft must be >= 0"),
]

const createShipRules = [
  body("name").exists().isString().trim().notEmpty().withMessage("name is required"),
  body("imoNumber").exists().isString().trim().notEmpty().withMessage("imoNumber is required"),
  body("mmsiNumber").exists().isString().trim().notEmpty().withMessage("mmsiNumber is required"),
  body("flagState").exists().isString().trim().notEmpty().withMessage("flagState is required"),
  body("shipType").exists().isIn(SHIP_TYPES).withMessage(`shipType is required`),
  body("yearBuilt").exists().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage("yearBuilt is required"),
  body("grossTonnage").exists().isFloat({ min: 0 }).withMessage("grossTonnage is required"),
  body("netTonnage").exists().isFloat({ min: 0 }).withMessage("netTonnage is required"),
  body("lengthOverall").exists().isFloat({ min: 0 }).withMessage("lengthOverall is required"),
  body("beam").exists().isFloat({ min: 0 }).withMessage("beam is required"),
  body("draft").exists().isFloat({ min: 0 }).withMessage("draft is required"),
  ...commonFields,
]

const updateShipRules = [...commonFields]

const addPassengerCapacityRules = [
  body("cabinType").exists().isIn(CABIN_TYPES).withMessage("cabinType is required"),
  body("totalWeight").exists().isFloat({ min: 0 }).withMessage("totalWeight is required"),
  body("numberOfSeats").exists().isInt({ min: 0 }).withMessage("numberOfSeats is required"),
]

const removePassengerCapacityRules = [body("capacityId").exists().isMongoId().withMessage("capacityId is required")]

const addCargoCapacityRules = [
  body("cargoType").exists().isIn(CARGO_TYPES).withMessage("cargoType is required"),
  body("totalWeight").exists().isFloat({ min: 0 }).withMessage("totalWeight is required"),
  body("spots").exists().isInt({ min: 0 }).withMessage("spots is required"),
]

const removeCargoCapacityRules = [body("capacityId").exists().isMongoId().withMessage("capacityId is required")]

const addVehicleCapacityRules = [
  body("vehicleType").exists().isIn(VEHICLE_TYPES).withMessage("vehicleType is required"),
  body("totalWeight").exists().isFloat({ min: 0 }).withMessage("totalWeight is required"),
  body("spots").exists().isInt({ min: 0 }).withMessage("spots is required"),
]

const removeVehicleCapacityRules = [body("capacityId").exists().isMongoId().withMessage("capacityId is required")]

const listShipsValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("q").optional().isString().trim(),
  query("status").optional().isIn(SHIP_STATUS),
  query("shipType").optional().isIn(SHIP_TYPES),
  query("sortBy").optional().isIn(["name", "shipType", "status", "createdAt", "updatedAt"]),
  query("sortOrder").optional().isIn(["asc", "desc"]),
]

module.exports = {
  createShipRules,
  updateShipRules,
  addPassengerCapacityRules,
  removePassengerCapacityRules,
  addCargoCapacityRules,
  removeCargoCapacityRules,
  addVehicleCapacityRules,
  removeVehicleCapacityRules,
  listShipsValidation,
}
