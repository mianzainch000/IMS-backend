const express = require("express");
const router = express.Router();

// Controllers import karein
const {
    getCategories,
    addCategory,
    deleteCategory,
    updateCategory // Agar aapne edit function banaya hai
} = require("../controllers/categoryController");

// Auth middleware (taake sirf logged-in user access kare)
const authenticate = require("../middleware/authenticate"); // Aapki file

// --- ALAG ALAG ROUTES ---

// 1. Saari categories fetch karne ke liye
router.get("/getCategory", authenticate, getCategories);

// 2. Nayi category add karne ke liye
router.post("/addCategory", authenticate, addCategory);

// 3. Category delete karne ke liye (ID ke saath)
router.delete("/deleteCategory/:id", authenticate, deleteCategory);

// 4. Category update/edit karne ke liye (Optional)
router.put("/updateCategory/:id", authenticate, updateCategory);

module.exports = router;