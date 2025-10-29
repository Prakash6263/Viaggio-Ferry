const { validationResult } = require("express-validator")
const {
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
} = require("../services/shipService")

function handleValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const err = new Error("Validation failed")
    err.status = 400
    err.details = errors.array()
    throw err
  }
}

async function create(req, res) {
  handleValidation(req)
  const ship = await createShip(req.body)
  res.status(201).json(ship)
}

async function index(req, res) {
  const { page, limit, q, status, shipType, sortBy, sortOrder } = req.query
  const result = await listShips({ page, limit, q, status, shipType, sortBy, sortOrder })
  res.json(result)
}

async function show(req, res) {
  const ship = await getShip(req.params.id)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }
  res.json(ship)
}

async function patch(req, res) {
  handleValidation(req)
  const ship = await updateShip(req.params.id, req.body)
  if (!ship) {
    const err = new Error("Ship not found")
    err.status = 404
    throw err
  }
  res.json(ship)
}

async function destroy(req, res) {
  await deleteShip(req.params.id)
  res.json({ success: true })
}

// Passenger Capacity Management
async function addPassengerCapacityHandler(req, res) {
  handleValidation(req)
  const ship = await addPassengerCapacity(req.params.id, req.body)
  res.status(201).json(ship)
}

async function removePassengerCapacityHandler(req, res) {
  const { capacityId } = req.body
  const ship = await removePassengerCapacity(req.params.id, capacityId)
  res.json(ship)
}

// Cargo Capacity Management
async function addCargoCapacityHandler(req, res) {
  handleValidation(req)
  const ship = await addCargoCapacity(req.params.id, req.body)
  res.status(201).json(ship)
}

async function removeCargoCapacityHandler(req, res) {
  const { capacityId } = req.body
  const ship = await removeCargoCapacity(req.params.id, capacityId)
  res.json(ship)
}

// Vehicle Capacity Management
async function addVehicleCapacityHandler(req, res) {
  handleValidation(req)
  const ship = await addVehicleCapacity(req.params.id, req.body)
  res.status(201).json(ship)
}

async function removeVehicleCapacityHandler(req, res) {
  const { capacityId } = req.body
  const ship = await removeVehicleCapacity(req.params.id, capacityId)
  res.json(ship)
}

module.exports = {
  create,
  index,
  show,
  patch,
  destroy,
  addPassengerCapacityHandler,
  removePassengerCapacityHandler,
  addCargoCapacityHandler,
  removeCargoCapacityHandler,
  addVehicleCapacityHandler,
  removeVehicleCapacityHandler,
}
