const express = require("express");
const router = express.Router();
const { getProducts, addProduct, updateProduct, deleteProduct } = require("../controllers/productController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize"); // Naya middleware import karein

// 1. Sab roles (Admin, Editor, Viewer) dekh sakte hain
router.get("/getProduct", authenticate, authorize([]), getProducts);
// 2. Sirf Admin aur Editor naya product add ya update kar sakte hain
router.post("/addProduct", authenticate, authorize(["Admin", "Editor"]), addProduct);
router.put("/updateProduct/:id", authenticate, authorize(["Admin", "Editor"]), updateProduct);

// 3. SIRF Admin delete kar sakta hai (Security Layer)
router.delete("/deleteProduct/:id", authenticate, authorize(["Admin"]), deleteProduct);

module.exports = router;