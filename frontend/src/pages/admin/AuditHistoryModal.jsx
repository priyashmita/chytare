import { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { History, X } from "lucide-react";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("chytare_token")}` });

const AuditHistoryModal = ({ entityType, entityId, entityName }) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/activity-logs`, {
        params: { entity_type: entityType, entity_id: entityId, limit: 50 },
        headers: authHeader(),
      });
      setLogs(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  if (!open) {
    return (
      <button onClick={handleOpen} style={{ padding: "6px", color: "rgba(27,77,62,0.4)", background: "none", border: "none", cursor: "pointer" }} title="View History">
        <History style={{ width: 15, height: 15 }} />
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={() => setOpen(false)}>
      <div style={{ background: "#FFFFF0", width: "100%", maxWidth: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(218,203,160,0.3)" }}>
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: "20px", color: "#1B4D3E", margin: 0, fontWeight: 400 }}>Audit History</h2>
            {entityName && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.45)", margin: "4px 0 0" }}>{entityName}</p>}
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,77,62,0.4)", padding: "4px" }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 24px 24px" }}>
          {loading ? (
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", textAlign: "center", padding: "40px 0" }}>Loading...</p>
          ) : logs.length === 0 ? (
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", textAlign: "center", padding: "40px 0" }}>No history recorded yet</p>
          ) : (
            logs.map((log, i) => (
              <div key={log.id || i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(218,203,160,0.18)", display: "flex", gap: "12px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#1B4D3E", marginTop: "5px", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>
                      {log.action?.split(".").pop()?.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {log.created_at ? new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : ""}
                    </span>
                  </div>
                  <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>{log.user_name || "System"}</span>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{ marginTop: "4px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.45)", background: "rgba(218,203,160,0.12)", padding: "4px 8px", wordBreak: "break-word" }}>
                      {Object.entries(log.details).map(([k, v]) => (
                        <span key={k} style={{ marginRight: "12px" }}>{k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditHistoryModal;
