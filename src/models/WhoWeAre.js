const mongoose = require("mongoose")

const WhoWeAreSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true, // One "Who We Are" per company
    },
    image: {
      type: String, // URL path to the uploaded image
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

// Index for efficient company lookup
WhoWeAreSchema.index({ company: 1 })

module.exports = mongoose.model("WhoWeAre", WhoWeAreSchema)
