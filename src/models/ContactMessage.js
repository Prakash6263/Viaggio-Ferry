const mongoose = require("mongoose")

const ContactMessageSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["New", "InProgress", "Closed"],
      default: "New",
      index: true,
    },
    internalNotes: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

ContactMessageSchema.index({ company: 1, fullName: "text", email: "text", subject: "text", message: "text" })

module.exports = mongoose.model("ContactMessage", ContactMessageSchema)
