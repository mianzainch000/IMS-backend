const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        quantity: Number,
        priceSold: Number, // Jis qeemat par becha
        costPrice: Number, // Jis qeemat par khareeda tha
        profit: Number     // (priceSold - costPrice) * quantity
    }],
    totalAmount: { type: Number, required: true },
    totalProfit: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Sale", saleSchema);