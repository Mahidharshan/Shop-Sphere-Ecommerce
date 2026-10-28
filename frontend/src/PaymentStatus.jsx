import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./api";

const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// Cashfree sends the customer back here after paying (or cancelling).
// We never trust the URL: the server asks Cashfree what really happened.
export default function PaymentStatusPage({ setCart, onPaid }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gatewayOrderId = params.get("order_id");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!gatewayOrderId) { setError("Payment details are missing."); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const data = await api("/payments/verify", { method: "POST", body: JSON.stringify({ gatewayOrderId }) });
      setOrder(data.order);
      if (data.order.paymentStatus === "Paid") {
        setCart([]);
        localStorage.removeItem("shopsphere-guest-cart");
        onPaid?.();
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [gatewayOrderId]);

  useEffect(() => { check(); }, [check]);

  if (loading) return <main className="page success-page"><h1>Confirming your <em>payment…</em></h1><p>Please don't close this page.</p></main>;

  if (error) return <main className="page success-page"><h1>Something <em>went wrong.</em></h1><p className="form-error">{error}</p><button className="button button-dark" onClick={check}>Check again</button><button className="text-button" onClick={() => navigate("/orders")}>Go to my orders</button></main>;

  if (order?.paymentStatus === "Paid") return (
    <main className="page success-page">
      <div className="success-mark">✓</div>
      <div className="eyebrow">PAYMENT RECEIVED</div>
      <h1>Order <em>placed!</em></h1>
      <p>Thank you. Your payment was successful.</p>
      <div className="success-card">
        <span>Order ID</span><b>{order._id}</b>
        <span>Amount paid</span><b>{money(order.totalAmount)}</b>
        <span>Estimated delivery</span><b>{fmtDate(order.estimatedDeliveryAt)}</b>
      </div>
      <button className="button button-dark" onClick={() => navigate(`/order/${order._id}`)}>View order details ↗</button>
      <button className="text-button" onClick={() => navigate("/")}>Continue shopping</button>
    </main>
  );

  if (order?.paymentStatus === "Failed") return (
    <main className="page success-page">
      <div className="eyebrow">PAYMENT NOT COMPLETED</div>
      <h1>Payment <em>failed.</em></h1>
      <p>Your order was not placed. If any money was deducted, it is usually returned to your account automatically. Contact us if it is not.</p>
      <button className="button button-dark" onClick={() => navigate("/cart")}>Back to cart</button>
    </main>
  );

  return (
    <main className="page success-page">
      <div className="eyebrow">WAITING FOR PAYMENT</div>
      <h1>Not confirmed <em>yet.</em></h1>
      <p>We have not received your payment yet. If you already paid, wait a minute and check again. An unpaid order is cancelled automatically after 30 minutes.</p>
      <button className="button button-dark" onClick={check}>Check again</button>
      <Link className="text-button" to="/orders">Go to my orders</Link>
    </main>
  );
}
