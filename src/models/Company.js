const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const CompanySchema = new mongoose.Schema(
  {
    // Basic Company Information
    companyName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    taxVatNumber: { type: String, trim: true }, // ✅ Tax/VAT Number
    logoUrl: { type: String },
    dateEstablished: { type: Date },

    // Contact Details
    address: { type: String },
    city: { type: String },
    country: { type: String },
    postalCode: { type: String },
    mainPhoneNumber: { type: String },
    emailAddress: { type: String, required: true },
    website: { type: String },

    // Operational Details
    defaultCurrency: { type: String, default: "USD" },
    applicableTaxes: [{ type: String }], // ✅ Applicable Taxes (e.g. ["VAT", "Excise"])
    operatingPorts: [{ type: String }],
    operatingCountries: [{ type: String }], // ✅ Operating Countries
    timeZone: { type: String }, // ✅ Time Zone
    workingHours: { type: String },

    // About Us
    whoWeAre: { type: String },
    vision: { type: String },
    mission: { type: String },
    purpose: { type: String },

    // Social Network Links
    facebookUrl: { type: String },
    instagramUrl: { type: String },
    whatsappNumber: { type: String },
    linkedinProfile: { type: String },
    skypeId: { type: String },

    // Authentication / Status
    loginEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    isActive: { type: Boolean, default: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
  },
  { timestamps: true },
)

// Indexes for query optimization
CompanySchema.index({ companyName: 1 })
CompanySchema.index({ status: 1 })
CompanySchema.index({ loginEmail: 1 })

async function generateRegistrationNumber() {
  const lastCompany = await mongoose
    .model("Company")
    .findOne({
      registrationNumber: { $regex: /^REG-\d+$/ },
    })
    .sort({ createdAt: -1 })

  if (!lastCompany || !lastCompany.registrationNumber) {
    return "REG-1001"
  }

  const lastNumber = Number.parseInt(lastCompany.registrationNumber.split("-")[1], 10)

  if (isNaN(lastNumber)) {
    return "REG-1001"
  }

  const nextNumber = lastNumber + 1

  return `REG-${nextNumber}`
}

// Hash password before saving
CompanySchema.pre("save", async function (next) {
  if (!this.registrationNumber) {
    this.registrationNumber = await generateRegistrationNumber()
  }

  if (this.isModified("passwordHash")) {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  }

  next()
})

// Method to compare passwords
CompanySchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash)
}

module.exports = mongoose.model("Company", CompanySchema)
