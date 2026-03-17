import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
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

const AdminMaterialEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState({ material_types: [], units_of_measure: [], fabric_types: [], storage_locations: [], suppliers: [] });
  const [materialCode, setMaterialCode] = useState(null);

  const emptyForm = {
    material_name: "", material_type: "", fabric_type: "", color: "",
    unit_of_measure: "", description: "", weave_type: "", gsm: "",
    origin_region: "", composition: "", fabric_count: "",
    swatch_url: "", current_stock_qty: "", storage_location: "",
    supplier_id: "",
  };
  const [form, setForm] = useState(emptyForm);
  const isFabric = form.material_type === "fabric";

  useEffect(() => { fetchMeta(); if (!isNew) fetchMaterial(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/materials/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchMaterial = async () => {
    try {
      const res = await axios.get(`${API}/admin/materials/${id}`);
      const m = res.data;
      setMaterialCode(m.material_code);
      setForm({
        material_name: m.material_name || "",
        material_type: m.material_type || "",
        fabric_type: m.fabric_type || "",
        color: m.color || "",
        unit_of_measure: m.unit_of_measure || "",
        description: m.description || "",
        weave_type: m.weave_type || "",
        gsm: m.gsm || "",
        origin_region: m.origin_region || "",
        composition: m.composition || "",
        fabric_count: m.fabric_count || "",
        swatch_url: m.swatch_url || "",
        current_stock_qty: m.current_stock_qty ?? "",
        storage_location: m.storage_location || "",
        supplier_id: m.supplier_id || "",
      });
    } catch {
      toast.error("Material not found");
      navigate("/admin/materials");
    } finally { setLoading(false); }
  };

  const setF = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSwatchUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large. Max 5MB.");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(prev => ({ ...prev, swatch_url: res.data.url }));
      toast.success("Swatch uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_name.trim()) return toast.error("Material name is required");
    if (!form.material_type) return toast.error("Material type is required");
    if (!form.unit_of_measure) return toast.error("Unit of measure is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        gsm: form.gsm ? parseFloat(form.gsm) : null,
        current_stock_qty: form.current_stock_qty !== "" ? parseFloat(form.current_stock_qty) : null,
        supplier_id: form.supplier_id || null,
        fabric_count: isFabric ? (form.fabric_count || null) : null,
      };
      if (isNew) {
        const res = await axios.post(`${API}/admin/materials`, payload);
        toast.success(`Material created — ${res.data.material_code}`);
        navigate(`/admin/materials/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/materials/${id}`, payload);
        toast.success("Material updated");
        navigate(`/admin/materials/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "New Material" : "Edit Material"}
          </h1>
          {materialCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{materialCode}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Basic Info */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Basic Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Material Name" required>
                  <Input value={form.material_name} onChange={setF("material_name")} style={inp} required placeholder="e.g. Tussar Silk Grey" />
                </Field>
              </div>
              <Field label="Material Type" required>
                <select value={form.material_type} onChange={setF("material_type")} required style={sel(!!form.material_type)}>
                  <option value="">Select type...</option>
                  {meta.material_types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Unit of Measure" required>
                <select value={form.unit_of_measure} onChange={setF("unit_of_measure")} required style={sel(!!form.unit_of_measure)}>
                  <option value="">Select unit...</option>
                  {meta.units_of_measure.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Colour">
                <Input value={form.color} onChange={setF("color")} style={inp} placeholder="e.g. Ivory, Deep Red" />
              </Field>
              <Field label="Supplier" hint="Who supplies this material?">
                <select value={form.supplier_id} onChange={setF("supplier_id")} style={sel(!!form.supplier_id)}>
                  <option value="">Select supplier...</option>
                  {(meta.suppliers || []).map(s => <option key={s.id} value={s.id}>{s.supplier_code} — {s.supplier_name}</option>)}
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description">
                  <textarea value={form.description} onChange={setF("description")} placeholder="Optional notes about this material..." style={{ ...inp, width: "100%", minHeight: "70px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
                </Field>
              </div>
            </div>
          </section>

          {/* Fabric Details */}
          {isFabric && (
            <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "4px" }}>Fabric Details</h2>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>These fields are only available for fabric materials.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Fabric Type">
                  <select value={form.fabric_type} onChange={setF("fabric_type")} style={sel(!!form.fabric_type)}>
                    <option value="">Select fabric type...</option>
                    {meta.fabric_types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Weave Type">
                  <Input value={form.weave_type} onChange={setF("weave_type")} style={inp} placeholder="e.g. Plain, Twill, Satin" />
                </Field>
                <Field label="Fabric Count" hint="Weft × Warp e.g. 100×100">
                  <Input value={form.fabric_count} onChange={setF("fabric_count")} style={inp} placeholder="e.g. 100×100, 60×60" />
                </Field>
                <Field label="GSM (Grams per sq metre)">
                  <Input type="number" min="0" value={form.gsm} onChange={setF("gsm")} style={inp} placeholder="e.g. 120" />
                </Field>
                <Field label="Origin Region">
                  <Input value={form.origin_region} onChange={setF("origin_region")} style={inp} placeholder="e.g. Bhagalpur, Varanasi" />
                </Field>
                <Field label="Composition">
                  <Input value={form.composition} onChange={setF("composition")} style={inp} placeholder="e.g. 100% Tussar Silk" />
                </Field>
              </div>
            </section>
          )}

          {/* Stock & Location */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Stock & Location</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Current Stock Qty">
                <Input type="number" min="0" step="0.01" value={form.current_stock_qty} onChange={setF("current_stock_qty")} style={inp} placeholder="0" />
              </Field>
              <Field label="Storage Location">
                <select value={form.storage_location} onChange={setF("storage_location")} style={sel(!!form.storage_location)}>
                  <option value="">Select location...</option>
                  {(meta.storage_locations || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Swatch */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "4px" }}>Material Swatch</h2>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>Upload a photo of the material for reference.</p>
            {form.swatch_url && (
              <div style={{ marginBottom: "16px" }}>
                <img src={form.swatch_url} alt="Swatch" style={{ width: "120px", height: "120px", objectFit: "cover", border: "1px solid rgba(218,203,160,0.3)" }} />
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleSwatchUpload} style={{ display: "none" }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ fontFamily: SANS, fontSize: "13px", padding: "10px 20px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", cursor: "pointer", opacity: uploading ? 0.5 : 1 }}>
              {uploading ? "Uploading..." : form.swatch_url ? "Replace Swatch" : "Upload Swatch Image"}
            </button>
            <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "8px" }}>JPG or PNG. Max 5MB.</p>
          </section>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Material" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/materials" : `/admin/materials/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminMaterialEdit;
