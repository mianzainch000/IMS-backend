const Product = require("../models/productSchema");

// 1. GET ALL PRODUCTS (Only for the logged-in user)
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ADD PRODUCT
exports.addProduct = async (req, res) => {
    try {
        const { name, sku, category, price, stock } = req.body;

        // 1. Manual Check: Kya is user ne pehle ye SKU use kiya hai?
        const existingProduct = await Product.findOne({
            sku: sku,
            userId: req.user.id
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: `Opps! SKU "${sku}" pehle se maujood hai. Kuch aur try karein.`
            });
        }

        // 2. Agar duplicate nahi hai, toh save karein
        const newProduct = new Product({
            name, sku, category, price, stock,
            userId: req.user.id
        });

        await newProduct.save();

        res.status(201).json({
            success: true,
            message: "Product added successfully!",
            data: newProduct
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {
        const { sku } = req.body;

        // 1. Manual Check for Update: 
        // Check karein ke naya SKU kisi aur product ka toh nahi (current product ko chor kar)
        const duplicateSku = await Product.findOne({
            sku: sku,
            userId: req.user.id,
            _id: { $ne: req.params.id } // $ne means "Not Equal" to current product ID
        });

        if (duplicateSku) {
            return res.status(400).json({
                success: false,
                message: `Yeh SKU (${sku}) kisi aur product ko diya ja chuka hai.`
            });
        }

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        );

        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        res.status(200).json({
            success: true,
            message: "Product updated successfully!",
            data: product
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!product) return res.status(404).json({ message: "Product not found or unauthorized" });
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};