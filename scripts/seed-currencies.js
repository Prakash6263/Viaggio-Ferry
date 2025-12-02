const mongoose = require("mongoose")
const connectDB = require("../src/config/db")
// Fixed imports to match model export patterns
const Company = require("../src/models/Company")
const { Currency } = require("../src/models/Currency")
require("dotenv").config()

const MONGODB_URI = "mongodb+srv://kdsinghappsol:kdsinghappsol-864-369@cluster0.rfgp5y0.mongodb.net/shipmentbackend"

const currenciesData = [
  { country: "Afghanistan", name: "Afghan Afghani", code: "AFN" },
  { country: "Albania", name: "Albanian Lek", code: "ALL" },
  { country: "Algeria", name: "Algerian Dinar", code: "DZD" },
  { country: "Angola", name: "Angolan Kwanza", code: "AOA" },
  { country: "Argentina", name: "Argentine Peso", code: "ARS" },
  { country: "Armenia", name: "Armenian Dram", code: "AMD" },
  { country: "Aruba", name: "Aruban Florin", code: "AWG" },
  { country: "Australia", name: "Australian Dollar", code: "AUD" },
  { country: "Azerbaijan", name: "Azerbaijani Manat", code: "AZN" },
  { country: "Bahamas", name: "Bahamian Dollar", code: "BSD" },
  { country: "Bahrain", name: "Bahraini Dinar", code: "BHD" },
  { country: "Bangladesh", name: "Bangladeshi Taka", code: "BDT" },
  { country: "Barbados", name: "Barbadian Dollar", code: "BBD" },
  { country: "Belarus", name: "Belarusian Ruble", code: "BYN" },
  { country: "Belgium", name: "Euro", code: "EUR" },
  { country: "Belize", name: "Belize Dollar", code: "BZD" },
  { country: "Benin", name: "West African CFA Franc", code: "XOF" },
  { country: "Bermuda", name: "Bermudian Dollar", code: "BMD" },
  { country: "Bhutan", name: "Bhutanese Ngultrum", code: "BTN" },
  { country: "Bolivia", name: "Boliviano", code: "BOB" },
  { country: "Bosnia and Herzegovina", name: "Convertible Mark", code: "BAM" },
  { country: "Botswana", name: "Botswana Pula", code: "BWP" },
  { country: "Brazil", name: "Brazilian Real", code: "BRL" },
  { country: "Brunei", name: "Brunei Dollar", code: "BND" },
  { country: "Bulgaria", name: "Bulgarian Lev", code: "BGN" },
  { country: "Burundi", name: "Burundian Franc", code: "BIF" },
  { country: "Cambodia", name: "Cambodian Riel", code: "KHR" },
  { country: "Cameroon", name: "Central African CFA Franc", code: "XAF" },
  { country: "Canada", name: "Canadian Dollar", code: "CAD" },
  { country: "Cape Verde", name: "Cape Verde Escudo", code: "CVE" },
  { country: "Cayman Islands", name: "Cayman Islands Dollar", code: "KYD" },
  { country: "Chad", name: "Central African CFA Franc", code: "XAF" },
  { country: "Chile", name: "Chilean Peso", code: "CLP" },
  { country: "China", name: "Chinese Yuan", code: "CNY" },
  { country: "Colombia", name: "Colombian Peso", code: "COP" },
  { country: "Costa Rica", name: "Costa Rican Colón", code: "CRC" },
  { country: "Côte d'Ivoire", name: "West African CFA Franc", code: "XOF" },
  { country: "Croatia", name: "Croatian Kuna", code: "HRK" },
  { country: "Cuba", name: "Cuban Peso", code: "CUP" },
  { country: "Cyprus", name: "Euro", code: "EUR" },
  { country: "Czech Republic", name: "Czech Koruna", code: "CZK" },
  { country: "Denmark", name: "Danish Krone", code: "DKK" },
  { country: "Djibouti", name: "Djiboutian Franc", code: "DJF" },
  { country: "Dominican Republic", name: "Dominican Peso", code: "DOP" },
  { country: "Ecuador", name: "United States Dollar", code: "USD" },
  { country: "Egypt", name: "Egyptian Pound", code: "EGP" },
  { country: "El Salvador", name: "United States Dollar", code: "USD" },
  { country: "Estonia", name: "Euro", code: "EUR" },
  { country: "Eswatini", name: "Eswatini Lilangeni", code: "SZL" },
  { country: "Ethiopia", name: "Ethiopian Birr", code: "ETB" },
  { country: "Fiji", name: "Fijian Dollar", code: "FJD" },
  { country: "Finland", name: "Euro", code: "EUR" },
  { country: "France", name: "Euro", code: "EUR" },
  { country: "Gabon", name: "Central African CFA Franc", code: "XAF" },
  { country: "Gambia", name: "Gambian Dalasi", code: "GMD" },
  { country: "Georgia", name: "Georgian Lari", code: "GEL" },
  { country: "Germany", name: "Euro", code: "EUR" },
  { country: "Ghana", name: "Ghana Cedi", code: "GHS" },
  { country: "Greece", name: "Euro", code: "EUR" },
  { country: "Guatemala", name: "Guatemalan Quetzal", code: "GTQ" },
  { country: "Guinea", name: "Guinean Franc", code: "GNF" },
  { country: "Guinea-Bissau", name: "West African CFA Franc", code: "XOF" },
  { country: "Guyana", name: "Guyanese Dollar", code: "GYD" },
  { country: "Haiti", name: "Haitian Gourde", code: "HTG" },
  { country: "Honduras", name: "Honduran Lempira", code: "HNL" },
  { country: "Hong Kong", name: "Hong Kong Dollar", code: "HKD" },
  { country: "Hungary", name: "Hungarian Forint", code: "HUF" },
  { country: "Iceland", name: "Icelandic Króna", code: "ISK" },
  { country: "India", name: "Indian Rupee", code: "INR" },
  { country: "Indonesia", name: "Indonesian Rupiah", code: "IDR" },
  { country: "Iran", name: "Iranian Rial", code: "IRR" },
  { country: "Iraq", name: "Iraqi Dinar", code: "IQD" },
  { country: "Ireland", name: "Euro", code: "EUR" },
  { country: "Israel", name: "Israeli New Sheqel", code: "ILS" },
  { country: "Italy", name: "Euro", code: "EUR" },
  { country: "Jamaica", name: "Jamaican Dollar", code: "JMD" },
  { country: "Japan", name: "Japanese Yen", code: "JPY" },
  { country: "Jordan", name: "Jordanian Dinar", code: "JOD" },
  { country: "Kazakhstan", name: "Kazakhstani Tenge", code: "KZT" },
  { country: "Kenya", name: "Kenyan Shilling", code: "KES" },
  { country: "Kuwait", name: "Kuwaiti Dinar", code: "KWD" },
  { country: "Kyrgyzstan", name: "Kyrgyzstani Som", code: "KGS" },
  { country: "Laos", name: "Lao Kip", code: "LAK" },
  { country: "Latvia", name: "Euro", code: "EUR" },
  { country: "Lebanon", name: "Lebanese Pound", code: "LBP" },
  { country: "Lesotho", name: "Lesotho Loti", code: "LSL" },
  { country: "Liberia", name: "Liberian Dollar", code: "LRD" },
  { country: "Libya", name: "Libyan Dinar", code: "LYD" },
  { country: "Liechtenstein", name: "Swiss Franc", code: "CHF" },
  { country: "Lithuania", name: "Euro", code: "EUR" },
  { country: "Luxembourg", name: "Euro", code: "EUR" },
  { country: "Madagascar", name: "Malagasy Ariary", code: "MGA" },
  { country: "Malawi", name: "Malawian Kwacha", code: "MWK" },
  { country: "Malaysia", name: "Malaysian Ringgit", code: "MYR" },
  { country: "Maldives", name: "Maldivian Rufiyaa", code: "MVR" },
  { country: "Mali", name: "West African CFA Franc", code: "XOF" },
  { country: "Malta", name: "Euro", code: "EUR" },
  { country: "Mauritania", name: "Mauritanian Ouguiya", code: "MRU" },
  { country: "Mauritius", name: "Mauritian Rupee", code: "MUR" },
  { country: "Mexico", name: "Mexican Peso", code: "MXN" },
  { country: "Moldova", name: "Moldovan Leu", code: "MDL" },
  { country: "Mongolia", name: "Mongolian Tugrik", code: "MNT" },
  { country: "Montenegro", name: "Euro", code: "EUR" },
  { country: "Morocco", name: "Moroccan Dirham", code: "MAD" },
  { country: "Mozambique", name: "Mozambican Metical", code: "MZN" },
  { country: "Myanmar", name: "Myanmar Kyat", code: "MMK" },
  { country: "Namibia", name: "Namibian Dollar", code: "NAD" },
  { country: "Nepal", name: "Nepalese Rupee", code: "NPR" },
  { country: "Netherlands", name: "Euro", code: "EUR" },
  { country: "New Zealand", name: "New Zealand Dollar", code: "NZD" },
  { country: "Nicaragua", name: "Nicaraguan Córdoba", code: "NIO" },
  { country: "Niger", name: "West African CFA Franc", code: "XOF" },
  { country: "Nigeria", name: "Nigerian Naira", code: "NGN" },
  { country: "Norway", name: "Norwegian Krone", code: "NOK" },
  { country: "Oman", name: "Omani Rial", code: "OMR" },
  { country: "Pakistan", name: "Pakistani Rupee", code: "PKR" },
  { country: "Panama", name: "Balboa / USD", code: "PAB" },
  { country: "Paraguay", name: "Paraguayan Guaraní", code: "PYG" },
  { country: "Peru", name: "Peruvian Sol", code: "PEN" },
  { country: "Philippines", name: "Philippine Peso", code: "PHP" },
  { country: "Poland", name: "Polish Zloty", code: "PLN" },
  { country: "Portugal", name: "Euro", code: "EUR" },
  { country: "Qatar", name: "Qatari Riyal", code: "QAR" },
  { country: "Romania", name: "Romanian Leu", code: "RON" },
  { country: "Russia", name: "Russian Ruble", code: "RUB" },
  { country: "Rwanda", name: "Rwandan Franc", code: "RWF" },
  { country: "Samoa", name: "Samoan Tala", code: "WST" },
  { country: "Saudi Arabia", name: "Saudi Riyal", code: "SAR" },
  { country: "Senegal", name: "West African CFA Franc", code: "XOF" },
  { country: "Serbia", name: "Serbian Dinar", code: "RSD" },
  { country: "Seychelles", name: "Seychellois Rupee", code: "SCR" },
  { country: "Sierra Leone", name: "Sierra Leonean Leone", code: "SLL" },
  { country: "Singapore", name: "Singapore Dollar", code: "SGD" },
  { country: "Slovakia", name: "Euro", code: "EUR" },
  { country: "Slovenia", name: "Euro", code: "EUR" },
  { country: "Solomon Islands", name: "Solomon Islands Dollar", code: "SBD" },
  { country: "Somalia", name: "Somali Shilling", code: "SOS" },
  { country: "South Africa", name: "South African Rand", code: "ZAR" },
  { country: "South Korea", name: "South Korean Won", code: "KRW" },
  { country: "Spain", name: "Euro", code: "EUR" },
  { country: "Sri Lanka", name: "Sri Lankan Rupee", code: "LKR" },
  { country: "Sudan", name: "Sudanese Pound", code: "SDG" },
  { country: "Suriname", name: "Surinamese Dollar", code: "SRD" },
  { country: "Sweden", name: "Swedish Krona", code: "SEK" },
  { country: "Switzerland", name: "Swiss Franc", code: "CHF" },
  { country: "Syria", name: "Syrian Pound", code: "SYP" },
  { country: "Taiwan", name: "New Taiwan Dollar", code: "TWD" },
  { country: "Tajikistan", name: "Tajikistani Somoni", code: "TJS" },
  { country: "Tanzania", name: "Tanzanian Shilling", code: "TZS" },
  { country: "Thailand", name: "Thai Baht", code: "THB" },
  { country: "Togo", name: "West African CFA Franc", code: "XOF" },
  { country: "Tonga", name: "Tongan Paʻanga", code: "TOP" },
  { country: "Trinidad & Tobago", name: "TT Dollar", code: "TTD" },
  { country: "Tunisia", name: "Tunisian Dinar", code: "TND" },
  { country: "Turkey", name: "Turkish Lira", code: "TRY" },
  { country: "Turkmenistan", name: "Turkmenistan Manat", code: "TMT" },
  { country: "Uganda", name: "Ugandan Shilling", code: "UGX" },
  { country: "Ukraine", name: "Ukrainian Hryvnia", code: "UAH" },
  { country: "UAE", name: "UAE Dirham", code: "AED" },
  { country: "United Kingdom", name: "Pound Sterling", code: "GBP" },
  { country: "United States", name: "US Dollar", code: "USD" },
  { country: "Uruguay", name: "Uruguayan Peso", code: "UYU" },
  { country: "Uzbekistan", name: "Uzbekistan Som", code: "UZS" },
  { country: "Vanuatu", name: "Vanuatu Vatu", code: "VUV" },
  { country: "Venezuela", name: "Venezuelan Bolívar", code: "VES" },
  { country: "Vietnam", name: "Vietnamese Dong", code: "VND" },
  { country: "Yemen", name: "Yemeni Rial", code: "YER" },
  { country: "Zambia", name: "Zambian Kwacha", code: "ZMW" },
  { country: "Zimbabwe", name: "Zimbabwean Dollar", code: "ZWL" },
]

