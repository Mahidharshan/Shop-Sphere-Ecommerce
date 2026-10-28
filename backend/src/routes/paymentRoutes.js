import { Router } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/authenticate.js";
import { releaseStock, reserveStock } from "../services/stock.js";
import { cashfreeConfigured, cashfreeMode, createCashfreeOrder, fetchCashfreeOrder } from "../services/cashfree.js";

const router = Router();
router.use(requireAuth);

const PAYMENT_WINDOW_MINUTES = 30; // customer must pay within this time

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/+$/, "");
const text = (v, max = 120) => String(v ?? "").trim().slice(0, max);

// Ask Cashfree what happened to this order and update our database.
// Safe to call many times: each change only happens if the order is still "Pending".
export async function reconcilePayment(order) {
  if (order.paymentStatus !== "Pending" || !order.gatewayOrderId) return order;
  const gw = await fetchCashfreeOrder(order.gatewayOrderId);

  if (gw.order_status === "PAID") {
    const paid = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "Pending" },
      { $set: { paymentStatus: "Paid", paidAt: new Date() } },
      { new: true }
    );
    if (paid) {
      const ids = order.items.map(i => i.productId);
      await Cart.updateOne({ customerId: order.customerId }, { $pull: { items: { productId: { $in: ids } } } });
    }
    return paid || Order.findById(order._id);
  }

  const tooOld = Date.now() - new Date(order.createdAt).getTime() > (PAYMENT_WINDOW_MINUTES + 5) * 60 * 1000;
  const closed = ["EXPIRED", "TERMINATED", "TERMINATION_REQUESTED"].includes(gw.order_status);
  if (closed || tooOld) {
    const failed = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: "Pending" },
      { $set: { paymentStatus: "Failed", status: "Cancelled" } },
      { new: true }
    );
    if (failed) await releaseStock(order.items); // only the request that changed the order gives stock back
    return failed || Order.findById(order._id);
  }
  return order; // still waiting for the customer
}

// Background job (called from server.js): settle payments the customer never came back to confirm.
export async function reconcilePendingPayments() {
  const pending = await Order.find({
    paymentStatus: "Pending",
    gatewayOrderId: { $type: "string" },
    createdAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) }
  }).limit(50);
  for (const order of pending) {
    try { await reconcilePayment(order); }
    catch (err) { console.error("Reconcile failed for", order._id.toString(), err.message); }
  }
}

// Shared by online payment and cash on delivery: validate the request and price the cart from the database.
// Returns { error: { status, message } } or the order details.
async function prepareCheckout(req) {
  const fail = (status, message) => ({ error: { status, message } });
  const addr = req.body.deliveryAddress || {};
  const deliveryAddress = {
    street: text(addr.street, 200), city: text(addr.city), state: text(addr.state),
    postalCode: text(addr.postalCode, 12), country: text(addr.country)
  };
  if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.postalCode || !deliveryAddress.country) {
    return fail(400, "Complete delivery address is required.");
  }
  const mobile = String(req.body.phone || "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(mobile)) return fail(400, "Enter a valid 10-digit mobile number.");

  const customer = await Customer.findById(req.session.customerId);
  if (!customer) return fail(401, "Please log in to continue.");

  let sourceItems = req.body.items;
  if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
    const cart = await Cart.findOne({ customerId: customer._id });
    sourceItems = (cart?.items || []).map(i => ({ productId: i.productId?.toString(), quantity: i.quantity, selectedSize: i.selectedSize }));
  }
  if (!sourceItems.length) return fail(400, "Your cart is empty.");

  const orderItems = [];
  let subtotal = 0;
  for (const item of sourceItems) {
    if (!mongoose.isValidObjectId(item.productId)) return fail(400, "Invalid product.");
    const product = await Product.findById(item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail(400, "Invalid product or quantity.");
    if (product.stock < quantity) return fail(409, `${product.name} is out of stock for the requested quantity.`);
    if (product.sizes.length && !product.sizes.includes(item.selectedSize)) return fail(400, `Choose a valid size for ${product.name}.`);
    const lineTotal = product.price * quantity;
    subtotal += lineTotal;
    orderItems.push({
      productId: product._id, productName: product.name, image: product.images[0],
      quantity, selectedSize: item.selectedSize || "", unitPrice: product.price,
      currency: product.currency, subtotal: lineTotal
    });
  }

  const deliveryFee = subtotal >= 2000 ? 0 : 50;
  const orderedAt = new Date();
  const estimatedDeliveryAt = new Date(orderedAt);
  estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 5);
  return {
    customer, mobile, deliveryAddress, orderItems, subtotal, deliveryFee,
    totalAmount: Number((subtotal + deliveryFee).toFixed(2)), orderedAt, estimatedDeliveryAt
  };
}

