const Product = require("../models/productSchema");

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

exports.addProduct = async (req, res) => {
  try {
    const { name, sku, category, price, stock } = req.body;

    const existingProduct = await Product.findOne({
      sku: sku,
      userId: req.user.id,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Opps! SKU "${sku}" pehle se maujood hai. Kuch aur try karein.`,
      });
    }

    const newProduct = new Product({
      name,
      sku,
      category,
      price,
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
      { new: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or unauthorized" });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    const product = await Product.findOne({ sku: sku, userId: req.user.id });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found!" });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: "Out of stock!" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.processSale = async (req, res) => {
  try {
    const { items } = req.body;

    for (let item of items) {
      const product = await Product.findOne({
        _id: item._id,
        userId: req.user.id,
      });

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock kam hai: ${product.name} (Available: ${product.stock})`,
        });
      }

      await Product.findOneAndUpdate(
        { _id: item._id, userId: req.user.id },
        { $inc: { stock: -item.quantity } },
      );
    }

    res
      .status(200)
      .json({ success: true, message: "Sale successful! Stock updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
