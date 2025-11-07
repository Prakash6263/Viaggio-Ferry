const { asyncHandler } = require("../middleware/errorHandler")
const { FiscalYear, FISCAL_YEAR_STATUS, PERIOD_STATUS } = require("../models/FiscalYear")
const { ChartOfAccount } = require("../models/ChartOfAccount")
const mongoose = require("mongoose")

// Get all fiscal years with filters
exports.getAllFiscalYears = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { status, page = 1, limit = 20 } = req.query

  const filters = {
    company: companyId,
    isDeleted: false,
  }

  if (status) {
    filters.status = status
  }

  const skip = (page - 1) * limit
  const total = await FiscalYear.countDocuments(filters)
  const fiscalYears = await FiscalYear.find(filters)
    .populate("returnEarningAccount", "ledgerCode ledgerDescription")
    .populate("createdBy", "firstName lastName email")
    .populate("closedBy", "firstName lastName")
    .sort({ fiscalYear: -1 })
    .skip(skip)
    .limit(Number.parseInt(limit))
    .lean()

  res.json({
    success: true,
    total,
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
    data: fiscalYears,
  })
})

// Get single fiscal year with details
exports.getFiscalYearDetails = asyncHandler(async (req, res) => {
  const { companyId, fiscalYearId } = req.params

  const fiscalYear = await FiscalYear.findOne({
    _id: fiscalYearId,
    company: companyId,
    isDeleted: false,
  })
    .populate("returnEarningAccount", "ledgerCode ledgerDescription")
    .populate("createdBy", "firstName lastName email")
    .populate("closedBy", "firstName lastName")
    .populate("periods.closedBy", "firstName lastName")

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "Fiscal year not found",
    })
  }

  res.json({
    success: true,
    data: fiscalYear,
  })
})

// Create new fiscal year
exports.createFiscalYear = asyncHandler(async (req, res) => {
  const { companyId } = req.params
  const { fiscalYear, returnEarningAccount, periods } = req.body
  const userId = req.user.id

  // Check if fiscal year already exists
  const existingFY = await FiscalYear.findOne({
    company: companyId,
    fiscalYear,
    isDeleted: false,
  })

  if (existingFY) {
    return res.status(400).json({
      success: false,
      message: `Fiscal year ${fiscalYear} already exists for this company`,
    })
  }

  // Verify return earning account exists
  const account = await ChartOfAccount.findOne({
    _id: returnEarningAccount,
    company: companyId,
    isDeleted: false,
  })

  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Return earning account not found",
    })
  }

  // Validate periods
  if (!periods || periods.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one accounting period is required",
    })
  }

  // Check period numbers are unique and sequential
  const periodNos = periods.map((p) => p.periodNo).sort((a, b) => a - b)
  const uniquePeriodNos = [...new Set(periodNos)]
  if (uniquePeriodNos.length !== periodNos.length) {
    return res.status(400).json({
      success: false,
      message: "Period numbers must be unique",
    })
  }

  // Validate date ranges
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i]
    if (new Date(period.startDate) >= new Date(period.endDate)) {
      return res.status(400).json({
        success: false,
        message: `Period ${period.periodNo}: Start date must be before end date`,
      })
    }

    // Check no overlapping periods
    for (let j = i + 1; j < periods.length; j++) {
      const otherPeriod = periods[j]
      if (
        (new Date(period.startDate) < new Date(otherPeriod.endDate) &&
          new Date(period.endDate) > new Date(otherPeriod.startDate)) ||
        (new Date(otherPeriod.startDate) < new Date(period.endDate) &&
          new Date(otherPeriod.endDate) > new Date(period.startDate))
      ) {
        return res.status(400).json({
          success: false,
          message: `Periods ${period.periodNo} and ${otherPeriod.periodNo} have overlapping dates`,
        })
      }
    }
  }

  const newFiscalYear = new FiscalYear({
    company: companyId,
    fiscalYear,
    returnEarningAccount,
    periods: periods.map((p) => ({
      periodNo: p.periodNo,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      type: p.type || "Normal",
      status: "Open",
      notes: p.notes || "",
    })),
    createdBy: userId,
  })

  await newFiscalYear.save()

  const savedFiscalYear = await newFiscalYear.populate([
    { path: "returnEarningAccount", select: "ledgerCode ledgerDescription" },
    { path: "createdBy", select: "firstName lastName email" },
  ])

  res.status(201).json({
    success: true,
    message: "Fiscal year created successfully",
    data: savedFiscalYear,
  })
})

