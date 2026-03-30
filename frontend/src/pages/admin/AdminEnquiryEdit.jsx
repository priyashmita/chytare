import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
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

const AdminEnquiryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ sources: [], statuses: [], products: [], admins: [] });
  const [enquiryCode, setEnquiryCode] = useState(null);

  const emptyForm = {
    product_id: "", customer_name: "", customer_email: "",
    customer_phone: "", customer_city: "", customer_country: "India",
    message: "", enquiry_source: "website", assigned_to: "",
    internal_notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchMeta(); if (!isNew) fetchEnquiry(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/enquiries/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchEnquiry = async () => {
    try {
      const res = await axios.get(`${API}/admin/enquiries/detail/${id}`);
      const e = res.data;
      setEnquiryCode(e.enquiry_code);
      setForm({
        product_id: e.product_id || "",
        customer_name: e.customer_name || e.name || "",
        customer_email: e.customer_email || e.email || "",
        customer_phone: e.customer_phone || e.phone || "",
        customer_city: e.customer_city || e.country_city || "",
        customer_country: e.customer_country || "India",
        message: e.message || "",
        enquiry_source: e.enquiry_source || "website",
        assigned_to: e.assigned_to || "",
        internal_notes: e.internal_notes || "",
      });
    } catch {
      toast.error("Enquiry not found");
      navigate("/admin/enquiries");
    } finally { setLoading(false); }
  };

  const setF = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.customer_email && !form.customer_phone) return toast.error("At least one contact field (email or phone) is required");
    if (!form.message.trim()) return toast.error("Message is required");
    setSaving(true);
    try {
      const payload = { ...form, assigned_to: form.assigned_to || null, product_id: form.product_id || null };
      if (isNew) {
        const res = await axios.post(`${API}/admin/enquiries/create`, payload);
        toast.success(`Enquiry created — ${res.data.enquiry_code}`);
        navigate(`/admin/enquiries/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/enquiries/${id}/update`, payload);
        toast.success("Enquiry updated");
        navigate(`/admin/enquiries/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  return (
    
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "New Enquiry" : "Edit Enquiry"}
          </h1>
          {enquiryCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{enquiryCode}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Product */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Product Interest</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Product" hint="Leave blank for general enquiries">
                  <select value={form.product_id} onChange={setF("product_id")} style={sel(!!form.product_id)}>
                    <option value="">General enquiry (no specific product)</option>
                    {meta.products.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Source" required hint="How did this enquiry come in?">
                <select value={form.enquiry_source} onChange={setF("enquiry_source")} required style={sel(!!form.enquiry_source)}>
                  {meta.sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Assigned To">
                <select value={form.assigned_to} onChange={setF("assigned_to")} style={sel(!!form.assigned_to)}>
                  <option value="">Unassigned</option>
                  {meta.admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Customer */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Customer Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Customer Name" required>
                  <Input value={form.customer_name} onChange={setF("customer_name")} style={inp} required placeholder="Full name" />
                </Field>
              </div>
              <Field label="Email" hint="At least email or phone is required">
                <Input type="email" value={form.customer_email} onChange={setF("customer_email")} style={inp} placeholder="customer@example.com" />
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

          {/* Message */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Message & Notes</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Customer Message" required>
                <textarea value={form.message} onChange={setF("message")} required placeholder="What the customer said..." style={{ ...inp, width: "100%", minHeight: "100px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
              </Field>
              <Field label="Internal Notes" hint="Not visible to customer">
                <textarea value={form.internal_notes} onChange={setF("internal_notes")} placeholder="Your internal notes about this enquiry..." style={{ ...inp, width: "100%", minHeight: "60px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
              </Field>
            </div>
          </section>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Enquiry" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/enquiries" : `/admin/enquiries/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    
  );
};

export default AdminEnquiryEdit;
