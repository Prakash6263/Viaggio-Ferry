const createHttpError = require("http-errors")
const Partner = require("../models/Partner")
const Company = require("../models/Company")
const { CompanyLedger } = require("../models/CompanyLedger")
const { generateLedgerCode } = require("./ledgerHelper")

/**
 * IDEMPOTENT: Creates exactly THREE default business partners for a company
 * - B2C_Marine_Partner (layer = Marine, role = "B2C_Marine_Partner")
 * - B2C_Commercial_Partner (layer = Commercial, role = "B2C_Commercial_Partner")
 * - B2C_Selling_Partner (layer = Selling, role = "B2C_Selling_Partner")
 *
 * Uses ROLE as the partner name (not company name).
 * Role field is used for business type classification and filtering.
 * Layer field remains unchanged for hierarchy purposes.
 * Prevents duplicate creation through existence checks.
 */
const initializeDefaultB2CPartners = async (companyId) => {
  try {
    console.log(`[v0] Starting default B2C partner initialization for company: ${companyId}`)

    // Fetch company details to get company name
    const company = await Company.findById(companyId)
    if (!company) {
      throw createHttpError(404, `Company not found: ${companyId}`)
    }

    const existingMarine = await Partner.findOne({
      company: companyId,
      layer: "Marine",
      role: "B2C_Marine_Partner",
      isDeleted: false,
    })

    if (existingMarine) {
      console.log(
        `[v0] B2C Marine partner already exists for company ${companyId}, skipping initialization (idempotent)`,
      )
      return {
        marinePartnerId: existingMarine._id,
        commercialPartnerId: null,
        sellingPartnerId: null,
        alreadyInitialized: true,
      }
    }

    const marinePartner = new Partner({
      company: companyId,
      name: "B2C_Marine_Partner", // Role as name with underscore format
      role: "B2C_Marine_Partner",
      phone: company.mainPhoneNumber || "N/A",
      address: company.address || "N/A",
      layer: "Marine",
      parentAccount: companyId,
      partnerStatus: "Active",
      contactInformation: {
        name: "B2C_Marine_Partner",
        email: company.emailAddress || "",
        phone: company.mainPhoneNumber || "",
      },
    })

    await marinePartner.save()
    console.log(`[v0] Created B2C Marine Partner: ${marinePartner._id}`)

    // Generate ledger for Marine Partner
    try {
      const marineGen = await generateLedgerCode("Business Partners", companyId)
      const marineLedger = new CompanyLedger({
        company: companyId,
        ledgerCode: marineGen.ledgerCode,
        ledgerSequenceNumber: marineGen.nextSequenceNumber,
        ledgerType: "Business Partners",
        typeSequence: marineGen.typeSequence,
        ledgerDescription: `B2C_Marine_Partner Ledger`,
        status: "Active",
        systemAccount: false,
        locked: false,
        createdBy: "company",
        partnerAccount: marinePartner._id,
        partnerModel: "Partner",
      })
      await marineLedger.save()
      console.log(`[v0] Created ledger for B2C Marine Partner: ${marineLedger.ledgerCode}`)
    } catch (ledgerError) {
      console.error("[v0] Error creating B2C Marine Partner ledger:", ledgerError.message)
      throw ledgerError
    }

    const commercialPartner = new Partner({
      company: companyId,
      name: "B2C_Commercial_Partner", // Role as name with underscore format
      role: "B2C_Commercial_Partner",
      phone: company.mainPhoneNumber || "N/A",
      address: company.address || "N/A",
      layer: "Commercial",
      parentAccount: marinePartner._id,
      partnerStatus: "Active",
      contactInformation: {
        name: "B2C_Commercial_Partner",
        email: company.emailAddress || "",
        phone: company.mainPhoneNumber || "",
      },
    })

    await commercialPartner.save()
    console.log(`[v0] Created B2C Commercial Partner: ${commercialPartner._id}`)

    // Generate ledger for Commercial Partner
    try {
      const commercialGen = await generateLedgerCode("Business Partners", companyId)
      const commercialLedger = new CompanyLedger({
        company: companyId,
        ledgerCode: commercialGen.ledgerCode,
        ledgerSequenceNumber: commercialGen.nextSequenceNumber,
        ledgerType: "Business Partners",
        typeSequence: commercialGen.typeSequence,
        ledgerDescription: `B2C_Commercial_Partner Ledger`,
        status: "Active",
        systemAccount: false,
        locked: false,
        createdBy: "company",
        partnerAccount: commercialPartner._id,
        partnerModel: "Partner",
      })
      await commercialLedger.save()
      console.log(`[v0] Created ledger for B2C Commercial Partner: ${commercialLedger.ledgerCode}`)
    } catch (ledgerError) {
      console.error("[v0] Error creating B2C Commercial Partner ledger:", ledgerError.message)
      throw ledgerError
    }

    const sellingPartner = new Partner({
      company: companyId,
      name: "B2C_Selling_Partner", // Role as name with underscore format
      role: "B2C_Selling_Partner",
      phone: company.mainPhoneNumber || "N/A",
      address: company.address || "N/A",
      layer: "Selling",
      parentAccount: commercialPartner._id,
      partnerStatus: "Active",
      contactInformation: {
        name: "B2C_Selling_Partner",
        email: company.emailAddress || "",
        phone: company.mainPhoneNumber || "",
      },
    })

    await sellingPartner.save()
    console.log(`[v0] Created B2C Selling Partner: ${sellingPartner._id}`)

    // Generate ledger for Selling Partner
    try {
      const sellingGen = await generateLedgerCode("Business Partners", companyId)
      const sellingLedger = new CompanyLedger({
        company: companyId,
        ledgerCode: sellingGen.ledgerCode,
        ledgerSequenceNumber: sellingGen.nextSequenceNumber,
        ledgerType: "Business Partners",
        typeSequence: sellingGen.typeSequence,
        ledgerDescription: `B2C_Selling_Partner Ledger`,
        status: "Active",
        systemAccount: false,
        locked: false,
        createdBy: "company",
        partnerAccount: sellingPartner._id,
        partnerModel: "Partner",
      })
      await sellingLedger.save()
      console.log(`[v0] Created ledger for B2C Selling Partner: ${sellingLedger.ledgerCode}`)
    } catch (ledgerError) {
      console.error("[v0] Error creating B2C Selling Partner ledger:", ledgerError.message)
      throw ledgerError
    }

    console.log(
      `[v0] Successfully initialized all default B2C partners for company: ${companyId} | Marine: ${marinePartner._id}, Commercial: ${commercialPartner._id}, Selling: ${sellingPartner._id}`,
    )

    return {
      marinePartnerId: marinePartner._id,
      commercialPartnerId: commercialPartner._id,
      sellingPartnerId: sellingPartner._id,
      alreadyInitialized: false,
    }
  } catch (error) {
    console.error(`[v0] Error initializing default B2C partners for company ${companyId}:`, error.message)
    throw error
  }
}

