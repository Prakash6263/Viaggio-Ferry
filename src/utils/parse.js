function parsePorts(input) {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((p) => String(p).trim()).filter(Boolean)
  }
  const parts = String(input)
    .split(/\r?\n|,/)
    .map((p) => p.trim())
    .filter(Boolean)
  return Array.from(new Set(parts))
}

module.exports = { parsePorts }
