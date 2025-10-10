const { LAYERS, MODULES } = require("../constants/rbac")

async function layers(req, res) {
  res.json({ items: LAYERS })
}

async function modules(req, res) {
  // Note: modules for dropdown labels; for active modules with submodules use /api/modules
  res.json({ items: MODULES })
}

module.exports = { layers, modules }
