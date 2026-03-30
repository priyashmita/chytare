import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Plus, Search, Eye, Edit, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ExportImportBar from "./ExportImportBar";
import AuditHistoryModal from "./AuditHistoryModal";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";
const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem("chytare_token")}` });

const STATUS_STYLE = {
  planned:     { bg: "rgba(218,203,160,0.2)",   color: "#8a7340" },
  in_progress: { bg: "rgba(27,77,62,0.08)",     color: "#1B4D3E" },
  completed:   { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d" },
  cancelled:   { bg: "rgba(192,128,129,0.12)",  color: "#8a4445" },
};

const isOverdue = (job) => {
  if (!job.due_date || job.status === "completed" || job.status === "cancelled") return false;
  return new Date(job.due_date) < new Date();
};

const AdminProductionJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ statuses: [], products: [], suppliers: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchMeta(); fetchJobs(); }, []);
  useEffect(() => { fetchJobs(); }, [filterStatus, filterSupplier, filterProduct]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/production-jobs/meta`); setMeta(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchJobs = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSupplier) params.supplier_id = filterSupplier;
      if (filterProduct) params.product_id = filterProduct;
      const res = await axios.get(`${API}/admin/production-jobs`, { params });
      setJobs(res.data);
      setSelected(new Set());
    } catch { toast.error("Failed to load production jobs"); }
    finally { setLoading(false); }
  };

  const handleStart = async (id) => {
    try { await axios.post(`${API}/admin/production-jobs/${id}/start`, {}, { headers: AUTH() }); toast.success("Job started"); fetchJobs(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to start"); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const cancellable = filtered.filter(j => j.status !== "completed" && j.status !== "cancelled");
    if (selected.size === cancellable.length && cancellable.length > 0) setSelected(new Set());
    else setSelected(new Set(cancellable.map(j => j.id)));
  };

  const handleBulkCancel = async () => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/admin/production-jobs/bulk-cancel`, { ids: [...selected] }, { headers: AUTH() });
      toast.success(`${res.data.updated} job(s) cancelled`);
      fetchJobs();
    } catch { toast.error("Bulk cancel failed"); }
    finally { setBulkLoading(false); }
  };

  const filtered = jobs.filter(j =>
    !search ||
    j.job_code?.toLowerCase().includes(search.toLowerCase()) ||
    j.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
  jobs.forEach(j => { if (counts[j.status] !== undefined) counts[j.status]++; });

  const cancellableCount = filtered.filter(j => j.status !== "completed" && j.status !== "cancelled").length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Production Jobs</h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>Track manufacturing runs from planning to completion</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ExportImportBar module="production-jobs" filters={{ status: filterStatus, supplier_id: filterSupplier, product_id: filterProduct, search }} onImportDone={fetchJobs} />
          <Link to="/admin/production-jobs/new" className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Plus style={{ width: 16, height: 16 }} /> New Job
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ ...STATUS_STYLE[status], fontFamily: SANS, fontSize: "12px", padding: "6px 14px", letterSpacing: "0.05em" }}>
            {count} {status.replace("_", " ")}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job code or product..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "140px" }}>
          <option value="">All Status</option>
          {meta.statuses.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
        </select>
        <select value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "180px" }}>
          <option value="">All Suppliers</option>
          {meta.suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
        </select>
        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "180px" }}>
          <option value="">All Products</option>
          {meta.products.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", background: "rgba(27,77,62,0.06)", border: "1px solid rgba(27,77,62,0.15)", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{selected.size} selected</span>
          <button onClick={handleBulkCancel} disabled={bulkLoading} style={{ fontFamily: SANS, fontSize: "12px", padding: "6px 14px", background: "rgba(192,128,129,0.1)", color: "#8a4445", border: "1px solid rgba(192,128,129,0.3)", cursor: "pointer" }}>Cancel Jobs</button>
          <button onClick={() => setSelected(new Set())} style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>No production jobs found</p>
          <Link to="/admin/production-jobs/new" className="btn-luxury btn-luxury-secondary">Create First Job</Link>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "rgba(27,77,62,0.04)" }}>
              <tr>
                <th style={{ padding: "12px 16px", width: "36px" }}>
                  <input type="checkbox" checked={cancellableCount > 0 && selected.size === cancellableCount} onChange={toggleAll} style={{ cursor: "pointer" }} title="Select all cancellable" />
                </th>
                {["Job", "Product", "Supplier", "Qty", "Due Date", "Progress", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((j, i) => {
                const statusStyle = STATUS_STYLE[j.status] || STATUS_STYLE.planned;
                const overdue = isOverdue(j);
                const progress = j.quantity_planned > 0 ? Math.round((j.quantity_completed / j.quantity_planned) * 100) : 0;
                const canCancel = j.status !== "completed" && j.status !== "cancelled";
                const isSelected = selected.has(j.id);
                return (
                  <tr key={j.id} style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: isSelected ? "rgba(27,77,62,0.03)" : i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      {canCancel && <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(j.id)} style={{ cursor: "pointer" }} />}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E", letterSpacing: "0.05em" }}>{j.job_code}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{j.product_name}</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{j.product_code}</p>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)" }}>{j.supplier_name}</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{j.supplier_code}</p>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{j.quantity_planned}</p>
                      {j.quantity_completed > 0 && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>{j.quantity_completed} done</p>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: overdue ? "#C08081" : "rgba(27,77,62,0.6)", fontWeight: overdue ? 600 : 400 }}>
                        {j.due_date ? new Date(j.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                        {overdue && " ⚠"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", minWidth: "100px" }}>
                      {j.status !== "cancelled" && (
                        <div>
                          <div style={{ height: "4px", background: "rgba(218,203,160,0.3)", width: "80px" }}>
                            <div style={{ height: "100%", background: j.status === "completed" ? "#2d6e2d" : "#1B4D3E", width: `${progress}%`, transition: "width 0.3s" }} />
                          </div>
                          <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "3px" }}>{progress}%</p>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500 }}>
                        {j.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <button onClick={() => navigate(`/admin/production-jobs/${j.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View"><Eye style={{ width: 15, height: 15 }} /></button>
                        {canCancel && <button onClick={() => navigate(`/admin/production-jobs/${j.id}/edit`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>}
                        {j.status === "planned" && <button onClick={() => handleStart(j.id)} style={{ padding: "6px", color: "rgba(27,77,62,0.6)", background: "none", border: "none", cursor: "pointer" }} title="Start Job"><Play style={{ width: 15, height: 15 }} /></button>}
                        <AuditHistoryModal entityType="production_job" entityId={j.id} entityName={j.job_code} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminProductionJobs;
