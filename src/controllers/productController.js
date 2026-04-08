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
    const { items } = req.body; // Frontend se aane wale products
    let totalSaleAmount = 0;
    let totalSaleProfit = 0;
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

      // Profit Calculation per item
      const itemProfit = (product.price - product.costPrice) * item.quantity;
      totalSaleAmount += (product.price * item.quantity);
      totalSaleProfit += itemProfit;

      saleItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        priceSold: product.price,
        costPrice: product.costPrice,
        profit: itemProfit
      });

      // Stock update (Decrease)
      await Product.findOneAndUpdate(
        { _id: item._id, userId: req.user.id },
        { $inc: { stock: -item.quantity } }
      );
    }

    // Save this transaction to the Sale collection
    const newSale = new Sale({
      userId: req.user.id,
      items: saleItems,
      totalAmount: totalSaleAmount,
      totalProfit: totalSaleProfit
    });

    await newSale.save();

    res.status(200).json({
      success: true,
      message: "Sale completed! Profit & Stock updated.",
      data: newSale
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Analytics for Profit/Loss
exports.getAnalytics = async (req, res) => {
  try {
    const { filter } = req.query;
    let startDate = new Date(0);
    const now = new Date();

    if (filter === 'day') startDate = new Date(now.setHours(0, 0, 0, 0));
    else if (filter === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
    else if (filter === 'year') startDate = new Date(now.setFullYear(now.getFullYear() - 1));

    const sales = await Sale.find({
      userId: req.user.id,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const groupedSales = {};

    sales.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toLocaleDateString('en-GB');
      const productNames = sale.items.map(i => i.name).sort().join(", ");
      const key = `${dateKey}-${productNames}`;

      if (!groupedSales[key]) {
        groupedSales[key] = {
          _id: sale._id,
          createdAt: sale.createdAt,
          productNames: productNames,
          totalAmount: 0,
          totalProfit: 0,
          totalQty: 0 // Initialize Quantity
        };
      }

      groupedSales[key].totalAmount += sale.totalAmount;
      groupedSales[key].totalProfit += sale.totalProfit;

      // Items ki quantity ko sum karna
      sale.items.forEach(item => {
        groupedSales[key].totalQty += (item.quantity || 1);
      });
    });

    const finalSalesArray = Object.values(groupedSales);

    // Global Stats
    let stats = { totalSales: 0, totalProfit: 0, totalCost: 0, totalQty: 0, loss: 0 };
    finalSalesArray.forEach(item => {
      stats.totalSales += item.totalAmount;
      stats.totalProfit += item.totalProfit;
      stats.totalQty += item.totalQty;
      stats.totalCost += (item.totalAmount - item.totalProfit);
    });

    res.status(200).json({ stats, recentSales: finalSalesArray });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};