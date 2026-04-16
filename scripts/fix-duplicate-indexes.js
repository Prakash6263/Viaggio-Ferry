/**
 * Script: fix-duplicate-indexes.js
 * Drops the OLD unique indexes on MarkupDiscountRule and CommissionRule collections
 * so Mongoose can recreate them with the new `partner` field included.
 *
 * Run once: node scripts/fix-duplicate-indexes.js
 */

require("dotenv").config()
const mongoose = require("mongoose")

const MONGODB_URI = process.env.MONGODB_URI

async function run() {
  console.log("Connecting to MongoDB...")
  await mongoose.connect(MONGODB_URI)
  console.log("Connected.\n")

  const db = mongoose.connection.db

  // ── MarkupDiscountRule ──────────────────────────────────────────────────────
  console.log("=== MarkupDiscountRules collection ===")
  const mdCollection = db.collection("markupdiscountrules")
  const mdIndexes = await mdCollection.indexes()
  console.log("Current indexes:", mdIndexes.map(i => i.name))

  // Drop any unique index (the one we are replacing)
  for (const idx of mdIndexes) {
    if (idx.unique && idx.name !== "_id_") {
      console.log(`  Dropping index: ${idx.name}`)
      await mdCollection.dropIndex(idx.name)
      console.log(`  ✓ Dropped`)
    }
  }

  // ── CommissionRules ─────────────────────────────────────────────────────────
  console.log("\n=== CommissionRules collection ===")
  const crCollection = db.collection("commissionrules")
  const crIndexes = await crCollection.indexes()
  console.log("Current indexes:", crIndexes.map(i => i.name))

  for (const idx of crIndexes) {
    if (idx.unique && idx.name !== "_id_") {
      console.log(`  Dropping index: ${idx.name}`)
      await crCollection.dropIndex(idx.name)
      console.log(`  ✓ Dropped`)
    }
  }

  console.log("\n✅ Done. Restart the backend server — Mongoose will recreate the indexes automatically.")
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(err => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})
