const CompanyCurrency = require("../models/CompanyCurrency")
const { Currency } = require("../models/Currency")

/**
 * Create default currency for a company during registration
 * @param {String} companyId - Company ID
 * @param {String} defaultCurrency - Currency code (e.g., "USD")
 * // Added countryName parameter for precise lookup
 * @param {String} countryName - The country name to match the specific currency version
 * @returns {Promise<Object>} - Created CompanyCurrency document
 */
const createDefaultCompanyCurrency = async (companyId, defaultCurrency = "USD", countryName) => {
  try {
    const query = { currencyCode: defaultCurrency }
    if (countryName) {
      query.countryName = countryName
    }

    // Find the global currency record
    let currency = await Currency.findOne(query)

    if (!currency && countryName) {
      currency = await Currency.findOne({ currencyCode: defaultCurrency })
    }

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
      countryName: currency.countryName,
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
