// const createHttpError = require("http-errors")
// const Partner = require("../models/Partner")
// const Company = require("../models/Company")
// const B2CCustomer = require("../models/B2CCustomer") // Imported B2CCustomer to handle automatic partner assignment to B2C users
// const { CompanyLedger } = require("../models/CompanyLedger")
// const { generateLedgerCode } = require("../utils/ledgerHelper")

// const createPartner = async (req, res, next) => {
//   try {
//     let parsedBody = req.body
//     if (typeof req.body === "string") {
//       try {
//         parsedBody = JSON.parse(req.body)
//       } catch (parseError) {
//         // ignore parse error if it's not JSON
//       }
//     }

//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     const {
//       name,
//       phone,
//       address,
//       layer,
//       role,
//       parentAccount,
//       partnerStatus,
//       priceList,
//       creditLimit,
//       contactInformation,
//       companyId: bodyCompanyId,
//     } = parsedBody

//     let finalCompanyId = bodyCompanyId
//     if (userRole === "company") {
//       finalCompanyId = tokenCompanyId
//     }

//     if (!finalCompanyId) {
//       throw createHttpError(400, "Company ID (tenant) is required")
//     }

//     if (layer === "Marine") {
//       if (parentAccount && parentAccount !== finalCompanyId) {
//         throw createHttpError(400, "For Marine layer, parent must be the Company ID")
//       }
//     } else if (layer === "Commercial") {
//       if (!parentAccount) throw createHttpError(400, "Commercial layer requires a Marine partner as parent")
//       const parentPartner = await Partner.findById(parentAccount)
//       if (!parentPartner || parentPartner.layer !== "Marine") {
//         throw createHttpError(400, "Parent for Commercial layer must be a Marine partner")
//       }
//     } else if (layer === "Selling") {
//       if (!parentAccount) throw createHttpError(400, "Selling layer requires a Commercial partner as parent")
//       const parentPartner = await Partner.findById(parentAccount)
//       if (!parentPartner || parentPartner.layer !== "Commercial") {
//         throw createHttpError(400, "Parent for Selling layer must be a Commercial partner")
//       }
//     }

//     const validRoles = [
//       "B2C_Marine_Partner",
//       "B2B_Marine_Partner",
//       "Govt_Marine_Partner",
//       "B2C_Commercial_Partner",
//       "B2B_Commercial_Partner",
//       "Govt_Commercial_Partner",
//       "B2C_Selling_Partner",
//       "B2B_Selling_Partner",
//       "Govt_Selling_Partner",
//       "Custom Partner",
//     ]

//     if (role && !validRoles.includes(role)) {
//       throw createHttpError(400, "Invalid role value")
//     }

//     const partnerData = {
//       company: finalCompanyId,
//       name,
//       phone,
//       address,
//       layer,
//       role: role || "Custom Partner",
//       parentAccount: parentAccount || (layer === "Marine" ? finalCompanyId : null),
//       partnerStatus: partnerStatus || "Active",
//       priceList,
//       creditLimit: {
//         limitAmount: Number(creditLimit?.limitAmount) || 0,
//         limitTicket:
//           typeof creditLimit?.limitTicket === "string"
//             ? Number(creditLimit.limitTicket.replace(/[^0-9.]/g, ""))
//             : Number(creditLimit?.limitTicket) || 0,
//       },
//       contactInformation: {
//         name: contactInformation?.name || "",
//         title: contactInformation?.title || "",
//         phone: contactInformation?.phone || "",
//         email: contactInformation?.email || "",
//         hotline: contactInformation?.hotline || "",
//       },
//     }

//     const partner = new Partner(partnerData)
//     await partner.save()

