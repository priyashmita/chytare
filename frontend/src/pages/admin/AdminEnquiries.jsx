import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Search, Eye, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Excel export utility
const exportToExcel = async (endpoint, filename) => {
  try {
    const res = await axios.get(endpoint);
    const data = res.data;
    if (!data || data.length === 0) return toast.error("No data to export");
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  } catch { toast.error("Export failed"); }
};


const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const STATUS_STYLE = {
  new:         { bg: "rgba(27,77,62,0.08)",     color: "#1B4D3E" },
  contacted:   { bg: "rgba(218,203,160,0.25)",  color: "#8a7340" },
  negotiating: { bg: "rgba(100,120,200,0.1)",   color: "#3a4a9a" },
  converted:   { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d" },
  closed:      { bg: "rgba(192,128,129,0.12)",  color: "#8a4445" },
};

const SOURCE_STYLE = {
  website:   "rgba(27,77,62,0.06)",
  whatsapp:  "rgba(37,211,102,0.1)",
  instagram: "rgba(228,64,95,0.1)",
  phone:     "rgba(218,203,160,0.2)",
  showroom:  "rgba(100,120,200,0.1)",
  other:     "rgba(180,180,180,0.1)",
};

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [meta, setMeta] = useState({ sources: [], statuses: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchMeta(); fetchEnquiries(); }, []);
  useEffect(() => { fetchEnquiries(); }, [filterStatus, filterSource, filterProduct]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/enquiries/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchEnquiries = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.enquiry_source = filterSource;
      if (filterProduct) params.product_id = filterProduct;
      const res = await axios.get(`${API}/admin/enquiries/enhanced`, { params });
      setEnquiries(res.data);
    } catch { toast.error("Failed to load enquiries"); }
    finally { setLoading(false); }
  };

  const filtered = enquiries.filter(e =>
    !search ||
    e.enquiry_code?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    e.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { new: 0, contacted: 0, negotiating: 0, converted: 0, closed: 0 };
  enquiries.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++; });

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Enquiries</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{enquiries.length} total enquiries</p>
          </div>
          <button onClick={() => navigate("/admin/enquiries/new")} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Plus style={{ width: 16, height: 16 }} /> New Enquiry
          </button>
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {Object.entries(counts).map(([status, count]) => (
            <button key={status} onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
              style={{ ...STATUS_STYLE[status], fontFamily: SANS, fontSize: "12px", padding: "6px 14px", letterSpacing: "0.05em", border: filterStatus === status ? `1px solid ${STATUS_STYLE[status]?.color}` : "1px solid transparent", cursor: "pointer" }}>
              {count} {status}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, name, email, product..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
          </div>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "140px" }}>
            <option value="">All Sources</option>
            {meta.sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "180px" }}>
            <option value="">All Products</option>
            {meta.products.map(p => <option key={p.id} value={p.id}>{p.product_code} — {p.product_name}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(5)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)" }}>No enquiries found</p>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(27,77,62,0.04)" }}>
                <tr>
                  {["Code", "Customer", "Product", "Source", "Message", "Status", "Date", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const statusStyle = STATUS_STYLE[e.status] || STATUS_STYLE.new;
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)", cursor: "pointer" }}
                      onClick={() => navigate(`/admin/enquiries/${e.id}`)}>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", color: "#1B4D3E" }}>{e.enquiry_code || e.id?.slice(0,8).toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{e.customer_name}</p>
                        <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{e.customer_email || e.customer_phone || ""}</p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.product_name || "—"}</p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: SANS, fontSize: "11px", background: SOURCE_STYLE[e.enquiry_source] || SOURCE_STYLE.other, color: "#1B4D3E", padding: "3px 8px", textTransform: "capitalize" }}>
                          {e.enquiry_source || "website"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", maxWidth: "200px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500 }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                          {e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }} onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => navigate(`/admin/enquiries/${e.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View">
                          <Eye style={{ width: 15, height: 15 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEnquiries;
