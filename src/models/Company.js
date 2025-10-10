const mongoose = require("mongoose")

const LogoSchema = new mongoose.Schema(
  {
    dataBase64: { type: String },
    mimeType: { type: String },
  },
  { _id: false },
)

const ContactSchema = new mongoose.Schema(
  {
    streetAddress: String,
    city: String,
    country: String,
    postalCode: String,
    mainPhoneNumber: String,
    email: String,
    website: String,
  },
  { _id: false },
)

const AboutSchema = new mongoose.Schema(
  {
    whoWeAre: String,
    vision: String,
    mission: String,
    purpose: String,
  },
  { _id: false },
)

const SocialSchema = new mongoose.Schema(
  {
    facebook: String,
    instagram: String,
    whatsapp: String,
    linkedin: String,
    skype: String,
  },
  { _id: false },
)

const CompanySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    logo: LogoSchema,
    dateEstablished: { type: Date },

    contact: ContactSchema,

    operational: {
      defaultCurrency: { type: String, uppercase: true, trim: true },
      operatingPorts: [{ type: String, trim: true }],
      workingHours: { type: String, trim: true },
    },

    about: AboutSchema,
    social: SocialSchema,

    subdomain: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

CompanySchema.index({ companyName: 1 })

module.exports = mongoose.model("Company", CompanySchema)