// Update periods in fiscal year
exports.updatePeriods = asyncHandler(async (req, res) => {
  const { companyId, fiscalYearId } = req.params
  const { periods } = req.body

  const fiscalYear = await FiscalYear.findOne({
    _id: fiscalYearId,
    company: companyId,
    isDeleted: false,
  })

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "Fiscal year not found",
    })
  }

  if (fiscalYear.status === "Locked") {
    return res.status(400).json({
      success: false,
      message: "Cannot update locked fiscal year",
    })
  }

  // Validate periods
  if (!periods || periods.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one accounting period is required",
    })
  }

  // Check period numbers are unique
  const periodNos = periods.map((p) => p.periodNo).sort((a, b) => a - b)
  const uniquePeriodNos = [...new Set(periodNos)]
  if (uniquePeriodNos.length !== periodNos.length) {
    return res.status(400).json({
      success: false,
      message: "Period numbers must be unique",
    })
  }

  // Validate date ranges
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i]
    if (new Date(period.startDate) >= new Date(period.endDate)) {
      return res.status(400).json({
        success: false,
        message: `Period ${period.periodNo}: Start date must be before end date`,
      })
    }

    for (let j = i + 1; j < periods.length; j++) {
      const otherPeriod = periods[j]
      if (
        (new Date(period.startDate) < new Date(otherPeriod.endDate) &&
          new Date(period.endDate) > new Date(otherPeriod.startDate)) ||
        (new Date(otherPeriod.startDate) < new Date(period.endDate) &&
          new Date(otherPeriod.endDate) > new Date(period.startDate))
      ) {
        return res.status(400).json({
          success: false,
          message: `Periods ${period.periodNo} and ${otherPeriod.periodNo} have overlapping dates`,
        })
      }
    }
  }

  // Update periods
  fiscalYear.periods = periods.map((p) => ({
    periodNo: p.periodNo,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
    type: p.type || "Normal",
    status: p.status || "Open",
    closedDate: p.closedDate || null,
    notes: p.notes || "",
  }))

  await fiscalYear.save()

  const updated = await FiscalYear.findById(fiscalYearId).populate([
    { path: "returnEarningAccount", select: "ledgerCode ledgerDescription" },
    { path: "periods.closedBy", select: "firstName lastName" },
  ])

  res.json({
    success: true,
    message: "Periods updated successfully",
    data: updated,
  })
})

// Close period
exports.closePeriod = asyncHandler(async (req, res) => {
  const { companyId, fiscalYearId, periodId } = req.params
  const userId = req.user.id

  const fiscalYear = await FiscalYear.findOne({
    _id: fiscalYearId,
    company: companyId,
    isDeleted: false,
  })

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "Fiscal year not found",
    })
  }

  const period = fiscalYear.periods.id(periodId)
  if (!period) {
    return res.status(404).json({
      success: false,
      message: "Period not found",
    })
  }

  if (period.status === "Locked") {
    return res.status(400).json({
      success: false,
      message: "Cannot close locked period",
    })
  }

  period.status = "Closed"
  period.closedDate = new Date()
  period.closedBy = userId

  await fiscalYear.save()

  const updated = await FiscalYear.findById(fiscalYearId).populate([
    { path: "periods.closedBy", select: "firstName lastName" },
  ])

  res.json({
    success: true,
    message: "Period closed successfully",
    data: updated,
  })
})

// Close entire fiscal year
exports.closeFiscalYear = asyncHandler(async (req, res) => {
  const { companyId, fiscalYearId } = req.params
  const userId = req.user.id

  const fiscalYear = await FiscalYear.findOne({
    _id: fiscalYearId,
    company: companyId,
    isDeleted: false,
  })

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "Fiscal year not found",
    })
  }

  if (fiscalYear.status === "Locked") {
    return res.status(400).json({
      success: false,
      message: "Fiscal year is already locked",
    })
  }

  // Check all periods are closed
  const openPeriods = fiscalYear.periods.filter((p) => p.status === "Open")
  if (openPeriods.length > 0) {
    return res.status(400).json({
      success: false,
      message: "All periods must be closed before closing fiscal year",
    })
  }

  fiscalYear.status = "Closed"
  fiscalYear.closedDate = new Date()
  fiscalYear.closedBy = userId

  await fiscalYear.save()

  const updated = await FiscalYear.findById(fiscalYearId).populate([
    { path: "returnEarningAccount", select: "ledgerCode ledgerDescription" },
    { path: "closedBy", select: "firstName lastName" },
  ])

  res.json({
    success: true,
    message: "Fiscal year closed successfully",
    data: updated,
  })
})

// Get current/active accounting period
exports.getActivePeriod = asyncHandler(async (req, res) => {
  const { companyId } = req.params

  const today = new Date()
  const fiscalYear = await FiscalYear.findOne({
    company: companyId,
    status: "Open",
    isDeleted: false,
    "periods.startDate": { $lte: today },
    "periods.endDate": { $gte: today },
    "periods.status": "Open",
  }).populate("returnEarningAccount", "ledgerCode ledgerDescription")

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "No active accounting period found",
    })
  }

  const activePeriod = fiscalYear.periods.find(
    (p) => new Date(p.startDate) <= today && new Date(p.endDate) >= today && p.status === "Open",
  )

  res.json({
    success: true,
    data: {
      fiscalYear: fiscalYear.fiscalYear,
      period: activePeriod,
    },
  })
})

// Delete fiscal year (soft delete)
exports.deleteFiscalYear = asyncHandler(async (req, res) => {
  const { companyId, fiscalYearId } = req.params

  const fiscalYear = await FiscalYear.findOne({
    _id: fiscalYearId,
    company: companyId,
  })

  if (!fiscalYear) {
    return res.status(404).json({
      success: false,
      message: "Fiscal year not found",
    })
  }

  if (fiscalYear.status === "Closed" || fiscalYear.status === "Locked") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete closed or locked fiscal year",
    })
  }

  fiscalYear.isDeleted = true
  await fiscalYear.save()

  res.json({
    success: true,
    message: "Fiscal year deleted successfully",
  })
})
