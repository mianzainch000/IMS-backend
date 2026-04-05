const express = require("express");
const router = express.Router();
const { getProducts, addProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const authenticate = require("../middleware/authenticate"); // Aapki file

// Sab routes protected hain
router.get("/getProduct", authenticate, getProducts);
router.post("/addProduct", authenticate, addProduct);
router.put("/updateProduct/:id", authenticate, updateProduct);
router.delete("/deleteProduct/:id", authenticate, deleteProduct);

module.exports = router;