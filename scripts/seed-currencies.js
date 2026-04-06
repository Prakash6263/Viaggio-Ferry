require("dotenv").config()
const mongoose = require("mongoose")
const { Currency } = require("../src/models/Currency")
const Counter = require("../src/models/Counter")

// ==================
// CURRENCY DATA
// ==================
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
  { country: "Mongolia", name: "Mongolian Tögrög", code: "MNT" },
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

// ==================
// SEED FUNCTION
// ==================
async function seedCurrencies() {
  try {
    const mongoUri = process.env.MONGODB_URI
    console.log("[v0] MONGODB_URI loaded:", mongoUri ? "✓ Yes" : "✗ No")

    if (!mongoUri) {
      console.error("[v0] Error: MONGODB_URI is not set")
      process.exit(1)
    }

    await mongoose.connect(mongoUri)
    console.log("[v0] ✓ Connected to MongoDB")

    // Clear old data
    await Currency.deleteMany({})
    console.log("[v0] ✓ Cleared existing currencies")

    // Get or create counter
    const counter = await Counter.findOneAndUpdate(
      { name: "currency" },
      { $setOnInsert: { seq: 0 } },
      { new: true, upsert: true }
    )

    let currentSeq = counter.seq

    // Prepare insert data WITH currencyId
    const currenciesToInsert = currenciesData.map((curr) => {
      currentSeq += 1

      return {
        currencyId: currentSeq,
        currencyCode: curr.code,
        currencyName: curr.name,
        countryName: curr.country,
      }
    })

    const result = await Currency.insertMany(currenciesToInsert)
    console.log(`[v0] ✓ Inserted ${result.length} currencies`)

    // Update counter value
    await Counter.updateOne(
      { name: "currency" },
      { $set: { seq: currentSeq } }
    )

    console.log("[v0] ✓ Counter updated to", currentSeq)

    await mongoose.connection.close()
    console.log("[v0] ✓ DB connection closed")
    process.exit(0)
  } catch (error) {
    console.error("[v0] Error seeding currencies:", error.message)
    process.exit(1)
  }
}

seedCurrencies()
