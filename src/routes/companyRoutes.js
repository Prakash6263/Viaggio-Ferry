const express = require("express")
const router = express.Router()

const { upload } = require("../middleware/upload")
const { asyncHandler } = require("../middleware/errorHandler")
const { createCompanyRules, updateCompanyRules } = require("../validators/companyValidators")
const controller = require("../controllers/companyController")

// List & Create
router.get("/", asyncHandler(controller.index))
router.post("/", upload.single("logo"), createCompanyRules, asyncHandler(controller.create))

// Read one
router.get("/:id", asyncHandler(controller.show))

// Serve logo image
router.get("/:id/logo", asyncHandler(controller.logo))

// Update
router.patch("/:id", upload.single("logo"), updateCompanyRules, asyncHandler(controller.patch))

// Delete
router.delete("/:id", asyncHandler(controller.destroy))

module.exports = router
