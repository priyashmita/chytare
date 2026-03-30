import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Lock, AlertTriangle, ChevronDown, ChevronRight,
  ExternalLink, Globe, EyeOff, GitBranch,
} from "lucide-react";
import { API } from "@/App";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
});

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  planned:    "bg-yellow-100 text-yellow-800",
  in_progress:"bg-blue-100 text-blue-800",
  completed:  "bg-green-100 text-green-800",
  cancelled:  "bg-red-100 text-red-800",
};

const LISTING_META = {
  backend_only:    { label: "Internal only", color: "bg-gray-100 text-gray-600",   icon: EyeOff },
  website_linked:  { label: "Website linked", color: "bg-blue-100 text-blue-700",  icon: Globe },
  website_listed:  { label: "Listed publicly", color: "bg-green-100 text-green-700", icon: Globe },
};

function Badge({ label, colorClass = "bg-gray-100 text-gray-600" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wide w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function ProgressBar({ pct }) {
  const c = Math.min(100, Math.max(0, pct));
  const col = c === 100 ? "bg-green-500" : c >= 60 ? "bg-blue-500" : c >= 30 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${col} h-2 rounded-full transition-all`} style={{ width: `${c}%` }} />
    </div>
  );
}

function LockBanner({ lockStatus, userRole }) {
  if (!lockStatus) return null;
  const isSA = userRole === "super_admin";
  if (lockStatus.is_locked) {
    return (
      <div className={`flex items-start gap-3 px-4 py-3 rounded border ${isSA ? "bg-amber-50 border-amber-300" : "bg-red-50 border-red-200"}`}>
        <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${isSA ? "text-amber-600" : "text-red-500"}`} />
        <div>
          <p className={`text-sm font-medium ${isSA ? "text-amber-800" : "text-red-700"}`}>
            {isSA ? "Locked — Super Admin override available" : "This record is locked"}
          </p>
          <p className="text-xs mt-0.5 text-gray-500">
            Locked {lockStatus.locked_at ? new Date(lockStatus.locked_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}.
            {isSA ? " You can edit — a reason will be required." : " Only Super Admin can edit."}
          </p>
        </div>
      </div>
    );
  }
  if (lockStatus.hours_until_lock !== null && lockStatus.hours_until_lock < 24) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded border bg-yellow-50 border-yellow-200">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
        <p className="text-sm text-yellow-800">
          Auto-locks in <span className="font-bold">{lockStatus.hours_until_lock}h</span>
        </p>
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// LISTING STATUS PANEL (post-completion decision)
// ─────────────────────────────────────────────────────────────

function ListingStatusPanel({ job, onAction }) {
  const [loading, setLoading] = useState(false);
  const status = job._listing_status;
  const websiteId = job._website_product_id;
  const meta = LISTING_META[status] || LISTING_META.backend_only;
  const Icon = meta.icon;

  const handleCreateWebsiteProduct = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/api/admin/production-jobs/${job.id}/create-website-product`,
        {},
        authHeader()
      );
      // Navigate to product edit page with prefilled data via state
      onAction("create_product", res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not prefill product data");
    } finally {
      setLoading(false);
    }
  };

  const handleKeepInternal = async () => {
    if (!window.confirm("Mark this as internal only? No public listing will be created.")) return;
    setLoading(true);
    try {
      await axios.post(
        `${API}/api/admin/production-jobs/${job.id}/keep-internal`,
        {},
        authHeader()
      );
      toast.success("Marked as internal only");
      onAction("refresh");
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Website Listing Status</h2>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
          <Icon className="w-3 h-3" /> {meta.label}
        </span>
      </div>

      {/* Already linked */}
      {websiteId && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700 flex items-center gap-2">
          <Globe className="w-4 h-4 shrink-0" />
          <span>Linked to website product.</span>
          <Link
            to={`/admin/products/${websiteId}/edit`}
            className="underline font-medium flex items-center gap-1"
          >
            View product <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Decision buttons — only shown on completed jobs without a decision yet */}
      {job.status === "completed" && !websiteId && status !== "backend_only" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            This job is complete. Choose what to do with the finished pieces:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreateWebsiteProduct}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 bg-[#1B4D3E] text-[#FFFFF0] rounded text-sm font-medium hover:bg-[#163d31] disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              Create Website Product
            </button>
            <button
              onClick={handleKeepInternal}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-600 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" />
              Keep Internal Only
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Or{" "}
            <Link to="/admin/products" className="underline text-[#1B4D3E]">
              find an existing product
            </Link>{" "}
            to link manually.
          </p>
        </div>
      )}

      {/* Already marked internal */}
      {status === "backend_only" && !websiteId && (
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <EyeOff className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p>Marked as internal only. This work will not appear on the website.</p>
            {job.status === "completed" && (
              <button
                onClick={handleCreateWebsiteProduct}
                disabled={loading}
                className="mt-2 text-xs text-[#1B4D3E] underline"
              >
                Changed your mind? Create website product →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHILD JOBS SECTION
// ─────────────────────────────────────────────────────────────

function ChildJobsSection({ children, parentJobCode }) {
  const [open, setOpen] = useState(true);
  if (!children || children.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Sub-Jobs ({children.length})
          </h2>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100">
          {children.map(c => (
            <Link
              key={c.id}
              to={`/admin/production-jobs/${c.id}`}
              className="flex items-center justify-between px-5 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400">{c.job_code}</span>
                <span className="text-sm text-gray-700">{c.work_type || "—"}</span>
                <span className="text-xs text-gray-400">{c.supplier_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {c.quantity_completed || 0} / {c.quantity_planned} pcs
                </span>
                <Badge
                  label={c.status.replace("_", " ")}
                  colorClass={STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}
                />
              </div>
            </Link>
          ))}
          <div className="px-5 py-3">
            <Link
              to={`/admin/production-jobs/new?parent_job_id=CURRENT_ID`}
              className="text-xs text-[#1B4D3E] underline"
            >
              + Add sub-job
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function AdminProductionJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [reports, setReports] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ progress_pct: "", note: "", attachment_url: "" });
  const [reportSaving, setReportSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [showQcForm, setShowQcForm] = useState(false);
  const [qcForm, setQcForm] = useState({ qc_status: "passed", qc_notes: "", qc_date: "" });
  const [qcSaving, setQcSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, reportsRes, allocRes] = await Promise.allSettled([
        axios.get(`${API}/api/admin/production-jobs/${id}`, authHeader()),
        axios.get(`${API}/api/admin/production-jobs/${id}/progress-reports`, authHeader()),
        axios.get(`${API}/api/admin/material-allocations?production_job_id=${id}`, authHeader()),
      ]);
      if (jobRes.status === "fulfilled") setJob(jobRes.value.data);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value.data);
      if (allocRes.status === "fulfilled") setAllocations(allocRes.value.data);
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API}/api/upload`, form, authHeader());
      setReportForm(f => ({ ...f, attachment_url: res.data.url }));
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportForm.progress_pct && reportForm.progress_pct !== 0) {
      toast.error("Progress % is required"); return;
    }
    if (!reportForm.note.trim()) { toast.error("Note is required"); return; }
    setReportSaving(true);
    try {
      await axios.post(
        `${API}/api/admin/production-jobs/${id}/progress-reports`,
        { progress_pct: parseInt(reportForm.progress_pct), note: reportForm.note, attachment_url: reportForm.attachment_url || null },
        authHeader()
      );
      toast.success("Progress report added");
      setReportForm({ progress_pct: "", note: "", attachment_url: "" });
      setShowReportForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save report");
    } finally {
      setReportSaving(false);
    }
  };

  const handleJobAction = async (action) => {
    if (!window.confirm({ start: "Start this job?", cancel: "Cancel this job?" }[action])) return;
    try {
      await axios.post(`${API}/api/admin/production-jobs/${id}/${action}`, {}, authHeader());
      toast.success(action === "start" ? "Job started" : "Job cancelled");
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Action failed");
    }
  };

  const handleListingAction = (action, data) => {
    if (action === "refresh") { fetchAll(); return; }
    if (action === "create_product") {
      sessionStorage.setItem("product_prefill", JSON.stringify(data));
      navigate("/admin/products/new?from_job=true");
    }
  };

  const handleQcSubmit = async () => {
    if (!qcForm.qc_status) { toast.error("QC status is required"); return; }
    setQcSaving(true);
    try {
      await axios.post(
        `${API}/api/admin/production-jobs/${id}/qc`,
        { qc_status: qcForm.qc_status, qc_notes: qcForm.qc_notes || null, qc_date: qcForm.qc_date || null },
        authHeader()
      );
      toast.success("QC recorded");
      setShowQcForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save QC");
    } finally {
      setQcSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading job details…</div>;
  if (!job) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 text-sm mb-4">Job not found.</p>
      <button onClick={() => navigate("/admin/production-jobs")} className="text-sm text-green-700 underline">
        ← Production Jobs
      </button>
    </div>
  );

  const latestProgress = reports.length > 0 ? reports[0].progress_pct : job.latest_progress_pct ?? null;
  const canStart = job.status === "planned";
  const canCancel = !["completed", "cancelled"].includes(job.status);
  const canReport = !["cancelled", "completed"].includes(job.status);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/admin/production-jobs")}
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
          >
            ← Production Jobs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{job.job_code}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{job.product_name}</p>

          {/* Parent job breadcrumb */}
          {job._parent_job?.job_code && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
              <GitBranch className="w-3 h-3" />
              Sub-job of{" "}
              <Link
                to={`/admin/production-jobs/${job.parent_job_id}`}
                className="text-[#1B4D3E] underline"
              >
                {job._parent_job.job_code}
              </Link>
              <Badge
                label={job._parent_job.status.replace("_", " ")}
                colorClass={STATUS_COLORS[job._parent_job.status] || "bg-gray-100 text-gray-600"}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge label={job.status.replace("_", " ")} colorClass={STATUS_COLORS[job.status] || "bg-gray-100 text-gray-700"} />
          {canStart && (
            <button
              onClick={() => handleJobAction("start")}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Start Job
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleJobAction("cancel")}
              className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          )}
          <Link
            to={`/admin/production-jobs/${id}/edit`}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Progress snapshot */}
      {latestProgress !== null && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{latestProgress}%</span>
          </div>
          <ProgressBar pct={latestProgress} />
        </div>
      )}

      {/* Job details */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Job Details</h2>
          {job.supplier_provides_materials && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
              End-to-end supplier — materials included
            </span>
          )}
        </div>
        <InfoRow label="Job Code" value={job.job_code} />
        <InfoRow label="Product" value={job._product?.product_name ? `${job._product.product_code} — ${job._product.product_name}` : job.product_name} />
        <InfoRow label="Supplier" value={`${job.supplier_code || ""} ${job.supplier_name || ""}`.trim()} />
        <InfoRow label="Work Type" value={job.work_type} />
        <InfoRow label="Qty Planned" value={`${job.quantity_planned} pieces`} />
        <InfoRow label="Qty Completed" value={job.quantity_completed ? `${job.quantity_completed} pieces` : null} />
        <InfoRow label="Start Date" value={job.start_date} />
        <InfoRow label="Proposed End" value={job.proposed_end_date} />
        <InfoRow label="Due Date" value={job.due_date} />
        <InfoRow label="Actual Completion" value={job.actual_completion_date} />
        <InfoRow label="Cost to Pay" value={job.cost_to_pay ? `₹${Number(job.cost_to_pay).toLocaleString("en-IN")}` : null} />
        <InfoRow label="Amount Paid" value={job.amount_paid ? `₹${Number(job.amount_paid).toLocaleString("en-IN")}` : null} />
        {job.qc_status && (
          <InfoRow
            label="QC Status"
            value={
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                job.qc_status === "passed" ? "bg-green-100 text-green-700" :
                job.qc_status === "failed" ? "bg-red-100 text-red-700" :
                job.qc_status === "conditional" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-600"
              }`}>{job.qc_status.charAt(0).toUpperCase() + job.qc_status.slice(1)}</span>
            }
          />
        )}
        {job.qc_notes && <InfoRow label="QC Notes" value={job.qc_notes} />}
        {job.qc_date && <InfoRow label="QC Date" value={job.qc_date} />}
        {job.notes && <InfoRow label="Notes" value={job.notes} />}
      </div>

      {/* Child jobs */}
      <ChildJobsSection children={job._child_jobs} parentJobCode={job.job_code} />

      {/* Material Allocations */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Material Allocations
            {allocations.length > 0 && (
              <span className="ml-2 text-xs text-gray-400 font-normal">({allocations.length})</span>
            )}
          </h2>
          {!job.supplier_provides_materials && (
            <Link
              to={`/admin/material-allocations/new?job_id=${id}`}
              className="text-xs text-[#1B4D3E] underline"
            >
              + Allocate Material
            </Link>
          )}
        </div>
        {job.supplier_provides_materials ? (
          <p className="text-xs text-gray-400 italic">
            Not applicable — supplier sources all materials for this job.
          </p>
        ) : allocations.length === 0 ? (
          <p className="text-xs text-gray-400">No materials allocated yet.</p>
        ) : (
          <div className="space-y-0">
            {allocations.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium text-gray-800 text-sm">{a.material_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{a.allocation_code}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{a.quantity_allocated} {a.unit_of_measure} allocated</span>
                  {a.quantity_used > 0 && (
                    <span className="text-green-600">{a.quantity_used} used</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website Listing Status — shown when completed */}
      {job.status === "completed" && (
        <ListingStatusPanel job={job} onAction={handleListingAction} />
      )}

      {/* QC — shown for end-to-end jobs */}
      {job.supplier_provides_materials && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Quality Control</h2>
            {!showQcForm && (
              <button
                onClick={() => {
                  setQcForm({ qc_status: job.qc_status || "passed", qc_notes: job.qc_notes || "", qc_date: job.qc_date || "" });
                  setShowQcForm(true);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31]"
              >
                {job.qc_status ? "Update QC" : "Record QC"}
              </button>
            )}
          </div>
          {!job.qc_status && !showQcForm && (
            <p className="text-xs text-gray-400">No QC recorded yet. This is an end-to-end job — record QC when goods are received.</p>
          )}
          {showQcForm && (
            <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0] rounded-lg space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">QC Status <span className="text-red-400">*</span></label>
                <select
                  value={qcForm.qc_status}
                  onChange={e => setQcForm(f => ({ ...f, qc_status: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                >
                  <option value="passed">Passed</option>
                  <option value="conditional">Conditional (minor issues noted)</option>
                  <option value="failed">Failed (returned to supplier)</option>
                  <option value="pending">Pending inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">QC Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                  placeholder="Any observations, defects found, rework instructions..."
                  value={qcForm.qc_notes}
                  onChange={e => setQcForm(f => ({ ...f, qc_notes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">QC Date</label>
                <input
                  type="date"
                  value={qcForm.qc_date}
                  onChange={e => setQcForm(f => ({ ...f, qc_date: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleQcSubmit} disabled={qcSaving}
                  className="px-4 py-1.5 text-sm font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31] disabled:opacity-50">
                  {qcSaving ? "Saving…" : "Save QC"}
                </button>
                <button onClick={() => setShowQcForm(false)}
                  className="px-4 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Reports */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Progress Reports</h2>
          {canReport && !showReportForm && (
            <button
              onClick={() => setShowReportForm(true)}
              className="px-3 py-1.5 text-xs font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31]"
            >
              + Add Report
            </button>
          )}
        </div>

        {showReportForm && (
          <div className="mb-5 p-4 bg-[#FFFFF0] border border-[#DACBA0] rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Progress Report</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Progress — <span className="font-semibold text-gray-800">{reportForm.progress_pct || 0}%</span>
              </label>
              <input
                type="range" min="0" max="100" step="5"
                value={reportForm.progress_pct || 0}
                onChange={e => setReportForm(f => ({ ...f, progress_pct: e.target.value }))}
                className="w-full accent-[#1B4D3E]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              {reportForm.progress_pct !== "" && (
                <div className="mt-2"><ProgressBar pct={parseInt(reportForm.progress_pct)} /></div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                placeholder="What has been done? Any issues?"
                value={reportForm.note}
                onChange={e => setReportForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Attachment (optional)</label>
              {reportForm.attachment_url ? (
                <div className="flex items-center gap-2">
                  <a href={reportForm.attachment_url} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 underline truncate max-w-xs">View file</a>
                  <button onClick={() => setReportForm(f => ({ ...f, attachment_url: "" }))}
                    className="text-xs text-red-400">Remove</button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400">
                  {uploading ? "Uploading…" : "Upload file / photo"}
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    disabled={uploading} onChange={handleAttachmentUpload} />
                </label>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleReportSubmit} disabled={reportSaving || uploading}
                className="px-4 py-1.5 text-sm font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31] disabled:opacity-50">
                {reportSaving ? "Saving…" : "Save Report"}
              </button>
              <button
                onClick={() => { setShowReportForm(false); setReportForm({ progress_pct: "", note: "", attachment_url: "" }); }}
                className="px-4 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {reports.length === 0 ? (
          <p className="text-xs text-gray-400">No progress reports yet.</p>
        ) : (
          <div className="space-y-4">
            {reports.map((r, i) => (
              <div key={r.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-[#1B4D3E]" : "bg-gray-300"}`} />
                  {i < reports.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{r.progress_pct}%</span>
                    <div className="flex-1 min-w-[100px]"><ProgressBar pct={r.progress_pct} /></div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="text-xs text-gray-400">{r.created_by_name}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.note}</p>
                  {r.attachment_url && (
                    <a href={r.attachment_url} target="_blank" rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 underline">
                      📎 View attachment
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
