const commissionRuleService = require("../services/commissionRuleService")

class CommissionRuleController {
  // Create a new commission rule
  async createRule(req, res) {
    try {
      const rule = await commissionRuleService.createRule(req.body)
      res.status(201).json({ success: true, data: rule })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get rule by ID
  async getRuleById(req, res) {
    try {
      const rule = await commissionRuleService.getRuleById(req.params.id)
      if (!rule) return res.status(404).json({ success: false, message: "Rule not found" })
      res.json({ success: true, data: rule })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // List rules with filters
  async listRules(req, res) {
    try {
      const result = await commissionRuleService.listRules(req.query)
      res.json({ success: true, ...result })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // Update rule
  async updateRule(req, res) {
    try {
      const rule = await commissionRuleService.updateRule(req.params.id, req.body)
      if (!rule) return res.status(404).json({ success: false, message: "Rule not found" })
      res.json({ success: true, data: rule })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // Delete rule
  async deleteRule(req, res) {
    try {
      const success = await commissionRuleService.deleteRule(req.params.id)
      if (!success) return res.status(404).json({ success: false, message: "Rule not found" })
      res.json({ success: true, message: "Rule deleted successfully" })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // Find applicable rules
  async findApplicableRules(req, res) {
    try {
      const rules = await commissionRuleService.findApplicableRules(req.body)
      res.json({ success: true, data: rules })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // Calculate commission distribution
  async calculateCommission(req, res) {
    try {
      const result = await commissionRuleService.calculateCommissionDistribution(req.body)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

module.exports = new CommissionRuleController()
