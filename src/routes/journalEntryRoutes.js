const express = require("express")
const router = express.Router()
const controller = require("../controllers/journalEntryController")
const { verifyCompanyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const {
  createJournalEntryValidation,
  updateJournalEntryValidation,
  idParamValidation,
  listJournalEntriesValidation,
} = require("../validators/journalEntryValidators")

router.use(verifyCompanyToken, extractCompanyId, extractUserId)

router.get("/", listJournalEntriesValidation, controller.getAll)
router.get("/:id", idParamValidation, controller.getOne)
router.post("/", createJournalEntryValidation, controller.create)
router.put("/:id", updateJournalEntryValidation, controller.update)
router.post("/:id/post", idParamValidation, controller.post)
router.post("/:id/cancel", idParamValidation, controller.cancel)
router.delete("/:id", idParamValidation, controller.remove)

module.exports = router