async function seedCurrencies() {
  let connection = null
  try {
    console.log("[v0] Starting seed currencies script...")
    console.log("[v0] Connecting to MongoDB Atlas...")

    connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("[v0] Successfully connected to MongoDB")

    // Validate Company model exists before querying
    if (!Company) {
      throw new Error("Company model failed to load")
    }

    console.log("[v0] Querying companies from database...")
    const companies = await Company.find({})
    console.log(`[v0] Query completed. Found ${companies ? companies.length : 0} companies`)

    if (!companies || companies.length === 0) {
      console.error("\n[v0] ==================== ERROR ====================")
      console.error("[v0] No companies found in database!")
      console.error("[v0] You must create at least one company before seeding currencies.")
      console.error("[v0] Steps to fix:")
      console.error("[v0]   1. Start your server: npm run dev")
      console.error("[v0]   2. Create a company via admin API endpoint")
      console.error("[v0]   3. Then run: node scripts/seed-currencies.js")
      console.error("[v0] ================================================\n")
      process.exit(1)
    }

    console.log(`[v0] Beginning currency seeding for ${companies.length} company/companies...\n`)

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const company of companies) {
      console.log(`[v0] Processing company: "${company.companyName}" (${company._id})`)

      for (const currencyData of currenciesData) {
        try {
          // Added null check before querying
          if (!currencyData.code) {
            console.error(`[v0]   Error: Currency data missing code field`)
            errorCount++
            continue
          }

          const exists = await Currency.findOne({
            company: company._id,
            code: currencyData.code.toUpperCase(),
          })

          if (exists) {
            skippedCount++
            continue
          }

          await Currency.create({
            company: company._id,
            code: currencyData.code.toUpperCase(),
            name: currencyData.name,
            rates: [],
          })
          createdCount++
        } catch (innerError) {
          console.error(`[v0]   Error creating ${currencyData.code}: ${innerError.message}`)
          errorCount++
        }
      }
    }

    console.log("\n[v0] ==================== SEEDING COMPLETE ====================")
    console.log(`[v0] Created:  ${createdCount} currencies`)
    console.log(`[v0] Skipped:  ${skippedCount} (already exist)`)
    console.log(`[v0] Errors:   ${errorCount}`)
    console.log("[v0] ============================================================\n")

    process.exit(0)
  } catch (error) {
    console.error("\n[v0] ==================== SEEDING FAILED ====================")
    console.error("[v0] Error Type:", error.constructor.name)
    console.error("[v0] Error Message:", error.message)
    console.error("[v0]")

    // Detailed error messages for common issues
    if (error.message.includes("MONGODB_URI")) {
      console.error("[v0] SOLUTION:")
      console.error("[v0]   1. Create .env.local in project root")
      console.error("[v0]   2. Add: MONGODB_URI=mongodb://localhost:27017/viaggio-ferry")
      console.error("[v0]   3. Or use MongoDB Atlas connection string")
    } else if (error.message.includes("connect ECONNREFUSED")) {
      console.error("[v0] SOLUTION:")
      console.error("[v0]   MongoDB server is not running!")
      console.error("[v0]   1. Start MongoDB locally: mongod")
      console.error("[v0]   2. Or use MongoDB Atlas cloud database")
      console.error("[v0]   3. Check your MONGODB_URI is correct")
    } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.error("[v0] SOLUTION:")
      console.error("[v0]   Cannot reach MongoDB server!")
      console.error("[v0]   1. Check internet connection")
      console.error("[v0]   2. Check MONGODB_URI is correct")
      console.error("[v0]   3. If using Atlas, check IP whitelist")
    } else if (error.message.includes("find")) {
      console.error("[v0] SOLUTION:")
      console.error("[v0]   Database query failed!")
      console.error("[v0]   1. Check models are properly loaded")
      console.error("[v0]   2. Check MongoDB connection")
      console.error("[v0]   Details: " + error.message)
    } else {
      console.error("[v0] DETAILS:", error.message)
      console.error("[v0] STACK:", error.stack)
    }

    console.error("[v0] ============================================================\n")
    process.exit(1)
  }
}

seedCurrencies()