//     if (layer === "Marine") {
//       try {
//         const updateResult = await B2CCustomer.updateMany(
//           { company: finalCompanyId, isDeleted: false },
//           { $set: { partner: partner._id } },
//         )
//         console.log(`[v0] Automatically assigned new Marine partner ${name} to ${updateResult.modifiedCount} B2C users`)
//       } catch (b2cError) {
//         console.error("[v0] Warning: Could not auto-assign Marine partner to B2C users:", b2cError.message)
//         // Non-blocking: don't fail partner creation if auto-assignment fails
//       }
//     }

//     if (layer === "Commercial" || layer === "Selling") {
//       try {
//         const updateResult = await B2CCustomer.updateMany(
//           { company: finalCompanyId, partner: null, isDeleted: false },
//           { $set: { partner: partner._id } },
//         )
//         console.log(`[v0] Assigned new ${layer} partner ${name} to ${updateResult.modifiedCount} unassigned B2C users`)
//       } catch (b2cError) {
//         console.error(`[v0] Warning: Could not auto-assign ${layer} partner to B2C users:`, b2cError.message)
//       }
//     }

//     try {
//       const gen = await generateLedgerCode("Business Partners", finalCompanyId)
//       const newLedger = new CompanyLedger({
//         company: finalCompanyId,
//         ledgerCode: gen.ledgerCode,
//         ledgerSequenceNumber: gen.nextSequenceNumber,
//         ledgerType: "Business Partners",
//         typeSequence: gen.typeSequence,
//         ledgerDescription: `Partner: ${name}`,
//         status: "Active",
//         systemAccount: true,
//         locked: true,
//         createdBy: "system",
//         partnerAccount: partner._id,
//         partnerModel: "Partner",
//       })
//       await newLedger.save()
//     } catch (ledgerError) {
//       console.error("[v0] Warning: Could not auto-generate ledger for partner:", ledgerError.message)
//     }

//     res.status(201).json({ success: true, data: partner })
//   } catch (error) {
//     next(error)
//   }
// }

// const listPartners = async (req, res, next) => {
//   try {
//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     const filter = { isDeleted: false }

//     if (userRole === "company") {
//       filter.company = tokenCompanyId
//     }

//     const partners = await Partner.find(filter)
//       .populate("company", "name email")
//       .populate("parentAccount", "name layer")
//       .sort({ createdAt: -1 })

//     res.json({
//       success: true,
//       count: partners.length,
//       data: partners,
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// const updatePartner = async (req, res, next) => {
//   try {
//     const { id } = req.params
//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     // Find the partner to update
//     const targetPartner = await Partner.findById(id)
//     if (!targetPartner) {
//       throw createHttpError(404, "Partner not found")
//     }

//     // Get user's partner context (if they are a partner user)
//     let userPartner = null
//     if (userRole === "partner") {
//       userPartner = await Partner.findOne({
//         users: req.user.id,
//         isDeleted: false,
//       })
//     }

//     // Authorization: Check hierarchy permissions
//     // Company can update all layers (Marine, Commercial, Selling)
//     if (userRole !== "company") {
//       if (userRole === "partner" && userPartner) {
//         // Partner hierarchy: Marine can update Commercial and Selling
//         if (userPartner.layer === "Marine") {
//           if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
//             throw createHttpError(403, "Marine partner can only update Commercial and Selling layers")
//           }
//         }
//         // Commercial can only update Selling
//         else if (userPartner.layer === "Commercial") {
//           if (targetPartner.layer !== "Selling") {
//             throw createHttpError(403, "Commercial partner can only update Selling layer")
//           }
//         }
//         // Selling cannot update anyone
//         else if (userPartner.layer === "Selling") {
//           throw createHttpError(403, "Selling partners cannot update other partners")
//         }
//       } else {
//         throw createHttpError(403, "Unauthorized to update partner")
//       }
//     }

//     // Tenant isolation: Ensure same company
//     if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
//       throw createHttpError(403, "Cannot update partners from other companies")
//     }

//     const { name, phone, address, role, partnerStatus, priceList, creditLimit, contactInformation, notes } = req.body