/**
 * SAFE LOOKUP: Retrieves the default "B2C_Selling_Partner" for a company
 * Searches by layer = "Selling" and role = "B2C_Selling_Partner"
 * Used for auto-assigning B2C users during registration.
 */
const getSafeSellingPartner = async (companyId) => {
  try {
    if (!companyId) {
      console.warn("[v0] getSafeSellingPartner called with null companyId")
      return null
    }

    const sellingPartner = await Partner.findOne({
      company: companyId,
      layer: "Selling",
      role: "B2C_Selling_Partner", // Updated to underscore format
      partnerStatus: "Active",
      isDeleted: false,
    })

    if (!sellingPartner) {
      console.warn(`[v0] No active B2C Selling Partner found for company: ${companyId}`)
      return null
    }

    return sellingPartner
  } catch (error) {
    console.error(`[v0] Error looking up B2C Selling Partner for company ${companyId}:`, error.message)
    throw error
  }
}

/**
 * AUTO-ASSIGN: Assigns a B2C user to the default B2C Selling partner
 * Called during B2C user registration.
 */
const assignB2CUserToSellingPartner = async (b2cUserId, companyId) => {
  try {
    if (!b2cUserId || !companyId) {
      console.warn("[v0] assignB2CUserToSellingPartner: missing userId or companyId")
      return false
    }

    const B2CCustomer = require("../models/B2CCustomer")

    const sellingPartner = await getSafeSellingPartner(companyId)
    if (!sellingPartner) {
      console.warn(
        `[v0] Could not auto-assign B2C user ${b2cUserId}: no B2C Selling Partner found for company ${companyId}`,
      )
      return false
    }

    await B2CCustomer.findByIdAndUpdate(b2cUserId, { partner: sellingPartner._id })
    console.log(`[v0] Successfully assigned B2C user ${b2cUserId} to B2C Selling Partner ${sellingPartner._id}`)
    return true
  } catch (error) {
    console.error(`[v0] Error assigning B2C user to Selling Partner:`, error.message)
    return false
  }
}

/**
 * BATCH ASSIGN: Assigns existing B2C users to the B2C Selling partner
 * Used when setting up partner hierarchy after users are already created
 */
const assignExistingB2CUsersToSellingPartner = async (companyId) => {
  try {
    if (!companyId) {
      console.warn("[v0] assignExistingB2CUsersToSellingPartner called with null companyId")
      return { assigned: 0, failed: 0 }
    }

    const B2CCustomer = require("../models/B2CCustomer")
    const sellingPartner = await getSafeSellingPartner(companyId)

    if (!sellingPartner) {
      console.warn(`[v0] No B2C Selling Partner found for company ${companyId}, cannot assign existing users`)
      return { assigned: 0, failed: 0 }
    }

    const result = await B2CCustomer.updateMany(
      { company: companyId, isDeleted: false, partner: null },
      { $set: { partner: sellingPartner._id } },
    )

    console.log(
      `[v0] Assigned ${result.modifiedCount} existing B2C users to B2C Selling Partner for company ${companyId}`,
    )

    return { assigned: result.modifiedCount, failed: 0 }
  } catch (error) {
    console.error(`[v0] Error assigning existing B2C users to Selling Partner:`, error.message)
    return { assigned: 0, failed: 1 }
  }
}

module.exports = {
  initializeDefaultB2CPartners,
  getSafeSellingPartner,
  assignB2CUserToSellingPartner,
  assignExistingB2CUsersToSellingPartner,
}
