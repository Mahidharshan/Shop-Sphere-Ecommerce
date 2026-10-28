import { Router } from "express";
import bcrypt from "bcrypt";
import Customer from "../models/Customer.js";

import { isAdminEmail } from "../services/admin.js";


const router = Router();

function publicCustomer(customer) {
  return {
    _id: customer._id,
    name: customer.name,
    email: customer.email,
    photo: customer.photo,
    bio: customer.bio,
    phone: customer.phone,
    addresses: customer.addresses || [],
    isAdmin: isAdminEmail(customer.email)
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await Customer.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const customer = await Customer.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12)
    });
    req.session.customerId = customer._id.toString();
    res.status(201).json({ customer: publicCustomer(customer) });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const customer = await Customer.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    req.session.customerId = customer._id.toString();
    res.json({ customer: publicCustomer(customer) });
  } catch (err) { next(err); }
});

router.get("/me", async (req, res, next) => {
  try {
    if (!req.session.customerId) return res.json({ customer: null });
    const customer = await Customer.findById(req.session.customerId);
    if (!customer) {
      req.session.destroy(() => {});
      return res.json({ customer: null });
    }
    res.json({ customer: publicCustomer(customer) });
  } catch (err) { next(err); }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie("shopsphere.sid");
    res.json({ message: "Logged out successfully." });
  });
});

export default router;
