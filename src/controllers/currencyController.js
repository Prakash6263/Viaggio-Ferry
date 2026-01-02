const { Currency } = require("../models/Currency")
const connectDB = require("../config/db")

// Get all currencies globally (no company filter)
const getAllCurrenciesGlobally = async (req, res) => {
  try {
    await connectDB()

    const currencies = await Currency.find({
      isDeleted: false,
    }).sort({ currencyCode: 1 }) // Fixed sort field to match model

    res.status(200).json({
      success: true,
      data: currencies,
      count: currencies.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getCurrencies = async (req, res) => {
  try {
    await connectDB()

    const currencies = await Currency.find({
      isDeleted: false,
    }).sort({ currencyCode: 1 })

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

    const { code } = req.params
    if (!code) {
      return res.status(400).json({ error: "Currency code is required" })
    }

    const currency = await Currency.findOne({
      currencyCode: code.toUpperCase(),
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

const getGlobalCurrencyCodes = async (req, res) => {
  try {
    await connectDB()

    const currencies = await Currency.find({
      isDeleted: false,
    })
      .select("currencyCode -_id")
      .sort({ currencyCode: 1 })

    const codes = currencies.map((c) => c.currencyCode)

    res.status(200).json({
      success: true,
      data: codes,
      count: codes.length,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllCurrenciesGlobally,
  getCurrencies,
  getCurrencyByCode,
  getGlobalCurrencyCodes,
}
