const createHttpError = require("http-errors")
const TermsAndConditions = require("../models/TermsAndConditions")
const Company = require("../models/Company")

// 1️⃣ Get Terms & Conditions (Company or Public)
const getTermsAndConditions = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    let termsAndConditions = await TermsAndConditions.findOne({ companyId })

    // If no T&C exists, create a default draft
    if (!termsAndConditions) {
      termsAndConditions = new TermsAndConditions({
        companyId,
        content: "",
        status: "draft",
      })
      await termsAndConditions.save()
    }

    res.status(200).json({
      success: true,
      message: "Terms & Conditions retrieved successfully",
      data: termsAndConditions,
    })
  } catch (error) {
    next(error)
  }
}

// 2️⃣ Get Published Terms & Conditions (Public - No Auth Required)
const getPublishedTermsAndConditions = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    const termsAndConditions = await TermsAndConditions.findOne({
      companyId,
      status: "published",
    })

    if (!termsAndConditions) {
      throw createHttpError(404, "No published Terms & Conditions found for this company")
    }

    res.status(200).json({
      success: true,
      message: "Published Terms & Conditions retrieved successfully",
      data: termsAndConditions,
    })
  } catch (error) {
    next(error)
  }
}

// 3️⃣ Save Draft (Company - Authenticated)
const saveDraft = async (req, res, next) => {
  try {
    const { companyId } = req.params
    const { content } = req.body

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Verify user is from this company
    const userCompanyId = req.user.companyId || req.user.id
    if (userCompanyId !== companyId) {
      throw createHttpError(403, "Unauthorized: You can only edit your own company's Terms & Conditions")
    }

    let termsAndConditions = await TermsAndConditions.findOne({ companyId })

    if (!termsAndConditions) {
      termsAndConditions = new TermsAndConditions({
        companyId,
        content: content || "",
        status: "draft",
        draftSavedAt: new Date(),
      })
    } else {
      termsAndConditions.content = content || termsAndConditions.content
      termsAndConditions.status = "draft"
      termsAndConditions.draftSavedAt = new Date()
    }

    await termsAndConditions.save()

    res.status(200).json({
      success: true,
      message: "Draft saved successfully",
      data: termsAndConditions,
    })
  } catch (error) {
    next(error)
  }
}

// 4️⃣ Publish Terms & Conditions (Company - Authenticated)
const publishTermsAndConditions = async (req, res, next) => {
  try {
    const { companyId } = req.params
    const { content } = req.body

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Verify user is from this company
    const userCompanyId = req.user.companyId || req.user.id
    if (userCompanyId !== companyId) {
      throw createHttpError(403, "Unauthorized: You can only publish your own company's Terms & Conditions")
    }

    let termsAndConditions = await TermsAndConditions.findOne({ companyId })

    if (!termsAndConditions) {
      termsAndConditions = new TermsAndConditions({
        companyId,
        content: content || "",
        status: "published",
        publishedAt: new Date(),
        publishedBy: req.user.id || req.user.userId,
        version: 1,
      })
    } else {
      // Increment version only if changing from draft to published
      if (termsAndConditions.status === "draft") {
        termsAndConditions.version = (termsAndConditions.version || 1) + 1
      }
      termsAndConditions.content = content || termsAndConditions.content
      termsAndConditions.status = "published"
      termsAndConditions.publishedAt = new Date()
      termsAndConditions.publishedBy = req.user.id || req.user.userId
    }

    await termsAndConditions.save()

    res.status(200).json({
      success: true,
      message: "Terms & Conditions published successfully",
      data: termsAndConditions,
    })
  } catch (error) {
    next(error)
  }
}

// 5️⃣ Unpublish Terms & Conditions (Revert to Draft) (Company - Authenticated)
const unpublishTermsAndConditions = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Verify user is from this company
    const userCompanyId = req.user.companyId || req.user.id
    if (userCompanyId !== companyId) {
      throw createHttpError(403, "Unauthorized: You can only manage your own company's Terms & Conditions")
    }

    const termsAndConditions = await TermsAndConditions.findOne({ companyId })

    if (!termsAndConditions) {
      throw createHttpError(404, "Terms & Conditions not found for this company")
    }

    termsAndConditions.status = "draft"
    termsAndConditions.publishedAt = null
    termsAndConditions.publishedBy = null

    await termsAndConditions.save()

    res.status(200).json({
      success: true,
      message: "Terms & Conditions reverted to draft",
      data: termsAndConditions,
    })
  } catch (error) {
    next(error)
  }
}

// 6️⃣ Delete Terms & Conditions (Company - Authenticated)
const deleteTermsAndConditions = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    // Verify user is from this company
    const userCompanyId = req.user.companyId || req.user.id
    if (userCompanyId !== companyId) {
      throw createHttpError(403, "Unauthorized: You can only delete your own company's Terms & Conditions")
    }

    await TermsAndConditions.findOneAndDelete({ companyId })

    res.status(200).json({
      success: true,
      message: "Terms & Conditions deleted successfully",
    })
  } catch (error) {
    next(error)
  }
}

// 7️⃣ Get Terms & Conditions History/Versions (Super Admin)
const getTermsAndConditionsHistory = async (req, res, next) => {
  try {
    const { companyId } = req.params

    // Verify company exists
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, "Company not found")
    }

    const termsAndConditions = await TermsAndConditions.findOne({ companyId }).populate("publishedBy", "name email")

    if (!termsAndConditions) {
      throw createHttpError(404, "Terms & Conditions not found for this company")
    }

    res.status(200).json({
      success: true,
      message: "Terms & Conditions history retrieved successfully",
      data: {
        version: termsAndConditions.version,
        currentStatus: termsAndConditions.status,
        content: termsAndConditions.content,
        publishedAt: termsAndConditions.publishedAt,
        publishedBy: termsAndConditions.publishedBy,
        draftSavedAt: termsAndConditions.draftSavedAt,
        createdAt: termsAndConditions.createdAt,
        updatedAt: termsAndConditions.updatedAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getTermsAndConditions,
  getPublishedTermsAndConditions,
  saveDraft,
  publishTermsAndConditions,
  unpublishTermsAndConditions,
  deleteTermsAndConditions,
  getTermsAndConditionsHistory,
}
