const express = require("express")
const router = express.Router()
const commissionRuleController = require("../controllers/commissionRuleController")
const {
  createRuleValidation,
  updateRuleValidation,
  idParamValidation,
  listRulesValidation,
  calculateCommissionValidation,
} = require("../validators/commissionRuleValidators")

// List rules
router.get("/", listRulesValidation, (req, res) => commissionRuleController.listRules(req, res))

// Get rule by ID
router.get("/:id", idParamValidation, (req, res) => commissionRuleController.getRuleById(req, res))

// Create rule
router.post("/", createRuleValidation, (req, res) => commissionRuleController.createRule(req, res))

// Update rule
router.patch("/:id", updateRuleValidation, (req, res) => commissionRuleController.updateRule(req, res))

// Delete rule
router.delete("/:id", idParamValidation, (req, res) => commissionRuleController.deleteRule(req, res))

// Find applicable rules
router.post("/find-applicable", (req, res) => commissionRuleController.findApplicableRules(req, res))

// Calculate commission distribution
router.post("/calculate", calculateCommissionValidation, (req, res) =>
  commissionRuleController.calculateCommission(req, res),
)

module.exports = router
