import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const Field = ({ label, required, hint, children, span }) => (
  <div style={span ? { gridColumn: "1 / -1" } : {}}>
    <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>
      {label}{required && <span style={{ color: "#C08081", marginLeft: "4px" }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "4px" }}>{hint}</p>}
  </div>
);

const sel = (v) => ({ fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: v ? "#1B4D3E" : "rgba(27,77,62,0.4)" });
const inp = { fontFamily: SANS, fontSize: "14px" };

const AdminOrderEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === "new";
  const prefillEnquiry = searchParams.get("enquiry");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ products: [], order_statuses: [], payment_statuses: [] });
  const [orderCode, setOrderCode] = useState(null);

  const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "CAD", "AUD"];
  const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED ", SGD: "S$", CAD: "CA$", AUD: "A$" };
  const CHANNELS = ["online", "showroom", "offline", "phone"];

  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    customer_city: "", customer_country: "India",
    notes: "", enquiry_id: prefillEnquiry || "",
    currency: "INR", exchange_rate_to_inr: 1, channel: "online",
  });

  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: "" }]);

  useEffect(() => { fetchMeta(); if (!isNew) fetchOrder(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/orders/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API}/admin/orders/${id}`);
      const o = res.data;
      setOrderCode(o.order_code);
      setForm({
        customer_name: o.customer_name || "",
        customer_email: o.customer_email || "",
        customer_phone: o.customer_phone || "",
        customer_city: o.customer_city || "",
        customer_country: o.customer_country || "India",
        notes: o.notes || "",
        enquiry_id: o.enquiry_id || "",
        currency: o.currency || "INR",
        exchange_rate_to_inr: o.exchange_rate_to_inr || 1,
        channel: o.channel || "online",
      });
      if (o.items?.length) {
        setItems(o.items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })));
      }
    } catch {
      toast.error("Order not found");
      navigate("/admin/orders");
    } finally { setLoading(false); }
  };

  const setF = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const updateItem = (idx, field, val) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    // Auto-fill price from product
    if (field === "product_id") {
      const product = meta.products.find(p => p.id === val);
      if (product?.price) updated[idx].unit_price = product.price;
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { product_id: "", quantity: 1, unit_price: "" }]);
  const removeItem = (idx) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const totalAmount = items.reduce((sum, item) => {
    const q = parseInt(item.quantity) || 0;
    const p = parseFloat(item.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (items.some(i => !i.product_id)) return toast.error("Please select a product for all items");
    if (items.some(i => parseInt(i.quantity) <= 0)) return toast.error("All quantities must be > 0");
    if (items.some(i => parseFloat(i.unit_price) <= 0)) return toast.error("All prices must be > 0");

    setSaving(true);
    try {
      const payload = {
        ...form,
        enquiry_id: form.enquiry_id || null,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price),
        })),
      };
      if (isNew) {
        const res = await axios.post(`${API}/admin/orders`, payload);
        toast.success(`Order created — ${res.data.order_code}`);
        navigate(`/admin/orders/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/orders/${id}`, { ...form });
        toast.success("Order updated");
        navigate(`/admin/orders/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save order");
    } finally { setSaving(false); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  return (
    
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "New Order" : "Edit Order"}
          </h1>
          {orderCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{orderCode}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Order Items */}
          {isNew && (
            <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Order Items</h2>
              {items.map((item, idx) => {
                const product = meta.products.find(p => p.id === item.product_id);
                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", marginBottom: "12px", alignItems: "end" }}>
                    <div>
                      {idx === 0 && <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Product <span style={{ color: "#C08081" }}>*</span></label>}
                      <select value={item.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)} required style={sel(!!item.product_id)}>
                        <option value="">Select product...</option>
                        {meta.products.map(p => (
                          <option key={p.id} value={p.id}>{p.product_code} — {p.product_name} (Stock: {p.available_stock})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Qty</label>}
                      <Input type="number" min="1" max={product?.available_stock} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} style={inp} />
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Unit Price ({CURRENCY_SYMBOLS[form.currency] || form.currency})</label>}
                      <Input type="number" min="1" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} style={inp} placeholder="0" />
                    </div>
                    <div>
                      {idx === 0 && <div style={{ marginBottom: "6px", height: "17px" }} />}
                      <button type="button" onClick={() => removeItem(idx)} style={{ padding: "9px", color: "#C08081", background: "none", border: "1px solid rgba(192,128,129,0.3)", cursor: "pointer" }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addItem} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", background: "rgba(27,77,62,0.05)", border: "1px solid rgba(218,203,160,0.4)", padding: "8px 16px", cursor: "pointer", marginTop: "8px" }}>
                <Plus style={{ width: 14, height: 14 }} /> Add Item
              </button>
              {totalAmount > 0 && (
                <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(27,77,62,0.04)", borderTop: "2px solid rgba(218,203,160,0.3)" }}>
                  <p style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 600 }}>
                    Total: {CURRENCY_SYMBOLS[form.currency] || form.currency}{totalAmount.toLocaleString("en-IN")}
                    {form.currency !== "INR" && form.exchange_rate_to_inr > 0 && (
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", fontWeight: 400, marginLeft: "10px" }}>
                        ≈ ₹{(totalAmount * parseFloat(form.exchange_rate_to_inr || 1)).toLocaleString("en-IN")} INR
                      </span>
                    )}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Customer */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Customer Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Customer Name" required>
                  <Input value={form.customer_name} onChange={setF("customer_name")} style={inp} required placeholder="Full name" />
                </Field>
              </div>
              <Field label="Email">
                <Input type="email" value={form.customer_email} onChange={setF("customer_email")} style={inp} placeholder="email@example.com" />
              </Field>
              <Field label="Phone">
                <Input value={form.customer_phone} onChange={setF("customer_phone")} style={inp} placeholder="+91 98765 43210" />
              </Field>
              <Field label="City">
                <Input value={form.customer_city} onChange={setF("customer_city")} style={inp} placeholder="Mumbai" />
              </Field>
              <Field label="Country">
                <Input value={form.customer_country} onChange={setF("customer_country")} style={inp} />
              </Field>
            </div>
          </section>

          {/* Currency & Channel */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Currency & Channel</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <Field label="Currency">
                <select value={form.currency} onChange={setF("currency")} style={sel(true)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Exchange Rate to INR" hint={form.currency === "INR" ? "Always 1 for INR" : "e.g. 84 for 1 USD = ₹84"}>
                <Input type="number" step="0.01" min="0.01" value={form.exchange_rate_to_inr} onChange={setF("exchange_rate_to_inr")} style={inp} disabled={form.currency === "INR"} />
              </Field>
              <Field label="Sales Channel">
                <select value={form.channel} onChange={setF("channel")} style={sel(true)}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Notes */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Notes</h2>
            <textarea value={form.notes} onChange={setF("notes")} placeholder="Any order notes..." style={{ ...inp, width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
          </section>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Order" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/orders" : `/admin/orders/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>

          {isNew && (
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
              Creating this order will <strong>deduct finished goods from inventory</strong> automatically.
            </p>
          )}
        </form>
      </div>
    
  );
};

export default AdminOrderEdit;
