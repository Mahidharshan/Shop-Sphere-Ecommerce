// Small helper for the Cashfree Payment Gateway REST API (no extra npm package needed).
// Docs: https://www.cashfree.com/docs/api-reference/payments/latest/overview
const API_VERSION = "2023-08-01";

export const cashfreeMode = () => (process.env.CASHFREE_ENV === "production" ? "production" : "sandbox");

const baseUrl = () =>
  cashfreeMode() === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

export const cashfreeConfigured = () =>
  Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET);

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Cashfree error:", response.status, data);
    throw new Error(data.message || "Payment gateway error.");
  }
  return data;
}

export const createCashfreeOrder = body => call("/orders", { method: "POST", body: JSON.stringify(body) });

// order_status is PAID, ACTIVE (not paid yet), EXPIRED, TERMINATED ...
export const fetchCashfreeOrder = orderId => call(`/orders/${encodeURIComponent(orderId)}`);
