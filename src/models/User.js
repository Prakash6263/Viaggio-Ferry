const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    profileImage: { type: String, default: null }, // URL/path to user profile image
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
      select: false, // Don't include password in queries by default
    },
    position: { type: String, default: "", trim: true },
    layer: {
      type: String,
      enum: ["company", "marine-agent", "commercial-agent", "selling-agent"],
      required: true,
      index: true,
    },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null },
    isSalesman: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isDeleted: { type: Boolean, default: false },
    
    // Module Access - Maps modules to access groups
    // Each module can have one access group assigned to the user
    moduleAccess: [
      {
        moduleCode: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        accessGroupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AccessGroup",
          required: true,
        },
        _id: false, // Prevent MongoDB from creating _id for subdocument
      },
    ],
  },
  { timestamps: true },
)

// Indexes for performance
userSchema.index({ company: 1, email: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } })
userSchema.index({ fullName: "text", email: "text", position: "text" })
userSchema.index({ company: 1, status: 1 })
userSchema.index({ company: 1, isDeleted: 1 })

// Hash password before saving if it's modified
userSchema.pre("save", async function (next) {
  // Ensure moduleAccess array is properly structured
  if (this.moduleAccess && Array.isArray(this.moduleAccess)) {
    this.moduleAccess = this.moduleAccess.filter((ma) => ma.moduleCode && ma.accessGroupId)
  }

  // Hash password if it's modified and exists
  if (this.isModified("password") && this.password) {
    const bcrypt = require("bcryptjs")
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }

  next()
})

module.exports = mongoose.model("User", userSchema)
