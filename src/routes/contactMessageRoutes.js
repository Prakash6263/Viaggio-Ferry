const express = require("express")
const router = express.Router()

const controller = require("../controllers/contactMessageController")
const {
  createContactMessageValidators,
  updateContactMessageValidators,
  listContactMessageValidators,
} = require("../validators/contactMessageValidators")

// List with filters and pagination
router.get("/", listContactMessageValidators, controller.list)

// Create a new contact message (from the public form)
router.post("/", createContactMessageValidators, controller.create)

// Get a contact message by id
router.get("/:id", controller.getById)

// Update status/notes of a message
router.patch("/:id", updateContactMessageValidators, controller.update)

// Soft delete a message
router.delete("/:id", controller.remove)

module.exports = router
