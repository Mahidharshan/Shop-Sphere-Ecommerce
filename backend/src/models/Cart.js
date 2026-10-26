import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, min: 1, default: 1 },
  selectedSize: { type: String, default: "" }
});

const cartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", unique: true, required: true },
  items: { type: [cartItemSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Cart", cartSchema);
