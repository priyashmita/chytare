import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Edit, ArrowLeft, Play, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({ quantity_completed: "", actual_completion_date: "", notes: "" });
  const [completing, setCompleting] = useState(false);

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
    try {
      await axios.post(`${API}/admin/production-jobs/${id}/start`);
      toast.success("Job started");
      fetchJob();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleComplete = async () => {
    if (!completeForm.quantity_completed || parseInt(completeForm.quantity_completed) <= 0) return toast.error("Enter quantity completed");
    setCompleting(true);
    try {
      await axios.post(`${API}/admin/production-jobs/${id}/complete`, {
        quantity_completed: parseInt(completeForm.quantity_completed),
        actual_completion_date: completeForm.actual_completion_date || null,
        notes: completeForm.notes || null,
      });
      toast.success("Job completed — inventory updated");
      setShowCompleteForm(false);
      fetchJob();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCompleting(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this job?")) return;
    try {
      await axios.post(`${API}/admin/production-jobs/${id}/cancel`);
      toast.success("Job cancelled");
      fetchJob();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
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
  const isOverdue = job.due_date && job.status !== "completed" && job.status !== "cancelled" && new Date(job.due_date) < new Date();
  const isLate = job.proposed_end_date && job.status !== "completed" && job.status !== "cancelled" && new Date(job.proposed_end_date) < new Date();
  const progress = job.quantity_planned > 0 ? Math.round((job.quantity_completed / job.quantity_planned) * 100) : 0;
  const amountPending = (job.cost_to_pay || 0) - (job.amount_paid || 0);
  const totalCost = (job.cost_to_pay || 0) + (job.incentive_amount || 0);

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>

        <button onClick={() => navigate("/admin/production-jobs")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Production Jobs
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{job.job_code}</span>
              <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{job.status?.replace("_", " ")}</span>
              {isOverdue && <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(192,128,129,0.15)", color: "#C08081", padding: "2px 8px" }}>OVERDUE</span>}
              {!isOverdue && isLate && <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(218,203,160,0.3)", color: "#8a7340", padding: "2px 8px" }}>PAST PROPOSED DATE</span>}
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{job.product_name}</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{job.supplier_name} · {job.work_type?.replace(/_/g, " ")}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {job.status === "planned" && (
              <button onClick={handleStart} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <Play style={{ width: 13, height: 13 }} /> Start Job
              </button>
            )}
            {(job.status === "planned" || job.status === "in_progress") && (
              <>
                <button onClick={() => setShowCompleteForm(!showCompleteForm)} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                  <CheckCircle style={{ width: 13, height: 13 }} /> Complete Job
                </button>
                <button onClick={handleCancel} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", fontFamily: SANS, background: "none", border: "1px solid rgba(192,128,129,0.4)", color: "#C08081", cursor: "pointer" }}>
                  <XCircle style={{ width: 13, height: 13 }} /> Cancel
                </button>
                <button onClick={() => navigate(`/admin/production-jobs/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                  <Edit style={{ width: 13, height: 13 }} /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Complete Job Form */}
        {showCompleteForm && (
          <div style={{ background: "rgba(27,77,62,0.03)", border: "2px solid rgba(27,77,62,0.15)", padding: "24px", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>Complete Job</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Qty Completed <span style={{ color: "#C08081" }}>*</span></label>
                <Input type="number" min="1" max={job.quantity_planned} value={completeForm.quantity_completed} onChange={e => setCompleteForm({ ...completeForm, quantity_completed: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Completion Date</label>
                <Input type="date" value={completeForm.actual_completion_date} onChange={e => setCompleteForm({ ...completeForm, actual_completion_date: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} />
              </div>
              <div>
                <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>Notes</label>
                <Input value={completeForm.notes} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px" }} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleComplete} disabled={completing} className="btn-luxury btn-luxury-primary" style={{ opacity: completing ? 0.5 : 1 }}>
                {completing ? "Completing..." : "Confirm Completion"}
              </button>
              <button onClick={() => setShowCompleteForm(false)} className="btn-luxury btn-luxury-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Progress</span>
            <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>{job.quantity_completed} / {job.quantity_planned} units ({progress}%)</span>
          </div>
          <div style={{ height: "6px", background: "rgba(218,203,160,0.3)", borderRadius: "3px" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#2d6e2d" : "#1B4D3E", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Job Details */}
        <Card title="Job Details">
          <InfoRow label="Job Code" value={job.job_code} />
          <InfoRow label="Product" value={`${job.product_name} (${job.product_code})`} />
          <InfoRow label="Supplier" value={`${job.supplier_name} (${job.supplier_code})`} />
          <InfoRow label="Work Type" value={job.work_type?.replace(/_/g, " ")} />
          <InfoRow label="Qty Planned" value={job.quantity_planned} />
          <InfoRow label="Qty Completed" value={job.quantity_completed} />
        </Card>

        {/* Timeline */}
        <Card title="Timeline">
          <InfoRow label="Start Date" value={job.start_date} />
          <InfoRow label="Proposed End" value={
            <span style={{ color: isLate && job.status !== "completed" ? "#8a7340" : "#1B4D3E" }}>
              {job.proposed_end_date || "—"}{isLate && job.status !== "completed" ? " ⚠ Past proposed date" : ""}
            </span>
          } />
          <InfoRow label="Due Date" value={
            <span style={{ color: isOverdue ? "#C08081" : "#1B4D3E" }}>
              {job.due_date || "—"}{isOverdue ? " ⚠ Overdue" : ""}
            </span>
          } />
          <InfoRow label="Actual Completion" value={job.actual_completion_date} />
        </Card>

        {/* Cost & Payment */}
        <Card title="Cost & Payment">
          <InfoRow label="Cost to Pay" value={job.cost_to_pay !== undefined && job.cost_to_pay !== null ? `₹${(job.cost_to_pay).toLocaleString("en-IN")}` : null} />
          <InfoRow label="Amount Paid" value={job.amount_paid !== undefined && job.amount_paid !== null ? `₹${(job.amount_paid).toLocaleString("en-IN")}` : null} />
          <InfoRow label="Amount Pending" value={job.cost_to_pay > 0 ? `₹${amountPending.toLocaleString("en-IN")}` : null} />
          <InfoRow label="Payment Date" value={job.payment_date} />
          <InfoRow label="Payment Notes" value={job.payment_notes} />
          {job.incentive_amount > 0 && <>
            <InfoRow label="Incentive" value={`₹${(job.incentive_amount).toLocaleString("en-IN")}`} />
            <InfoRow label="Incentive Reason" value={job.incentive_reason} />
          </>}
          {totalCost > 0 && <InfoRow label="Total Job Cost" value={<strong>₹{totalCost.toLocaleString("en-IN")}</strong>} />}
        </Card>

        {job.notes && (
          <Card title="Notes">
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.7)", lineHeight: 1.7 }}>{job.notes}</p>
          </Card>
        )}

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
            Created {job.created_at ? new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
            {job.created_by_name && ` by ${job.created_by_name}`}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProductionJobDetail;