//     // Prepare update object
//     const updateData = {}
//     if (name) updateData.name = name
//     if (phone) updateData.phone = phone
//     if (address) updateData.address = address
//     if (role) {
//       if (
//         ![
//           "B2C_Marine_Partner",
//           "B2B_Marine_Partner",
//           "Govt_Marine_Partner",
//           "B2C_Commercial_Partner",
//           "B2B_Commercial_Partner",
//           "Govt_Commercial_Partner",
//           "B2C_Selling_Partner",
//           "B2B_Selling_Partner",
//           "Govt_Selling_Partner",
//           "Custom Partner",
//         ].includes(role)
//       ) {
//         throw createHttpError(400, "Invalid role value")
//       }
//       updateData.role = role
//     }
//     if (partnerStatus) {
//       if (!["Active", "Inactive"].includes(partnerStatus)) {
//         throw createHttpError(400, "Invalid partnerStatus")
//       }
//       updateData.partnerStatus = partnerStatus
//     }
//     if (priceList !== undefined) updateData.priceList = priceList
//     if (creditLimit) {
//       updateData.creditLimit = {
//         limitAmount: Number(creditLimit.limitAmount) || targetPartner.creditLimit.limitAmount,
//         limitTicket: Number(creditLimit.limitTicket) || targetPartner.creditLimit.limitTicket,
//       }
//     }
//     if (contactInformation) {
//       updateData.contactInformation = {
//         name: contactInformation.name || targetPartner.contactInformation.name,
//         title: contactInformation.title || targetPartner.contactInformation.title,
//         phone: contactInformation.phone || targetPartner.contactInformation.phone,
//         email: contactInformation.email || targetPartner.contactInformation.email,
//         hotline: contactInformation.hotline || targetPartner.contactInformation.hotline,
//       }
//     }
//     if (notes !== undefined) updateData.notes = notes

//     const updatedPartner = await Partner.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
//       .populate("company", "name email")
//       .populate("parentAccount", "name layer")

//     res.json({
//       success: true,
//       message: "Partner updated successfully",
//       data: updatedPartner,
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// const getPartnerById = async (req, res, next) => {
//   try {
//     const { id } = req.params
//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     const partner = await Partner.findById(id)
//       .populate("company", "name email")
//       .populate("parentAccount", "name layer role")

//     if (!partner) {
//       throw createHttpError(404, "Partner not found")
//     }

//     if (partner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
//       throw createHttpError(403, "Cannot access partners from other companies")
//     }

//     res.json({
//       success: true,
//       data: partner,
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// const disablePartner = async (req, res, next) => {
//   try {
//     const { id } = req.params
//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     // Find the partner to disable
//     const targetPartner = await Partner.findById(id)
//     if (!targetPartner) {
//       throw createHttpError(404, "Partner not found")
//     }

//     // Tenant isolation
//     if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
//       throw createHttpError(403, "Cannot disable partners from other companies")
//     }

//     // Get user's partner context (if they are a partner user)
//     let userPartner = null
//     if (userRole === "partner") {
//       userPartner = await Partner.findOne({
//         users: req.user.id,
//         isDeleted: false,
//       })
//     }

