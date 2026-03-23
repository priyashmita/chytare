import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { TrendingUp, Package, AlertTriangle, ShoppingBag, MessageSquare, Wrench, CheckCircle, DollarSign } from "lucide-react";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

// ── KPI Card ──────────────────────────────────────────────────────────
const KpiCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <div onClick={onClick} style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px 24px", cursor: onClick ? "pointer" : "default", transition: "box-shadow 0.2s" }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,77,62,0.1)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>{title}</p>
        <p style={{ fontFamily: SERIF, fontSize: "32px", fontWeight: 400, color: color || "#1B4D3E", lineHeight: 1 }}>{value}</p>
        {subtitle && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>{subtitle}</p>}
      </div>
      <div style={{ background: `${color || "#1B4D3E"}15`, padding: "10px", borderRadius: "2px" }}>
        <Icon style={{ width: 20, height: 20, color: color || "#1B4D3E" }} />
      </div>
    </div>
  </div>
);

// ── Section Header ────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <h2 style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px", marginTop: "32px", paddingBottom: "8px", borderBottom: "1px solid rgba(218,203,160,0.3)" }}>{title}</h2>
);

// ── Chart components using Chart.js ──────────────────────────────────
const BarChart = ({ data, labelKey, valueKey, color = "#1B4D3E", height = 200 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;
    const loadChart = () => {
      const Chart = window.Chart;
      if (!Chart) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: data.map(d => d[labelKey] || "Other"),
          datasets: [{
            data: data.map(d => d[valueKey]),
            backgroundColor: color + "99",
            borderColor: color,
            borderWidth: 1,
            borderRadius: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(218,203,160,0.2)" }, ticks: { font: { family: SANS, size: 11 } } },
            x: { grid: { display: false }, ticks: { font: { family: SANS, size: 11 } } }
          }
        }
      });
    };
    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById('chartjs-script');
      if (script) script.addEventListener('load', loadChart);
    }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data || data.length === 0) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(27,77,62,0.3)", fontFamily: SANS, fontSize: "13px" }}>No data yet</div>;
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

const PieChart = ({ data, labelKey, valueKey, height = 200 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const COLORS = ["#1B4D3E", "#DACBA0", "#C08081", "#4a7c6e", "#8a7340", "#3a4a9a", "#2d6e2d", "#7a207a"];

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;
    const loadChart = () => {
      const Chart = window.Chart;
      if (!Chart) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "doughnut",
        data: {
          labels: data.map(d => d[labelKey]),
          datasets: [{
            data: data.map(d => d[valueKey]),
            backgroundColor: COLORS.slice(0, data.length),
            borderWidth: 2,
            borderColor: "#FFFFF0",
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { font: { family: SANS, size: 11 }, padding: 12, boxWidth: 12 } }
          }
        }
      });
    };
    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById('chartjs-script');
      if (script) script.addEventListener('load', loadChart);
    }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data || data.length === 0) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(27,77,62,0.3)", fontFamily: SANS, fontSize: "13px" }}>No data yet</div>;
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

const LineChart = ({ data, height = 220 }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;
    const loadChart = () => {
      const Chart = window.Chart;
      if (!Chart) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          }),
          datasets: [{
            label: "Revenue",
            data: data.map(d => d.revenue),
            borderColor: "#1B4D3E",
            backgroundColor: "rgba(27,77,62,0.05)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: "#1B4D3E",
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(218,203,160,0.2)" },
              ticks: {
                font: { family: SANS, size: 11 },
                callback: v => `₹${(v/1000).toFixed(0)}k`
              }
            },
            x: { grid: { display: false }, ticks: { font: { family: SANS, size: 10 }, maxTicksLimit: 10 } }
          }
        }
      });
    };
    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById('chartjs-script');
      if (script) script.addEventListener('load', loadChart);
    }
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data || data.length === 0) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(27,77,62,0.3)", fontFamily: SANS, fontSize: "13px" }}>No orders yet</div>;
  return <div style={{ height }}><canvas ref={canvasRef} /></div>;
};

// ── Skeleton loader ───────────────────────────────────────────────────
const Skeleton = ({ h = 80 }) => (
  <div style={{ height: h, background: "rgba(218,203,160,0.15)", animation: "pulse 1.5s infinite" }} />
);

