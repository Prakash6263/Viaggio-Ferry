const CompanyCurrency = require("../models/CompanyCurrency")
const { Currency } = require("../models/Currency")

/**
 * Create default currency for a company during registration
 * @param {String} companyId - Company ID
 * @param {String} defaultCurrency - Currency code (e.g., "USD")
 * @returns {Promise<Object>} - Created CompanyCurrency document
 */
const createDefaultCompanyCurrency = async (companyId, defaultCurrency = "USD") => {
  try {
    // Find the global currency record
    const currency = await Currency.findOne({ currencyCode: defaultCurrency })

    if (!currency) {
      throw new Error(`Currency with code ${defaultCurrency} not found in system`)
    }

    // Check if default currency already exists
    const existingDefault = await CompanyCurrency.findOne({
      company: companyId,
      isDefault: true,
      isDeleted: false,
    })

    if (existingDefault) {
      return existingDefault
    }

    // Create new default company currency
    const companyCurrency = new CompanyCurrency({
      company: companyId,
      currency: currency._id,
      currencyCode: currency.currencyCode,
      currencyName: currency.currencyName,
      currentRate: 1.0, // Default rate for base currency
      isDefault: true,
      exchangeRates: [
        {
          rate: 1.0,
          rateDate: new Date(),
          baseUnit: defaultCurrency,
        },
      ],
      lastRateUpdate: new Date(),
    })

    await companyCurrency.save()
    return companyCurrency
  } catch (error) {
    console.error("Error creating default company currency:", error.message)
    throw error
  }
}

module.exports = {
  createDefaultCompanyCurrency,
}
