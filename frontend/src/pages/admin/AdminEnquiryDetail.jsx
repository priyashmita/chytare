import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Edit, ArrowLeft, ShoppingBag, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const STATUS_STYLE = {
  new:         { bg: "rgba(27,77,62,0.08)",     color: "#1B4D3E" },
  contacted:   { bg: "rgba(218,203,160,0.25)",  color: "#8a7340" },
  negotiating: { bg: "rgba(100,120,200,0.1)",   color: "#3a4a9a" },
  converted:   { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d" },
  closed:      { bg: "rgba(192,128,129,0.12)",  color: "#8a4445" },
};

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.12)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "160px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.6 }}>{value}</span>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
  </div>
);

const AdminEnquiryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [convertForm, setConvertForm] = useState({ agreed_price: "", currency: "INR", notes: "" });
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => { fetchEnquiry(); }, [id]);

  const fetchEnquiry = async () => {
    try {
      const res = await axios.get(`${API}/admin/enquiries/detail/${id}`);
      setEnquiry(res.data);
    } catch {
      toast.error("Enquiry not found");
      navigate("/admin/enquiries");
    } finally { setLoading(false); }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await axios.put(`${API}/admin/enquiries/${id}/update`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchEnquiry();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setStatusUpdating(false); }
  };

  const handleConvert = async () => {
    if (!convertForm.agreed_price || parseFloat(convertForm.agreed_price) <= 0) return toast.error("Enter agreed price");
    setConverting(true);
    try {
      const res = await axios.post(`${API}/admin/enquiries/${id}/convert`, {
        agreed_price: parseFloat(convertForm.agreed_price),
        currency: convertForm.currency,
        notes: convertForm.notes || null,
      });
      toast.success(res.data.message);
      setShowConvertForm(false);
      fetchEnquiry();
    } catch (err) { toast.error(err.response?.data?.detail || "Conversion failed"); }
    finally { setConverting(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  if (!enquiry) return null;

  const statusStyle = STATUS_STYLE[enquiry.status] || STATUS_STYLE.new;
  const product = enquiry._product || {};
  const order = enquiry._order || {};
  const canConvert = ["new", "contacted", "negotiating"].includes(enquiry.status);
  const history = enquiry.status_history || [];

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>

        <button onClick={() => navigate("/admin/enquiries")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Enquiries
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{enquiry.enquiry_code || enquiry.id?.slice(0,8).toUpperCase()}</span>
              <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{enquiry.status}</span>
              <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(218,203,160,0.15)", color: "rgba(27,77,62,0.6)", padding: "2px 8px", textTransform: "capitalize" }}>{enquiry.enquiry_source || "website"}</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{enquiry.customer_name}</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{enquiry.product_name || "General enquiry"}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {enquiry.status !== "converted" && enquiry.status !== "closed" && (
              <button onClick={() => navigate(`/admin/enquiries/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <Edit style={{ width: 14, height: 14 }} /> Edit
              </button>
            )}
            {canConvert && (
              <button onClick={() => setShowConvertForm(!showConvertForm)} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <ShoppingBag style={{ width: 14, height: 14 }} /> Convert to Order
              </button>
            )}
          </div>
        </div>

        {/* Convert to Order Form */}
        {showConvertForm && (
          <div style={{ background: "rgba(27,77,62,0.03)", border: "2px solid rgba(27,77,62,0.15)", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>Convert to Order</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Agreed Price <span style={{ color: "#C08081" }}>*</span></label>
                <Input type="number" min="1" value={convertForm.agreed_price} onChange={(e) => setConvertForm({ ...convertForm, agreed_price: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} placeholder="e.g. 45000" />
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Currency</label>
                <select value={convertForm.currency} onChange={(e) => setConvertForm({ ...convertForm, currency: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E" }}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Notes</label>
                <Input value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} placeholder="Optional order notes" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleConvert} disabled={converting} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", opacity: converting ? 0.5 : 1 }}>
                <CheckCircle style={{ width: 15, height: 15 }} />
                {converting ? "Converting..." : "Confirm Conversion"}
              </button>
              <button onClick={() => setShowConvertForm(false)} className="btn-luxury btn-luxury-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Converted order banner */}
        {enquiry.status === "converted" && order.order_code && (
          <div style={{ background: "rgba(100,160,100,0.08)", border: "1px solid rgba(100,160,100,0.3)", padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "13px", color: "#2d6e2d", fontWeight: 500 }}>✓ Converted to Order</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.6)", marginTop: "4px" }}>{order.order_code} · ₹{order.agreed_price?.toLocaleString("en-IN")}</p>
            </div>
            <button onClick={() => navigate(`/admin/orders/${enquiry.order_id}`)} style={{ fontFamily: SANS, fontSize: "12px", color: "#2d6e2d", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              View Order →
            </button>
          </div>
        )}

        {/* Quick status update */}
        {enquiry.status !== "converted" && (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Update Status:</span>
            {["new", "contacted", "negotiating", "closed"].filter(s => s !== enquiry.status).map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} disabled={statusUpdating}
                style={{ fontFamily: SANS, fontSize: "12px", padding: "6px 12px", background: "rgba(27,77,62,0.05)", border: "1px solid rgba(218,203,160,0.4)", color: "#1B4D3E", cursor: "pointer", textTransform: "capitalize", opacity: statusUpdating ? 0.5 : 1 }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Customer */}
        <Card title="Customer Information">
          <InfoRow label="Name" value={enquiry.customer_name} />
          <InfoRow label="Email" value={enquiry.customer_email} />
          <InfoRow label="Phone" value={enquiry.customer_phone} />
          <InfoRow label="City" value={enquiry.customer_city} />
          <InfoRow label="Country" value={enquiry.customer_country} />
        </Card>

        {/* Enquiry */}
        <Card title="Enquiry Details">
          <InfoRow label="Enquiry Code" value={enquiry.enquiry_code} />
          <InfoRow label="Source" value={enquiry.enquiry_source} />
          <InfoRow label="Product" value={enquiry.product_name} />
          {product.product_code && <InfoRow label="Product Code" value={product.product_code} />}
          <InfoRow label="Message" value={enquiry.message} />
          {enquiry.occasion && <InfoRow label="Occasion" value={enquiry.occasion} />}
          {enquiry.internal_notes && <InfoRow label="Internal Notes" value={enquiry.internal_notes} />}
        </Card>

        {/* Status History */}
        {history.length > 0 && (
          <Card title="Status History">
            {[...history].reverse().map((h, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ ...STATUS_STYLE[h.status], fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500, flexShrink: 0 }}>{h.status}</span>
                <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                  {h.changed_at ? new Date(h.changed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  {h.changed_by && ` · ${h.changed_by}`}
                </span>
              </div>
            ))}
          </Card>
        )}

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
            Received {enquiry.created_at ? new Date(enquiry.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
          </p>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminEnquiryDetail;
