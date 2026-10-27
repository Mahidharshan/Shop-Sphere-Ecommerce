import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Cart from "../models/Cart.js";
import { requireAuth } from "../middleware/authenticate.js";
import { uploadProductImages, uploadDir, publicBaseUrl } from "../middleware/upload.js";

const router = Router();

const CATEGORIES = ["Men's Wear", "Women's Wear", "Kids' Wear", "Shoes", "Sports", "Accessories", "Electronics", "Food"];
// Categories that can have sizes/variants (always optional). Others always save an empty list.
const SIZED_CATEGORIES = ["Men's Wear", "Women's Wear", "Kids' Wear", "Shoes", "Sports", "Electronics"];
const MAX_IMAGES = 8;

const toNumber = v => (v === undefined || v === null || String(v).trim() === "" ? NaN : Number(v));
const removeFiles = files => Promise.all((files || []).map(f => fs.unlink(f.path).catch(() => {})));

function parseSizes(value) {
  const sizes = String(value || "").split(",").map(s => s.trim()).filter(Boolean);
  return [...new Set(sizes)];
}

// Image links pasted by the seller: separated by spaces or new lines.
function parseImageUrls(value) {
  return String(value || "").split(/\s+/).filter(Boolean);
}

function isHttpUrl(value) {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}

// Delete photos that were uploaded to this server (never touches remote image links).
async function deleteLocalImages(images = []) {
  const prefix = `${publicBaseUrl()}/uploads/`;
  await Promise.all(images
    .filter(url => url.startsWith(prefix))
    .map(url => fs.unlink(path.join(uploadDir, path.basename(url))).catch(() => {})));
}

// ---------- Public: browse ----------
router.get("/", async (req, res, next) => {
  try {
    const { search = "", category = "" } = req.query;
    const filter = {};
    if (search.trim()) filter.name = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };//replace the special characters in the search string with escaped versions so that they are treated as literal characters in the regex
    if (category && category !== "All") filter.category = category;
    const products = await Product.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ products });
  } catch (err) { next(err); }
});

// ---------- Seller: my listings (must be declared before "/:id") ----------
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const products = await Product.find({ sellerId: req.session.customerId }).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Product not found." });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (err) { next(err); }
});

// ---------- Seller: add a product for sale ----------
// multipart/form-data: name, category, price, stock, sizes (comma separated), description,
// imageUrls (optional links), images (optional files, up to 8 in total with the links)
router.post("/", requireAuth, uploadProductImages, async (req, res, next) => {
  const files = req.files || [];
  const fail = async (status, message) => { await removeFiles(files); return res.status(status).json({ message }); };
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const price = toNumber(req.body.price);
    const stock = toNumber(req.body.stock);
    const sizes = SIZED_CATEGORIES.includes(category) ? parseSizes(req.body.sizes) : [];
    const imageUrls = parseImageUrls(req.body.imageUrls);

    if (name.length < 2 || name.length > 120) return fail(400, "Product name must be 2–120 characters.");
    if (!CATEGORIES.includes(category)) return fail(400, "Please choose a valid category.");
    if (description.length > 2000) return fail(400, "Description can be at most 2000 characters.");
    if (!Number.isFinite(price) || price <= 0 || price > 10000000) return fail(400, "Enter a valid price greater than 0.");
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return fail(400, "Quantity must be a whole number (0 or more).");
    if (sizes.length > 20 || sizes.some(s => s.length > 10)) return fail(400, "Sizes: up to 20 values, each at most 10 characters.");
    if (imageUrls.some(u => !isHttpUrl(u))) return fail(400, "Image links must start with http:// or https://");
    if (files.length + imageUrls.length < 1) return fail(400, "Add at least one product image.");
    if (files.length + imageUrls.length > MAX_IMAGES) return fail(400, `A product can have at most ${MAX_IMAGES} images.`);

    const seller = await Customer.findById(req.session.customerId);
    if (!seller) return fail(401, "Please log in to continue.");

    const uploaded = files.map(f => `${publicBaseUrl()}/uploads/${f.filename}`);
    const product = await Product.create({
      name, description, category, price, stock, sizes,
      soldQty: 0,
      images: [...uploaded, ...imageUrls],
      sellerId: seller._id,
      sellerName: seller.name
    });
    res.status(201).json({ product });
  } catch (err) {
    await removeFiles(files);
    next(err);
  }
});

// ---------- Seller: change price / add stock (only the owner) ----------
// addStock is a DELTA ($inc) so it can never overwrite stock that was just reduced by an order.
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Product not found." });
    const set = {};
    const ops = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2 || name.length > 120) return res.status(400).json({ message: "Product name must be 2–120 characters." });
      set.name = name;
    }
    if (req.body.description !== undefined) {
      const description = String(req.body.description).trim();
      if (description.length > 2000) return res.status(400).json({ message: "Description can be at most 2000 characters." });
      set.description = description;
    }
    if (req.body.price !== undefined) {
      const price = toNumber(req.body.price);
      if (!Number.isFinite(price) || price <= 0 || price > 10000000) return res.status(400).json({ message: "Enter a valid price greater than 0." });
      set.price = price;
    }
    if (req.body.addStock !== undefined) {
      const addStock = toNumber(req.body.addStock);
      if (!Number.isInteger(addStock) || addStock < 1 || addStock > 100000) return res.status(400).json({ message: "Stock to add must be a whole number of 1 or more." });
      ops.$inc = { stock: addStock };
    }
    if (Object.keys(set).length) ops.$set = set;
    if (!Object.keys(ops).length) return res.status(400).json({ message: "Nothing to update." });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.session.customerId }, ops, { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found, or it isn't one of your listings." });
    res.json({ product });
  } catch (err) { next(err); }
});

// ---------- Seller: remove a listing (only the owner) ----------
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Product not found." });
    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId: req.session.customerId });
    if (!product) return res.status(404).json({ message: "Product not found, or it isn't one of your listings." });
    // Remove it from every saved cart so no cart points at a deleted product. Past orders keep their own snapshot.
    await Cart.updateMany({}, { $pull: { items: { productId: product._id } } });
    await deleteLocalImages(product.images);
    res.json({ message: "Product removed." });
  } catch (err) { next(err); }
});

// get reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select("reviews");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ reviews: [...product.reviews].reverse() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// add or update a review (logged-in users only)
router.post("/:id/reviews", async (req, res) => {
  try {
    const rating = Number(req.body.rating) || 0;
    const comment = (req.body.comment || "").trim().slice(0, 500);
    if (!rating && !comment) return res.status(400).json({ message: "Add a rating or a comment" });
    if (rating < 0 || rating > 5) return res.status(400).json({ message: "Invalid rating" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const customer = req.customer; // use whatever your auth middleware sets
    const existing = product.reviews.find(
      (r) => String(r.customerId) === String(customer._id)
    );
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
    } else {
      product.reviews.push({ customerId: customer._id, userName: customer.name, rating, comment });
    }

    const rated = product.reviews.filter((r) => r.rating > 0);
    product.averageRating = rated.length
      ? Number((rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1))
      : 0;
    product.reviewCount = product.reviews.length;

    await product.save();
    res.json({ product, reviews: [...product.reviews].reverse() });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
