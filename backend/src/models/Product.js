import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  category: { type: String, required: true, index: true },
  images: { type: [String], validate: v => v.length >= 1 && v.length <= 8 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "INR" },
  sizes: { type: [String], default: [] },
  // Units currently available to buy. Goes DOWN by the ordered quantity on every order.
  stock: {
    type: Number, default: 0, min: 0,
    validate: { validator: Number.isInteger, message: "Stock must be a whole number." }
  },
  // Total units ever ordered for this product. Goes UP by the ordered quantity on every order.
  soldQty: { type: Number, default: 0, min: 0 },
  // Which customer listed this product (null for the seeded sample products).
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
  sellerName: { type: String, default: "ShopSphere Marketplace" },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
