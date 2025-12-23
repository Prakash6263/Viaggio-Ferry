const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["super_admin", "company_admin"],
      default: "super_admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Method to compare passwords
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash)
}

adminSchema.methods.generateResetPasswordOTP = function () {
  // Generate a 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()

  // Hash the OTP before saving
  this.resetPasswordOTP = crypto.createHash("sha256").update(otp).digest("hex")

  // Set expiry to 15 minutes from now
  this.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)

  // Return plain OTP to send via email
  return otp
}

adminSchema.methods.verifyResetPasswordOTP = function (otp) {
  if (!this.resetPasswordOTP || !this.resetPasswordExpires) {
    return false
  }

  // Check if OTP has expired
  if (this.resetPasswordExpires < new Date()) {
    return false
  }

  // Hash the provided OTP and compare with stored hash
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex")
  return hashedOTP === this.resetPasswordOTP
}

// Exclude password from JSON response
adminSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.resetPasswordOTP
  delete obj.resetPasswordExpires
  return obj
}

module.exports = mongoose.model("Admin", adminSchema)
