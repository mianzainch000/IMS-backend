const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    originalPrice: { type: Number }, // Jo system mein fix thi
    discountValue: { type: Number, default: 0 }, // 20% ya 50rs
    discountType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    finalSalePrice: { type: Number }, // Discount ke baad ki qeemat
    netProfit: { type: Number }, // finalSalePrice - costPrice
    profitMargin: { type: Number }, // Percentage (%)
    saleDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Sale", SaleSchema);