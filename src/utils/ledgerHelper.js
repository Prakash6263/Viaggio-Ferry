// const { SuperAdminLedger } = require("../models/SuperAdminLedger")
// const { CompanyLedger } = require("../models/CompanyLedger")
// const { LEDGER_TYPE_MAPPING } = require("../constants/ledgerTypes")

// /**
//  * Generates a unique ledger code based on type and sequence
//  * Supports both SuperAdminLedger and CompanyLedger schemas
//  */
// const generateLedgerCode = async (ledgerType, companyId = null) => {
//   const typeSequence = LEDGER_TYPE_MAPPING[ledgerType]
//   if (!typeSequence) {
//     throw new Error(`Invalid ledger type: ${ledgerType}`)
//   }

//   const query = { typeSequence, isDeleted: false }
//   let Model = SuperAdminLedger

//   if (companyId) {
//     query.company = companyId
//     Model = CompanyLedger
//   }

//   const latestLedger = await Model.findOne(query).sort({ ledgerSequenceNumber: -1 })

//   const nextSequenceNumber = latestLedger ? latestLedger.ledgerSequenceNumber + 1 : 1
//   const paddedSequence = String(nextSequenceNumber).padStart(5, "0")
//   const ledgerCode = `${typeSequence}-${paddedSequence}`

//   return { ledgerCode, nextSequenceNumber, typeSequence }
// }

// /**
//  * Rule 9: Company onboarding logic - create only 3 ledgers for business partners
//  * Only create 3 business partner ledgers during company registration
//  * Companies can manually create additional ledgers using the admin ledger API
//  */
// const initializeCompanyLedgers = async (companyId) => {
//   try {
//     // Get the 3 business partner ledger types only
//     const businessPartnerLedgerTypes = ["PARTNER_MARINE", "PARTNER_COMMERCIAL", "PARTNER_SELLING"]

//     const baseLedgers = await SuperAdminLedger.find({
//       isDeleted: false,
//       status: "Active",
//       ledgerType: { $in: businessPartnerLedgerTypes },
//     })

//     if (baseLedgers.length === 0) {
//       console.warn(`[v0] No base ledgers found for business partners to copy for company: ${companyId}`)
//       return
//     }

//     const companyLedgers = baseLedgers.map((base) => ({
//       company: companyId,
//       baseLedger: base._id,
//       ledgerCode: base.ledgerCode,
//       ledgerSequenceNumber: base.ledgerSequenceNumber,
//       ledgerDescription: base.ledgerDescription,
//       ledgerType: base.ledgerType,
//       typeSequence: base.typeSequence,
//       status: "Active",
//       systemAccount: true,
//       locked: true,
//       createdBy: "super_admin",
//     }))

//     await CompanyLedger.insertMany(companyLedgers)
//     console.log(
//       `[v0] Successfully initialized ${companyLedgers.length} business partner ledgers for company: ${companyId}`,
//     )
//   } catch (error) {
//     console.error(`[v0] Error initializing company ledgers:`, error)
//     throw error
//   }
// }

// module.exports = {
//   generateLedgerCode,
//   initializeCompanyLedgers,
// }



const { SuperAdminLedger } = require("../models/SuperAdminLedger")
const { CompanyLedger } = require("../models/CompanyLedger")
const { LEDGER_TYPE_MAPPING } = require("../constants/ledgerTypes")

/**
 * Generates a unique ledger code based on type and sequence
 * Supports both SuperAdminLedger and CompanyLedger schemas
 */
const generateLedgerCode = async (ledgerType, companyId = null) => {
  const typeSequence = LEDGER_TYPE_MAPPING[ledgerType]
  if (!typeSequence) {
    throw new Error(`Invalid ledger type: ${ledgerType}`)
  }

  const query = { typeSequence, isDeleted: false }
  let Model = SuperAdminLedger

  if (companyId) {
    query.company = companyId
    Model = CompanyLedger
  }

  const latestLedger = await Model.findOne(query).sort({ ledgerSequenceNumber: -1 })

  const nextSequenceNumber = latestLedger ? latestLedger.ledgerSequenceNumber + 1 : 1
  const paddedSequence = String(nextSequenceNumber).padStart(5, "0")
  const ledgerCode = `${typeSequence}-${paddedSequence}`

  return { ledgerCode, nextSequenceNumber, typeSequence }
}

/**
 * Updated to create ledgers for ALL SuperAdminLedger records with admin ledger
 * Rule 9: Company onboarding logic - create ledgers for all admin-level ledgers
 * During company registration, copies ALL active SuperAdminLedger records to the new company
 * This ensures the company has the complete chart of accounts from the platform template
 */
const initializeCompanyLedgers = async (companyId) => {
  try {
    const baseLedgers = await SuperAdminLedger.find({
      isDeleted: false,
      status: "Active",
    })

    if (baseLedgers.length === 0) {
      console.warn(`[v0] No base ledgers found to copy for company: ${companyId}`)
      return
    }

    const companyLedgers = baseLedgers.map((base) => ({
      company: companyId,
      baseLedger: base._id,
      ledgerCode: base.ledgerCode,
      ledgerSequenceNumber: base.ledgerSequenceNumber,
      ledgerDescription: base.ledgerDescription,
      ledgerType: base.ledgerType,
      typeSequence: base.typeSequence,
      status: "Active",
      systemAccount: true,
      locked: true,
      createdBy: "super_admin",
    }))

    await CompanyLedger.insertMany(companyLedgers)
    console.log(
      `[v0] Successfully initialized ${companyLedgers.length} ledgers (all admin ledgers) for company: ${companyId}`,
    )
  } catch (error) {
    console.error(`[v0] Error initializing company ledgers:`, error)
    throw error
  }
}

module.exports = {
  generateLedgerCode,
  initializeCompanyLedgers,
}
