import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const PRESET_TAGS = ["VIP", "repeat", "wholesale", "retail", "gifting", "international"];

const TAG_COLORS = {
  VIP:       { bg: "#FFF8E1", border: "#F59E0B", text: "#92400E" },
  repeat:    { bg: "#ECFDF5", border: "#10B981", text: "#065F46" },
  wholesale: { bg: "#EEF2FF", border: "#6366F1", text: "#3730A3" },
  retail:    { bg: "#F0FDF4", border: "#22C55E", text: "#14532D" },
  default:   { bg: "rgba(218,203,160,0.15)", border: "rgba(218,203,160,0.5)", text: "#1B4D3E" },
};

function Tag({ label, onRemove }) {
  const c = TAG_COLORS[label] || TAG_COLORS.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontFamily: SANS, fontSize: "11px", padding: "3px 8px", borderRadius: "20px", background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontWeight: 600 }}>
      {label}
      {onRemove && (
        <button onClick={() => onRemove(label)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text, fontSize: "12px", lineHeight: 1, padding: 0, opacity: 0.6 }}>×</button>
      )}
    </span>
  );
}

const ORDER_STATUS_COLORS = {
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  closed: "bg-gray-100 text-gray-600",
};

const AdminClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [preferences, setPreferences] = useState({ occasions: [], styles: [], categories: [] });
  const [prefInput, setPrefInput] = useState({ occasions: "", styles: "", categories: "" });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/clients/${id}`);
      const c = res.data;
      setClient(c);
      setNotes(c.internal_notes || "");
      setTags(c.tags || []);
      setPreferences(c.preferences || { occasions: [], styles: [], categories: [] });
    } catch {
      toast.error("Client not found");
      navigate("/admin/clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [id]);

  const save = async (patch) => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/clients/${id}`, patch);
      toast.success("Saved");
      fetch();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = () => { save({ internal_notes: notes }); setEditNotes(false); };

  const addTag = (t) => {
    const clean = (t || newTag).trim();
    if (!clean || tags.includes(clean)) return;
    const next = [...tags, clean];
    setTags(next);
    setNewTag("");
    save({ tags: next });
  };

  const removeTag = (t) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    save({ tags: next });
  };

  const addPref = (field) => {
    const v = prefInput[field].trim();
    if (!v) return;
    const current = preferences[field] || [];
    if (current.includes(v)) return;
    const next = { ...preferences, [field]: [...current, v] };
    setPreferences(next);
    setPrefInput(p => ({ ...p, [field]: "" }));
    save({ preferences: next });
  };

  const removePref = (field, v) => {
    const next = { ...preferences, [field]: (preferences[field] || []).filter(x => x !== v) };
    setPreferences(next);
    save({ preferences: next });
  };

  if (loading) return <div style={{ padding: "40px", fontFamily: SANS, color: "rgba(27,77,62,0.4)" }}>Loading…</div>;
  if (!client) return null;

  const orders = client._orders || [];
  const enquiries = client._enquiries || [];

  return (
    <div style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <button onClick={() => navigate("/admin/clients")} style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "8px" }}>
          ← Clients
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>{client.name || "Unknown"}</h1>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{client.client_code}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center", padding: "12px 20px", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
              <p style={{ fontFamily: SANS, fontSize: "20px", fontWeight: 700, color: "#1B4D3E" }}>{client.total_orders}</p>
              <p style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>Orders</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px 20px", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
              <p style={{ fontFamily: SANS, fontSize: "20px", fontWeight: 700, color: "#1B4D3E" }}>
                {client.total_spent_inr > 0 ? `₹${Number(client.total_spent_inr).toLocaleString("en-IN")}` : "—"}
              </p>
              <p style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>Total Spent</p>
            </div>
            <div style={{ textAlign: "center", padding: "12px 20px", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
              <p style={{ fontFamily: SANS, fontSize: "20px", fontWeight: 700, color: "#1B4D3E" }}>{client.total_enquiries}</p>
              <p style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>Enquiries</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* Left col: Contact + Tags + Notes + Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Contact info */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>Contact</h2>
            {[
              ["Email", client.email],
              ["Phone", client.phone],
              ["City", client.city],
              ["Country", client.country],
              ["First seen", client.first_activity_at ? new Date(client.first_activity_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"],
              ["Last active", client.last_activity_at ? new Date(client.last_activity_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"],
            ].map(([label, value]) => value ? (
              <div key={label} style={{ display: "flex", gap: "12px", paddingBottom: "8px", marginBottom: "8px", borderBottom: "1px solid rgba(218,203,160,0.15)" }}>
                <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", width: "80px", flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{value}</span>
              </div>
            ) : null)}
          </section>

          {/* Tags */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E", marginBottom: "12px" }}>Tags</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {tags.length === 0 && <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.3)" }}>No tags</span>}
              {tags.map(t => <Tag key={t} label={t} onRemove={removeTag} />)}
            </div>
            {/* Preset tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
              {PRESET_TAGS.filter(t => !tags.includes(t)).map(t => (
                <button key={t} onClick={() => addTag(t)} style={{ fontFamily: SANS, fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "transparent", border: "1px dashed rgba(218,203,160,0.6)", color: "rgba(27,77,62,0.5)", cursor: "pointer" }}>
                  + {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Custom tag..."
                style={{ fontFamily: SANS, fontSize: "12px", flex: 1, height: "32px", padding: "0 10px", border: "1px solid rgba(218,203,160,0.5)", outline: "none" }}
              />
              <button onClick={() => addTag()} style={{ fontFamily: SANS, fontSize: "12px", padding: "0 12px", background: "#1B4D3E", color: "#FFFFF0", border: "none", cursor: "pointer" }}>Add</button>
            </div>
          </section>

          {/* Internal notes */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Internal Notes</h2>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)} style={{ fontFamily: SANS, fontSize: "11px", color: "#1B4D3E", background: "none", border: "1px solid rgba(218,203,160,0.5)", padding: "3px 10px", cursor: "pointer" }}>Edit</button>
              )}
            </div>
            {editNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Private notes about this client — preferences, history, context..."
                  style={{ fontFamily: SANS, fontSize: "13px", width: "100%", minHeight: "80px", padding: "10px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={saveNotes} disabled={saving} style={{ fontFamily: SANS, fontSize: "12px", padding: "6px 14px", background: "#1B4D3E", color: "#FFFFF0", border: "none", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>Save</button>
                  <button onClick={() => { setEditNotes(false); setNotes(client.internal_notes || ""); }} style={{ fontFamily: SANS, fontSize: "12px", padding: "6px 14px", background: "none", border: "1px solid rgba(218,203,160,0.5)", color: "#1B4D3E", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: SANS, fontSize: "13px", color: notes ? "#1B4D3E" : "rgba(27,77,62,0.3)", lineHeight: "1.6" }}>
                {notes || "No notes yet"}
              </p>
            )}
          </section>

          {/* Preferences (for future personal shopper) */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <div style={{ marginBottom: "4px", display: "flex", alignItems: "baseline", gap: "8px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Preferences</h2>
              <span style={{ fontFamily: SANS, fontSize: "10px", color: "rgba(27,77,62,0.35)", letterSpacing: "0.08em" }}>FOR PERSONAL SHOPPER</span>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginBottom: "16px" }}>Capture what this client loves — feeds future recommendations.</p>
            {[
              { key: "occasions", label: "Occasions", placeholder: "e.g. wedding, festive, casual" },
              { key: "styles", label: "Styles / Aesthetics", placeholder: "e.g. Banarasi, minimalist" },
              { key: "categories", label: "Categories", placeholder: "e.g. sarees, dupattas" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: "14px" }}>
                <label style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", display: "block", marginBottom: "6px" }}>{label}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                  {(preferences[key] || []).map(v => (
                    <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontFamily: SANS, fontSize: "11px", padding: "2px 8px", background: "rgba(218,203,160,0.15)", border: "1px solid rgba(218,203,160,0.4)", color: "#1B4D3E" }}>
                      {v}
                      <button onClick={() => removePref(key, v)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,77,62,0.5)", fontSize: "12px", padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={prefInput[key]}
                    onChange={e => setPrefInput(p => ({ ...p, [key]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addPref(key)}
                    placeholder={placeholder}
                    style={{ fontFamily: SANS, fontSize: "12px", flex: 1, height: "30px", padding: "0 8px", border: "1px solid rgba(218,203,160,0.4)", outline: "none" }}
                  />
                  <button onClick={() => addPref(key)} style={{ fontFamily: SANS, fontSize: "11px", padding: "0 10px", background: "rgba(27,77,62,0.08)", border: "1px solid rgba(218,203,160,0.4)", color: "#1B4D3E", cursor: "pointer" }}>+</button>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Right col: Orders + Enquiries */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Orders */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>
              Orders
              {orders.length > 0 && <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginLeft: "6px", fontWeight: 400 }}>({orders.length})</span>}
            </h2>
            {orders.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.3)" }}>No orders yet.</p>
            ) : (
              <div>
                {orders.map((o, i) => (
                  <Link key={o.id} to={`/admin/orders/${o.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < orders.length - 1 ? "1px solid rgba(218,203,160,0.15)" : "none", textDecoration: "none" }}>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>{o.order_code}</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {o.channel && ` · ${o.channel}`}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>
                        ₹{Number(o.total_amount_inr || o.total_amount || 0).toLocaleString("en-IN")}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[o.order_status] || "bg-gray-100 text-gray-600"}`}>
                        {o.order_status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Enquiries */}
          <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>
              Enquiries
              {enquiries.length > 0 && <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginLeft: "6px", fontWeight: 400 }}>({enquiries.length})</span>}
            </h2>
            {enquiries.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.3)" }}>No enquiries yet.</p>
            ) : (
              <div>
                {enquiries.map((e, i) => (
                  <Link key={e.id} to={`/admin/enquiries/${e.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < enquiries.length - 1 ? "1px solid rgba(218,203,160,0.15)" : "none", textDecoration: "none" }}>
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>{e.enquiry_code}</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>
                        {new Date(e.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {e.product_name && ` · ${e.product_name}`}
                      </p>
                      {e.message && (
                        <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.5)", marginTop: "2px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.message}
                        </p>
                      )}
                    </div>
                    <span style={{ fontFamily: SANS, fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: e.status === "converted" ? "#ECFDF5" : "rgba(218,203,160,0.2)", color: e.status === "converted" ? "#065F46" : "#1B4D3E", flexShrink: 0 }}>
                      {e.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default AdminClientDetail;
