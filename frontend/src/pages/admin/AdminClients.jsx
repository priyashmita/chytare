import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const TAG_COLORS = {
  VIP:       { bg: "#FFF8E1", border: "#F59E0B", text: "#92400E" },
  repeat:    { bg: "#ECFDF5", border: "#10B981", text: "#065F46" },
  wholesale: { bg: "#EEF2FF", border: "#6366F1", text: "#3730A3" },
  retail:    { bg: "#F0FDF4", border: "#22C55E", text: "#14532D" },
  default:   { bg: "rgba(218,203,160,0.15)", border: "rgba(218,203,160,0.5)", text: "#1B4D3E" },
};

function Tag({ label }) {
  const c = TAG_COLORS[label] || TAG_COLORS.default;
  return (
    <span style={{ fontFamily: SANS, fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontWeight: 600 }}>
      {label}
    </span>
  );
}

const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async (q = "") => {
    setLoading(true);
    try {
      const params = q ? { search: q } : {};
      const res = await axios.get(`${API}/admin/clients`, { params });
      setClients(res.data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(window._clientSearchTimer);
    window._clientSearchTimer = setTimeout(() => fetchClients(v), 350);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Clients</h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
            Auto-built from orders and enquiries. One profile per email.
          </p>
        </div>
        <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "20px" }}>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by name, email, phone, or client code..."
          style={{ fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px", padding: "0 14px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: "64px", background: "rgba(218,203,160,0.1)", borderRadius: "2px" }} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(27,77,62,0.4)" }}>
          <p style={{ fontFamily: SERIF, fontSize: "20px" }}>No clients yet</p>
          <p style={{ fontFamily: SANS, fontSize: "13px", marginTop: "8px" }}>
            Client profiles are created automatically when you add orders or enquiries with an email address.
          </p>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 100px 120px 100px", gap: "0", borderBottom: "1px solid rgba(218,203,160,0.3)", padding: "10px 16px" }}>
            {["Code", "Client", "Email / Phone", "Orders", "Spent (INR)", "Last Active"].map(h => (
              <span key={h} style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>{h}</span>
            ))}
          </div>

          {clients.map((c, i) => (
            <div
              key={c.id}
              onClick={() => navigate(`/admin/clients/${c.id}`)}
              style={{ display: "grid", gridTemplateColumns: "90px 1fr 160px 100px 120px 100px", gap: "0", padding: "14px 16px", borderBottom: i < clients.length - 1 ? "1px solid rgba(218,203,160,0.15)" : "none", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(218,203,160,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", fontWeight: 600 }}>{c.client_code}</span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 600 }}>{c.name || "—"}</span>
                {c.tags?.map(t => <Tag key={t} label={t} />)}
              </div>

              <div>
                <p style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E" }}>{c.email || "—"}</p>
                {c.phone && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>{c.phone}</p>}
              </div>

              <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>
                {c.total_orders || 0}
                {c.total_enquiries > 0 && (
                  <span style={{ fontSize: "11px", color: "rgba(27,77,62,0.4)", marginLeft: "4px" }}>+{c.total_enquiries} enq</span>
                )}
              </span>

              <span style={{ fontFamily: SANS, fontSize: "13px", color: c.total_spent_inr > 0 ? "#1B4D3E" : "rgba(27,77,62,0.3)" }}>
                {c.total_spent_inr > 0 ? `₹${Number(c.total_spent_inr).toLocaleString("en-IN")}` : "—"}
              </span>

              <span style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>
                {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClients;
