const mongoose = require("mongoose")
const { MODULE_CODES } = require("../constants/rbac")

const SubmoduleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false },
)

const ModuleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: MODULE_CODES,
    },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    submodules: { type: [SubmoduleSchema], default: [] },
  },
  { timestamps: true },
)

ModuleSchema.index({ code: 1 }, { unique: true })

module.exports = mongoose.model("Module", ModuleSchema)