//     // Authorization: Check hierarchy permissions
//     // Company can disable all partners
//     if (userRole === "company") {
//       // Company can disable anyone
//     } else if (userRole === "partner" && userPartner) {
//       // Parent partner can disable their children
//       // Marine can disable Commercial and Selling
//       if (userPartner.layer === "Marine") {
//         if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
//           throw createHttpError(403, "Marine partner can only disable Commercial and Selling layers")
//         }
//         // Verify Commercial/Selling is under Marine's hierarchy
//         const isChild = await Partner.findOne({
//           _id: targetPartner._id,
//           parentAccount: userPartner._id,
//         })
//         if (!isChild) {
//           throw createHttpError(403, "Can only disable your direct or indirect children partners")
//         }
//       }
//       // Commercial can only disable Selling
//       else if (userPartner.layer === "Commercial") {
//         if (targetPartner.layer !== "Selling") {
//           throw createHttpError(403, "Commercial partner can only disable Selling layer")
//         }
//         // Verify Selling is under Commercial
//         const isChild = await Partner.findOne({
//           _id: targetPartner._id,
//           parentAccount: userPartner._id,
//         })
//         if (!isChild) {
//           throw createHttpError(403, "Can only disable your direct children partners")
//         }
//       }
//       // Selling cannot disable anyone
//       else if (userPartner.layer === "Selling") {
//         throw createHttpError(403, "Selling partners cannot disable other partners")
//       }
//     } else {
//       throw createHttpError(403, "Unauthorized to disable partner")
//     }

//     // Disable the partner
//     targetPartner.disabled = true
//     await targetPartner.save()

//     res.json({
//       success: true,
//       message: "Partner disabled successfully",
//       data: targetPartner,
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// const enablePartner = async (req, res, next) => {
//   try {
//     const { id } = req.params
//     const userRole = req.user?.role
//     const tokenCompanyId = req.user?.companyId || req.user?.id

//     // Find the partner to enable
//     const targetPartner = await Partner.findById(id)
//     if (!targetPartner) {
//       throw createHttpError(404, "Partner not found")
//     }

//     // Tenant isolation
//     if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
//       throw createHttpError(403, "Cannot enable partners from other companies")
//     }

//     // Get user's partner context (if they are a partner user)
//     let userPartner = null
//     if (userRole === "partner") {
//       userPartner = await Partner.findOne({
//         users: req.user.id,
//         isDeleted: false,
//       })
//     }

//     // Authorization: Check hierarchy permissions
//     // Company can enable all partners
//     if (userRole === "company") {
//       // Company can enable anyone
//     } else if (userRole === "partner" && userPartner) {
//       // Parent partner can enable their children
//       // Marine can enable Commercial and Selling
//       if (userPartner.layer === "Marine") {
//         if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
//           throw createHttpError(403, "Marine partner can only enable Commercial and Selling layers")
//         }
//         // Verify Commercial/Selling is under Marine's hierarchy
//         const isChild = await Partner.findOne({
//           _id: targetPartner._id,
//           parentAccount: userPartner._id,
//         })
//         if (!isChild) {
//           throw createHttpError(403, "Can only enable your direct or indirect children partners")
//         }
//       }
//       // Commercial can only enable Selling
//       else if (userPartner.layer === "Commercial") {
//         if (targetPartner.layer !== "Selling") {
//           throw createHttpError(403, "Commercial partner can only enable Selling layer")
//         }
//         // Verify Selling is under Commercial
//         const isChild = await Partner.findOne({
//           _id: targetPartner._id,
//           parentAccount: userPartner._id,
//         })
//         if (!isChild) {
//           throw createHttpError(403, "Can only enable your direct children partners")
//         }
//       }
//       // Selling cannot enable anyone
//       else if (userPartner.layer === "Selling") {
//         throw createHttpError(403, "Selling partners cannot enable other partners")
//       }
//     } else {
//       throw createHttpError(403, "Unauthorized to enable partner")
//     }

//     // Enable the partner
//     targetPartner.disabled = false
//     await targetPartner.save()

//     res.json({
//       success: true,
//       message: "Partner enabled successfully",
//       data: targetPartner,
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// module.exports = { createPartner, listPartners, updatePartner, getPartnerById, disablePartner, enablePartner }



const createHttpError = require("http-errors")
const Partner = require("../models/Partner")
const Company = require("../models/Company")
const B2CCustomer = require("../models/B2CCustomer") // Imported B2CCustomer to handle automatic partner assignment to B2C users
const { CompanyLedger } = require("../models/CompanyLedger")
const { generateLedgerCode } = require("../utils/ledgerHelper")

