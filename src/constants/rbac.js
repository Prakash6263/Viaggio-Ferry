const LAYERS = [
  { code: "company", label: "Company" },
  { code: "marine-agent", label: "Marine Agent" },
  { code: "commercial-agent", label: "Commercial Agent" },
  { code: "selling-agent", label: "Selling Agent" },
]

const MODULES = [
  { code: "finance", label: "Finance" },
  { code: "checkin-boardings", label: "Checkin & Boardings" },
  { code: "sales-bookings", label: "Sales & Bookings" },
  { code: "partners-management", label: "Partners Management" },
  { code: "ship-trips", label: "Ship & Trips" },
  { code: "administration", label: "Administration" },
  { code: "settings", label: "Settings" },
]

const LAYER_CODES = LAYERS.map((l) => l.code)
const MODULE_CODES = MODULES.map((m) => m.code)

module.exports = { LAYERS, MODULES, LAYER_CODES, MODULE_CODES }
