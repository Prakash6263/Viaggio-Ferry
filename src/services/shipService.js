const { Ship } = require("../models/Ship")

function sanitize(doc) {
  if (!doc) return null
  return doc.toObject({ versionKey: false })
}

async function createShip(payload) {
  const data = {
    ...payload,
    passengerCapacity: payload.passengerCapacity || [],
    cargoCapacity: payload.cargoCapacity || [],
    vehicleCapacity: payload.vehicleCapacity || [],
  }

  const doc = await Ship.create(data)
  return sanitize(doc)
}

async function listShips({
  page = 1,
  limit = 10,
  q = "",
  status = "",
  shipType = "",
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const filter = { isDeleted: false }

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { imoNumber: { $regex: q, $options: "i" } },
      { mmsiNumber: { $regex: q, $options: "i" } },
    ]
  }

  if (status) {
    filter.status = status
  }

  if (shipType) {
    filter.shipType = shipType
  }

  const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1)
  const limitNum = Math.max(Number.parseInt(limit, 10) || 10, 1)
  const skip = (pageNum - 1) * limitNum

  const sortObj = {}
  sortObj[sortBy] = sortOrder === "asc" ? 1 : -1

  const [items, total] = await Promise.all([
    Ship.find(filter).sort(sortObj).skip(skip).limit(limitNum),
    Ship.countDocuments(filter),
  ])

  return {
    items: items.map((d) => sanitize(d)),
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  }
}

async function getShip(id) {
  const doc = await Ship.findById(id)
  return sanitize(doc)
}

async function updateShip(id, payload) {
  const doc = await Ship.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
  return sanitize(doc)
}

async function deleteShip(id) {
  await Ship.findByIdAndUpdate(id, { isDeleted: true })
  return { success: true }
}

// Passenger Capacity Management
async function addPassengerCapacity(shipId, capacityData) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  const newCapacity = {
    _id: new (require("mongoose").Types.ObjectId)(),
    ...capacityData,
  }

  ship.passengerCapacity.push(newCapacity)
  await ship.save()
  return sanitize(ship)
}

async function removePassengerCapacity(shipId, capacityId) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  ship.passengerCapacity.id(capacityId).deleteOne()
  await ship.save()
  return sanitize(ship)
}

// Cargo Capacity Management
async function addCargoCapacity(shipId, capacityData) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  const newCapacity = {
    _id: new (require("mongoose").Types.ObjectId)(),
    ...capacityData,
  }

  ship.cargoCapacity.push(newCapacity)
  await ship.save()
  return sanitize(ship)
}

async function removeCargoCapacity(shipId, capacityId) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  ship.cargoCapacity.id(capacityId).deleteOne()
  await ship.save()
  return sanitize(ship)
}

// Vehicle Capacity Management
async function addVehicleCapacity(shipId, capacityData) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  const newCapacity = {
    _id: new (require("mongoose").Types.ObjectId)(),
    ...capacityData,
  }

  ship.vehicleCapacity.push(newCapacity)
  await ship.save()
  return sanitize(ship)
}

async function removeVehicleCapacity(shipId, capacityId) {
  const ship = await Ship.findById(shipId)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }

  ship.vehicleCapacity.id(capacityId).deleteOne()
  await ship.save()
  return sanitize(ship)
}

module.exports = {
  createShip,
  listShips,
  getShip,
  updateShip,
  deleteShip,
  addPassengerCapacity,
  removePassengerCapacity,
  addCargoCapacity,
  removeCargoCapacity,
  addVehicleCapacity,
  removeVehicleCapacity,
}
