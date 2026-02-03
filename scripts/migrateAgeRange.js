/**
 * Migration Script: Convert ageRange from string to numeric format
 * 
 * Purpose:
 * - Find all PayloadType documents where ageRange is a string (e.g., "5-12")
 * - Convert to numeric format: { from: 5, to: 12 }
 * - Handle edge cases and validation
 * - Log all changes for audit trail
 * 
 * Usage:
 * node scripts/migrateAgeRange.js
 */

const mongoose = require("mongoose")
const path = require("path")

// Load environment variables
require("dotenv").config()

// Import models
const { PayloadType } = require("../src/models/PayloadType")

/**
 * Parse age range string into numeric format
 * Handles formats like: "5-12", "5 to 12", "5-12 years", etc.
 */
function parseAgeRangeString(ageRangeStr) {
  if (!ageRangeStr || typeof ageRangeStr !== "string") {
    return null
  }

  // Remove common suffixes
  let cleaned = ageRangeStr
    .toLowerCase()
    .replace(/years?/g, "")
    .replace(/years?old/g, "")
    .replace(/age/g, "")
    .trim()

  // Try to extract numbers with various separators
  const patterns = [
    /(\d+)\s*-\s*(\d+)/,        // "5-12", "5 - 12"
    /(\d+)\s*to\s*(\d+)/,       // "5 to 12"
    /(\d+)\s*~\s*(\d+)/,        // "5~12"
    /from\s*(\d+)\s*to\s*(\d+)/, // "from 5 to 12"
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      const from = parseInt(match[1])
      const to = parseInt(match[2])

      // Validate ranges
      if (from >= 0 && from <= 150 && to >= 0 && to <= 150 && from <= to) {
        return { from, to }
      }
    }
  }

  // If no pattern matched, return null
  return null
}

/**
 * Main migration function
 */
async function migrateAgeRange() {
  try {
    console.log("📋 Starting PayloadType ageRange migration...")
    console.log(`Database: ${process.env.MONGODB_URI || "mongodb://localhost:27017"}`)

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ship-booking", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log("✅ Connected to MongoDB\n")

    // Find all passenger PayloadTypes with string ageRange
    const stringAgeRangePayloadTypes = await PayloadType.find({
      category: "passenger",
      ageRange: { $type: "string" },
      isDeleted: false,
    })

    console.log(`📌 Found ${stringAgeRangePayloadTypes.length} documents with string ageRange\n`)

    if (stringAgeRangePayloadTypes.length === 0) {
      console.log("✨ No documents need migration. All ageRanges are already in numeric format.")
      await mongoose.disconnect()
      return
    }

    let successCount = 0
    let failedCount = 0
    const migrationLog = []

    // Process each document
    for (const payloadType of stringAgeRangePayloadTypes) {
      const originalAgeRange = payloadType.ageRange
      const parsedAgeRange = parseAgeRangeString(originalAgeRange)

      if (parsedAgeRange) {
        try {
          payloadType.ageRange = parsedAgeRange
          await payloadType.save()

          successCount++
          migrationLog.push({
            _id: payloadType._id,
            code: payloadType.code,
            name: payloadType.name,
            originalAgeRange,
            newAgeRange: parsedAgeRange,
            status: "SUCCESS",
          })

          console.log(
            `✅ ${payloadType.code}: "${originalAgeRange}" → { from: ${parsedAgeRange.from}, to: ${parsedAgeRange.to} }`
          )
        } catch (error) {
          failedCount++
          migrationLog.push({
            _id: payloadType._id,
            code: payloadType.code,
            name: payloadType.name,
            originalAgeRange,
            status: "FAILED",
            error: error.message,
          })

          console.error(
            `❌ ${payloadType.code}: Failed to save - ${error.message}`
          )
        }
      } else {
        failedCount++
        migrationLog.push({
          _id: payloadType._id,
          code: payloadType.code,
          name: payloadType.name,
          originalAgeRange,
          status: "UNPARSEABLE",
          error: `Could not parse ageRange format: "${originalAgeRange}"`,
        })

        console.warn(
          `⚠️  ${payloadType.code}: Could not parse ageRange "${originalAgeRange}". Please review manually.`
        )
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("📊 MIGRATION SUMMARY")
    console.log("=".repeat(60))
    console.log(`Total documents processed: ${stringAgeRangePayloadTypes.length}`)
    console.log(`✅ Successfully migrated: ${successCount}`)
    console.log(`❌ Failed: ${failedCount}`)
    console.log("=".repeat(60) + "\n")

    // Log any failures for manual review
    const failedMigrations = migrationLog.filter((log) => log.status !== "SUCCESS")
    if (failedMigrations.length > 0) {
      console.log("⚠️  MANUAL REVIEW REQUIRED:")
      console.table(failedMigrations)
    }

    await mongoose.disconnect()
    console.log("\n✅ Migration complete!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

// Run migration
migrateAgeRange()
