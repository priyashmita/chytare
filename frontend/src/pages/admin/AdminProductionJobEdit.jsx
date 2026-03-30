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

const AdminProductionJobEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ products: [], suppliers: [], work_types: [], statuses: [] });
  const [jobCode, setJobCode] = useState(null);

  const empty = {
    product_id: "", supplier_id: "", quantity_planned: "",
    work_type: "", start_date: "", proposed_end_date: "", due_date: "",
    sequence_number: "", parent_job_id: "",
    cost_to_pay: "", amount_paid: "", payment_date: "", payment_notes: "",
    incentive_amount: "", incentive_reason: "",
    notes: "",
  };
  const [form, setForm] = useState(empty);

  useEffect(() => { fetchMeta(); if (!isNew) fetchJob(); }, [id]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/production-jobs/meta`);
      setMeta(res.data);
    } catch {}
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
        work_type: j.work_type || "",
        start_date: j.start_date || "",
        proposed_end_date: j.proposed_end_date || "",
        due_date: j.due_date || "",
        sequence_number: j.sequence_number || "",
        parent_job_id: j.parent_job_id || "",
        cost_to_pay: j.cost_to_pay ?? "",
        amount_paid: j.amount_paid ?? "",
        payment_date: j.payment_date || "",
        payment_notes: j.payment_notes || "",
        incentive_amount: j.incentive_amount ?? "",
        incentive_reason: j.incentive_reason || "",
        notes: j.notes || "",
      });
    } catch {
      toast.error("Job not found");
      navigate("/admin/production-jobs");
    } finally { setLoading(false); }
  };

  const setF = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id) return toast.error("Product is required");
    if (!form.supplier_id) return toast.error("Supplier is required");
    if (!form.quantity_planned || parseInt(form.quantity_planned) <= 0) return toast.error("Quantity must be > 0");
    setSaving(true);
    try {
      const payload = {
        product_id: form.product_id,
        supplier_id: form.supplier_id,
        quantity_planned: parseInt(form.quantity_planned),
        work_type: form.work_type || null,
        start_date: form.start_date || null,
        proposed_end_date: form.proposed_end_date || null,
        due_date: form.due_date || null,
        sequence_number: form.sequence_number ? parseInt(form.sequence_number) : null,
        parent_job_id: form.parent_job_id || null,
        cost_to_pay: form.cost_to_pay !== "" ? parseFloat(form.cost_to_pay) : null,
        amount_paid: form.amount_paid !== "" ? parseFloat(form.amount_paid) : null,
        payment_date: form.payment_date || null,
        payment_notes: form.payment_notes || null,
        incentive_amount: form.incentive_amount !== "" ? parseFloat(form.incentive_amount) : null,
        incentive_reason: form.incentive_reason || null,
        notes: form.notes || null,
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
      toast.error(err.response?.data?.detail || "Failed to save");
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
            {isNew ? "New Production Job" : "Edit Production Job"}
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>
            {jobCode || "Job code will be auto-generated on save (e.g. JOB-001)"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Job Assignment */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Job Assignment</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
              <Field label="Product" required hint="Active and draft products from Product Master">
                <select value={form.product_id} onChange={setF("product_id")} required style={sel(!!form.product_id)}>
                  <option value="">Select product...</option>
                  {meta.products?.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_code} — {p.product_name} {p.status === "draft" ? "(draft)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supplier / Artisan Unit" required hint="Only active suppliers are shown">
                <select value={form.supplier_id} onChange={setF("supplier_id")} required style={sel(!!form.supplier_id)}>
                  <option value="">Select supplier...</option>
                  {meta.suppliers?.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_code} — {s.supplier_name} ({s.supplier_type})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Work Details */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Work Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Work Type">
                <select value={form.work_type} onChange={setF("work_type")} style={sel(!!form.work_type)}>
                  <option value="">Select work type...</option>
                  {(meta.work_types || []).map(w => <option key={w} value={w}>{w.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </Field>
              <Field label="Quantity Planned" required>
                <Input type="number" min="1" value={form.quantity_planned} onChange={setF("quantity_planned")} style={inp} placeholder="e.g. 5" required />
              </Field>
              <Field label="Sequence Number" hint="Order in multi-step production chain (e.g. 1 = first step)">
                <Input type="number" min="1" value={form.sequence_number} onChange={setF("sequence_number")} style={inp} placeholder="e.g. 1" />
              </Field>
              <Field label="Parent Job" hint="Multi-step production: e.g. JOB-001=weaving → JOB-002=embroidery (parent=JOB-001) → JOB-003=finishing (parent=JOB-002). Parent = the immediately previous step.">
                <select value={form.parent_job_id} onChange={setF("parent_job_id")} style={sel(!!form.parent_job_id)}>
                  <option value="">None (this is the first step)</option>
                  {meta.jobs?.filter(j => j.id !== id).map(j => (
                    <option key={j.id} value={j.id}>{j.job_code} — {j.product_name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Timeline */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Timeline</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <Field label="Start Date">
                <Input type="date" value={form.start_date} onChange={setF("start_date")} style={inp} />
              </Field>
              <Field label="Proposed End Date" hint="Expected completion — used for tracking">
                <Input type="date" value={form.proposed_end_date} onChange={setF("proposed_end_date")} style={inp} />
              </Field>
              <Field label="Due Date" hint="Hard deadline">
                <Input type="date" value={form.due_date} onChange={setF("due_date")} style={inp} />
              </Field>
            </div>
          </section>

          {/* Cost & Payment */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "4px" }}>Cost & Payment</h2>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>All fields optional. Cost feeds into product margin analysis.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Cost to Pay (₹)" hint="Agreed amount for this job">
                <Input type="number" min="0" step="0.01" value={form.cost_to_pay} onChange={setF("cost_to_pay")} style={inp} placeholder="e.g. 5000" />
              </Field>
              <Field label="Amount Paid (₹)">
                <Input type="number" min="0" step="0.01" value={form.amount_paid} onChange={setF("amount_paid")} style={inp} placeholder="e.g. 2500" />
              </Field>
              <Field label="Payment Date">
                <Input type="date" value={form.payment_date} onChange={setF("payment_date")} style={inp} />
              </Field>
              <Field label="Payment Notes">
                <Input value={form.payment_notes} onChange={setF("payment_notes")} style={inp} placeholder="e.g. 50% advance paid" />
              </Field>
            </div>
          </section>

          {/* Incentive */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "4px" }}>Incentive</h2>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>Optional bonus for early or exceptional completion.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field label="Incentive Amount (₹)">
                <Input type="number" min="0" step="0.01" value={form.incentive_amount} onChange={setF("incentive_amount")} style={inp} placeholder="e.g. 500" />
              </Field>
              <Field label="Incentive Reason">
                <Input value={form.incentive_reason} onChange={setF("incentive_reason")} style={inp} placeholder="e.g. Completed 3 days early" />
              </Field>
            </div>
          </section>

          {/* Notes */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Notes</h2>
            <textarea value={form.notes} onChange={setF("notes")} placeholder="Any additional notes for this job..." style={{ ...inp, width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
          </section>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Job" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/production-jobs" : `/admin/production-jobs/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    
  );
};

export default AdminProductionJobEdit;
