require("dotenv").config()
const mongoose = require("mongoose")
const { Currency } = require("../src/models/Ccdurrency")

async function verifyCurrencies() {
  try {
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      console.error("[v0] MONGODB_URI not set")
      process.exit(1)
    }

    console.log("[v0] Connecting to MongoDB...")
    await mongoose.connect(mongoUri)

    // Count all currencies
    const totalCount = await Currency.countDocuments()
    console.log(`[v0] Total currencies in database: ${totalCount}`)

    // Get global currencies (no company field)
    const globalCount = await Currency.countDocuments({ company: null })
    console.log(`[v0] Global currencies (no company): ${globalCount}`)

    // Show all currencies
    const allCurrencies = await Currency.find().sort("code")
    console.log("\n[v0] All Currencies:")
    console.log("Code | Name")
    console.log("-".repeat(50))
    allCurrencies.forEach((c) => {
      console.log(`${c.code} | ${c.name}`)
    })

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error("[v0] Error:", error.message)
    process.exit(1)
  }
}

verifyCurrencies()
