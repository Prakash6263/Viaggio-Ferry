const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { verifySuperAdmin } = require("../middleware/authMiddleware")
const { adminUpload } = require("../middleware/upload")

// Public endpoints (no auth required)
router.post("/register-super-admin", adminUpload.single("profileImage"), adminController.registerSuperAdmin)
router.post("/login", adminController.login)

// Protected endpoints (super admin required)
router.get("/profile", verifySuperAdmin, adminController.getProfile)
router.patch("/profile", verifySuperAdmin, adminUpload.single("profileImage"), adminController.updateProfile)
router.get("/companies", verifySuperAdmin, adminController.listCompanies)
router.get("/companies/:id", verifySuperAdmin, adminController.getCompany)
router.patch("/companies/:id/verify", verifySuperAdmin, adminController.verifyCompany)
router.patch("/companies/:id/reject", verifySuperAdmin, adminController.rejectCompany)
router.delete("/companies/:id", verifySuperAdmin, adminController.deleteCompany)

module.exports = router
