import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Edit, UserX, UserCheck, ArrowLeft, ShoppingCart, Hammer, Layers, Plus, X, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.15)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "140px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
  </div>
);

const Field = ({ label, required, hint, children }) => (
  <div>
    <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>
      {label}{required && <span style={{ color: "#C08081", marginLeft: "4px" }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "4px" }}>{hint}</p>}
  </div>
);

const inp = {
  fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px",
  padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)",
  background: "white", color: "#1B4D3E", outline: "none",
};

const sel = (hasVal) => ({
  ...inp,
  color: hasVal ? "#1B4D3E" : "rgba(27,77,62,0.4)",
  cursor: "pointer",
});

const TYPE_COLORS = {
  fabric:    { bg: "rgba(27,77,62,0.08)",    color: "#1B4D3E" },
  thread:    { bg: "rgba(218,203,160,0.25)", color: "#8a7340" },
  trim:      { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
  accessory: { bg: "rgba(100,120,200,0.1)",  color: "#3a4a9a" },
  packaging: { bg: "rgba(150,150,150,0.12)", color: "#555" },
  dye:       { bg: "rgba(180,80,180,0.1)",   color: "#7a207a" },
  other:     { bg: "rgba(180,180,180,0.12)", color: "#666" },
};

const EMPTY_PURCHASE_FORM = {
  supplier_id: "",
  quantity_received: "",
  unit_price: "",
  total_cost: "",
  purchase_date: "",
  payment_type: "cash",
  invoice_number: "",
  notes: "",
  invoice_url: "",
};

const AdminMaterialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [purchases, setPurchases]   = useState([]);
  const [suppliers, setSuppliers]   = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_PURCHASE_FORM);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [matRes, purRes, metaRes] = await Promise.all([
        axios.get(`${API}/admin/materials/${id}`),
        axios.get(`${API}/admin/material-purchases?material_id=${id}`),
        axios.get(`${API}/admin/material-purchases/meta`),
      ]);
      setMaterial(matRes.data);
      setPurchases(purRes.data);
      setSuppliers(metaRes.data.suppliers || []);
    } catch {
      toast.error("Material not found");
      navigate("/admin/materials");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try { await axios.post(`${API}/admin/materials/${id}/deactivate`); toast.success("Material deactivated"); fetchAll(); }
    catch { toast.error("Failed"); }
  };

  const handleReactivate = async () => {
    try { await axios.post(`${API}/admin/materials/${id}/reactivate`); toast.success("Material reactivated"); fetchAll(); }
    catch { toast.error("Failed"); }
  };

  const setF = (field) => (e) => {
    const val = e.target.value;
    setForm(prev => {
      const next = { ...prev, [field]: val };
      // Auto-calculate total when unit_price or quantity changes
      if (field === "unit_price" && next.quantity_received) {
        next.total_cost = (parseFloat(val) * parseFloat(next.quantity_received)).toFixed(2);
      }
      if (field === "quantity_received" && next.unit_price) {
        next.total_cost = (parseFloat(next.unit_price) * parseFloat(val)).toFixed(2);
      }
      // Auto-calculate unit_price when total_cost typed manually
      if (field === "total_cost" && next.quantity_received && parseFloat(next.quantity_received) > 0) {
        next.unit_price = (parseFloat(val) / parseFloat(next.quantity_received)).toFixed(4);
      }
      return next;
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(prev => ({ ...prev, invoice_url: res.data.url }));
      toast.success("Bill uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity_received || parseFloat(form.quantity_received) <= 0)
      return toast.error("Quantity received must be greater than 0");
    if (!form.purchase_date)
      return toast.error("Purchase date is required");
    setSaving(true);
    try {
      await axios.post(`${API}/admin/material-purchases`, {
        material_id: id,
        supplier_id: form.supplier_id || null,
        quantity_received: parseFloat(form.quantity_received),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
        total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
        purchase_date: form.purchase_date,
        payment_type: form.payment_type,
        invoice_number: form.invoice_number || null,
        invoice_url: form.invoice_url || null,
        notes: form.notes || null,
      });
      toast.success("Purchase recorded");
      setForm(EMPTY_PURCHASE_FORM);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
    </div>
  );

  if (!material) return null;

  const isActive      = (material.status || "active") === "active";
  const isFabric      = material.material_type === "fabric";
  const typeStyle     = TYPE_COLORS[material.material_type] || TYPE_COLORS.other;
  const hasFabricDetails = isFabric && (material.fabric_type || material.weave_type || material.gsm || material.origin_region || material.composition);

  return (
    <div style={{ maxWidth: "800px" }}>

      {/* Back */}
      <button onClick={() => navigate("/admin/materials")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Materials
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{material.material_code}</span>
            <span style={{ ...typeStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{material.material_type}</span>
            <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500, background: isActive ? "rgba(27,77,62,0.08)" : "rgba(192,128,129,0.1)", color: isActive ? "#1B4D3E" : "#C08081" }}>
              {material.status || "active"}
            </span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: "#1B4D3E" }}>{material.material_name}</h1>
          {material.color && <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{material.color}</p>}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => navigate(`/admin/materials/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
            <Edit style={{ width: 14, height: 14 }} /> Edit
          </button>
          {isActive ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="btn-luxury" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", background: "transparent", border: "1px solid #C08081", color: "#C08081", cursor: "pointer" }}>
                  <UserX style={{ width: 14, height: 14 }} /> Deactivate
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#FFFFF0]">
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Deactivate Material</AlertDialogTitle>
                  <AlertDialogDescription>Deactivate {material.material_name}? It will remain in the system but cannot be used for new purchases.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate} style={{ background: "#C08081", color: "white" }}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <button onClick={handleReactivate} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
              <UserCheck style={{ width: 14, height: 14 }} /> Reactivate
            </button>
          )}
        </div>
      </div>

      {/* Swatch */}
      {material.swatch_url && (
        <div style={{ marginBottom: "16px" }}>
          <img src={material.swatch_url} alt="Material swatch" style={{ width: "160px", height: "160px", objectFit: "cover", border: "1px solid rgba(218,203,160,0.4)" }} />
          <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Material Swatch</p>
        </div>
      )}

      {/* Core details */}
      <Section title="Material Details">
        <InfoRow label="Material Name"    value={material.material_name} />
        <InfoRow label="Material Type"    value={material.material_type} />
        <InfoRow label="Unit of Measure"  value={material.unit_of_measure} />
        <InfoRow label="Colour"           value={material.color} />
        <InfoRow label="In Stock"         value={material.current_stock_qty !== undefined ? `${material.current_stock_qty} ${material.unit_of_measure}` : null} />
        <InfoRow label="Storage Location" value={material.storage_location} />
        {material.description && <InfoRow label="Description" value={material.description} />}
      </Section>

      {/* Fabric-specific */}
      {hasFabricDetails && (
        <Section title="Fabric Details">
          <InfoRow label="Fabric Type"   value={material.fabric_type} />
          <InfoRow label="Weave Type"    value={material.weave_type} />
          <InfoRow label="GSM"           value={material.gsm ? `${material.gsm} g/m²` : null} />
          <InfoRow label="Origin Region" value={material.origin_region} />
          <InfoRow label="Composition"   value={material.composition} />
        </Section>
      )}

      {/* ── MATERIAL PURCHASES ───────────────────────────────────────── */}
      <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: purchases.length > 0 ? "20px" : "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingCart style={{ width: 16, height: 16, color: "#1B4D3E" }} />
            <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>
              Material Purchases
              {purchases.length > 0 && (
                <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginLeft: "8px" }}>
                  {purchases.length} batch{purchases.length !== 1 ? "es" : ""}
                </span>
              )}
            </h3>
          </div>
          {!showForm && isActive && (
            <button
              onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "8px 14px", background: "#1B4D3E", color: "#FFFFF0", border: "none", cursor: "pointer" }}
            >
              <Plus style={{ width: 12, height: 12 }} /> Record Purchase
            </button>
          )}
        </div>

        {/* Existing purchases list */}
        {purchases.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: showForm ? "20px" : "0" }}>
            {purchases.map(p => (
              <div key={p.id} style={{ border: "1px solid rgba(218,203,160,0.25)", padding: "14px 16px", background: "rgba(27,77,62,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E" }}>{p.purchase_code}</span>
                    {p.supplier_name && (
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", marginLeft: "10px" }}>{p.supplier_name}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", background: p.status === "received" ? "rgba(27,77,62,0.08)" : p.status === "partial" ? "rgba(218,203,160,0.3)" : "rgba(192,128,129,0.1)", color: p.status === "received" ? "#1B4D3E" : p.status === "partial" ? "#8a7340" : "#C08081" }}>
                      {p.status}
                    </span>
                    <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", background: p.payment_type === "cash" ? "rgba(100,120,200,0.1)" : "rgba(27,77,62,0.06)", color: p.payment_type === "cash" ? "#3a4a9a" : "#1B4D3E" }}>
                      {p.payment_type}
                    </span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginTop: "10px" }}>
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>RECEIVED</p>
                    <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>{p.quantity_received} {p.unit_of_measure}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>AVAILABLE</p>
                    <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>{p.quantity_available} {p.unit_of_measure}</p>
                  </div>
                  {p.total_cost && (
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>TOTAL COST</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>₹{p.total_cost.toLocaleString("en-IN")}</p>
                    </div>
                  )}
                  {p.unit_price && (
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>UNIT PRICE</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>₹{p.unit_price}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>DATE</p>
                    <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>
                      {new Date(p.purchase_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {p.invoice_number && (
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "2px" }}>INVOICE</p>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{p.invoice_number}</p>
                    </div>
                  )}
                </div>
                {p.invoice_url && (
                  <div style={{ marginTop: "10px" }}>
                    <a href={p.invoice_url} target="_blank" rel="noreferrer" style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", textDecoration: "underline" }}>
                      View Bill / Invoice ↗
                    </a>
                  </div>
                )}
                {p.notes && (
                  <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", marginTop: "8px", fontStyle: "italic" }}>{p.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {purchases.length === 0 && !showForm && (
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6, marginTop: "12px" }}>
            No purchase batches recorded yet. Click "Record Purchase" to log the first batch.
          </p>
        )}

        {/* Inline add form */}
        {showForm && (
          <div style={{ borderTop: purchases.length > 0 ? "1px solid rgba(218,203,160,0.3)" : "none", paddingTop: purchases.length > 0 ? "20px" : "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ fontFamily: SERIF, fontSize: "14px", color: "#1B4D3E" }}>New Purchase Batch</p>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_PURCHASE_FORM); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,77,62,0.4)" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Row 1: Supplier + Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Supplier" hint="Optional — skip if cash with no supplier record">
                  <select value={form.supplier_id} onChange={setF("supplier_id")} style={sel(!!form.supplier_id)}>
                    <option value="">No supplier / cash</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Purchase Date" required>
                  <input type="date" value={form.purchase_date} onChange={setF("purchase_date")} required style={inp} />
                </Field>
              </div>

              {/* Row 2: Quantity + Payment type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label={`Quantity Received (${material.unit_of_measure})`} required>
                  <input type="number" min="0.01" step="0.01" value={form.quantity_received} onChange={setF("quantity_received")} required style={inp} placeholder="e.g. 10" />
                </Field>
                <Field label="Payment Type" required>
                  <select value={form.payment_type} onChange={setF("payment_type")} style={sel(true)}>
                    <option value="cash">Cash</option>
                    <option value="bill">Bill / Invoice</option>
                  </select>
                </Field>
              </div>

              {/* Row 3: Unit price + Total cost */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Unit Price (₹)" hint="Enter either unit price or total — other auto-fills">
                  <input type="number" min="0" step="0.01" value={form.unit_price} onChange={setF("unit_price")} style={inp} placeholder="e.g. 250" />
                </Field>
                <Field label="Total Cost (₹)">
                  <input type="number" min="0" step="0.01" value={form.total_cost} onChange={setF("total_cost")} style={inp} placeholder="e.g. 2500" />
                </Field>
              </div>

              {/* Bill fields — only if payment_type is bill */}
              {form.payment_type === "bill" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <Field label="Invoice / Bill Number">
                    <input type="text" value={form.invoice_number} onChange={setF("invoice_number")} style={inp} placeholder="e.g. INV-2024-001" />
                  </Field>
                  <Field label="Upload Bill" hint="Photo or PDF">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", padding: "8px 14px", border: "1px solid rgba(218,203,160,0.5)", background: "white", cursor: "pointer", color: "#1B4D3E" }}>
                        <Upload style={{ width: 13, height: 13 }} />
                        {uploading ? "Uploading..." : form.invoice_url ? "Replace" : "Choose file"}
                        <input type="file" accept="image/*,.pdf" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
                      </label>
                      {form.invoice_url && (
                        <a href={form.invoice_url} target="_blank" rel="noreferrer" style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", textDecoration: "underline" }}>
                          View ↗
                        </a>
                      )}
                    </div>
                  </Field>
                </div>
              )}

              {/* Notes */}
              <Field label="Notes">
                <textarea value={form.notes} onChange={setF("notes")} placeholder="Any notes about this batch..." style={{ ...inp, height: "60px", padding: "10px 12px", resize: "vertical" }} />
              </Field>

              <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
                  {saving ? "Saving..." : "Record Purchase"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_PURCHASE_FORM); }} className="btn-luxury btn-luxury-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Production Jobs — placeholder */}
      <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Hammer style={{ width: 16, height: 16, color: "rgba(218,203,160,0.7)" }} />
          <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Production Jobs</h3>
        </div>
        <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>
          Production jobs that use this material will appear here.
        </p>
      </div>

      {/* Material Allocations — placeholder */}
      <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Layers style={{ width: 16, height: 16, color: "rgba(218,203,160,0.7)" }} />
          <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Material Allocations</h3>
        </div>
        <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>
          Allocation records showing which production batches consumed this material will appear here.
        </p>
      </div>

      {/* Audit */}
      <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
              {material.created_at ? new Date(material.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              {material.created_by_name && ` by ${material.created_by_name}`}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Last Updated</p>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
              {material.updated_at ? new Date(material.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "numeric", year: "numeric" }) : "—"}
              {material.updated_by_name && ` by ${material.updated_by_name}`}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminMaterialDetail;
