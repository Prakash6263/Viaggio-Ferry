const express = require("express")
const {
  createOrUpdateWhoWeAre,
  getOwnWhoWeAre,
  getWhoWeAreByCompanyName,
  deleteWhoWeAre,
} = require("../controllers/whoWeAreController")
const { verifyToken, verifyCompanyToken, extractCompanyId } = require("../middleware/authMiddleware")
const { whoWeAreUpload } = require("../middleware/upload")

const router = express.Router()

// Public route - Get Who We Are by company name
router.get("/company/:companyName", getWhoWeAreByCompanyName)

// Company routes (require authentication)
router.get("/me", verifyToken, verifyCompanyToken, extractCompanyId, getOwnWhoWeAre)
router.post(
  "/",
  verifyToken,
  verifyCompanyToken,
  extractCompanyId,
  whoWeAreUpload.single("image"),
  createOrUpdateWhoWeAre,
)
router.put(
  "/",
  verifyToken,
  verifyCompanyToken,
  extractCompanyId,
  whoWeAreUpload.single("image"),
  createOrUpdateWhoWeAre,
)
router.delete("/", verifyToken, verifyCompanyToken, extractCompanyId, deleteWhoWeAre)

module.exports = router
