const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, required: true }, // SKU duplicate ho sakta hai different users ke liye
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    // User connection
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
},);

module.exports = mongoose.model("Product", productSchema);