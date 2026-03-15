import { useEffect, useState } from "react";
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

const sel = (hasValue) => ({
  fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px",
  padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)",
  background: "white", color: hasValue ? "#1B4D3E" : "rgba(27,77,62,0.4)",
});

const inp = { fontFamily: SANS, fontSize: "14px" };

const AdminProductionJobEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ statuses: [], products: [], suppliers: [] });
  const [jobCode, setJobCode] = useState(null);

  const emptyForm = {
    product_id: "", supplier_id: "", quantity_planned: "",
    start_date: "", due_date: "", notes: "",
    work_type: "", parent_job_id: "", sequence_number: "", stage_group_id: "",
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchMeta(); if (!isNew) fetchJob(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/production-jobs/full-meta`); setMeta(res.data); }
    catch {}
  };

  const fetchJob = async () => {
    try {
      const res = await axios.get(`${API}/admin/production-jobs/${id}`);
      const j = res.data;
      setJobCode(j.job_code);
      setForm({
        product_id: j.product_id || "",
        supplier_id: j.supplier_id || "",
        quantity_planned: j.quantity_planned || "",
        start_date: j.start_date || "",
        due_date: j.due_date || "",
        notes: j.notes || "",
        work_type: j.work_type || "",
        parent_job_id: j.parent_job_id || "",
        sequence_number: j.sequence_number || "",
        stage_group_id: j.stage_group_id || "",
      });
    } catch {
      toast.error("Job not found");
      navigate("/admin/production-jobs");
    } finally { setLoading(false); }
  };

  const setF = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) return toast.error("Please select a product");
    if (!form.supplier_id) return toast.error("Please select a supplier");
    if (!form.quantity_planned || parseInt(form.quantity_planned) <= 0) return toast.error("Quantity must be greater than 0");
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity_planned: parseInt(form.quantity_planned),
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
        work_type: form.work_type || null,
        parent_job_id: form.parent_job_id || null,
        sequence_number: form.sequence_number ? parseInt(form.sequence_number) : null,
        stage_group_id: form.stage_group_id || null,
      };
      if (isNew) {
        const res = await axios.post(`${API}/admin/production-jobs`, payload);
        toast.success(`Job created — ${res.data.job_code}`);
        navigate(`/admin/production-jobs/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/production-jobs/${id}`, payload);
        toast.success("Job updated");
        navigate(`/admin/production-jobs/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save job");
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
            {isNew ? "New Production Job" : "Edit Production Job"}
          </h1>
          {jobCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{jobCode}</p>}
          {isNew && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>Job code will be auto-generated on save (e.g. JOB-001)</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Product & Supplier */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Job Assignment</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Product" required hint="Only active products from Product Master are shown">
                  <select value={form.product_id} onChange={setF("product_id")} required style={sel(!!form.product_id)}>
                    <option value="">Select product...</option>
                    {meta.products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Supplier / Artisan Unit" required hint="Only active suppliers are shown">
                  <select value={form.supplier_id} onChange={setF("supplier_id")} required style={sel(!!form.supplier_id)}>
                    <option value="">Select supplier...</option>
                    {meta.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supplier_code} — {s.supplier_name} ({s.supplier_type})</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </section>

          {/* Work Type */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Work Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Work Type" hint="Type of work being performed by this supplier">
                <select value={form.work_type} onChange={setF("work_type")} style={sel(!!form.work_type)}>
                  <option value="">Select work type...</option>
                  {(meta.work_types || []).map(w => <option key={w} value={w}>{w.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
                </select>
              </Field>
              <Field label="Sequence Number" hint="Order in multi-step production chain (e.g. 1 = first step)">
                <Input type="number" min="1" value={form.sequence_number} onChange={setF("sequence_number")} style={inp} placeholder="e.g. 1" />
              </Field>
              <Field label="Parent Job" hint="If this job follows another, select the preceding job">
                <select value={form.parent_job_id} onChange={setF("parent_job_id")} style={sel(!!form.parent_job_id)}>
                  <option value="">No parent (first step)</option>
                  {(meta.jobs || []).filter(j => j.id !== (id === "new" ? null : id)).map(j => (
                    <option key={j.id} value={j.id}>{j.job_code} — {j.product_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Stage Group ID" hint="Link related jobs with a shared group ID (auto-fill or type)">
                <Input value={form.stage_group_id} onChange={setF("stage_group_id")} style={inp} placeholder="e.g. SGP-001 (leave blank to auto-assign)" />
              </Field>
            </div>
          </section>

          {/* Quantity & Timeline */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Quantity & Timeline</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Quantity Planned" required hint="Number of pieces to be produced">
                <Input type="number" min="1" value={form.quantity_planned} onChange={setF("quantity_planned")} style={inp} required placeholder="e.g. 5" />
              </Field>
              <div /> {/* spacer */}
              <Field label="Start Date">
                <Input type="date" value={form.start_date} onChange={setF("start_date")} style={inp} />
              </Field>
              <Field label="Due Date">
                <Input type="date" value={form.due_date} onChange={setF("due_date")} style={inp} />
              </Field>
            </div>
          </section>

          {/* Notes */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Notes</h2>
            <textarea value={form.notes} onChange={setF("notes")} placeholder="Any instructions for the supplier, special requirements..." style={{ ...inp, width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
          </section>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Job" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/production-jobs" : `/admin/production-jobs/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>

          {isNew && (
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
              New jobs are created in <strong>Planned</strong> status. Start them when production begins, and mark complete when finished goods are ready.
            </p>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProductionJobEdit;
