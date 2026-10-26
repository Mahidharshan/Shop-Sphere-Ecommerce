export function requireAuth(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ message: "Please log in to continue." });
  }
  next();
}
