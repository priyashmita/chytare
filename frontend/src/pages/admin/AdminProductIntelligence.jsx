import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const FLAG_STYLE = {
  repeat:                { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d",  label: "Repeat" },
  repeat_with_variation: { bg: "rgba(27,77,62,0.08)",    color: "#1B4D3E",  label: "Repeat w/ Variation" },
  improve:               { bg: "rgba(100,120,200,0.1)",  color: "#3a4a9a",  label: "Improve" },
  monitor:               { bg: "rgba(218,203,160,0.25)", color: "#8a7340",  label: "Monitor" },
  low_performer:         { bg: "rgba(192,128,129,0.1)",  color: "#C08081",  label: "Low Performer" },
  discontinue:           { bg: "rgba(192,128,129,0.2)",  color: "#8a4445",  label: "Discontinue" },
};

const KpiCard = ({ label, value, sub }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px 24px" }}>
    <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>{label}</p>
    <p style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>{sub}</p>}
  </div>
);

// Export utility
const exportToExcel = async (data, filename) => {
  if (!data || data.length === 0) return toast.error("No data to export");
  const headers = ["product_code","product_name","category","enquiry_count","order_count","quantity_sold","revenue","conversion_rate","current_finished_stock","average_production_days","estimated_material_cost","total_estimated_cost","estimated_margin","recommendation_flag"];
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
  toast.success("Exported");
};

const Bar = ({ value, max, color = "#1B4D3E" }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: "6px", background: "rgba(218,203,160,0.2)", borderRadius: "3px", minWidth: "60px" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px" }} />
    </div>
  );
};

const AdminProductIntelligence = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ categories: [], recommendation_flags: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterFlag, setFilterFlag] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchMeta(); fetchData(); }, []);
  useEffect(() => { fetchData(); }, [filterCategory, filterFlag]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/product-intelligence/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterFlag) params.recommendation_flag = filterFlag;
      const res = await axios.get(`${API}/admin/product-intelligence`, { params });
      setData(res.data);
    } catch { toast.error("Failed to load intelligence data"); }
    finally { setLoading(false); }
  };

  const filtered = data.filter(d =>
    !search ||
    d.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = data.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalEnquiries = data.reduce((s, d) => s + (d.enquiry_count || 0), 0);
  const totalOrders = data.reduce((s, d) => s + (d.order_count || 0), 0);
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0), 1);
  const maxEnquiries = Math.max(...data.map(d => d.enquiry_count || 0), 1);

  const flagCounts = {};
  data.forEach(d => { flagCounts[d.recommendation_flag] = (flagCounts[d.recommendation_flag] || 0) + 1; });

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Product Intelligence</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>Performance analysis across all products · v1</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={fetchData} style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", background: "rgba(27,77,62,0.06)", border: "1px solid rgba(218,203,160,0.5)", padding: "8px 16px", cursor: "pointer" }}>↻ Refresh</button>
            <button onClick={() => exportToExcel(filtered, "product_intelligence.csv")} style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", background: "white", border: "1px solid rgba(218,203,160,0.5)", padding: "8px 16px", cursor: "pointer" }}>↓ Export CSV</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <KpiCard label="Total Products" value={data.length} />
          <KpiCard label="Total Enquiries" value={totalEnquiries} />
          <KpiCard label="Total Orders" value={totalOrders} />
          <KpiCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
          <KpiCard label="Avg Conversion" value={totalEnquiries > 0 ? `${Math.round((totalOrders / totalEnquiries) * 100)}%` : "—"} />
        </div>

        {/* Recommendation Summary */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {Object.entries(FLAG_STYLE).map(([flag, style]) => (
            <button key={flag} onClick={() => setFilterFlag(filterFlag === flag ? "" : flag)}
              style={{ ...style, fontFamily: SANS, fontSize: "12px", padding: "6px 14px", border: filterFlag === flag ? `1px solid ${style.color}` : "1px solid transparent", cursor: "pointer" }}>
              {flagCounts[flag] || 0} {style.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E" }}>
            <option value="">All Categories</option>
            {meta.categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.08)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)" }}>No products found</p>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(27,77,62,0.03)" }}>
                <tr>
                  {["#", "Product", "Category", "Enquiries", "Orders", "Qty Sold", "Revenue", "Conversion", "Stock", "Flag", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const flagStyle = FLAG_STYLE[d.recommendation_flag] || FLAG_STYLE.monitor;
                  return (
                    <tr key={d.product_id} style={{ borderTop: "1px solid rgba(218,203,160,0.12)", cursor: "pointer", background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)" }}
                      onClick={() => navigate(`/admin/product-intelligence/${d.product_id}`)}>
                      <td style={{ padding: "12px 14px", fontFamily: SERIF, fontSize: "16px", color: "rgba(218,203,160,0.6)", minWidth: "30px" }}>{i + 1}</td>
                      <td style={{ padding: "12px 14px", minWidth: "180px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>{d.product_name}</p>
                        <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{d.product_code}</p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(27,77,62,0.05)", color: "#1B4D3E", padding: "2px 8px", textTransform: "capitalize" }}>{d.category}</span>
                      </td>
                      <td style={{ padding: "12px 14px", minWidth: "100px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{d.enquiry_count}</p>
                        <Bar value={d.enquiry_count} max={maxEnquiries} color="#3a4a9a" />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{d.order_count}</p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{d.quantity_sold}</p>
                      </td>
                      <td style={{ padding: "12px 14px", minWidth: "120px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>₹{(d.revenue || 0).toLocaleString("en-IN")}</p>
                        <Bar value={d.revenue} max={maxRevenue} color="#2d6e2d" />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: d.conversion_rate > 0.3 ? "#2d6e2d" : d.conversion_rate > 0 ? "#8a7340" : "rgba(27,77,62,0.3)" }}>
                          {d.enquiry_count > 0 ? `${Math.round(d.conversion_rate * 100)}%` : "—"}
                        </p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: d.current_finished_stock === 0 ? "#C08081" : "#1B4D3E", fontWeight: d.current_finished_stock === 0 ? 600 : 400 }}>
                          {d.current_finished_stock ?? "—"}
                        </p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ ...flagStyle, fontFamily: SANS, fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {flagStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>→</span>
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

export default AdminProductIntelligence;
