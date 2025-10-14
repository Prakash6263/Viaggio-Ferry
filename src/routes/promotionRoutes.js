const router = require("express").Router()
const ctrl = require("../controllers/promotionController")
const {
  createPromotionValidation,
  updatePromotionValidation,
  listPromotionsValidation,
  idParamValidation,
  applyPromotionValidation,
} = require("../validators/promotionValidators")

router.get("/", listPromotionsValidation, ctrl.listPromotions)
router.post("/", createPromotionValidation, ctrl.createPromotion)

router.get("/:id", idParamValidation, ctrl.getPromotion)
router.patch("/:id", updatePromotionValidation, ctrl.updatePromotion)
router.delete("/:id", idParamValidation, ctrl.deletePromotion)

router.post("/apply", applyPromotionValidation, ctrl.applyPromotion)

module.exports = router
