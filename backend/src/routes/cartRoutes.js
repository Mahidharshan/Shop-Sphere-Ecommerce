import { Router } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/authenticate.js";

const router = Router();
router.use(requireAuth);

async function getCart(customerId) {
  let cart = await Cart.findOne({ customerId }).populate("items.productId");
  if (!cart) cart = await Cart.create({ customerId, items: [] });
  return cart;
}

router.get("/", async (req, res, next) => {
  try { res.json({ cart: await getCart(req.session.customerId) }); }
  catch (err) { next(err); }
});

router.post("/items", async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedSize = "" } = req.body;
    if (!mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Invalid product or quantity." });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (product.sizes.length && !product.sizes.includes(selectedSize)) {
      return res.status(400).json({ message: "Please select a valid size." });
    }
    if (product.stock < 1) return res.status(409).json({ message: `${product.name} is out of stock.` });
    const cart = await getCart(req.session.customerId);
    const item = cart.items.find(i => i.productId?._id?.toString() === productId && i.selectedSize === selectedSize);
    // Count what is already in the cart for this product (all sizes) against the stock in the database.
    const inCart = cart.items
      .filter(i => i.productId?._id?.toString() === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (inCart + quantity > product.stock) {
      return res.status(409).json({ message: `Only ${product.stock} of ${product.name} in stock${inCart ? ` (you already have ${inCart} in your cart)` : ""}.` });
    }
    if (item) item.quantity += quantity;
    else cart.items.push({ productId, quantity, selectedSize });
    await cart.save();
    res.json({ cart: await Cart.findById(cart._id).populate("items.productId") });
  } catch (err) { next(err); }
});

router.patch("/items/:itemId", async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ message: "Quantity must be between 1 and 99." });
    }
    const cart = await Cart.findOne({ customerId: req.session.customerId });
    if (!cart) return res.status(404).json({ message: "Cart not found." });
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found." });
    const product = await Product.findById(item.productId);
    if (!product) return res.status(404).json({ message: "This product is no longer available." });
    const others = cart.items
      .filter(i => i._id.toString() !== item._id.toString() && i.productId.toString() === item.productId.toString())
      .reduce((sum, i) => sum + i.quantity, 0);
    if (others + quantity > product.stock) {
      return res.status(409).json({ message: `Only ${product.stock} of ${product.name} in stock.` });
    }
    item.quantity = quantity;
    await cart.save();
    res.json({ cart: await Cart.findById(cart._id).populate("items.productId") });
  } catch (err) { next(err); }
});

router.delete("/items/:itemId", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customerId: req.session.customerId });
    if (!cart) return res.json({ cart: { items: [] } });
    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
    await cart.save();
    res.json({ cart: await Cart.findById(cart._id).populate("items.productId") });
  } catch (err) { next(err); }
});

export default router;