// Online payment, step 1: reserve stock, create our order + a Cashfree order, return the payment session.
router.post("/checkout", async (req, res, next) => {
  try {
    if (!cashfreeConfigured()) return res.status(503).json({ message: "Online payment is not set up yet." });
    const p = await prepareCheckout(req);
    if (p.error) return res.status(p.error.status).json({ message: p.error.message });

    const reservation = await reserveStock(p.orderItems);
    if (!reservation.ok) {
      return res.status(409).json({ message: `${reservation.failedItem.productName} just sold out or doesn't have enough stock left.` });
    }

    const orderId = new mongoose.Types.ObjectId();
    const gatewayOrderId = `ss_${orderId}`;
    try {
      await Order.create({
        _id: orderId, customerId: p.customer._id, items: p.orderItems, deliveryAddress: p.deliveryAddress,
        subtotal: p.subtotal, deliveryFee: p.deliveryFee, totalAmount: p.totalAmount, currency: "INR",
        status: "OrderPlaced", paymentStatus: "Pending", paymentMethod: "Cashfree", contactPhone: p.mobile,
        gatewayOrderId, orderedAt: p.orderedAt, estimatedDeliveryAt: p.estimatedDeliveryAt
      });

      const expiry = new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
      const gw = await createCashfreeOrder({
        order_id: gatewayOrderId,
        order_amount: p.totalAmount,
        order_currency: "INR",
        order_expiry_time: expiry,
        order_note: `ShopSphere order ${orderId}`,
        customer_details: {
          customer_id: String(p.customer._id), customer_name: p.customer.name,
          customer_email: p.customer.email, customer_phone: p.mobile
        },
        order_meta: { return_url: `${clientUrl()}/payment-status?order_id={order_id}` }
      });

      res.status(201).json({ orderId, gatewayOrderId, paymentSessionId: gw.payment_session_id, mode: cashfreeMode() });
    } catch (err) {
      // Could not start the payment: undo everything so no stock stays locked.
      await Order.deleteOne({ _id: orderId });
      await releaseStock(p.orderItems);
      console.error("Checkout failed:", err.message);
      return res.status(502).json({ message: "Could not start the payment. Please try again." });
    }
  } catch (err) { next(err); }
});

// Cash on delivery: the order is placed now, the customer pays in cash when it arrives.
router.post("/cod", async (req, res, next) => {
  try {
    const p = await prepareCheckout(req);
    if (p.error) return res.status(p.error.status).json({ message: p.error.message });

    const reservation = await reserveStock(p.orderItems);
    if (!reservation.ok) {
      return res.status(409).json({ message: `${reservation.failedItem.productName} just sold out or doesn't have enough stock left.` });
    }

    let order;
    try {
      order = await Order.create({
        customerId: p.customer._id, items: p.orderItems, deliveryAddress: p.deliveryAddress,
        subtotal: p.subtotal, deliveryFee: p.deliveryFee, totalAmount: p.totalAmount, currency: "INR",
        status: "OrderPlaced", paymentStatus: "Pay on Delivery", paymentMethod: "COD", contactPhone: p.mobile,
        orderedAt: p.orderedAt, estimatedDeliveryAt: p.estimatedDeliveryAt
      });
    } catch (err) {
      await releaseStock(p.orderItems);
      return next(err);
    }

    const ids = p.orderItems.map(i => i.productId);
    await Cart.updateOne({ customerId: p.customer._id }, { $pull: { items: { productId: { $in: ids } } } }).catch(() => {});
    res.status(201).json({ order });
  } catch (err) { next(err); }
});

// Step 2: the customer comes back from Cashfree. We ask Cashfree directly (never trust the browser).
router.post("/verify", async (req, res, next) => {
  try {
    const gatewayOrderId = text(req.body.gatewayOrderId, 60);
    const order = await Order.findOne({ gatewayOrderId, customerId: req.session.customerId });
    if (!order) return res.status(404).json({ message: "Order not found." });
    try {
      res.json({ order: await reconcilePayment(order) });
    } catch (err) {
      console.error("Verify failed:", err.message);
      res.status(502).json({ message: "Could not check the payment right now. Please look in My Orders in a minute." });
    }
  } catch (err) { next(err); }
});

export default router;
