const mongoose = require("mongoose")
const { LAYER_CODES, MODULE_CODES } = require("../constants/rbac")

const PermissionSchema = new mongoose.Schema(
  {
    submoduleCode: { type: String, required: true, trim: true, lowercase: true },
    canRead: { type: Boolean, default: false },
    canWrite: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
  },
  { _id: false },
)

const AccessGroupSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    groupName: { type: String, required: true, trim: true },
    groupCode: { type: String, required: true, trim: true },
    moduleCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: MODULE_CODES,
    },
    layer: {
      type: String,
      required: true,
      enum: LAYER_CODES,
    },
    isActive: { type: Boolean, default: true },
    permissions: { type: [PermissionSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

AccessGroupSchema.index({ company: 1, groupCode: 1 }, { unique: true })
AccessGroupSchema.index({ company: 1, isDeleted: 1 })

// Filter out soft-deleted documents by default
AccessGroupSchema.pre("find", function () {
  if (!this.getOptions()?.includeSoftDeleted) {
    this.where({ isDeleted: false })
  }
})

AccessGroupSchema.pre("findOne", function () {
  if (!this.getOptions()?.includeSoftDeleted) {
    this.where({ isDeleted: false })
  }
})

module.exports = mongoose.model("AccessGroup", AccessGroupSchema)
