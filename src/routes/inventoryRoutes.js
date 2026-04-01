const express = require("express");
const router = express.Router();
const invCtrl = require("../controllers/inventoryController");
const authenticate = require("../middleware/authenticate");
const { check } = require("express-validator");

// Middleware to check login
router.use(authenticate);

// Validations
const prodValidate = [
    check("name").notEmpty().withMessage("Name is required"),
    check("sku").notEmpty().withMessage("QR/SKU is required"),
    check("costPrice").isNumeric().withMessage("Invalid Cost"),
    check("sellingPrice").isNumeric().withMessage("Invalid Selling Price"),
];

// Routes
router.post("/add", prodValidate, invCtrl.addProduct);
router.post("/sale", invCtrl.processSale);
router.get("/reports", invCtrl.getReports);
router.put("/update/:id", invCtrl.updateProduct);
router.delete("/delete/:id", invCtrl.deleteProduct);

module.exports = router;