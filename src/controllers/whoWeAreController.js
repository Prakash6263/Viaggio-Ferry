const createHttpError = require("http-errors")
const WhoWeAre = require("../models/WhoWeAre")
const Company = require("../models/Company")

// 1️⃣ Company — Create/Update "Who We Are"
const createOrUpdateWhoWeAre = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id
    const { text } = req.body

    if (!text) {
      throw createHttpError(400, "Text is required")
    }

    if (!req.file) {
      // If updating and no new image provided, check if entry exists
      const existing = await WhoWeAre.findOne({ company: companyId })
      if (!existing) {
        throw createHttpError(400, "Image is required for new entries")
      }

      // Update text only
      existing.text = text
      await existing.save()

      return res.status(200).json({
        success: true,
        message: "Who We Are updated successfully",
        data: existing,
      })
    }

    const imageUrl = `/uploads/who-we-are/${req.file.filename}`

    // Use findOneAndUpdate with upsert to create or update
    const whoWeAre = await WhoWeAre.findOneAndUpdate(
      { company: companyId },
      {
        company: companyId,
        image: imageUrl,
        text: text,
      },
      { new: true, upsert: true, runValidators: true },
    )

    res.status(200).json({
      success: true,
      message: "Who We Are saved successfully",
      data: whoWeAre,
    })
  } catch (error) {
    next(error)
  }
}

// 2️⃣ Company — Get Own "Who We Are"
const getOwnWhoWeAre = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id

    // First, try to get from new WhoWeAre model
    const whoWeAre = await WhoWeAre.findOne({ company: companyId })

    if (whoWeAre) {
      return res.status(200).json({
        success: true,
        message: "Who We Are retrieved successfully",
        data: whoWeAre,
        source: "dedicated", // Indicates data from new WhoWeAre model
      })
    }

    // Fallback: Check if company has legacy whoWeAre field
    const company = await Company.findById(companyId).select("whoWeAre companyName logoUrl")

    if (company && company.whoWeAre) {
      return res.status(200).json({
        success: true,
        message: "Who We Are retrieved from company profile (legacy)",
        data: {
          text: company.whoWeAre,
          image: null, // Legacy field doesn't have image
          company: companyId,
          companyName: company.companyName,
          companyLogo: company.logoUrl,
        },
        source: "legacy", // Indicates data from old Company.whoWeAre field
        migrationNote: "Consider updating via POST /api/who-we-are to add an image",
      })
    }

    throw createHttpError(404, "Who We Are not found. Please create one.")
  } catch (error) {
    next(error)
  }
}

// 3️⃣ Public — Get "Who We Are" by Company Name
const getWhoWeAreByCompanyName = async (req, res, next) => {
  try {
    const { companyName } = req.params

    if (!companyName) {
      throw createHttpError(400, "Company name is required")
    }

    // Find company by name (case-insensitive)
    const company = await Company.findOne({
      companyName: { $regex: new RegExp(`^${companyName}$`, "i") },
      status: "approved",
      isActive: true,
    })

    if (!company) {
      throw createHttpError(404, "Company not found or not active")
    }

    // First, try to get from new WhoWeAre model
    const whoWeAre = await WhoWeAre.findOne({ company: company._id })

    if (whoWeAre) {
      return res.status(200).json({
        success: true,
        message: "Who We Are retrieved successfully",
        data: {
          ...whoWeAre.toObject(),
          companyName: company.companyName,
          companyLogo: company.logoUrl,
        },
        source: "dedicated",
      })
    }

    // Fallback: Use legacy whoWeAre field from Company model
    if (company.whoWeAre) {
      return res.status(200).json({
        success: true,
        message: "Who We Are retrieved from company profile",
        data: {
          text: company.whoWeAre,
          image: null, // Legacy field doesn't have image
          company: company._id,
          companyName: company.companyName,
          companyLogo: company.logoUrl,
        },
        source: "legacy",
      })
    }

    throw createHttpError(404, "Who We Are information not available for this company")
  } catch (error) {
    next(error)
  }
}

// 4️⃣ Company — Delete "Who We Are"
const deleteWhoWeAre = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id

    const whoWeAre = await WhoWeAre.findOneAndDelete({ company: companyId })

    if (!whoWeAre) {
      throw createHttpError(404, "Who We Are not found")
    }

    res.status(200).json({
      success: true,
      message: "Who We Are deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createOrUpdateWhoWeAre,
  getOwnWhoWeAre,
  getWhoWeAreByCompanyName,
  deleteWhoWeAre,
}
