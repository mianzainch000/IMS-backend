const Product = require("../models/productSchema");
const Sale = require("../models/saleSchema");

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
      price,
      costPrice,
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
    if (!product) return res.status(404).json({ message: "Product not found" });
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

    let totalSaleAmount = 0;
    let totalSaleProfit = 0;
    let totalDiscount = 0;
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

      const itemDiscount = (Number(product.price) - soldPrice) * quantity;

      const itemProfit = (soldPrice - Number(product.costPrice)) * quantity;

      totalSaleAmount += soldPrice * quantity;
      totalSaleProfit += itemProfit;
      totalDiscount += itemDiscount > 0 ? itemDiscount : 0;

      saleItems.push({
        productId: product._id,
        name: product.name,
        quantity: quantity,
        priceSold: soldPrice,
        costPrice: product.costPrice,
        discount: itemDiscount > 0 ? itemDiscount : 0,
        profit: itemProfit,
      });

      await Product.findOneAndUpdate(
        { _id: item._id, userId: req.user.id },
        { $inc: { stock: -item.quantity } },
      );
    }

    const newSale = new Sale({
      userId: req.user.id,
      items: saleItems,
      totalAmount: totalSaleAmount,
      totalProfit: totalSaleProfit,
      totalDiscount: totalDiscount,
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

exports.getAnalytics = async (req, res) => {
  try {
    const { filter, year, month, search } = req.query;
    let query = { userId: req.user.id };

    const currentYear = new Date().getFullYear();
    const targetYear = year ? parseInt(year) : currentYear;

    if (filter === "custom") {
      let start, end;
      if (month && month !== "all") {
        start = new Date(targetYear, parseInt(month) - 1, 1);
        end = new Date(targetYear, parseInt(month), 0, 23, 59, 59);
      } else {
        start = new Date(targetYear, 0, 1);
        end = new Date(targetYear, 11, 31, 23, 59, 59);
      }
      query.createdAt = { $gte: start, $lte: end };
    } else if (filter !== "all") {
      const pkDateStr = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Karachi",
      });
      let startDate = new Date(`${pkDateStr}T00:00:00+05:00`);
      if (filter === "week") startDate.setDate(startDate.getDate() - 7);
      query.createdAt = { $gte: startDate };
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 });

    const stats = {
      totalSales: 0,
      totalProfit: 0,
      totalQty: 0,
      totalDiscount: 0,
      totalCost: 0,
      loss: 0,
    };

    const groupedByProduct = {};

    sales.forEach((sale) => {
      const dateKey = new Date(sale.createdAt).toLocaleDateString("en-GB", {
        timeZone: "Asia/Karachi",
      });

      sale.items.forEach((item) => {
        if (search) {
          const searchLower = search.toLowerCase().trim();
          const matchesProduct = item.name.toLowerCase().includes(searchLower);

          const dateParts = dateKey.split("/");
          const day = dateParts[0];
          const month = dateParts[1];
          const yr = dateParts[2];

          const monthNames = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
          ];
          const monthName = monthNames[parseInt(month) - 1];

          const matchesDate =
            dateKey === searchLower ||
            day === searchLower ||
            month === searchLower ||
            yr === searchLower ||
            monthName === searchLower ||
            searchLower === `${parseInt(day)} ${monthName}` ||
            searchLower === `${monthName} ${parseInt(day)}` ||
            searchLower === `${day}/${month}` ||
            searchLower === `${parseInt(day)}/${parseInt(month)}` ||
            searchLower === `${parseInt(day)} ${monthName} ${yr}` ||
            searchLower === `${monthName} ${parseInt(day)} ${yr}` ||
            searchLower === `${monthName} ${yr}`;

          if (!matchesProduct && !matchesDate) {
            return;
          }
        }

        stats.totalSales += item.priceSold * item.quantity;
        stats.totalProfit += item.profit;
        stats.totalDiscount += item.discount;
        stats.totalQty += item.quantity || 0;
        stats.totalCost += item.costPrice * item.quantity;

        const key = `${dateKey}_${item.name}`;

        if (!groupedByProduct[key]) {
          groupedByProduct[key] = {
            _id: sale._id,
            date: dateKey,
            productNames: item.name,
            totalQty: 0,
            totalAmount: 0,
            totalProfit: 0,
            totalDiscount: 0,
            createdAt: sale.createdAt,
            items: [
              {
                _id: item._id,
                productId: item.productId,
                quantity: item.quantity,
              },
            ],
          };
        }

        groupedByProduct[key].totalQty += item.quantity;
        groupedByProduct[key].totalAmount += item.priceSold * item.quantity;
        groupedByProduct[key].totalProfit += item.profit;
        groupedByProduct[key].totalDiscount += item.discount;
      });
    });

    const finalSalesArray = Object.values(groupedByProduct).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.status(200).json({
      stats,
      recentSales: finalSalesArray,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.returnSale = async (req, res) => {
  try {
    const { saleId, itemId, returnQuantity } = req.body;

    const sale = await Sale.findOne({ _id: saleId, userId: req.user.id });
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    const itemIndex = sale.items.findIndex((i) => i._id.toString() === itemId);
    if (itemIndex === -1)
      return res.status(404).json({ message: "Item not found in this sale" });

    const item = sale.items[itemIndex];

    if (returnQuantity > item.quantity) {
      return res
        .status(400)
        .json({ message: "Return quantity exceeds sold quantity" });
    }

    const refundAmount = item.priceSold * returnQuantity;
    const lostProfit = item.profit * (returnQuantity / item.quantity);

    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: returnQuantity },
    });

    if (item.quantity === returnQuantity) {
      sale.items.splice(itemIndex, 1);
    } else {
      item.quantity -= returnQuantity;
      item.profit -= lostProfit;
      item.discount -=
        (item.discount / (item.quantity + returnQuantity)) * returnQuantity;
    }

    sale.totalAmount -= refundAmount;
    sale.totalProfit -= lostProfit;

    await sale.save();

    res
      .status(201)
      .json({ success: true, message: "Refund processed and stock updated!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
