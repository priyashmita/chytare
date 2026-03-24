import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
});

const STATUS_COLORS = {
  planned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function Badge({ label, colorClass }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wide w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function ProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped === 100 ? "bg-green-500" : clamped >= 60 ? "bg-blue-500" : clamped >= 30 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await axios.post(`${API}/api/upload`, form, authHeader());
      setReportForm((f) => ({ ...f, attachment_url: res.data.url }));
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportForm.progress_pct && reportForm.progress_pct !== 0) {
      toast.error("Progress % is required");
      return;
    }
    if (!reportForm.note.trim()) {
      toast.error("Note is required");
      return;
    }
    setReportSaving(true);
    try {
      await axios.post(
        `${API}/api/admin/production-jobs/${id}/progress-reports`,
        {
          progress_pct: parseInt(reportForm.progress_pct),
          note: reportForm.note,
          attachment_url: reportForm.attachment_url || null,
        },
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
    const confirmMsg = {
      start: "Start this production job?",
      cancel: "Cancel this job? This cannot be undone.",
    }[action];
    if (!window.confirm(confirmMsg)) return;
    try {
      if (action === "start") {
        await axios.post(`${API}/api/admin/production-jobs/${id}/start`, {}, authHeader());
        toast.success("Job started");
      } else if (action === "cancel") {
        await axios.post(`${API}/api/admin/production-jobs/${id}/cancel`, {}, authHeader());
        toast.success("Job cancelled");
      }
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Action failed");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">Loading job details…</div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-sm mb-4">Job not found.</p>
        <button onClick={() => navigate("/admin/production-jobs")} className="text-sm text-green-700 underline">
          Back to Production Jobs
        </button>
      </div>
    );
  }

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
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Job Details</h2>
        <InfoRow label="Job Code" value={job.job_code} />
        <InfoRow label="Product" value={`${job.product_code} — ${job.product_name}`} />
        <InfoRow label="Supplier" value={`${job.supplier_code} — ${job.supplier_name}`} />
        <InfoRow label="Work Type" value={job.work_type} />
        <InfoRow label="Qty Planned" value={`${job.quantity_planned} pieces`} />
        <InfoRow label="Qty Completed" value={job.quantity_completed ? `${job.quantity_completed} pieces` : null} />
        <InfoRow label="Start Date" value={job.start_date} />
        <InfoRow label="Proposed End" value={job.proposed_end_date} />
        <InfoRow label="Due Date" value={job.due_date} />
        <InfoRow label="Actual Completion" value={job.actual_completion_date} />
        <InfoRow label="Cost to Pay" value={job.cost_to_pay ? `₹${job.cost_to_pay.toLocaleString()}` : null} />
        <InfoRow label="Amount Paid" value={job.amount_paid ? `₹${job.amount_paid.toLocaleString()}` : null} />
        {job.notes && <InfoRow label="Notes" value={job.notes} />}
      </div>

      {/* Material Allocations */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Material Allocations</h2>
          <Link
            to={`/admin/material-allocations/new?job_id=${id}`}
            className="text-xs text-green-700 underline"
          >
            + Allocate Material
          </Link>
        </div>
        {allocations.length === 0 ? (
          <p className="text-xs text-gray-400">No materials allocated yet.</p>
        ) : (
          <div className="space-y-2">
            {allocations.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="font-medium text-gray-800">{a.material_name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{a.allocation_code}</span>
                </div>
                <span className="text-gray-600 text-xs">
                  {a.quantity_allocated} {a.unit_of_measure} allocated
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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

        {/* Add report form */}
        {showReportForm && (
          <div className="mb-5 p-4 bg-[#FFFFF0] border border-[#DACBA0] rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">New Progress Report</h3>

            {/* Progress % slider */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Progress — <span className="font-semibold text-gray-800">{reportForm.progress_pct || 0}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={reportForm.progress_pct || 0}
                onChange={(e) => setReportForm((f) => ({ ...f, progress_pct: e.target.value }))}
                className="w-full accent-[#1B4D3E]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              {reportForm.progress_pct !== "" && (
                <div className="mt-2">
                  <ProgressBar pct={parseInt(reportForm.progress_pct)} />
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note <span className="text-red-400">*</span></label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                placeholder="What has been done? Any issues or observations?"
                value={reportForm.note}
                onChange={(e) => setReportForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            {/* Attachment */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Attachment (optional)</label>
              {reportForm.attachment_url ? (
                <div className="flex items-center gap-2">
                  <a
                    href={reportForm.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline truncate max-w-xs"
                  >
                    View uploaded file
                  </a>
                  <button
                    onClick={() => setReportForm((f) => ({ ...f, attachment_url: "" }))}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400">
                  {uploading ? "Uploading…" : "Upload file / photo"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    disabled={uploading}
                    onChange={handleAttachmentUpload}
                  />
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleReportSubmit}
                disabled={reportSaving || uploading}
                className="px-4 py-1.5 text-sm font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31] disabled:opacity-50"
              >
                {reportSaving ? "Saving…" : "Save Report"}
              </button>
              <button
                onClick={() => {
                  setShowReportForm(false);
                  setReportForm({ progress_pct: "", note: "", attachment_url: "" });
                }}
                className="px-4 py-1.5 text-sm font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Reports timeline */}
        {reports.length === 0 ? (
          <p className="text-xs text-gray-400">No progress reports yet.</p>
        ) : (
          <div className="space-y-4">
            {reports.map((r, i) => (
              <div key={r.id} className="flex gap-3">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                      i === 0 ? "bg-[#1B4D3E]" : "bg-gray-300"
                    }`}
                  />
                  {i < reports.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">{r.progress_pct}%</span>
                    <ProgressBar pct={r.progress_pct} />
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-gray-400">{r.created_by_name}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.note}</p>
                  {r.attachment_url && (
                    <a
                      href={r.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 underline"
                    >
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
