import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Edit, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const ORDER_STATUS_STYLE = {
  pending:   { bg: "rgba(218,203,160,0.2)",   color: "#8a7340" },
  confirmed: { bg: "rgba(27,77,62,0.08)",     color: "#1B4D3E" },
  shipped:   { bg: "rgba(100,120,200,0.1)",   color: "#3a4a9a" },
  delivered: { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d" },
  cancelled: { bg: "rgba(192,128,129,0.12)",  color: "#8a4445" },
};

const PAYMENT_STATUS_STYLE = {
  unpaid:   { bg: "rgba(192,128,129,0.1)",  color: "#C08081" },
  pending:  { bg: "rgba(218,203,160,0.2)",  color: "#8a7340" },
  paid:     { bg: "rgba(100,160,100,0.12)", color: "#2d6e2d" },
  refunded: { bg: "rgba(100,120,200,0.1)",  color: "#3a4a9a" },
};

const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded"];

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.12)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "160px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    {children}
  </div>
);

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders/${id}`);
      setOrder(res.data);
      setPaymentRef(res.data.payment_reference || "");
    } catch {
      toast.error("Order not found");
      navigate("/admin/orders");
    } finally { setLoading(false); }
  };

  const handleStatusUpdate = async (field, value) => {
    setUpdating(true);
    try {
      const payload = { [field]: value };
      if (field === "payment_status" && value === "paid" && paymentRef) {
        payload.payment_reference = paymentRef;
      }
      await axios.put(`${API}/admin/orders/${id}`, payload);
      toast.success("Order updated");
      fetchOrder();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  if (!order) return null;

  const orderStyle = ORDER_STATUS_STYLE[order.order_status] || ORDER_STATUS_STYLE.pending;
  const payStyle = PAYMENT_STATUS_STYLE[order.payment_status] || PAYMENT_STATUS_STYLE.unpaid;
  const enquiry = order._enquiry || {};
  const movements = order._movements || [];

  return (
    
      <div style={{ maxWidth: "900px" }}>

        <button onClick={() => navigate("/admin/orders")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Orders
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "14px", fontWeight: 600, letterSpacing: "0.08em", color: "#1B4D3E" }}>{order.order_code}</span>
              <span style={{ ...orderStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{order.order_status}</span>
              <span style={{ ...payStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{order.payment_status}</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{order.customer_name}</h1>
            <p style={{ fontFamily: SANS, fontSize: "22px", fontWeight: 600, color: "#1B4D3E", marginTop: "4px" }}>₹{(order.total_amount || 0).toLocaleString("en-IN")}</p>
          </div>
          {order.order_status !== "cancelled" && (
            <button onClick={() => navigate(`/admin/orders/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
              <Edit style={{ width: 14, height: 14 }} /> Edit
            </button>
          )}
        </div>

        {/* Quick status updates */}
        {order.order_status !== "cancelled" && order.order_status !== "delivered" && (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "16px 20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>Order Status</p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {ORDER_STATUSES.filter(s => s !== order.order_status).map(s => (
                    <button key={s} onClick={() => handleStatusUpdate("order_status", s)} disabled={updating}
                      style={{ fontFamily: SANS, fontSize: "11px", padding: "5px 10px", background: ORDER_STATUS_STYLE[s]?.bg, color: ORDER_STATUS_STYLE[s]?.color, border: "none", cursor: "pointer", textTransform: "capitalize", opacity: updating ? 0.5 : 1 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ borderLeft: "1px solid rgba(218,203,160,0.3)", paddingLeft: "16px" }}>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>Payment</p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {PAYMENT_STATUSES.filter(s => s !== order.payment_status).map(s => (
                    <button key={s} onClick={() => handleStatusUpdate("payment_status", s)} disabled={updating}
                      style={{ fontFamily: SANS, fontSize: "11px", padding: "5px 10px", background: PAYMENT_STATUS_STYLE[s]?.bg, color: PAYMENT_STATUS_STYLE[s]?.color, border: "none", cursor: "pointer", textTransform: "capitalize", opacity: updating ? 0.5 : 1 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {order.payment_status !== "paid" && (
                <div style={{ borderLeft: "1px solid rgba(218,203,160,0.3)", paddingLeft: "16px" }}>
                  <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>Payment Reference</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Razorpay / UPI ref" style={{ fontFamily: SANS, fontSize: "13px", padding: "5px 10px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", width: "180px" }} />
                    <button onClick={() => handleStatusUpdate("payment_reference", paymentRef)} disabled={!paymentRef || updating}
                      style={{ fontFamily: SANS, fontSize: "11px", padding: "5px 12px", background: "rgba(27,77,62,0.08)", border: "none", color: "#1B4D3E", cursor: "pointer" }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <Card title="Order Items">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(218,203,160,0.2)" }}>
                {["Product", "Code", "Qty", "Unit Price", "Total"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
                  <td style={{ padding: "12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E" }}>{item.product_name}</td>
                  <td style={{ padding: "12px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>{item.product_code}</td>
                  <td style={{ padding: "12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E" }}>₹{(item.unit_price || 0).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 600 }}>₹{(item.total_price || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid rgba(218,203,160,0.3)", background: "rgba(27,77,62,0.02)" }}>
                <td colSpan="4" style={{ padding: "12px", fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E", textAlign: "right" }}>Total</td>
                <td style={{ padding: "12px", fontFamily: SANS, fontSize: "16px", fontWeight: 700, color: "#1B4D3E" }}>₹{(order.total_amount || 0).toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Customer */}
        <Card title="Customer Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <InfoRow label="Name" value={order.customer_name} />
            <InfoRow label="Email" value={order.customer_email} />
            <InfoRow label="Phone" value={order.customer_phone} />
            <InfoRow label="City" value={order.customer_city} />
            <InfoRow label="Country" value={order.customer_country} />
          </div>
        </Card>

        {/* Linked Enquiry */}
        {order.enquiry_id && (
          <Card title="Linked Enquiry">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <InfoRow label="Enquiry Code" value={enquiry.enquiry_code} />
              <InfoRow label="Source" value={enquiry.enquiry_source} />
              <InfoRow label="Message" value={enquiry.message} />
              {order.enquiry_id && (
                <a href={`/admin/enquiries/${order.enquiry_id}`} style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", textDecoration: "underline" }}>View original enquiry →</a>
              )}
            </div>
          </Card>
        )}

        {/* Payment */}
        <Card title="Payment">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <InfoRow label="Payment Status" value={order.payment_status} />
            <InfoRow label="Payment Reference" value={order.payment_reference} />
            <InfoRow label="Amount" value={`₹${(order.total_amount || 0).toLocaleString("en-IN")}`} />
          </div>
        </Card>

        {/* Inventory Movements */}
        {movements.length > 0 && (
          <Card title="Inventory Movements">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {movements.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
                  <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", background: "rgba(192,128,129,0.1)", color: "#C08081", padding: "2px 8px", flexShrink: 0 }}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{m.movement_type?.replace(/_/g, " ")}</span>
                  <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginLeft: "auto" }}>
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {order.notes && (
          <Card title="Notes">
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.7)", lineHeight: 1.7 }}>{order.notes}</p>
          </Card>
        )}

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
            Created {order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
            {order.created_by_name && ` by ${order.created_by_name}`}
          </p>
        </div>

      </div>
    
  );
};

export default AdminOrderDetail;
