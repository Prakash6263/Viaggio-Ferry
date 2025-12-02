const { Currency } = require("../models/Currency")
const connectDB = require("../config/db")

// Get all currencies for a company
const getCurrencies = async (req, res) => {
  try {
    await connectDB()

    const { companyId } = req.params
    if (!companyId) {
      return res.status(400).json({ error: "Company ID is required" })
    }

    const currencies = await Currency.find({
      company: companyId,
      isDeleted: false,
    }).sort({ code: 1 })

    res.status(200).json({
      success: true,
      data: currencies,
      count: currencies.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get single currency
const getCurrencyByCode = async (req, res) => {
  try {
    await connectDB()

    const { companyId, code } = req.params
    if (!companyId || !code) {
      return res.status(400).json({ error: "Company ID and currency code are required" })
    }

    const currency = await Currency.findOne({
      company: companyId,
      code: code.toUpperCase(),
      isDeleted: false,
    })

    if (!currency) {
      return res.status(404).json({ error: "Currency not found" })
    }

    res.status(200).json({
      success: true,
      data: currency,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getCurrencies,
  getCurrencyByCode,
}
