const mongoose = require("mongoose")
const { CommissionRule } = require("../src/models/CommissionRule")

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/viaggio-ferry")
  .then(() => {
    console.log("[v0] Connected to MongoDB")
  })
  .catch((err) => {
    console.error("[v0] MongoDB connection error:", err)
    process.exit(1)
  })

async function updateExpiredCommissionRules() {
  try {
    // Find all commission rules with expired dates
    const expiredRules = await CommissionRule.find({
      expiryDate: { $lt: new Date() },
      isDeleted: false,
    })

    console.log(`[v0] Found ${expiredRules.length} expired commission rules`)

    if (expiredRules.length === 0) {
      console.log("[v0] No expired rules found")
      await mongoose.connection.close()
      return
    }

    // Update all expired rules to have a future expiry date (1 year from now)
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const result = await CommissionRule.updateMany(
      {
        expiryDate: { $lt: new Date() },
        isDeleted: false,
      },
      {
        $set: { expiryDate: futureDate },
      }
    )

    console.log(`[v0] Updated ${result.modifiedCount} commission rules`)
    console.log(`[v0] New expiry date: ${futureDate.toISOString()}`)

    // Show sample of updated rules
    const updatedRules = await CommissionRule.find({
      expiryDate: { $gte: new Date() },
      isDeleted: false,
    }).limit(3)

    console.log("[v0] Sample of updated rules:")
    updatedRules.forEach((rule) => {
      console.log(`  - ${rule.ruleName}: expires ${rule.expiryDate.toDateString()}`)
    })

    await mongoose.connection.close()
    console.log("[v0] Done!")
  } catch (error) {
    console.error("[v0] Error updating commission rules:", error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

updateExpiredCommissionRules()
