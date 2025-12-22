const express = require("express")
const {
  registerCompany,
  loginCompany,
  listCompanies,
  getCompanyById,
  approveCompany,
  rejectCompany,
  getOwnProfile,
  updateOwnProfile,
  deleteCompany,
  adminAddCompany,
  confirmVerification,
  updateCompanyDetails, // Import new function
} = require("../controllers/companyController")
const { verifyToken, verifySuperAdmin, verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const { companyLogoUpload } = require("../middleware/upload")

const router = express.Router()

// Public routes
router.post("/register", companyLogoUpload.single("logo"), registerCompany)
router.post("/login", loginCompany)
router.get("/confirm-verification/:token", confirmVerification)

// Company routes (require authentication)
router.get("/me", verifyToken, verifyCompanyToken, extractCompanyId, getOwnProfile)
router.put("/me", verifyToken, verifyCompanyToken, extractCompanyId, companyLogoUpload.single("logo"), updateOwnProfile)

// Super Admin routes (require super admin authentication)
router.get("/", verifySuperAdmin, listCompanies)
router.get("/:id", verifySuperAdmin, getCompanyById)
router.post("/admin/add", verifySuperAdmin, companyLogoUpload.single("logo"), adminAddCompany)
router.put("/:id", verifyToken, companyLogoUpload.single("logo"), updateCompanyDetails)
router.patch("/:id/verify", verifySuperAdmin, approveCompany)
router.patch("/:id/reject", verifySuperAdmin, rejectCompany)
router.delete("/:id", verifySuperAdmin, deleteCompany)

module.exports = router
