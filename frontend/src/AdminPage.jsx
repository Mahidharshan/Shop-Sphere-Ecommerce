import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api";

const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const fmt = d => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";
const NEXT = { OrderPlaced: "Processing", Processing: "Shipped", Shipped: "Out for Delivery", "Out for Delivery": "Delivered" };

// Shop owner page: move orders to Shipped / Delivered and handle return requests.
// Only emails listed in ADMIN_EMAILS (backend/.env) can use it.
export default function AdminPage({ customer }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api("/admin/orders").then(d => setOrders(d.orders)).catch(e => setError(e.message));
  }, []);
  useEffect(() => { if (customer) load(); }, [customer, load]);

  const act = async (id, path, body) => {
    setBusyId(id);
    try { await api(`/admin/orders/${id}/${path}`, { method: "PATCH", body: JSON.stringify(body) }); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusyId(""); }
  };

  if (!customer) return <main className="page"><Link to="/login">Log in to open the admin page</Link></main>;
  if (error) return <main className="page"><p className="form-error">{error}</p><Link to="/">Back to home</Link></main>;
  if (!orders) return <main className="page">Loading orders…</main>;

  return (
    <main className="page">
      <div className="page-title"><div className="eyebrow">SHOP OWNER</div><h1>Manage <em>orders.</em></h1><p>Latest 100 orders. A delivered order can be returned for 7 days.</p></div>
      <div className="orders-list">
        {orders.length === 0 && <p>No orders yet.</p>}
        {orders.map(o => {
          const waitingPayment = o.gatewayOrderId && o.paymentStatus !== "Paid";
          const next = NEXT[o.status];
          return (
            <div className="order-card" key={o._id}>
              <div className="order-head">
                <span>ORDER<b>{o._id}</b></span>
                <span>PLACED<b>{fmt(o.orderedAt)}</b></span>
                <span>TOTAL<b>{money(o.totalAmount)}</b></span>
                <span>PAYMENT<b>{o.paymentMethod === "COD" ? "Cash on delivery" : o.paymentMethod}{" · "}{o.paymentStatus}</b></span>
                <span>STATUS<b>{o.status}</b></span>
              </div>
              <div className="order-body" style={{ display: "block" }}>
                <p><b>{o.customerId?.name}</b> · {o.customerId?.email} · {o.contactPhone || o.customerId?.phone || "no phone"}</p>
                <p>{o.deliveryAddress?.street}, {o.deliveryAddress?.city}, {o.deliveryAddress?.state} {o.deliveryAddress?.postalCode}</p>
                <p>{o.items.map(i => `${i.productName} × ${i.quantity}${i.selectedSize ? ` (${i.selectedSize})` : ""}`).join(", ")}</p>
                {o.deliveredAt && <p>Delivered: {fmt(o.deliveredAt)}</p>}
                {o.returnStatus && o.returnStatus !== "None" && <p><b>Return: {o.returnStatus}</b> — “{o.returnReason}”</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {next && !waitingPayment && <button className="button button-dark small" disabled={busyId === o._id} onClick={() => act(o._id, "status", { status: next })}>Mark as {next}</button>}
                  {waitingPayment && o.status === "OrderPlaced" && <small>Waiting for online payment</small>}
                  {o.returnStatus === "Requested" && <>
                    <button className="button button-dark small" disabled={busyId === o._id} onClick={() => window.confirm(o.paymentMethod === "COD" ? "Approve the return? You must send the refund yourself." : "Approve the return and refund the customer?") && act(o._id, "return", { action: "approve" })}>Approve return{o.paymentMethod === "COD" ? "" : " + refund"}</button>
                    <button className="button button-outline small" disabled={busyId === o._id} onClick={() => window.confirm("Reject this return?") && act(o._id, "return", { action: "reject" })}>Reject return</button>
                  </>}
                  {o.returnStatus === "Approved" && o.paymentMethod === "COD" && <button className="button button-dark small" disabled={busyId === o._id} onClick={() => act(o._id, "return", { action: "refunded" })}>Mark refund sent</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
