// const mongoose = require("mongoose")
// const { SuperAdminLedger } = require("../src/models/SuperAdminLedger")
// const { LEDGER_TYPE_MAPPING, LEDGER_TYPES } = require("../src/constants/ledgerTypes")
// require("dotenv").config()

// const baseLedgers = LEDGER_TYPES.map((type) => ({
//   description: type,
//   type: type,
// }))

// async function seed() {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI)
//     console.log("Connected to database for seeding...")

//     const sequences = {}

//     for (const item of baseLedgers) {
//       const typeSequence = LEDGER_TYPE_MAPPING[item.type]

//       const exists = await SuperAdminLedger.findOne({
//         ledgerType: item.type,
//         isDeleted: false,
//       })

//       if (exists) {
//         console.log(`Skipping existing base ledger for type: ${item.type}`)
//         continue
//       }

//       sequences[item.type] = (sequences[item.type] || 0) + 1

//       const paddedSeq = String(sequences[item.type]).padStart(5, "0")

//       await SuperAdminLedger.create({
//         ledgerCode: `${typeSequence}-${paddedSeq}`,
//         ledgerSequenceNumber: sequences[item.type],
//         ledgerType: item.type,
//         typeSequence: typeSequence,
//         status: "Active",
//         systemAccount: true,
//         locked: true,
//         createdBy: "super_admin",
//       })
//     }

//     console.log(`Seeded ${baseLedgers.length} base ledgers successfully.`)
//     process.exit(0)
//   } catch (error) {
//     console.error("Seeding failed:", error)
//     process.exit(1)
//   }
// }

// seed()



const mongoose = require("mongoose")
const { SuperAdminLedger } = require("../src/models/SuperAdminLedger")
const { BASE_LEDGERS } = require("../src/constants/baseLedgersConfig")
require("dotenv").config()

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to database for seeding...")

    let successCount = 0
    let skippedCount = 0

    for (const ledgerData of BASE_LEDGERS) {
      const exists = await SuperAdminLedger.findOne({
        ledgerCode: ledgerData.ledgerCode,
        isDeleted: false,
      })

      if (exists) {
        console.log(`Skipping existing base ledger: ${ledgerData.ledgerCode}`)
        skippedCount++
        continue
      }

      await SuperAdminLedger.create({
        ledgerCode: ledgerData.ledgerCode,
        ledgerSequenceNumber: ledgerData.ledgerSequenceNumber,
        ledgerDescription: ledgerData.ledgerDescription, // explicitly set description from config
        ledgerType: ledgerData.ledgerType,
        typeSequence: ledgerData.typeSequence,
        status: "Active",
        systemAccount: true,
        locked: true,
        createdBy: "super_admin",
      })
      successCount++
      console.log(`Created base ledger: ${ledgerData.ledgerCode} - ${ledgerData.ledgerDescription}`)
    }

    console.log(`\nSeeding complete!`)
    console.log(`Successfully created: ${successCount} ledgers`)
    console.log(`Skipped (already exist): ${skippedCount} ledgers`)
    process.exit(0)
  } catch (error) {
    console.error("Seeding failed:", error)
    process.exit(1)
  }
}

seed()
