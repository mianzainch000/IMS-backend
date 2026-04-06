const express = require("express");
const router = express.Router();
const {
    getCategories,
    addCategory,
    deleteCategory,
    updateCategory
} = require("../controllers/categoryController");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize"); // Naya middleware

// 1. Viewer, Editor, aur Admin sab categories DEKH sakte hain
router.get("/getCategory", authenticate, getCategories);

// 2. Sirf Admin aur Editor categories ADD kar sakte hain
router.post("/addCategory", authenticate, authorize(["Admin", "Editor"]), addCategory);

// 3. Sirf Admin aur Editor categories UPDATE kar sakte hain
router.put("/updateCategory/:id", authenticate, authorize(["Admin", "Editor"]), updateCategory);

// 4. SIRF Admin category DELETE kar sakta hai
// (Category delete karna risky hai kyunki is se products par asar par sakta hai)
router.delete("/deleteCategory/:id", authenticate, authorize(["Admin"]), deleteCategory);

module.exports = router;