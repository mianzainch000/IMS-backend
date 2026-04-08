const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },     // Ye Selling Price hai
  costPrice: { type: Number, required: true }, // Ye ADD KAREIN (Khareed Qeemat)
  stock: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true }); // Timestamps analytics mein kaam ayenge

module.exports = mongoose.model("Product", productSchema);