const createPartner = async (req, res, next) => {
  try {
    let parsedBody = req.body
    if (typeof req.body === "string") {
      try {
        parsedBody = JSON.parse(req.body)
      } catch (parseError) {
        // ignore parse error if it's not JSON
      }
    }

    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    const {
      name,
      phone,
      address,
      layer,
      role,
      parentAccount,
      partnerStatus,
      priceList,
      creditLimit,
      contactInformation,
      companyId: bodyCompanyId,
    } = parsedBody

    let finalCompanyId = bodyCompanyId
    if (userRole === "company") {
      finalCompanyId = tokenCompanyId
    }

    if (!finalCompanyId) {
      throw createHttpError(400, "Company ID (tenant) is required")
    }

    let resolvedParentAccount = null
let resolvedParentCompany = null

if (layer === "Marine") {
  resolvedParentCompany = finalCompanyId
} 
else if (layer === "Commercial") {
  if (!parentAccount) {
    throw createHttpError(400, "Commercial layer requires Marine partner")
  }

  const parentPartner = await Partner.findById(parentAccount)
  if (!parentPartner || parentPartner.layer !== "Marine") {
    throw createHttpError(400, "Parent must be Marine partner")
  }

  resolvedParentAccount = parentAccount
} 
else if (layer === "Selling") {
  if (!parentAccount) {
    throw createHttpError(400, "Selling layer requires Commercial partner")
  }

  const parentPartner = await Partner.findById(parentAccount)
  if (!parentPartner || parentPartner.layer !== "Commercial") {
    throw createHttpError(400, "Parent must be Commercial partner")
  }

  resolvedParentAccount = parentAccount
}


    const validRoles = [
      "B2C_Marine_Partner",
      "B2B_Marine_Partner",
      "Govt_Marine_Partner",
      "B2C_Commercial_Partner",
      "B2B_Commercial_Partner",
      "Govt_Commercial_Partner",
      "B2C_Selling_Partner",
      "B2B_Selling_Partner",
      "Govt_Selling_Partner",
      "Custom Partner",
    ]

    if (role && !validRoles.includes(role)) {
      throw createHttpError(400, "Invalid role value")
    }

  const partnerData = {
  company: finalCompanyId,
  name,
  phone,
  address,
  layer,
  role: role || "Custom Partner",

  parentCompany: resolvedParentCompany,
  parentAccount: resolvedParentAccount,

  partnerStatus: partnerStatus || "Active",
  priceList,
  creditLimit,
  contactInformation,
}


    const partner = new Partner(partnerData)
    await partner.save()

    if (layer === "Marine") {
      try {
        const updateResult = await B2CCustomer.updateMany(
          { company: finalCompanyId, isDeleted: false },
          { $set: { partner: partner._id } },
        )
        console.log(`[v0] Automatically assigned new Marine partner ${name} to ${updateResult.modifiedCount} B2C users`)
      } catch (b2cError) {
        console.error("[v0] Warning: Could not auto-assign Marine partner to B2C users:", b2cError.message)
        // Non-blocking: don't fail partner creation if auto-assignment fails
      }
    }

    if (layer === "Commercial" || layer === "Selling") {
      try {
        const updateResult = await B2CCustomer.updateMany(
          { company: finalCompanyId, partner: null, isDeleted: false },
          { $set: { partner: partner._id } },
        )
        console.log(`[v0] Assigned new ${layer} partner ${name} to ${updateResult.modifiedCount} unassigned B2C users`)
      } catch (b2cError) {
        console.error(`[v0] Warning: Could not auto-assign ${layer} partner to B2C users:`, b2cError.message)
      }
    }

    try {
      const gen = await generateLedgerCode("Business Partners", finalCompanyId)
      const newLedger = new CompanyLedger({
        company: finalCompanyId,
        ledgerCode: gen.ledgerCode,
        ledgerSequenceNumber: gen.nextSequenceNumber,
        ledgerType: "Business Partners",
        typeSequence: gen.typeSequence,
        ledgerDescription: `Partner: ${name}`,
        status: "Active",
        systemAccount: false,
        locked: false,
        createdBy: "company",
        partnerAccount: partner._id,
        partnerModel: "Partner",
      })
      await newLedger.save()
    } catch (ledgerError) {
      console.error("[v0] Warning: Could not auto-generate ledger for partner:", ledgerError.message)
    }

    res.status(201).json({ success: true, data: partner })
  } catch (error) {
    next(error)
  }
}

