const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

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

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    password: { type: String },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin" },

    approvalDate: { type: Date },

    rejectionReason: { type: String },
  },
  { timestamps: true },
)

CompanySchema.index({ companyName: 1 })
CompanySchema.index({ status: 1 })

CompanySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

CompanySchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("Company", CompanySchema)
