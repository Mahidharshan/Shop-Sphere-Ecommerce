import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { releaseStock } from "../services/stock.js";
import { createCashfreeRefund } from "../services/cashfree.js";

const router = Router();
router.use(requireAdmin);

const FLOW = ["OrderPlaced", "Processing", "Shipped", "Out for Delivery", "Delivered"];

router.get("/orders", async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ orderedAt: -1 }).limit(100).populate("customerId", "name email phone");
    res.json({ orders });
  } catch (err) { next(err); }
});

// Move an order forward: Processing > Shipped > Out for Delivery > Delivered.
router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found." });
    const next_ = String(req.body.status || "");
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const from = FLOW.indexOf(order.status);
    const to = FLOW.indexOf(next_);
    if (from === -1 || to === -1 || to <= from) {
      return res.status(409).json({ message: `Can't change status from ${order.status} to ${next_}.` });
    }
    if (order.gatewayOrderId && order.paymentStatus !== "Paid") {
      return res.status(409).json({ message: "This online order is not paid yet." });
    }

    const set = { status: next_ };
    if (next_ === "Delivered") {
      set.deliveredAt = new Date(); // the 7-day return period starts now
      if (order.paymentMethod === "COD") { set.paymentStatus = "Paid"; set.paidAt = new Date(); } // cash collected
    }
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: set }, { new: true });
    if (!updated) return res.status(409).json({ message: "The order was changed by someone else. Reload and try again." });
    res.json({ order: updated });
  } catch (err) { next(err); }
});

// Handle a return request: approve (refund), reject, or mark a COD refund as sent.
router.patch("/orders/:id/return", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found." });
    const action = String(req.body.action || "");
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (action === "reject") {
      const updated = await Order.findOneAndUpdate(
        { _id: order._id, returnStatus: "Requested" },
        { $set: { returnStatus: "Rejected", returnResolvedAt: new Date() } }, { new: true });
      if (!updated) return res.status(409).json({ message: "There is no open return request for this order." });
      return res.json({ order: updated });
    }

    if (action === "refunded") { // COD only: you sent the money back yourself (bank / UPI)
      const updated = await Order.findOneAndUpdate(
        { _id: order._id, returnStatus: "Approved", paymentMethod: "COD" },
        { $set: { returnStatus: "Refunded", paymentStatus: "Refunded", returnResolvedAt: new Date() } }, { new: true });
      if (!updated) return res.status(409).json({ message: "This order is not waiting for a manual COD refund." });
      return res.json({ order: updated });
    }

    if (action === "approve") {
      // Claim the request first (one atomic step), so the refund can only be created once.
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, returnStatus: "Requested" },
        { $set: { returnStatus: "Approved", status: "Returned", returnResolvedAt: new Date() } }, { new: false });
      if (!claimed) return res.status(409).json({ message: "There is no open return request for this order." });

      if (order.gatewayOrderId && order.paymentStatus === "Paid") {
        try {
          const refund = await createCashfreeRefund(order.gatewayOrderId, `rt_${order._id}`, order.totalAmount, `Return of order ${order._id}`);
          if (["CANCELLED", "FAILED"].includes(refund?.refund_status)) throw new Error(`Refund status ${refund.refund_status}`);
        } catch (err) {
          console.error("Return refund failed:", err.message);
          await Order.updateOne({ _id: order._id }, { $set: { returnStatus: "Requested", status: "Delivered", returnResolvedAt: null } });
          return res.status(502).json({ message: "The refund could not be started. Please try again." });
        }
        await Order.updateOne({ _id: order._id }, { $set: { returnStatus: "Refunded", paymentStatus: "Refund Initiated" } });
      }
      await releaseStock(order.items); // returned items go back to stock
      return res.json({ order: await Order.findById(order._id) });
    }

    res.status(400).json({ message: "Unknown action." });
  } catch (err) { next(err); }
});

export default router;
