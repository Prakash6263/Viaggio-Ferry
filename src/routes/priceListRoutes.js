const express = require("express")
const {
  create,
  index,
  show,
  update,
  destroy,
  addDetail,
  updateDetail,
  deleteDetail,
  getDetails,
  calculatePrice,
} = require("../controllers/priceListController")
const {
  createPriceListValidator,
  updatePriceListValidator,
  addPriceDetailValidator,
  calculatePriceValidator,
} = require("../validators/priceListValidators")
const { asyncHandler } = require("../middleware/errorHandler")

const router = express.Router()

// Price List Header Routes
router.post("/", createPriceListValidator, asyncHandler(create))
router.get("/", asyncHandler(index))
router.get("/:id", asyncHandler(show))
router.patch("/:id", updatePriceListValidator, asyncHandler(update))
router.delete("/:id", asyncHandler(destroy))

// Price List Details Routes
router.post("/:id/details", addPriceDetailValidator, asyncHandler(addDetail))
router.get("/:id/details", asyncHandler(getDetails))
router.patch("/:id/details/:detailId", addPriceDetailValidator, asyncHandler(updateDetail))
router.delete("/:id/details/:detailId", asyncHandler(deleteDetail))

// Calculate Price Route
router.post("/calculate-price", calculatePriceValidator, asyncHandler(calculatePrice))

module.exports = router