// ── Main Dashboard ────────────────────────────────────────────────────
const AdminDashboard = () => {
  // Load Chart.js from CDN once
  useEffect(() => {
    if (!document.getElementById('chartjs-script')) {
      const script = document.createElement('script');
      script.id = 'chartjs-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/admin/dashboard/metrics`);
      setData(res.data);
    } catch (err) {
      setError("Failed to load dashboard data");
    } finally { setLoading(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString("en-IN");
  const fmtCurrency = (n) => `₹${fmt(n)}`;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Operations Dashboard</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={fetchDashboard} style={{ fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", background: "rgba(27,77,62,0.06)", border: "1px solid rgba(218,203,160,0.5)", padding: "8px 16px", cursor: "pointer" }}>
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(192,128,129,0.1)", border: "1px solid rgba(192,128,129,0.3)", padding: "16px", marginBottom: "24px", fontFamily: SANS, fontSize: "13px", color: "#C08081" }}>
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "8px" }}>
          {loading ? [...Array(8)].map((_, i) => <Skeleton key={i} h={100} />) : <>
            <KpiCard title="Open Production Jobs" value={fmt(data?.production?.open_jobs)} subtitle={`${data?.production?.overdue_jobs || 0} overdue`} icon={Wrench} color={data?.production?.overdue_jobs > 0 ? "#C08081" : "#1B4D3E"} onClick={() => navigate("/admin/production-jobs")} />
            <KpiCard title="Completed This Week" value={fmt(data?.production?.completed_this_week)} subtitle="production jobs" icon={CheckCircle} color="#2d6e2d" onClick={() => navigate("/admin/production-jobs?status=completed")} />
            <KpiCard title="Finished Goods" value={fmt(data?.inventory?.total_finished_goods)} subtitle="units available" icon={Package} color="#1B4D3E" onClick={() => navigate("/admin/inventory")} />
            <KpiCard title="Low Stock Materials" value={fmt(data?.inventory?.low_stock_count)} subtitle="need restocking" icon={AlertTriangle} color={data?.inventory?.low_stock_count > 0 ? "#C08081" : "#1B4D3E"} onClick={() => navigate("/admin/materials")} />
            <KpiCard title="New Enquiries" value={fmt(data?.enquiries?.new_this_week)} subtitle="this week" icon={MessageSquare} color="#3a4a9a" onClick={() => navigate("/admin/enquiries")} />
            <KpiCard title="Orders This Month" value={fmt(data?.orders?.this_month)} subtitle={`${data?.orders?.this_week || 0} this week`} icon={ShoppingBag} color="#1B4D3E" onClick={() => navigate("/admin/orders")} />
            <KpiCard title="Revenue This Month" value={fmtCurrency(data?.orders?.revenue_this_month)} subtitle="confirmed orders" icon={TrendingUp} color="#2d6e2d" />
            <KpiCard title="Avg Order Value" value={fmtCurrency(data?.orders?.avg_order_value)} subtitle="this month" icon={DollarSign} color="#8a7340" />
          </>}
        </div>

        {/* ── Production Section ── */}
        <SectionHeader title="Production" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
          {/* Jobs by work type */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Open Jobs by Work Type</p>
            {loading ? <Skeleton h={200} /> : <BarChart data={data?.production?.jobs_by_work_type} labelKey="work_type" valueKey="count" height={200} />}
          </div>
          {/* Open jobs table */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Open Jobs</p>
            {loading ? <Skeleton h={200} /> : (
              <div style={{ overflowY: "auto", maxHeight: "200px" }}>
                {(!data?.production?.open_jobs_list?.length) ? (
                  <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No open jobs</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Job", "Product", "Supplier", "Due", "Status"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.production?.open_jobs_list?.map((job, i) => {
                        const overdue = job.due_date && new Date(job.due_date) < new Date();
                        return (
                          <tr key={i} style={{ borderTop: "1px solid rgba(218,203,160,0.1)", cursor: "pointer" }} onClick={() => navigate(`/admin/production-jobs`)}>
                            <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E" }}>{job.job_code}</td>
                            <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.7)", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.product_name}</td>
                            <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.5)", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.supplier_name}</td>
                            <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "11px", color: overdue ? "#C08081" : "rgba(27,77,62,0.6)", fontWeight: overdue ? 600 : 400 }}>
                              {job.due_date ? new Date(job.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 6px", background: job.status === "in_progress" ? "rgba(27,77,62,0.08)" : "rgba(218,203,160,0.2)", color: job.status === "in_progress" ? "#1B4D3E" : "#8a7340" }}>{job.status?.replace("_", " ")}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Inventory Section ── */}
        <SectionHeader title="Inventory" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
          {/* Finished goods */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Finished Goods Stock</p>
            {loading ? <Skeleton h={180} /> : (
              <div style={{ overflowY: "auto", maxHeight: "180px" }}>
                {(!data?.inventory?.finished_goods?.length) ? (
                  <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No finished goods in inventory yet</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Product", "Code", "Qty", "Location"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.inventory?.finished_goods?.filter(f => f.quantity > 0).map((fg, i) => (
                        <tr key={i} style={{ borderTop: "1px solid rgba(218,203,160,0.1)" }}>
                          <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fg.product_name}</td>
                          <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.5)" }}>{fg.product_code}</td>
                          <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>{fg.quantity}</td>
                          <td style={{ padding: "6px 8px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.5)" }}>{fg.location || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          {/* Low stock alerts */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Low Stock Materials</p>
              {!loading && data?.inventory?.low_stock_count > 0 && (
                <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(192,128,129,0.15)", color: "#C08081", padding: "1px 8px" }}>{data.inventory.low_stock_count} alert{data.inventory.low_stock_count !== 1 ? "s" : ""}</span>
              )}
            </div>
            {loading ? <Skeleton h={180} /> : (
              <div style={{ overflowY: "auto", maxHeight: "180px" }}>
                {(!data?.inventory?.low_stock?.length) ? (
                  <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>✓ All materials have sufficient stock</p>
                ) : (
                  data?.inventory?.low_stock?.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
                      <div>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{m.material_name}</p>
                        <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>{m.material_code} · {m.material_type}</p>
                      </div>
                      <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: (m.current_stock_qty || 0) === 0 ? "#C08081" : "#8a7340" }}>
                        {m.current_stock_qty || 0} {m.unit_of_measure}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Enquiries Section ── */}
        <SectionHeader title="Enquiries" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Enquiries by Source</p>
            {loading ? <Skeleton h={200} /> : <PieChart data={data?.enquiries?.by_source} labelKey="source" valueKey="count" height={200} />}
          </div>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Most Enquired Products</p>
            {loading ? <Skeleton h={200} /> : <BarChart data={data?.enquiries?.most_enquired} labelKey="product_name" valueKey="count" color="#3a4a9a" height={200} />}
          </div>
        </div>

        {/* Enquiry status pills */}
        {!loading && data?.enquiries?.by_status && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
            {data?.enquiries?.by_status?.map((s, i) => (
              <div key={i} onClick={() => navigate(`/admin/enquiries?status=${s.status}`)} style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "12px 20px", cursor: "pointer", display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: "22px", color: "#1B4D3E" }}>{s.count}</span>
                <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.06em", textTransform: "capitalize", color: "rgba(27,77,62,0.6)" }}>{s.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Revenue & Orders Section ── */}
        <SectionHeader title="Revenue & Orders" />
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
          <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Revenue — Last 30 Days</p>
          {loading ? <Skeleton h={220} /> : <LineChart data={data?.orders?.revenue_by_day} height={220} />}
        </div>

        {/* Orders by status */}
        {!loading && data?.orders?.by_status && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
            {data?.orders?.by_status?.map((s, i) => {
              const colors = { confirmed: "#1B4D3E", delivered: "#2d6e2d", shipped: "#3a4a9a", pending: "#8a7340", cancelled: "#C08081" };
              return (
                <div key={i} onClick={() => navigate(`/admin/orders?status=${s.status}`)} style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "12px 20px", cursor: "pointer", display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontFamily: SERIF, fontSize: "22px", color: colors[s.status] || "#1B4D3E" }}>{s.count}</span>
                  <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.06em", textTransform: "capitalize", color: "rgba(27,77,62,0.6)" }}>{s.status}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Top Products Section ── */}
        <SectionHeader title="Top Products" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
          {/* Top selling */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Top Selling</p>
            {loading ? <Skeleton h={160} /> : (
              !data?.top_products?.top_selling?.length ? (
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No sales data yet</p>
              ) : (
                data?.top_products?.top_selling?.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: SERIF, fontSize: "16px", color: "rgba(218,203,160,0.7)", minWidth: "20px" }}>{i + 1}</span>
                      <div>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{p.product_name}</p>
                        <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>{p.product_code}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>{p.units_sold} units</p>
                      <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.5)" }}>₹{(p.revenue || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
          {/* Most enquired */}
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
            <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>Most Enquired</p>
            {loading ? <Skeleton h={160} /> : (
              !data?.top_products?.most_enquired?.length ? (
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No enquiry data yet</p>
              ) : (
                data?.top_products?.most_enquired?.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontFamily: SERIF, fontSize: "16px", color: "rgba(218,203,160,0.7)", minWidth: "20px" }}>{i + 1}</span>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{p.product_name}</p>
                    </div>
                    <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#3a4a9a" }}>{p.count} enquiries</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
