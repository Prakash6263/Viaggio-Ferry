const { body } = require("express-validator")

const registerCompanyRules = [
  body("companyName").trim().notEmpty().withMessage("Company name is required"),
  body("registrationNumber").trim().notEmpty().withMessage("Registration number is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("contact.email").isEmail().withMessage("Valid email is required"),
  body("contact.mainPhoneNumber").notEmpty().withMessage("Phone number is required"),
]

const loginCompanyRules = [
  body("companyName").trim().notEmpty().withMessage("Company name is required"),
  body("password").notEmpty().withMessage("Password is required"),
]

const rejectCompanyRules = [body("rejectionReason").trim().notEmpty().withMessage("Rejection reason is required")]

module.exports = {
  registerCompanyRules,
  loginCompanyRules,
  rejectCompanyRules,
}