const listPartners = async (req, res, next) => {
  try {
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    const filter = { isDeleted: false }

    if (userRole === "company") {
      filter.company = tokenCompanyId
    }

  const partners = await Partner.find(filter)
  .populate("company", "name email")
  .populate("parentCompany", "companyName")
  .populate("parentAccount", "name layer")

      .sort({ createdAt: -1 })

    const transformedPartners = partners.map((partner) => {
      const partnerObj = partner.toObject()

      // if (partner.layer === "Marine" && partner.parentAccount) {
      //   // For Marine layer, parentAccount is company ID, so populate with company data
      //   partnerObj.parentAccount = {
      //     _id: partner.parentAccount,
      //     name: partner.company.name,
      //     layer: "Company",
      //     type: "company",
      //   }
      // }

      return partnerObj
    })

    res.json({
      success: true,
      count: transformedPartners.length,
      data: transformedPartners,
    })
  } catch (error) {
    next(error)
  }
}

const updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    // Find the partner to update
    const targetPartner = await Partner.findById(id)
    if (!targetPartner) {
      throw createHttpError(404, "Partner not found")
    }

    // Get user's partner context (if they are a partner user)
    let userPartner = null
    if (userRole === "partner") {
      userPartner = await Partner.findOne({
        users: req.user.id,
        isDeleted: false,
      })
    }

    // Authorization: Check hierarchy permissions
    // Company can update all layers (Marine, Commercial, Selling)
    if (userRole !== "company") {
      if (userRole === "partner" && userPartner) {
        // Partner hierarchy: Marine can update Commercial and Selling
        if (userPartner.layer === "Marine") {
          if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
            throw createHttpError(403, "Marine partner can only update Commercial and Selling layers")
          }
        }
        // Commercial can only update Selling
        else if (userPartner.layer === "Commercial") {
          if (targetPartner.layer !== "Selling") {
            throw createHttpError(403, "Commercial partner can only update Selling layer")
          }
        }
        // Selling cannot update anyone
        else if (userPartner.layer === "Selling") {
          throw createHttpError(403, "Selling partners cannot update other partners")
        }
      } else {
        throw createHttpError(403, "Unauthorized to update partner")
      }
    }

    // Tenant isolation: Ensure same company
    if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
      throw createHttpError(403, "Cannot update partners from other companies")
    }

    const { name, phone, address, role, partnerStatus, priceList, creditLimit, contactInformation, notes } = req.body

    // Prepare update object
    const updateData = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (address) updateData.address = address
    if (role) {
      if (
        ![
          "B2C_Marine_Partner",
          "B2B_Marine_Partner",
          "Govt_Marine_Partner",
          "B2C_Commercial_Partner",
          "B2B_Commercial_Partner",
          "Govt_Commercial_Partner",
          "B2C_Selling_Partner",
          "B2B_Selling_Partner",
          "Govt_Selling_Partner",
          "Custom Partner",
        ].includes(role)
      ) {
        throw createHttpError(400, "Invalid role value")
      }
      updateData.role = role
    }
    if (partnerStatus) {
      if (!["Active", "Inactive"].includes(partnerStatus)) {
        throw createHttpError(400, "Invalid partnerStatus")
      }
      updateData.partnerStatus = partnerStatus
    }
    if (priceList !== undefined) updateData.priceList = priceList
    if (creditLimit) {
      updateData.creditLimit = {
        limitAmount: Number(creditLimit.limitAmount) || targetPartner.creditLimit.limitAmount,
        limitTicket: Number(creditLimit.limitTicket) || targetPartner.creditLimit.limitTicket,
      }
    }
    if (contactInformation) {
      updateData.contactInformation = {
        name: contactInformation.name || targetPartner.contactInformation.name,
        title: contactInformation.title || targetPartner.contactInformation.title,
        phone: contactInformation.phone || targetPartner.contactInformation.phone,
        email: contactInformation.email || targetPartner.contactInformation.email,
        hotline: contactInformation.hotline || targetPartner.contactInformation.hotline,
      }
    }
    if (notes !== undefined) updateData.notes = notes

    const updatedPartner = await Partner.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("company", "name email")
      .populate("parentAccount", "name layer")

    res.json({
      success: true,
      message: "Partner updated successfully",
      data: updatedPartner,
    })
  } catch (error) {
    next(error)
  }
}

