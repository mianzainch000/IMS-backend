const Category = require("../models/CategorySchema");

// 1. GET ALL CATEGORIES
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.user.id }).sort({ name: 1 });
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. ADD CATEGORY
exports.addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if already exists for this user
        const existing = await Category.findOne({ name: name.trim(), userId: req.user.id });
        if (existing) {
            return res.status(400).json({ success: false, message: "Category already exists!" });
        }

        const newCategory = new Category({
            name,
            description,
            userId: req.user.id
        });

        await newCategory.save();
        res.status(201).json({ success: true, data: newCategory });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!category) return res.status(404).json({ success: false, message: "Not found" });

        res.status(200).json({ success: true, message: "Category deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. UPDATE CATEGORY
exports.updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Pehle check karein ke category exist karti hai aur isi user ki hai
        let category = await Category.findOne({ _id: req.params.id, userId: req.user.id });

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Data update karein
        category.name = name || category.name;
        category.description = description || category.description;

        await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category
        });
    } catch (err) {
        // Agar naya naam kisi aur category se match kar gaya (Unique index error)
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Category name already exists!" });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};