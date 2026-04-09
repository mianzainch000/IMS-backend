const Product = require("../models/productSchema");
const Sale = require("../models/saleSchema"); // Sales tracking ke liye zaroori hai

// 1. Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Add new product with Cost Price
exports.addProduct = async (req, res) => {
  try {
    const { name, sku, category, price, costPrice, stock } = req.body;

    const existingProduct = await Product.findOne({
      sku: sku,
      userId: req.user.id,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Opps! SKU "${sku}" pehle se maujood hai.`,
      });
    }

    const newProduct = new Product({
      name,
      sku,
      category,
      price,      // Selling Price
      costPrice,  // Purchase Price (Profit ke liye)
      stock,
      userId: req.user.id,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully!",
      data: newProduct,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Update product
exports.updateProduct = async (req, res) => {
  try {
    const { sku } = req.body;

    const duplicateSku = await Product.findOne({
      sku: sku,
      userId: req.user.id,
      _id: { $ne: req.params.id },
    });

    if (duplicateSku) {
      return res.status(400).json({
        success: false,
        message: `Yeh SKU (${sku}) kisi aur product ko diya ja chuka hai.`,
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!product)
      return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Get Product by SKU (For Scanner)
exports.getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku: sku, userId: req.user.id });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: "Out of stock!" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Process Sale (Checkout) - RECORDING PROFIT/LOSS
exports.processSale = async (req, res) => {
  try {
    const { items } = req.body;

    let totalSaleAmount = 0;
    let totalSaleProfit = 0;
    let totalDiscount = 0; // Discount calculate karne ke liye
    let saleItems = [];

    for (let item of items) {
      const product = await Product.findOne({
        _id: item._id,
        userId: req.user.id,
      });

      if (!product) continue;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock kam hai: ${product.name}`,
        });
      }

      const soldPrice = Number(item.price);
      const quantity = Number(item.quantity);

      // ✅ DISCOUNT LOGIC: (Original Price - Sold Price) * Quantity
      const itemDiscount = (Number(product.price) - soldPrice) * quantity;

      // ✅ PROFIT LOGIC: (Sold Price - Cost Price) * Quantity
      const itemProfit = (soldPrice - Number(product.costPrice)) * quantity;

      totalSaleAmount += soldPrice * quantity;
      totalSaleProfit += itemProfit;
      totalDiscount += itemDiscount > 0 ? itemDiscount : 0; // Sirf positive discount count karein

      saleItems.push({
        productId: product._id,
        name: product.name,
        quantity: quantity,
        priceSold: soldPrice,
        costPrice: product.costPrice,
        discount: itemDiscount > 0 ? itemDiscount : 0, // Individual record
        profit: itemProfit,
      });

      // Stock decrease
      await Product.findOneAndUpdate(
        { _id: item._id, userId: req.user.id },
        { $inc: { stock: -item.quantity } }
      );
    }

    const newSale = new Sale({
      userId: req.user.id,
      items: saleItems,
      totalAmount: totalSaleAmount,
      totalProfit: totalSaleProfit,
      totalDiscount: totalDiscount, // DB mein save ho raha hai
    });

    await newSale.save();

    res.status(200).json({
      success: true,
      message: "Sale completed with discount tracking!",
      data: newSale,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Analytics for Profit/Loss
exports.getAnalytics = async (req, res) => {
  try {
    const { filter } = req.query;

    const getPKTime = () => {
      return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    };

    let startDate = new Date(0);
    const nowPK = getPKTime();

    if (filter === "day") {
      nowPK.setHours(0, 0, 0, 0);
      startDate = nowPK;
    } else if (filter === "week") {
      nowPK.setDate(nowPK.getDate() - 7);
      startDate = nowPK;
    } else if (filter === "year") {
      nowPK.setFullYear(nowPK.getFullYear() - 1);
      startDate = nowPK;
    }

    const sales = await Sale.find({
      userId: req.user.id,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: -1 });

    const groupedSales = {};

    sales.forEach((sale) => {
      const dateKey = new Date(sale.createdAt).toLocaleDateString("en-GB", {
        timeZone: "Asia/Karachi",
      });

      const key = sale._id.toString();

      if (!groupedSales[key]) {
        groupedSales[key] = {
          _id: sale._id,
          createdAt: sale.createdAt,
          productNames: sale.items.map((i) => i.name).join(", "),
          totalAmount: 0,
          totalProfit: 0,
          totalQty: 0,
          totalDiscount: 0, // Naya field grouped data ke liye
          date: dateKey,
        };
      }

      groupedSales[key].totalAmount += sale.totalAmount;
      groupedSales[key].totalProfit += sale.totalProfit;
      groupedSales[key].totalDiscount += (sale.totalDiscount || 0); //

      sale.items.forEach((item) => {
        groupedSales[key].totalQty += item.quantity || 1;
      });
    });

    const finalSalesArray = Object.values(groupedSales);

    let stats = {
      totalSales: 0,
      totalProfit: 0,
      totalCost: 0,
      totalQty: 0,
      totalDiscount: 0, // Global stats card ke liye
      loss: 0,
    };

    finalSalesArray.forEach((item) => {
      stats.totalSales += item.totalAmount;
      stats.totalProfit += item.totalProfit;
      stats.totalQty += item.totalQty;
      stats.totalDiscount += item.totalDiscount; //
      stats.totalCost += item.totalAmount - item.totalProfit;
    });

    res.status(200).json({
      stats,
      recentSales: finalSalesArray,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};