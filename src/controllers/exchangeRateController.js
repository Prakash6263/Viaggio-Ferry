const createHttpError = require("http-errors")

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || "1f85ceea7ab768f2fdf69c36"
const EXCHANGE_RATE_BASE_URL = "https://v6.exchangerate-api.com/v6"

const getAllCurrencies = async (req, res, next) => {
  try {
    const response = await fetch(`${EXCHANGE_RATE_BASE_URL}/${EXCHANGE_RATE_API_KEY}/codes`)

    if (!response.ok) {
      throw createHttpError(502, "Failed to fetch currencies from ExchangeRate API")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw createHttpError(502, "ExchangeRate API returned an error")
    }

    // Transform the response format: [[code, name], [code, name], ...] to array of objects
    const currencies = data.supported_codes.map(([code, name]) => ({
      code,
      name,
    }))

    res.status(200).json({
      success: true,
      message: "Currencies retrieved successfully",
      data: {
        currencies,
        total: currencies.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

const getExchangeRate = async (req, res, next) => {
  try {
    const { fromCurrency } = req.params
    const { toCurrency } = req.query

    if (!fromCurrency) {
      throw createHttpError(400, "fromCurrency parameter is required")
    }

    if (!toCurrency) {
      throw createHttpError(400, "toCurrency query parameter is required")
    }

    const response = await fetch(
      `${EXCHANGE_RATE_BASE_URL}/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency.toUpperCase()}`,
    )

    if (!response.ok) {
      throw createHttpError(502, "Failed to fetch exchange rates from ExchangeRate API")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw createHttpError(
        502,
        data.error_type === "unsupported-code"
          ? `Currency ${fromCurrency} is not supported`
          : "ExchangeRate API returned an error",
      )
    }

    const exchangeRates = data.conversion_rates
    const rate = exchangeRates[toCurrency.toUpperCase()]

    if (!rate) {
      throw createHttpError(400, `Target currency ${toCurrency} is not supported or invalid`)
    }

    res.status(200).json({
      success: true,
      message: "Exchange rate retrieved successfully",
      data: {
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate,
        timestamp: new Date(data.time_last_updated_utc),
        baseURL: data.base_code,
      },
    })
  } catch (error) {
    next(error)
  }
}

const getMultipleExchangeRates = async (req, res, next) => {
  try {
    const { fromCurrency } = req.params
    const { toCurrencies } = req.query

    if (!fromCurrency) {
      throw createHttpError(400, "fromCurrency parameter is required")
    }

    if (!toCurrencies) {
      throw createHttpError(400, "toCurrencies query parameter is required (comma-separated)")
    }

    const targetCurrencies = toCurrencies.split(",").map((c) => c.trim().toUpperCase())

    const response = await fetch(
      `${EXCHANGE_RATE_BASE_URL}/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency.toUpperCase()}`,
    )

    if (!response.ok) {
      throw createHttpError(502, "Failed to fetch exchange rates from ExchangeRate API")
    }

    const data = await response.json()

    if (data.result !== "success") {
      throw createHttpError(
        502,
        data.error_type === "unsupported-code"
          ? `Currency ${fromCurrency} is not supported`
          : "ExchangeRate API returned an error",
      )
    }

    const exchangeRates = data.conversion_rates
    const rates = {}

    targetCurrencies.forEach((currency) => {
      if (exchangeRates[currency]) {
        rates[currency] = exchangeRates[currency]
      }
    })

    if (Object.keys(rates).length === 0) {
      throw createHttpError(400, "None of the target currencies are supported or valid")
    }

    res.status(200).json({
      success: true,
      message: "Exchange rates retrieved successfully",
      data: {
        fromCurrency: fromCurrency.toUpperCase(),
        rates,
        timestamp: new Date(data.time_last_updated_utc),
        baseURL: data.base_code,
      },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllCurrencies,
  getExchangeRate,
  getMultipleExchangeRates,
}
