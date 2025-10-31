const { body } = require("express-validator")

const updateCompanyProfileRules = [
  body("contact.email").optional().isEmail().withMessage("Valid email is required"),
  body("contact.mainPhoneNumber").optional().notEmpty().withMessage("Phone number is required"),
  body("operational.defaultCurrency")
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency code must be 3 characters"),
]

const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
]

module.exports = {
  updateCompanyProfileRules,
  changePasswordRules,
}
