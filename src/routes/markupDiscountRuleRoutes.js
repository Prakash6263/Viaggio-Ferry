const express = require("express")
const router = express.Router()
const controller = require("../controllers/markupDiscountRuleController")
const validators = require("../validators/markupDiscountRuleValidators")

// List rules
router.get("/", validators.listRulesValidation, controller.listRules)

// Get single rule
router.get("/:id", validators.idParamValidation, controller.getRule)

// Create rule
router.post("/", validators.createRuleValidation, controller.createRule)

// Update rule
router.patch("/:id", validators.updateRuleValidation, controller.updateRule)

// Delete rule
router.delete("/:id", validators.idParamValidation, controller.deleteRule)

// Apply rules to item
router.post("/apply", validators.applyRulesValidation, controller.applyRules)

// Find applicable rules
router.post("/find-applicable", validators.applyRulesValidation, controller.findApplicableRules)

module.exports = router
