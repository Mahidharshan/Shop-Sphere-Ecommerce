import { Router } from "express";
import Customer from "../models/Customer.js";
import { requireAuth } from "../middleware/authenticate.js";
import { isAdminEmail } from "../services/admin.js";


const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.session.customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found." });
    res.json({ customer: {
      _id: customer._id, name: customer.name, email: customer.email,
      photo: customer.photo, bio: customer.bio, phone: customer.phone,

      addresses: customer.addresses,
      addresses: customer.addresses, isAdmin: isAdminEmail(customer.email)
    }});
  } catch (err) { next(err); }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const allowed = {};
    for (const key of ["name", "bio", "phone", "photo"]) {
      if (typeof req.body[key] === "string") allowed[key] = req.body[key].trim();
    }
    const customer = await Customer.findByIdAndUpdate(
      req.session.customerId, { $set: allowed }, { new: true, runValidators: true }
    );
    res.json({ customer: {
      _id: customer._id, name: customer.name, email: customer.email,
      photo: customer.photo, bio: customer.bio, phone: customer.phone,

      addresses: customer.addresses,
      addresses: customer.addresses, 
      isAdmin: isAdminEmail(customer.email)

    }});
  } catch (err) { next(err); }
});

export default router;
