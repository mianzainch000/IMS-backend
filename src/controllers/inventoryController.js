const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { validationResult } = require("express-validator");

// 1. Add Product
exports.addProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array()[0].msg });

    try {
        const product = new Product({ ...req.body, userId: req.user._id });
        await product.save();
        res.status(201).json({ success: true, message: "Product Added", data: product });
    } catch (err) {
        res.status(400).json({ success: false, message: "SKU already exists" });
    }
};

// 2. Process Sale (QR Scan + Discount Logic)
exports.processSale = async (req, res) => {
    const { qrData, discountValue = 0, discountType = "fixed" } = req.body;
    const uId = req.user._id;

    try {
        const product = await Product.findOne({ sku: qrData, userId: uId });
        if (!product || product.stock <= 0) {
            return res.status(404).json({ message: "Product not available" });
        }

        // Discount Calculation
        let discountAmt = discountType === "percentage"
            ? (product.sellingPrice * discountValue) / 100
            : discountValue;

        const finalPrice = product.sellingPrice - discountAmt;
        const profit = finalPrice - product.costPrice;
        const margin = ((profit / product.costPrice) * 100).toFixed(2);

        // Update Stock
        product.stock -= 1;
        await product.save();

        // Save Sale Record
        const newSale = new Sale({
            userId: uId,
            productId: product._id,
            originalPrice: product.sellingPrice,
            discountValue,
            discountType,
            finalSalePrice: finalPrice,
            netProfit: profit,
            profitMargin: margin
        });
        await newSale.save();

        res.status(200).json({ success: true, finalPrice, profit, margin: margin + "%" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Reports (Daily/Weekly/Monthly/Yearly)
exports.getReports = async (req, res) => {
    const { year, month, range } = req.query; // range: 'monthly' or 'yearly'
    const uId = req.user._id;

    let startDate = range === 'monthly' ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    let endDate = range === 'monthly' ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

    try {
        const report = await Sale.aggregate([
            { $match: { userId: uId, saleDate: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: range === 'monthly' ? { $dayOfMonth: "$saleDate" } : { $month: "$saleDate" },
                    totalRevenue: { $sum: "$finalSalePrice" },
                    totalProfit: { $sum: "$netProfit" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Delete & Update
exports.updateProduct = async (req, res) => {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true });
    res.json({ success: true, data: product });
};

exports.deleteProduct = async (req, res) => {
    await Product.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Deleted" });
};