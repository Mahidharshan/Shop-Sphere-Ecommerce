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
<<<<<<< HEAD
  status: { type: String, enum: ["OrderPlaced","Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"], default: "OrderPlaced" },
  paymentStatus: { type: String, enum: ["Demo - not paid", "Pending", "Paid", "Failed"], default: "Demo - not paid" },
  paymentMethod: { type: String, default: "Demo" },
=======
  status: { type: String, enum: ["OrderPlaced","Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"], default: "OrderPlaced" },
  paymentStatus: { type: String, enum: ["Demo - not paid", "Pending", "Paid", "Failed", "Pay on Delivery", "Refund Initiated", "Refunded"], default: "Demo - not paid" },
  paymentMethod: { type: String, default: "Demo" },
  contactPhone: { type: String, default: "" }, // mobile number given at checkout (needed for delivery)
>>>>>>> 1d03b75 (All Done)
  gatewayOrderId: { type: String, index: true }, // Cashfree order id (ss_<order id>)
  paidAt: { type: Date, default: null },
  orderedAt: { type: Date, default: Date.now },
  estimatedDeliveryAt: Date,
<<<<<<< HEAD
  deliveredAt: { type: Date, default: null }
=======
  deliveredAt: { type: Date, default: null },
  // Returns: customer can request within 7 days of deliveredAt.
  returnStatus: { type: String, enum: ["None", "Requested", "Approved", "Rejected", "Refunded"], default: "None" },
  returnReason: { type: String, default: "" },
  returnRequestedAt: { type: Date, default: null },
  returnResolvedAt: { type: Date, default: null }
>>>>>>> 1d03b75 (All Done)
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
