import { Router } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/authenticate.js";

const router = Router();
router.use(requireAuth);

// Undo stock reservations (used when an order can't be completed).
async function releaseStock(items) {
  await Promise.all(items.map(i =>
    Product.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity, soldQty: -i.quantity } })
  ));
}

router.get("/", async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.session.customerId }).sort({ orderedAt: -1 });
    res.json({ orders });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found." });
    const order = await Order.findOne({ _id: req.params.id, customerId: req.session.customerId });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json({ order });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { deliveryAddress, items: requestedItems } = req.body;
    if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.postalCode || !deliveryAddress?.country) {
      return res.status(400).json({ message: "Complete delivery address is required." });
    }

    let sourceItems = requestedItems;
    const cart = await Cart.findOne({ customerId: req.session.customerId }).populate("items.productId");
    if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
      sourceItems = (cart?.items || []).map(i => ({
        productId: i.productId?._id?.toString(),
        quantity: i.quantity,
        selectedSize: i.selectedSize
      }));
    }
    if (!sourceItems.length) return res.status(400).json({ message: "Your cart is empty." });

    const orderItems = [];
    let subtotal = 0;
    for (const item of sourceItems) {
      if (!mongoose.isValidObjectId(item.productId)) return res.status(400).json({ message: "Invalid product." });
      const product = await Product.findById(item.productId);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ message: "Invalid product or quantity." });
      }
      if (product.stock < quantity) return res.status(409).json({ message: `${product.name} is out of stock for the requested quantity.` });
      if (product.sizes.length && !product.sizes.includes(item.selectedSize)) {
        return res.status(400).json({ message: `Choose a valid size for ${product.name}.` });
      }
      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      orderItems.push({
        productId: product._id, productName: product.name,
        image: product.images[0], quantity, selectedSize: item.selectedSize || "",
        unitPrice: product.price, currency: product.currency, subtotal: lineTotal
      });
    }

    // Demo checkout: order is created but no payment is collected.
    const deliveryFee = subtotal >= 2000 ? 0 : 50;
    const orderedAt = new Date();
    const estimatedDeliveryAt = new Date(orderedAt);
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 5);

    // Reserve stock FIRST, one atomic step per line:
    //   "reduce stock by qty AND raise soldQty by qty, but only if stock >= qty".
    // Two people buying the last unit at the same moment can never both succeed.
    // If any line fails, or saving the order fails, everything reserved so far is put back.
    const reserved = [];
    let order;
    try {
      for (const item of orderItems) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity, soldQty: item.quantity } },
          { new: true }
        );
        if (!updated) {
          await releaseStock(reserved);
          return res.status(409).json({ message: `${item.productName} just sold out or doesn't have enough stock left.` });
        }
        reserved.push(item);
      }
      order = await Order.create({
        customerId: req.session.customerId,
        items: orderItems, deliveryAddress, subtotal, deliveryFee,
        totalAmount: subtotal + deliveryFee, currency: "INR",
        status: "OrderPlaced", paymentStatus: "Pending",
        orderedAt, estimatedDeliveryAt
      });
    } catch (err) {
      await releaseStock(reserved);
      return next(err);
    }

    if (cart) { cart.items = []; await cart.save(); }
    res.status(201).json({ message: "Order placed successfully (demo checkout; no payment taken).", order });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({message: "Order not found"});
    }
    res.status(200).json({message: "Order Cancelled successfully"});
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Failed to delete order"});
  }
});

export default router;
