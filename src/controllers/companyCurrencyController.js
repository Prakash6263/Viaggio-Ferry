const CompanyCurrency = require("../models/CompanyCurrency")
const { Currency } = require("../models/Currency")
const Company = require("../models/Company")
const connectDB = require("../config/db")
const mongoose = require("mongoose")

const addCurrencyToCompany = async (req, res) => {
  try {
    await connectDB()

    const { companyId } = req.params
    const { currencyId, currentRate, isDefault, exchangeRates, countryName } = req.body

    console.log("[v0] Received companyId:", companyId)
    console.log("[v0] Received request body:", JSON.stringify(req.body, null, 2))

    // Validation
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      console.log("[v0] Invalid companyId format detected:", companyId)
      return res.status(400).json({
        success: false,
        error: `Invalid companyId format: ${companyId}`,
      })
    }

    if (!companyId || !currencyId || (currentRate === undefined && (!exchangeRates || !exchangeRates.length))) {
      return res.status(400).json({
        success: false,
        error: "companyId, currencyId, and either currentRate or exchangeRates are required",
      })
    }

    // Check if company exists
    const company = await Company.findById(companyId)
    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      })
    }

    // Check if currency exists
    const currency = await Currency.findById(currencyId)
    if (!currency) {
      return res.status(404).json({
        success: false,
        error: "Currency not found",
      })
    }

    const finalCountryName = countryName || currency.countryName

    const existingCurrency = await CompanyCurrency.findOne({
      company: companyId,
      currencyCode: currency.currencyCode,
      countryName: finalCountryName,
      isDeleted: false,
    })

    if (existingCurrency) {
      return res.status(400).json({
        success: false,
        error: `Currency ${currency.currencyCode} for country ${finalCountryName} is already added to this company`,
      })
    }

    // Check if this is the first currency being added
    const existingCurrencies = await CompanyCurrency.countDocuments({
      company: companyId,
      isDeleted: false,
    })

    // If isDefault is explicitly false but it's the first currency, make it default
    const shouldBeDefault = isDefault === true || existingCurrencies === 0

    // If this should be default, unset other default currencies
    if (shouldBeDefault) {
      await CompanyCurrency.updateMany({ company: companyId, isDefault: true }, { $set: { isDefault: false } })
    }

    let finalExchangeRates = []
    let finalCurrentRate = currentRate
    let finalRateUpdate = new Date()

    if (exchangeRates && Array.isArray(exchangeRates) && exchangeRates.length > 0) {
      finalExchangeRates = exchangeRates.map((r) => ({
        rate: r.rate,
        baseUnit: r.baseUnit || company.defaultCurrency || "USD", // fallback to company default
        createdAt: new Date(),
      }))

      const mostRecent = [...finalExchangeRates].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      finalCurrentRate = mostRecent.rate
      finalRateUpdate = mostRecent.createdAt
    } else {
      finalExchangeRates = [
        {
          rate: currentRate,
          baseUnit: company.defaultCurrency || "USD", // use company default instead of hardcoded USD
          createdAt: new Date(),
        },
      ]
    }

    // Create new company currency
    const companyCurrency = new CompanyCurrency({
      company: companyId,
      currency: currencyId,
      currencyCode: currency.currencyCode,
      currencyName: currency.currencyName,
      countryName: finalCountryName,
      currentRate: finalCurrentRate,
      isDefault: shouldBeDefault,
      exchangeRates: finalExchangeRates,
      lastRateUpdate: finalRateUpdate,
    })

    await companyCurrency.save()

    res.status(201).json({
      success: true,
      message: "Currency added to company successfully",
      data: companyCurrency,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const getCompanyCurrencies = async (req, res) => {
  try {
    await connectDB()

    const { companyId } = req.params
    const { page = 1, limit = 10, search } = req.query

    // Validation
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid companyId format: ${companyId}`,
      })
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "companyId is required",
      })
    }

    // Check if company exists
    const company = await Company.findById(companyId)
    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      })
    }

    // Build filter
    const filter = {
      company: companyId,
      isDeleted: false,
    }

    if (search) {
      filter.$or = [
        { currencyCode: { $regex: search, $options: "i" } },
        { currencyName: { $regex: search, $options: "i" } },
        { countryName: { $regex: search, $options: "i" } },
      ]
    }

    // Get total count
    const total = await CompanyCurrency.countDocuments(filter)

    // Get paginated results
    const currencies = await CompanyCurrency.find(filter)
      .populate("currency")
      .sort({ isDefault: -1, currencyCode: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    res.status(200).json({
      success: true,
      data: currencies,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const getCompanyCurrencyById = async (req, res) => {
  try {
    await connectDB()

    const { companyId, currencyId } = req.params

    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(currencyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid companyId or currencyId format",
      })
    }

    if (!companyId || !currencyId) {
      return res.status(400).json({
        success: false,
        error: "companyId and currencyId are required",
      })
    }

    const companyCurrency = await CompanyCurrency.findOne({
      _id: currencyId,
      company: companyId,
      isDeleted: false,
    }).populate("currency")

    if (!companyCurrency) {
      return res.status(404).json({
        success: false,
        error: "Company currency not found",
      })
    }

    res.status(200).json({
      success: true,
      data: companyCurrency,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const addExchangeRate = async (req, res) => {
  try {
    await connectDB()

    const { companyId, currencyId } = req.params
    const { rate } = req.body

    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(currencyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid companyId or currencyId format",
      })
    }

    if (!rate) {
      return res.status(400).json({
        success: false,
        error: "rate is required",
      })
    }

    const company = await Company.findById(companyId)
    if (!company) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
      })
    }

    const companyCurrency = await CompanyCurrency.findOne({
      _id: currencyId,
      company: companyId,
      isDeleted: false,
    })

    if (!companyCurrency) {
      return res.status(404).json({
        success: false,
        error: "Company currency not found",
      })
    }

    companyCurrency.exchangeRates.push({
      rate,
      baseUnit: company.defaultCurrency || "USD",
      createdAt: new Date(),
    })

    const mostRecentRate = companyCurrency.exchangeRates.reduce((max, current) => {
      return new Date(current.createdAt) > new Date(max.createdAt) ? current : max
    })

    companyCurrency.currentRate = mostRecentRate.rate
    companyCurrency.lastRateUpdate = mostRecentRate.createdAt

    companyCurrency.exchangeRates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    await companyCurrency.save()

    res.status(200).json({
      success: true,
      message: "Exchange rate added to history successfully",
      data: {
        currencyCode: companyCurrency.currencyCode,
        currentRate: companyCurrency.currentRate,
        lastRateUpdate: companyCurrency.lastRateUpdate,
        historyCount: companyCurrency.exchangeRates.length,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const getExchangeRateHistory = async (req, res) => {
  try {
    await connectDB()

    const { companyId, currencyId } = req.params
    const { startDate, endDate, limit = 50 } = req.query

    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(currencyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid companyId or currencyId format",
      })
    }

    if (!companyId || !currencyId) {
      return res.status(400).json({
        success: false,
        error: "companyId and currencyId are required",
      })
    }

    const companyCurrency = await CompanyCurrency.findOne({
      _id: currencyId,
      company: companyId,
      isDeleted: false,
    })

    if (!companyCurrency) {
      return res.status(404).json({
        success: false,
        error: "Company currency not found",
      })
    }

    let rates = companyCurrency.exchangeRates

    if (startDate || endDate) {
      rates = rates.filter((r) => {
        const date = new Date(r.createdAt)
        if (startDate && date < new Date(startDate)) return false
        if (endDate && date > new Date(endDate)) return false
        return true
      })
    }

    rates = rates
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map(({ rate, baseUnit, createdAt }) => ({
        rate,
        baseUnit,
        createdAt,
      }))

    res.status(200).json({
      success: true,
      data: {
        currencyCode: companyCurrency.currencyCode,
        currencyName: companyCurrency.currencyName,
        countryName: companyCurrency.countryName,
        history: rates,
        total: rates.length,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

const deleteCompanyCurrency = async (req, res) => {
  try {
    await connectDB()

    const { companyId, currencyId } = req.params

    if (!mongoose.Types.ObjectId.isValid(companyId) || !mongoose.Types.ObjectId.isValid(currencyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid companyId or currencyId format",
      })
    }

    if (!companyId || !currencyId) {
      return res.status(400).json({
        success: false,
        error: "companyId and currencyId are required",
      })
    }

    const companyCurrency = await CompanyCurrency.findOne({
      _id: currencyId,
      company: companyId,
      isDeleted: false,
    })

    if (!companyCurrency) {
      return res.status(404).json({
        success: false,
        error: "Company currency not found",
      })
    }

    // Don't allow deletion of default currency
    if (companyCurrency.isDefault) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete the default currency for the company",
      })
    }

    // Soft delete
    companyCurrency.isDeleted = true
    await companyCurrency.save()

    res.status(200).json({
      success: true,
      message: "Company currency deleted successfully",
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

module.exports = {
  addCurrencyToCompany,
  getCompanyCurrencies,
  getCompanyCurrencyById,
  addExchangeRate,
  getExchangeRateHistory,
  deleteCompanyCurrency,
}