const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    const partner = await Partner.findById(id)
      .populate("company", "name email")
      .populate("parentAccount", "name layer role")

    if (!partner) {
      throw createHttpError(404, "Partner not found")
    }

    if (partner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
      throw createHttpError(403, "Cannot access partners from other companies")
    }

    const partnerObj = partner.toObject()
    if (partner.layer === "Marine" && partner.parentAccount) {
      partnerObj.parentAccount = {
        _id: partner.parentAccount,
        name: partner.company.name,
        layer: "Company",
        type: "company",
      }
    }

    res.json({
      success: true,
      data: partnerObj,
    })
  } catch (error) {
    next(error)
  }
}

const disablePartner = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    // Find the partner to disable
    const targetPartner = await Partner.findById(id)
    if (!targetPartner) {
      throw createHttpError(404, "Partner not found")
    }

    // Tenant isolation
    if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
      throw createHttpError(403, "Cannot disable partners from other companies")
    }

    // Get user's partner context (if they are a partner user)
    let userPartner = null
    if (userRole === "partner") {
      userPartner = await Partner.findOne({
        users: req.user.id,
        isDeleted: false,
      })
    }

    // Authorization: Check hierarchy permissions
    // Company can disable all partners
    if (userRole === "company") {
      // Company can disable anyone
    } else if (userRole === "partner" && userPartner) {
      // Parent partner can disable their children
      // Marine can disable Commercial and Selling
      if (userPartner.layer === "Marine") {
        if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
          throw createHttpError(403, "Marine partner can only disable Commercial and Selling layers")
        }
        // Verify Commercial/Selling is under Marine's hierarchy
        const isChild = await Partner.findOne({
          _id: targetPartner._id,
          parentAccount: userPartner._id,
        })
        if (!isChild) {
          throw createHttpError(403, "Can only disable your direct or indirect children partners")
        }
      }
      // Commercial can only disable Selling
      else if (userPartner.layer === "Commercial") {
        if (targetPartner.layer !== "Selling") {
          throw createHttpError(403, "Commercial partner can only disable Selling layer")
        }
        // Verify Selling is under Commercial
        const isChild = await Partner.findOne({
          _id: targetPartner._id,
          parentAccount: userPartner._id,
        })
        if (!isChild) {
          throw createHttpError(403, "Can only disable your direct children partners")
        }
      }
      // Selling cannot disable anyone
      else if (userPartner.layer === "Selling") {
        throw createHttpError(403, "Selling partners cannot disable other partners")
      }
    } else {
      throw createHttpError(403, "Unauthorized to disable partner")
    }

    // Disable the partner
    targetPartner.disabled = true
    await targetPartner.save()

    res.json({
      success: true,
      message: "Partner disabled successfully",
      data: targetPartner,
    })
  } catch (error) {
    next(error)
  }
}

