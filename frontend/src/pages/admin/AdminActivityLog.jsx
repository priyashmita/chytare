import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";

const ACTION_LABELS = {
  "user.created": { label: "User Created", color: "text-emerald-700 bg-emerald-50" },
  "user.updated": { label: "User Updated", color: "text-blue-700 bg-blue-50" },
  "user.disabled": { label: "User Disabled", color: "text-red-700 bg-red-50" },
  "user.enabled": { label: "User Enabled", color: "text-emerald-700 bg-emerald-50" },
  "user.password_reset": { label: "Password Reset", color: "text-amber-700 bg-amber-50" },
  "role.created": { label: "Role Created", color: "text-emerald-700 bg-emerald-50" },
  "role.updated": { label: "Role Updated", color: "text-blue-700 bg-blue-50" },
  "role.deleted": { label: "Role Deleted", color: "text-red-700 bg-red-50" },
  "role.duplicated": { label: "Role Duplicated", color: "text-purple-700 bg-purple-50" },
};

const AdminActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/activity-logs?limit=200`);
      setLogs(res.data);
    } catch {
      console.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(
    (l) =>
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.target_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-testid="admin-activity-log">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Activity Log</h1>
          <p className="text-[#1B4D3E]/60 mt-1">Audit trail of admin actions</p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-luxury btn-luxury-secondary flex items-center gap-2 w-fit"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4D3E]/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-[#DACBA0]/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1B4D3E]/5">
              <tr>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">When</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">User</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Action</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Target</th>
                <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DACBA0]/10">
              {filtered.map((log) => {
                const meta = ACTION_LABELS[log.action] || {
                  label: log.action,
                  color: "text-gray-600 bg-gray-50",
                };

                return (
                  <tr key={log.id} className="hover:bg-[#FFFFF0]">
                    <td className="p-4 text-xs text-[#1B4D3E]/50 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E]">{log.user_name}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#1B4D3E]/60">
                      {log.target_type && <span className="capitalize">{log.target_type}</span>}
                      {log.target_id && (
                        <span className="text-[#1B4D3E]/30 ml-1 font-mono">
                          {log.target_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-[#1B4D3E]/50 max-w-xs truncate">
                      {Object.entries(log.details || {})
                        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                        .join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#1B4D3E]/50">No logs found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminActivityLog;
