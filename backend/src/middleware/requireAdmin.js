import Customer from "../models/Customer.js";
import { isAdminEmail } from "../services/admin.js";

export async function requireAdmin(req, res, next) {
  try {
    if (!req.session.customerId) return res.status(401).json({ message: "Please log in to continue." });
    const customer = await Customer.findById(req.session.customerId).select("email");
    if (!customer || !isAdminEmail(customer.email)) return res.status(403).json({ message: "Admins only." });
    next();
  } catch (err) { next(err); }
}
