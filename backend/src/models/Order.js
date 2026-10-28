import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: String,
  image: String,
  quantity: Number,
  selectedSize: String,
  unitPrice: Number,
  currency: { type: String, default: "INR" },
  subtotal: Number,
  rating: { type: Number, default: null }
});

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  items: [orderItemSchema],
  deliveryAddress: {
    street: String, city: String, state: String, postalCode: String, country: String
  },
  subtotal: Number,
  deliveryFee: Number,
  totalAmount: Number,
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["OrderPlaced","Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"], default: "OrderPlaced" },
  paymentStatus: { type: String, enum: ["Demo - not paid", "Pending", "Paid", "Failed"], default: "Demo - not paid" },
  paymentMethod: { type: String, default: "Demo" },
  gatewayOrderId: { type: String, index: true }, // Cashfree order id (ss_<order id>)
  paidAt: { type: Date, default: null },
  orderedAt: { type: Date, default: Date.now },
  estimatedDeliveryAt: Date,
  deliveredAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
