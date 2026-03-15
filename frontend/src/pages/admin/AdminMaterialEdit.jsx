import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const Field = ({ label, required, hint, children }) => (
  <div>
    <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>
      {label}{required && <span style={{ color: "#C08081", marginLeft: "4px" }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "4px" }}>{hint}</p>}
  </div>
);

const selectStyle = (hasValue) => ({
  fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px",
  padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)",
  background: "white", color: hasValue ? "#1B4D3E" : "rgba(27,77,62,0.4)",
});

const inputStyle = { fontFamily: SANS, fontSize: "14px" };

const AdminMaterialEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ material_types: [], units_of_measure: [], fabric_types: [] });
  const [materialCode, setMaterialCode] = useState(null);

  const emptyForm = {
    material_name: "", material_type: "", fabric_type: "",
    color: "", unit_of_measure: "", description: "",
    weave_type: "", gsm: "", origin_region: "", composition: "",
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
      });
    } catch {
      toast.error("Material not found");
      navigate("/admin/materials");
    } finally { setLoading(false); }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_name.trim()) return toast.error("Material name is required");
    if (!form.material_type) return toast.error("Please select a material type");
    if (!form.unit_of_measure) return toast.error("Please select a unit of measure");
    setSaving(true);
    try {
      const payload = {
        ...form,
        gsm: form.gsm ? parseFloat(form.gsm) : null,
        fabric_type: isFabric ? form.fabric_type || null : null,
        weave_type: isFabric ? form.weave_type || null : null,
        origin_region: isFabric ? form.origin_region || null : null,
        composition: isFabric ? form.composition || null : null,
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
      toast.error(err.response?.data?.detail || "Failed to save material");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "Add Material" : "Edit Material"}
          </h1>
          {materialCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{materialCode}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Basic Info */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Basic Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Material Name" required>
                  <Input value={form.material_name} onChange={set("material_name")} style={inputStyle} required placeholder="e.g. Ivory Tussar Silk" />
                </Field>
              </div>
              <Field label="Material Type" required hint="Controls which additional fields are shown">
                <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value, fabric_type: "", weave_type: "", gsm: "", origin_region: "", composition: "" })} required style={selectStyle(!!form.material_type)}>
                  <option value="">Select type...</option>
                  {meta.material_types.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Unit of Measure" required hint="Cannot be changed after purchases are linked">
                <select value={form.unit_of_measure} onChange={set("unit_of_measure")} required style={selectStyle(!!form.unit_of_measure)}>
                  <option value="">Select unit...</option>
                  {meta.units_of_measure.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Colour">
                <Input value={form.color} onChange={set("color")} style={inputStyle} placeholder="e.g. Ivory, Rust, Black" />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description">
                  <textarea value={form.description} onChange={set("description")} placeholder="Any notes about this material..." style={{ ...inputStyle, width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
                </Field>
              </div>
            </div>
          </section>

          {/* Fabric-specific — only shown when material_type = fabric */}
          {isFabric && (
            <section style={{ background: "white", border: "1px solid rgba(27,77,62,0.1)", padding: "24px", borderLeft: "3px solid rgba(27,77,62,0.3)" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "6px" }}>Fabric Details</h2>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>These fields are only available for fabric materials.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Fabric Type">
                  <select value={form.fabric_type} onChange={set("fabric_type")} style={selectStyle(!!form.fabric_type)}>
                    <option value="">Select fabric type...</option>
                    {meta.fabric_types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Weave Type">
                  <Input value={form.weave_type} onChange={set("weave_type")} style={inputStyle} placeholder="e.g. Plain, Twill, Satin" />
                </Field>
                <Field label="GSM (grams per sq metre)">
                  <Input type="number" min="0" step="0.1" value={form.gsm} onChange={set("gsm")} style={inputStyle} placeholder="e.g. 120" />
                </Field>
                <Field label="Origin Region">
                  <Input value={form.origin_region} onChange={set("origin_region")} style={inputStyle} placeholder="e.g. Bhagalpur, Varanasi" />
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Composition">
                    <Input value={form.composition} onChange={set("composition")} style={inputStyle} placeholder="e.g. 100% Tussar Silk, 60% Cotton 40% Silk" />
                  </Field>
                </div>
              </div>
            </section>
          )}

          {/* Actions */}
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
