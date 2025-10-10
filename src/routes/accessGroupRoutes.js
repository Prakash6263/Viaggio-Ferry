const express = require("express")
const router = express.Router()

const { asyncHandler } = require("../middleware/errorHandler")
const {
  createAccessGroupRules,
  updateAccessGroupRules,
  listAccessGroupRules,
} = require("../validators/accessGroupValidators")
const controller = require("../controllers/accessGroupController")

// List (requires companyId) & Create
router.get("/", listAccessGroupRules, asyncHandler(controller.index))
router.post("/", createAccessGroupRules, asyncHandler(controller.create))

// Read one
router.get("/:id", asyncHandler(controller.show))

// Update
router.patch("/:id", updateAccessGroupRules, asyncHandler(controller.patch))

// Delete
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
