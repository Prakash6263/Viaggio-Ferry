const { body } = require("express-validator")

const currencyRegex = /^[A-Z]{3}$/

const commonFields = [
  body("companyName").optional().isString().trim().notEmpty().withMessage("companyName required"),
  body("registrationNumber").optional().isString().trim(),
  body("dateEstablished").optional().isISO8601().toDate(),

  body("contact.streetAddress").optional().isString(),
  body("contact.city").optional().isString(),
  body("contact.country").optional().isString(),
  body("contact.postalCode").optional().isString(),
  body("contact.mainPhoneNumber").optional().isString(),
  body("contact.email").optional().isEmail().withMessage("Invalid email"),
  body("contact.website").optional().isURL().withMessage("Invalid website URL"),

  body("operational.defaultCurrency")
    .optional()
    .isString()
    .custom((v) => currencyRegex.test(String(v).toUpperCase()))
    .withMessage("defaultCurrency must be ISO 4217, e.g., USD"),
  body("operational.operatingPorts").optional({ nullable: true }),
  body("operational.workingHours").optional().isString(),

  body("about.whoWeAre").optional().isString(),
  body("about.vision").optional().isString(),
  body("about.mission").optional().isString(),
  body("about.purpose").optional().isString(),

  body("social.facebook").optional().isURL().withMessage("facebook must be a URL"),
  body("social.instagram").optional().isURL().withMessage("instagram must be a URL"),
  body("social.whatsapp").optional().isString(),
  body("social.linkedin").optional().isURL().withMessage("linkedin must be a URL"),
  body("social.skype").optional().isString(),

  body("subdomain").optional().isString().isLowercase(),
]

const createCompanyRules = [body("companyName").exists().withMessage("companyName is required"), ...commonFields]
const updateCompanyRules = [...commonFields]

module.exports = { createCompanyRules, updateCompanyRules }
