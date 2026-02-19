const { Tax } = require("../models/Tax")
const connectDB = require("../config/db")

/**
 * Calculate total price based on fare, taxes, and tax base option
 *
 * TAX BASE LOGIC:
 *
 * 1. "fare_only" - All taxes calculated on original fare
 *    total = basicPrice + (tax1% of basicPrice) + (tax2% of basicPrice) + (tax3_fixed)
 *    Example: fare=100, tax1=15%, tax2=10%, tax3=20fixed
 *    total = 100 + 15 + 10 + 20 = 145
 *
 * 2. "fare_plus_tax" - Each tax calculated on running total
 *    basicPrice = 100
 *    tax1 = 15% of 100 = 15 → running total = 115
 *    tax2 = 10% of 115 = 11.5 → running total = 126.5
 *    tax3 = +20 → running total = 146.5
 *    total = 146.5
 *
 * @param {Number} basicPrice - Base fare price
 * @param {Array} taxIds - Array of Tax ObjectIds to apply
 * @param {String} taxBase - "fare_only" or "fare_plus_tax"
 * @param {String} companyId - Company ObjectId for tax lookup
 * @returns {Number} - Calculated total price
 */
const calculateTotalPrice = async (basicPrice, taxIds = [], taxBase = "fare_only", companyId) => {
  try {
    await connectDB()

    if (!basicPrice || basicPrice < 0) {
      throw new Error("Invalid basic price")
    }

    if (!taxIds || taxIds.length === 0) {
      return basicPrice
    }

    // Fetch tax details
    const taxes = await Tax.find({
      _id: { $in: taxIds },
      company: companyId,
      isDeleted: false,
    })

    if (!taxes || taxes.length === 0) {
      return basicPrice
    }

    let totalPrice = basicPrice

    if (taxBase === "fare_only") {
      // All taxes calculated on original basicPrice
      for (const tax of taxes) {
        if (tax.type === "%") {
          // Percentage tax
          const taxAmount = (basicPrice * tax.value) / 100
          totalPrice += taxAmount
        } else if (tax.type === "Fixed") {
          // Fixed amount tax
          totalPrice += tax.value
        }
      }
    } else if (taxBase === "fare_plus_tax") {
      // Each tax calculated on running total
      for (const tax of taxes) {
        if (tax.type === "%") {
          // Percentage tax on current total
          const taxAmount = (totalPrice * tax.value) / 100
          totalPrice += taxAmount
        } else if (tax.type === "Fixed") {
          // Fixed amount tax
          totalPrice += tax.value
        }
      }
    }

    // Round to 2 decimal places
    return Math.round(totalPrice * 100) / 100
  } catch (error) {
    console.error("Error calculating total price:", error.message)
    throw error
  }
}

/**
 * Get tax details for a price list
 * @param {Array} taxIds - Array of Tax ObjectIds
 * @param {String} companyId - Company ObjectId
 * @returns {Array} - Tax details
 */
const getTaxDetails = async (taxIds = [], companyId) => {
  try {
    await connectDB()

    if (!taxIds || taxIds.length === 0) {
      return []
    }

    const taxes = await Tax.find({
      _id: { $in: taxIds },
      company: companyId,
      isDeleted: false,
    })

    return taxes
  } catch (error) {
    console.error("Error fetching tax details:", error.message)
    throw error
  }
}

/**
 * Validate tax IDs exist in company
 * @param {Array} taxIds - Array of Tax ObjectIds
 * @param {String} companyId - Company ObjectId
 * @returns {Boolean} - true if all taxes exist
 */
const validateTaxIds = async (taxIds = [], companyId) => {
  try {
    if (!taxIds || taxIds.length === 0) {
      return true
    }

    await connectDB()

    const count = await Tax.countDocuments({
      _id: { $in: taxIds },
      company: companyId,
      isDeleted: false,
    })

    return count === taxIds.length
  } catch (error) {
    console.error("Error validating tax IDs:", error.message)
    throw error
  }
}

module.exports = {
  calculateTotalPrice,
  getTaxDetails,
  validateTaxIds,
}
