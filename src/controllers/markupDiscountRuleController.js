const { asyncHandler } = require("../middleware/errorHandler")
const svc = require("../services/markupDiscountRuleService")

const listRules = asyncHandler(async (req, res) => {
  const result = await svc.listRules(req.query)
  res.json(result)
})

const getRule = asyncHandler(async (req, res) => {
  const doc = await svc.getRuleById(req.params.id)
  if (!doc) return res.status(404).json({ message: "Rule not found" })
  res.json(doc)
})

const createRule = asyncHandler(async (req, res) => {
  const created = await svc.createRule(req.body)
  res.status(201).json(created)
})

const updateRule = asyncHandler(async (req, res) => {
  const updated = await svc.updateRule(req.params.id, req.body)
  if (!updated) return res.status(404).json({ message: "Rule not found" })
  res.json(updated)
})

const deleteRule = asyncHandler(async (req, res) => {
  const ok = await svc.deleteRule(req.params.id)
  if (!ok) return res.status(404).json({ message: "Rule not found" })
  res.json({ message: "Rule deleted" })
})

const applyRules = asyncHandler(async (req, res) => {
  const result = await svc.applyRulesToItem(req.body)
  res.json(result)
})

const findApplicableRules = asyncHandler(async (req, res) => {
  const rules = await svc.findApplicableRules(req.body)
  res.json({ rules, count: rules.length })
})

module.exports = {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  applyRules,
  findApplicableRules,
}
