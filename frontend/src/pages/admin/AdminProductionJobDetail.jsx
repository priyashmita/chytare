import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Edit, ArrowLeft, Play, CheckCircle, XCircle, Package, Layers, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const STATUS_STYLE = {
  planned:     { bg: "rgba(218,203,160,0.2)",   color: "#8a7340" },
  in_progress: { bg: "rgba(27,77,62,0.08)",     color: "#1B4D3E" },
  completed:   { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d" },
  cancelled:   { bg: "rgba(192,128,129,0.12)",  color: "#8a4445" },
};

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.12)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "160px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
  </div>
);

const AdminProductionJobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completeForm, setCompleteForm] = useState({ quantity_completed: "", actual_completion_date: "", notes: "" });

  useEffect(() => { fetchJob(); }, [id]);

  const fetchJob = async () => {
    try {
      const res = await axios.get(`${API}/admin/production-jobs/${id}`);
      setJob(res.data);
      setCompleteForm(prev => ({ ...prev, quantity_completed: res.data.quantity_planned || "" }));
    } catch {
      toast.error("Job not found");
      navigate("/admin/production-jobs");
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    try { await axios.post(`${API}/admin/production-jobs/${id}/start`); toast.success("Job started"); fetchJob(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleComplete = async () => {
    if (!completeForm.quantity_completed || parseInt(completeForm.quantity_completed) <= 0) {
      return toast.error("Enter quantity completed");
    }
    setCompleting(true);
    try {
      const res = await axios.post(`${API}/admin/production-jobs/${id}/complete`, {
        quantity_completed: parseInt(completeForm.quantity_completed),
        actual_completion_date: completeForm.actual_completion_date || null,
        notes: completeForm.notes || null,
      });
      toast.success(res.data.message);
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to complete");
    } finally { setCompleting(false); }
  };

  const handleCancel = async () => {
    try { await axios.post(`${API}/admin/production-jobs/${id}/cancel`); toast.success("Job cancelled"); fetchJob(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  if (!job) return null;

  const statusStyle = STATUS_STYLE[job.status] || STATUS_STYLE.planned;
  const progress = job.quantity_planned > 0 ? Math.round((job.quantity_completed / job.quantity_planned) * 100) : 0;
  const isOverdue = job.due_date && job.status !== "completed" && job.status !== "cancelled" && new Date(job.due_date) < new Date();
  const product = job._product || {};
  const supplier = job._supplier || {};

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>

        {/* Back */}
        <button onClick={() => navigate("/admin/production-jobs")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Production Jobs
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "14px", fontWeight: 600, letterSpacing: "0.08em", color: "#1B4D3E" }}>{job.job_code}</span>
              <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{job.status.replace("_", " ")}</span>
              {isOverdue && <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(192,128,129,0.15)", color: "#C08081", padding: "2px 8px", fontWeight: 500 }}>OVERDUE</span>}
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{job.product_name}</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{job.supplier_name}</p>
          </div>

          {/* Action buttons based on status */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {job.status === "planned" && (
              <>
                <button onClick={() => navigate(`/admin/production-jobs/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                  <Edit style={{ width: 14, height: 14 }} /> Edit
                </button>
                <button onClick={handleStart} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                  <Play style={{ width: 14, height: 14 }} /> Start Job
                </button>
              </>
            )}
            {job.status === "in_progress" && (
              <button onClick={() => navigate(`/admin/production-jobs/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <Edit style={{ width: 14, height: 14 }} /> Edit
              </button>
            )}
            {(job.status === "planned" || job.status === "in_progress") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="btn-luxury" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", background: "transparent", border: "1px solid #C08081", color: "#C08081", cursor: "pointer" }}>
                    <XCircle style={{ width: 14, height: 14 }} /> Cancel Job
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FFFFF0]">
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Cancel Job</AlertDialogTitle>
                    <AlertDialogDescription>Cancel {job.job_code}? This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Job</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} style={{ background: "#C08081", color: "white" }}>Cancel Job</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {job.status !== "cancelled" && (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Production Progress</span>
              <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>{job.quantity_completed} / {job.quantity_planned} pieces</span>
            </div>
            <div style={{ height: "8px", background: "rgba(218,203,160,0.3)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: job.status === "completed" ? "#2d6e2d" : "#1B4D3E", width: `${progress}%`, transition: "width 0.5s", borderRadius: "4px" }} />
            </div>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>{progress}% complete</p>
          </div>
        )}

        {/* Complete Job form — shown only for in_progress */}
        {job.status === "in_progress" && (
          <div style={{ background: "rgba(27,77,62,0.03)", border: "2px solid rgba(27,77,62,0.15)", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>Mark Job Complete</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Quantity Completed <span style={{ color: "#C08081" }}>*</span></label>
                <Input type="number" min="1" max={job.quantity_planned} value={completeForm.quantity_completed} onChange={(e) => setCompleteForm({ ...completeForm, quantity_completed: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} placeholder={`Max ${job.quantity_planned}`} />
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Completion Date</label>
                <Input type="date" value={completeForm.actual_completion_date} onChange={(e) => setCompleteForm({ ...completeForm, actual_completion_date: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Notes</label>
                <Input value={completeForm.notes} onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} placeholder="Optional completion notes" />
              </div>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", marginBottom: "12px" }}>
              Completing this job will add <strong>{completeForm.quantity_completed || "—"} finished units</strong> to inventory automatically.
            </p>
            <button onClick={handleComplete} disabled={completing} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", opacity: completing ? 0.5 : 1 }}>
              <CheckCircle style={{ width: 15, height: 15 }} />
              {completing ? "Completing..." : "Complete Job & Add to Inventory"}
            </button>
          </div>
        )}

        {/* Job Details */}
        <Card title="Job Details">
          <InfoRow label="Job Code" value={job.job_code} />
          <InfoRow label="Status" value={job.status.replace("_", " ")} />
          <InfoRow label="Quantity Planned" value={`${job.quantity_planned} pieces`} />
          <InfoRow label="Quantity Completed" value={job.quantity_completed > 0 ? `${job.quantity_completed} pieces` : null} />
          <InfoRow label="Start Date" value={job.start_date} />
          <InfoRow label="Due Date" value={job.due_date ? `${job.due_date}${isOverdue ? " — OVERDUE" : ""}` : null} />
          <InfoRow label="Actual Completion" value={job.actual_completion_date} />
          {job.work_type && <InfoRow label="Work Type" value={job.work_type.replace(/_/g, " ")} />}
          {job.sequence_number && <InfoRow label="Sequence" value={`Step ${job.sequence_number}`} />}
          {job.stage_group_id && <InfoRow label="Stage Group" value={job.stage_group_id} />}
          {job.parent_job_id && <InfoRow label="Parent Job" value={job.parent_job_code || job.parent_job_id} />}
          {job.notes && <InfoRow label="Notes" value={job.notes} />}
        </Card>

        {/* Product */}
        <Card title="Product">
          <InfoRow label="Product Code" value={product.product_code} />
          <InfoRow label="Product Name" value={product.product_name} />
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Collection" value={product.collection_name} />
        </Card>

        {/* Supplier */}
        <Card title="Assigned Supplier">
          <InfoRow label="Supplier Code" value={supplier.supplier_code} />
          <InfoRow label="Supplier Name" value={supplier.supplier_name} />
          <InfoRow label="Type" value={supplier.supplier_type} />
          <InfoRow label="City" value={supplier.city} />
        </Card>

        {/* Placeholders for future modules */}
        <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "12px", marginTop: "8px" }}>Linked Records</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Layers style={{ width: 15, height: 15, color: "rgba(218,203,160,0.8)" }} />
              <h4 style={{ fontFamily: SERIF, fontSize: "14px", fontWeight: 400, color: "#1B4D3E" }}>Material Allocations</h4>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>
              Fabric and material batches allocated to this job will appear here once the Material Allocation module is active.
            </p>
            <a href={`/admin/material-allocations?job=${id}`} style={{ fontFamily: "'Manrope',sans-serif", fontSize: "12px", color: "#1B4D3E", textDecoration: "underline", display: "inline-block", marginTop: "8px" }}>View allocations →</a>
          </div>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Package style={{ width: 15, height: 15, color: "rgba(218,203,160,0.8)" }} />
              <h4 style={{ fontFamily: SERIF, fontSize: "14px", fontWeight: 400, color: "#1B4D3E" }}>Inventory Movements</h4>
              {job._linked?.inventory_movements > 0 && (
                <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(27,77,62,0.08)", color: "#1B4D3E", padding: "1px 6px" }}>{job._linked.inventory_movements}</span>
              )}
            </div>
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>
              {job.status === "completed"
                ? `${job.quantity_completed} finished goods were added to inventory when this job was completed.`
                : "Inventory movements will be recorded when this job is completed."}
            </p>
          </div>
        </div>

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {job.created_at ? new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {job.created_by_name && ` by ${job.created_by_name}`}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Last Updated</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {job.updated_at ? new Date(job.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminProductionJobDetail;
