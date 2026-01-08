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
  updateCompanyDetails,
  toggleCompanyStatus,
  sendVerificationLink,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  getCompanyPublicAboutByName,
  getCompanyContactByName, // importing new function
} = require("../controllers/companyController")
const { verifyToken, verifySuperAdmin, verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const { companyLogoUpload, companyMultiUpload } = require("../middleware/upload")
const ledgerController = require("../controllers/ledgerController")

const router = express.Router()

// Public routes
router.post("/register", companyMultiUpload, registerCompany)
router.post("/login", loginCompany)
router.get("/confirm-verification/:token", confirmVerification)

router.post("/forgot-password", forgotPassword)
router.post("/verify-reset-otp", verifyResetOTP)
router.post("/reset-password", resetPassword)

// Company routes (require authentication)
router.get("/me", verifyToken, verifyCompanyToken, extractCompanyId, getOwnProfile)
router.get("/ledgers", verifyToken, verifyCompanyToken, ledgerController.listLedgers) // Allow companies to fetch their own ledgers

// Super Admin routes (require super admin authentication)
router.get("/", verifySuperAdmin, listCompanies)
router.get("/:id", verifySuperAdmin, getCompanyById)
router.post("/admin/add", verifySuperAdmin, companyMultiUpload, adminAddCompany)
router.put("/:id", verifyToken, companyMultiUpload, updateCompanyDetails)
router.patch("/:id/verify", verifySuperAdmin, approveCompany)
router.patch("/:id/reject", verifySuperAdmin, rejectCompany)
router.patch("/:id/toggle-status", verifySuperAdmin, toggleCompanyStatus)
router.post("/:id/send-verification", verifySuperAdmin, sendVerificationLink)
router.delete("/:id", verifySuperAdmin, deleteCompany)
router.get("/public/about/:companyName", getCompanyPublicAboutByName)
router.get("/public/contact/:companyName", getCompanyContactByName) // adding public contact route

module.exports = router
