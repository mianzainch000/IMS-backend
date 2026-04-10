const express = require("express");
const router = express.Router();
const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductBySku,
  processSale,
  getAnalytics,
} = require("../controllers/productController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.get("/getProduct", authenticate, authorize([]), getProducts);

router.post(
  "/addProduct",
  authenticate,
  authorize(["Admin", "Editor"]),
  addProduct,
);
router.put(
  "/updateProduct/:id",
  authenticate,
  authorize(["Admin", "Editor"]),
  updateProduct,
);

router.delete(
  "/deleteProduct/:id",
  authenticate,
  authorize(["Admin"]),
  deleteProduct,
);
router.get("/scan/:sku", authenticate, authorize([]), getProductBySku);

router.post(
  "/checkout",
  authenticate,
  authorize(["Admin", "Editor"]),
  processSale,
);

router.get(
  "/analytics",
  authenticate,
  authorize(["Admin", "Editor"]),
  getAnalytics,
);
module.exports = router;
