import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Search, Eye, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ExportImportBar from "./ExportImportBar";

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

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ order_statuses: [], payment_statuses: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchMeta(); fetchOrders(); }, []);
  useEffect(() => { fetchOrders(); }, [filterOrderStatus, filterPaymentStatus]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/orders/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchOrders = async () => {
    try {
      const params = {};
      if (filterOrderStatus) params.order_status = filterOrderStatus;
      if (filterPaymentStatus) params.payment_status = filterPaymentStatus;
      const res = await axios.get(`${API}/admin/orders`, { params });
      setOrders(res.data);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  };

  const filtered = orders.filter(o =>
    !search ||
    o.order_code?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  orders.forEach(o => { if (counts[o.order_status] !== undefined) counts[o.order_status]++; });
  const totalRevenue = orders
    .filter(o => o.order_status !== "cancelled" && o.payment_status === "paid")
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Orders</h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
            {orders.length} orders · ₹{totalRevenue.toLocaleString("en-IN")} collected
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ExportImportBar
            module="orders"
            filters={{ order_status: filterOrderStatus, payment_status: filterPaymentStatus, search }}
          />
          <button
            onClick={() => navigate("/admin/orders/new")}
            className="btn-luxury btn-luxury-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
          >
            <Plus style={{ width: 16, height: 16 }} /> New Order
          </button>
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {Object.entries(counts).map(([status, count]) => (
          <button key={status}
            onClick={() => setFilterOrderStatus(filterOrderStatus === status ? "" : status)}
            style={{ ...ORDER_STATUS_STYLE[status], fontFamily: SANS, fontSize: "12px", padding: "6px 14px", letterSpacing: "0.05em", border: filterOrderStatus === status ? `1px solid ${ORDER_STATUS_STYLE[status]?.color}` : "1px solid transparent", cursor: "pointer" }}>
            {count} {status}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order code or customer..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
        </div>
        <select value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "150px" }}>
          <option value="">All Payments</option>
          {meta.payment_statuses?.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>No orders found</p>
          <button onClick={() => navigate("/admin/orders/new")} className="btn-luxury btn-luxury-secondary">Create First Order</button>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "rgba(27,77,62,0.04)" }}>
              <tr>
                {["Order", "Customer", "Items", "Amount", "Order Status", "Payment", "Date", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const orderStyle = ORDER_STATUS_STYLE[o.order_status] || ORDER_STATUS_STYLE.pending;
                const payStyle = PAYMENT_STATUS_STYLE[o.payment_status] || PAYMENT_STATUS_STYLE.unpaid;
                return (
                  <tr key={o.id}
                    style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)", cursor: "pointer" }}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", color: "#1B4D3E" }}>{o.order_code}</span>
                      {o.enquiry_id && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>via enquiry</p>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{o.customer_name}</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{o.customer_city || o.customer_country || ""}</p>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.6)" }}>{o.item_count || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "14px", fontWeight: 600, color: "#1B4D3E" }}>₹{(o.total_amount || 0).toLocaleString("en-IN")}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ ...orderStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500 }}>{o.order_status}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ ...payStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500 }}>{o.payment_status}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/admin/orders/${o.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }}>
                        <Eye style={{ width: 15, height: 15 }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
