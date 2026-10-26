import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home" },
  street: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  postalCode: { type: String, default: "" },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  photo: { type: String, default: "" },
  bio: { type: String, default: "", maxlength: 300 },
  phone: { type: String, default: "" },
  addresses: { type: [addressSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("Customer", customerSchema);
