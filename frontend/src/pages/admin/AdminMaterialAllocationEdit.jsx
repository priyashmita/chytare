import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
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

const sel = (v) => ({ fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: v ? "#1B4D3E" : "rgba(27,77,62,0.4)" });
const inp = { fontFamily: SANS, fontSize: "14px" };

const AdminMaterialAllocationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === "new";
  const prefillJob = searchParams.get("job");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ jobs: [], purchases: [] });
  const [allocationCode, setAllocationCode] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const [form, setForm] = useState({
    production_job_id: prefillJob || "",
    material_purchase_id: "",
    quantity_allocated: "",
    notes: "",
  });

  useEffect(() => { fetchMeta(); if (!isNew) fetchAllocation(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/material-allocations/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchAllocation = async () => {
    try {
      const res = await axios.get(`${API}/admin/material-allocations/${id}`);
      const a = res.data;
      setAllocationCode(a.allocation_code);
      setForm({
        production_job_id: a.production_job_id || "",
        material_purchase_id: a.material_purchase_id || "",
        quantity_allocated: a.quantity_allocated || "",
        notes: a.notes || "",
      });
    } catch {
      toast.error("Allocation not found");
      navigate("/admin/material-allocations");
    } finally { setLoading(false); }
  };

  const setF = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const handlePurchaseSelect = (e) => {
    const purchaseId = e.target.value;
    setForm({ ...form, material_purchase_id: purchaseId });
    const purchase = meta.purchases.find(p => p.id === purchaseId);
    setSelectedPurchase(purchase || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.production_job_id) return toast.error("Please select a production job");
    if (!form.material_purchase_id) return toast.error("Please select a material batch");
    if (!form.quantity_allocated || parseFloat(form.quantity_allocated) <= 0) return toast.error("Quantity must be greater than 0");
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity_allocated: parseFloat(form.quantity_allocated),
        notes: form.notes || null,
      };
      if (isNew) {
        const res = await axios.post(`${API}/admin/material-allocations`, payload);
        toast.success(`Allocation created — ${res.data.allocation_code}`);
        navigate(`/admin/material-allocations/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/material-allocations/${id}`, payload);
        toast.success("Allocation updated");
        navigate(`/admin/material-allocations/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(2)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "New Material Allocation" : "Edit Allocation"}
          </h1>
          {allocationCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{allocationCode}</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Job & Material */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Link to Production Job</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Production Job" required hint="Only active (planned or in-progress) jobs are shown">
                <select value={form.production_job_id} onChange={setF("production_job_id")} required style={sel(!!form.production_job_id)}>
                  <option value="">Select job...</option>
                  {meta.jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_code} — {j.product_name} ({j.status})</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Material Batch */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>Material Batch</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Field label="Material Purchase Batch" required hint="Select the specific purchase batch to allocate from">
                <select value={form.material_purchase_id} onChange={handlePurchaseSelect} required style={sel(!!form.material_purchase_id)}>
                  <option value="">Select batch...</option>
                  {meta.purchases.length === 0 ? (
                    <option disabled>No received batches available — add material purchases first</option>
                  ) : (
                    meta.purchases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.purchase_code || p.id.slice(0,8)} — {p.material_name} | Available: {p.quantity_available} {p.unit_of_measure} | Supplier: {p.supplier_name}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              {/* Show selected batch details */}
              {selectedPurchase && (
                <div style={{ background: "rgba(27,77,62,0.04)", border: "1px solid rgba(218,203,160,0.3)", padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", marginBottom: "4px" }}>Material</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{selectedPurchase.material_name}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", marginBottom: "4px" }}>Available</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>{selectedPurchase.quantity_available} {selectedPurchase.unit_of_measure}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", marginBottom: "4px" }}>Supplier</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{selectedPurchase.supplier_name}</p>
                    </div>
                  </div>
                </div>
              )}

              <Field label="Quantity to Allocate" required hint={selectedPurchase ? `Max ${selectedPurchase.quantity_available} ${selectedPurchase.unit_of_measure}` : ""}>
                <Input
                  type="number" min="0.01" step="0.01"
                  max={selectedPurchase?.quantity_available}
                  value={form.quantity_allocated}
                  onChange={setF("quantity_allocated")}
                  style={inp}
                  placeholder="e.g. 6"
                  required
                />
              </Field>

              <Field label="Notes">
                <textarea value={form.notes} onChange={setF("notes")} placeholder="Any notes about this allocation..." style={{ ...inp, width: "100%", minHeight: "60px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
              </Field>
            </div>
          </section>

          {isNew && (
            <div style={{ background: "rgba(27,77,62,0.04)", border: "1px solid rgba(218,203,160,0.3)", padding: "14px 16px" }}>
              <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.6)" }}>
                Creating this allocation will <strong>deduct the quantity from the material batch</strong> and create an inventory movement record automatically.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Allocation" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/material-allocations" : `/admin/material-allocations/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminMaterialAllocationEdit;
