const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      quantity: Number,
      priceSold: Number,
      costPrice: Number,
      discount: Number,
      profit: Number,
    },
  ],
  totalAmount: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
},
  { timestamps: true },
);

module.exports = mongoose.model("Sale", saleSchema);