const enablePartner = async (req, res, next) => {
  try {
    const { id } = req.params
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    // Find the partner to enable
    const targetPartner = await Partner.findById(id)
    if (!targetPartner) {
      throw createHttpError(404, "Partner not found")
    }

    // Tenant isolation
    if (targetPartner.company.toString() !== tokenCompanyId && userRole !== "super_admin") {
      throw createHttpError(403, "Cannot enable partners from other companies")
    }

    // Get user's partner context (if they are a partner user)
    let userPartner = null
    if (userRole === "partner") {
      userPartner = await Partner.findOne({
        users: req.user.id,
        isDeleted: false,
      })
    }

    // Authorization: Check hierarchy permissions
    // Company can enable all partners
    if (userRole === "company") {
      // Company can enable anyone
    } else if (userRole === "partner" && userPartner) {
      // Parent partner can enable their children
      // Marine can enable Commercial and Selling
      if (userPartner.layer === "Marine") {
        if (!["Commercial", "Selling"].includes(targetPartner.layer)) {
          throw createHttpError(403, "Marine partner can only enable Commercial and Selling layers")
        }
        // Verify Commercial/Selling is under Marine's hierarchy
        const isChild = await Partner.findOne({
          _id: targetPartner._id,
          parentAccount: userPartner._id,
        })
        if (!isChild) {
          throw createHttpError(403, "Can only enable your direct or indirect children partners")
        }
      }
      // Commercial can only enable Selling
      else if (userPartner.layer === "Commercial") {
        if (targetPartner.layer !== "Selling") {
          throw createHttpError(403, "Commercial partner can only enable Selling layer")
        }
        // Verify Selling is under Commercial
        const isChild = await Partner.findOne({
          _id: targetPartner._id,
          parentAccount: userPartner._id,
        })
        if (!isChild) {
          throw createHttpError(403, "Can only enable your direct children partners")
        }
      }
      // Selling cannot enable anyone
      else if (userPartner.layer === "Selling") {
        throw createHttpError(403, "Selling partners cannot enable other partners")
      }
    } else {
      throw createHttpError(403, "Unauthorized to enable partner")
    }

    // Enable the partner
    targetPartner.disabled = false
    await targetPartner.save()

    res.json({
      success: true,
      message: "Partner enabled successfully",
      data: targetPartner,
    })
  } catch (error) {
    next(error)
  }
}

const getParentPartnersByLayer = async (req, res, next) => {
  try {
    const { layer } = req.query
    const userRole = req.user?.role
    const tokenCompanyId = req.user?.companyId || req.user?.id

    if (!layer) {
      throw createHttpError(400, "Layer query parameter is required")
    }

    const parentFilter = { company: tokenCompanyId, isDeleted: false }

    if (layer === "Marine") {
      // Marine layer parent is company ID, not a partner
      // Return company info instead
      const company = await Company.findById(tokenCompanyId)
      if (!company) {
        throw createHttpError(404, "Company not found")
      }
      return res.json({
        success: true,
        data: [
          {
            _id: tokenCompanyId,
            name: company.name,
            layer: "Company",
            type: "company",
          },
        ],
      })
    } else if (layer === "Commercial") {
      // Commercial layer parent must be Marine partners
      parentFilter.layer = "Marine"
      parentFilter.partnerStatus = "Active"
    } else if (layer === "Selling") {
      // Selling layer parent must be Commercial partners
      parentFilter.layer = "Commercial"
      parentFilter.partnerStatus = "Active"
    } else {
      throw createHttpError(400, "Invalid layer value. Must be Marine, Commercial, or Selling")
    }

    const parentPartners = await Partner.find(parentFilter).select("_id name layer role").sort({ name: 1 })

    res.json({
      success: true,
      count: parentPartners.length,
      data: parentPartners,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPartner,
  listPartners,
  updatePartner,
  getPartnerById,
  disablePartner,
  enablePartner,
  getParentPartnersByLayer,
}
