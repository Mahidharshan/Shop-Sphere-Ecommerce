// Admins are the customers whose email is listed in ADMIN_EMAILS (comma separated) in backend/.env
export function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email || "").toLowerCase());
}
