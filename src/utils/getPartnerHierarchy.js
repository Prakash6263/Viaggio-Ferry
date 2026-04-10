const Partner = require("../models/Partner")

async function getPartnerHierarchy(partnerId) {
  const hierarchy = []

  let current = await Partner.findById(partnerId).lean()

  while (current) {
    hierarchy.push(current._id)

    if (!current.parentPartner) break

    current = await Partner.findById(current.parentPartner).lean()
  }

  return hierarchy
}

module.exports = { getPartnerHierarchy }