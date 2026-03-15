import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const Field = ({ label, required, children }) => (
  <div>
    <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>
      {label}{required && <span style={{ color: "#C08081", marginLeft: "4px" }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = { fontFamily: SANS, fontSize: "14px" };

const AdminSupplierEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ supplier_types: [], payment_terms: [] });
  const [supplierCode, setSupplierCode] = useState(null);

  const emptyForm = {
    supplier_name: "", supplier_type: "", contact_person: "", phone: "",
    alternate_phone: "", email: "", address_line_1: "", address_line_2: "",
    city: "", state: "", country: "India", gst_number: "",
    payment_terms: "", lead_time_days: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchMeta();
    if (!isNew) fetchSupplier();
  }, [id]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/suppliers/meta`);
      setMeta(res.data);
    } catch {}
  };

  const fetchSupplier = async () => {
    try {
      const res = await axios.get(`${API}/admin/suppliers/${id}`);
      const s = res.data;
      setSupplierCode(s.supplier_code);
      setForm({
        supplier_name: s.supplier_name || "",
        supplier_type: s.supplier_type || "",
        contact_person: s.contact_person || "",
        phone: s.phone || "",
        alternate_phone: s.alternate_phone || "",
        email: s.email || "",
        address_line_1: s.address_line_1 || "",
        address_line_2: s.address_line_2 || "",
        city: s.city || "",
        state: s.state || "",
        country: s.country || "India",
        gst_number: s.gst_number || "",
        payment_terms: s.payment_terms || "",
        lead_time_days: s.lead_time_days || "",
        notes: s.notes || "",
      });
    } catch {
      toast.error("Supplier not found");
      navigate("/admin/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_name.trim()) return toast.error("Supplier name is required");
    if (!form.supplier_type) return toast.error("Please select a supplier type");
    setSaving(true);
    try {
      const payload = { ...form, lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null };
      if (isNew) {
        const res = await axios.post(`${API}/admin/suppliers`, payload);
        toast.success(`Supplier created — ${res.data.supplier_code}`);
        navigate(`/admin/suppliers/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/suppliers/${id}`, payload);
        toast.success("Supplier updated");
        navigate(`/admin/suppliers/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: "48px", background: "rgba(218,203,160,0.1)" }} />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "Add Supplier" : "Edit Supplier"}
          </h1>
          {supplierCode && (
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{supplierCode}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Basic Information */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Basic Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Supplier Name" required>
                  <Input value={form.supplier_name} onChange={set("supplier_name")} style={inputStyle} required placeholder="e.g. Ramesh Textiles" />
                </Field>
              </div>
              <Field label="Supplier Type" required>
                <select value={form.supplier_type} onChange={set("supplier_type")} required style={{ ...inputStyle, width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: form.supplier_type ? "#1B4D3E" : "rgba(27,77,62,0.4)" }}>
                  <option value="">Select type...</option>
                  {meta.supplier_types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Contact Person">
                <Input value={form.contact_person} onChange={set("contact_person")} style={inputStyle} placeholder="Name of primary contact" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={set("phone")} style={inputStyle} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Alternate Phone">
                <Input value={form.alternate_phone} onChange={set("alternate_phone")} style={inputStyle} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set("email")} style={inputStyle} placeholder="supplier@example.com" />
              </Field>
            </div>
          </section>

          {/* Address */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Address</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address Line 1">
                  <Input value={form.address_line_1} onChange={set("address_line_1")} style={inputStyle} placeholder="Street address, building name" />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address Line 2">
                  <Input value={form.address_line_2} onChange={set("address_line_2")} style={inputStyle} placeholder="Area, locality" />
                </Field>
              </div>
              <Field label="City">
                <Input value={form.city} onChange={set("city")} style={inputStyle} placeholder="Kolkata" />
              </Field>
              <Field label="State">
                <Input value={form.state} onChange={set("state")} style={inputStyle} placeholder="West Bengal" />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={set("country")} style={inputStyle} />
              </Field>
            </div>
          </section>

          {/* Business Details */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Business Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="GST Number">
                <Input value={form.gst_number} onChange={set("gst_number")} style={inputStyle} placeholder="22AAAAA0000A1Z5" />
              </Field>
              <Field label="Payment Terms">
                <select value={form.payment_terms} onChange={set("payment_terms")} style={{ ...inputStyle, width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: form.payment_terms ? "#1B4D3E" : "rgba(27,77,62,0.4)" }}>
                  <option value="">Select payment terms...</option>
                  {meta.payment_terms.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Lead Time (Days)">
                <Input type="number" min="0" value={form.lead_time_days} onChange={set("lead_time_days")} style={inputStyle} placeholder="e.g. 14" />
              </Field>
            </div>
          </section>

          {/* Notes */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Notes</h2>
            <Field label="Internal Notes">
              <Textarea value={form.notes} onChange={set("notes")} style={{ ...inputStyle, minHeight: "100px" }} placeholder="Any internal notes about this supplier — specialisations, quality notes, history..." />
            </Field>
          </section>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Supplier" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/suppliers" : `/admin/suppliers/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSupplierEdit;
