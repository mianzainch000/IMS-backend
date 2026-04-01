const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true }, // QR Code Data
    costPrice: { type: Number, required: true }, // 100
    sellingPrice: { type: Number, required: true }, // 300
    stock: { type: Number, default: 0 },
    category: { type: String, default: "General" }
},
    // { timestamps: true }
);

// Ek user ke liye SKU unique hona chahiye
ProductSchema.index({ userId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);