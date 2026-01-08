const express = require("express")
const router = express.Router()
const partnerController = require("../controllers/partnerController")
const { verifyAdminOrCompany } = require("../middleware/authMiddleware")

router.post("/", verifyAdminOrCompany, partnerController.createPartner)
router.get("/", verifyAdminOrCompany, partnerController.listPartners)
router.get("/:id", verifyAdminOrCompany, partnerController.getPartnerById)
router.put("/:id", verifyAdminOrCompany, partnerController.updatePartner)
router.patch("/:id/disable", verifyAdminOrCompany, partnerController.disablePartner)
router.patch("/:id/enable", verifyAdminOrCompany, partnerController.enablePartner)

module.exports = router
