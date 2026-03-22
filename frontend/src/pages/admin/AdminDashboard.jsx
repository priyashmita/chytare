import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingBag,
  MessageSquare,
  Wrench,
  CheckCircle,
  DollarSign,
} from "lucide-react";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const KpiCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "white",
      border: "1px solid rgba(218,203,160,0.3)",
      padding: "20px 24px",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow 0.2s",
    }}
    onMouseEnter={(e) => {
      if (onClick) e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,77,62,0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <p
          style={{
            fontFamily: SANS,
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(27,77,62,0.5)",
            marginBottom: "8px",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: SERIF,
            fontSize: "32px",
            fontWeight: 400,
            color: color || "#1B4D3E",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {subtitle && (
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ background: `${color || "#1B4D3E"}15`, padding: "10px", borderRadius: "2px" }}>
        <Icon style={{ width: 20, height: 20, color: color || "#1B4D3E" }} />
      </div>
    </div>
  </div>
);

const SectionHeader = ({ title }) => (
  <h2
    style={{
      fontFamily: SERIF,
      fontSize: "20px",
      fontWeight: 400,
      color: "#1B4D3E",
      marginBottom: "16px",
      marginTop: "32px",
      paddingBottom: "8px",
      borderBottom: "1px solid rgba(218,203,160,0.3)",
    }}
  >
    {title}
  </h2>
);

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
          labels: data.map((d) => d[labelKey] || "Other"),
          datasets: [
            {
              data: data.map((d) => d[valueKey]),
              backgroundColor: `${color}99`,
              borderColor: color,
              borderWidth: 1,
              borderRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(218,203,160,0.2)" },
              ticks: { font: { family: SANS, size: 11 } },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: SANS, size: 11 } },
            },
          },
        },
      });
    };

    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById("chartjs-script");
      if (script) script.addEventListener("load", loadChart);
    }

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data, labelKey, valueKey, color]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(27,77,62,0.3)",
          fontFamily: SANS,
          fontSize: "13px",
        }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
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
          labels: data.map((d) => d[labelKey]),
          datasets: [
            {
              data: data.map((d) => d[valueKey]),
              backgroundColor: COLORS.slice(0, data.length),
              borderWidth: 2,
              borderColor: "#FFFFF0",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { font: { family: SANS, size: 11 }, padding: 12, boxWidth: 12 },
            },
          },
        },
      });
    };

    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById("chartjs-script");
      if (script) script.addEventListener("load", loadChart);
    }

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data, labelKey, valueKey]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(27,77,62,0.3)",
          fontFamily: SANS,
          fontSize: "13px",
        }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
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
          labels: data.map((d) => {
            const date = new Date(d.date);
            return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
          }),
          datasets: [
            {
              label: "Revenue",
              data: data.map((d) => d.revenue),
              borderColor: "#1B4D3E",
              backgroundColor: "rgba(27,77,62,0.05)",
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: "#1B4D3E",
            },
          ],
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
                callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
              },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: SANS, size: 10 }, maxTicksLimit: 10 },
            },
          },
        },
      });
    };

    if (window.Chart) {
      loadChart();
    } else {
      const script = document.getElementById("chartjs-script");
      if (script) script.addEventListener("load", loadChart);
    }

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(27,77,62,0.3)",
          fontFamily: SANS,
          fontSize: "13px",
        }}
      >
        No orders yet
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const Skeleton = ({ h = 80 }) => (
  <div style={{ height: h, background: "rgba(218,203,160,0.15)", animation: "pulse 1.5s infinite" }} />
);

const AdminDashboard = () => {
  useEffect(() => {
    if (!document.getElementById("chartjs-script")) {
      const script = document.createElement("script");
      script.id = "chartjs-script";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/admin/dashboard/metrics`);
      setData(res.data);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString("en-IN");
  const fmtCurrency = (n) => `₹${fmt(n)}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            Operations Dashboard
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          style={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "#1B4D3E",
            background: "rgba(27,77,62,0.06)",
            border: "1px solid rgba(218,203,160,0.5)",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(192,128,129,0.1)",
            border: "1px solid rgba(192,128,129,0.3)",
            padding: "16px",
            marginBottom: "24px",
            fontFamily: SANS,
            fontSize: "13px",
            color: "#C08081",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "8px",
        }}
      >
        {loading ? (
          [...Array(8)].map((_, i) => <Skeleton key={i} h={100} />)
        ) : (
          <>
            <KpiCard
              title="Open Production Jobs"
              value={fmt(data?.production?.open_jobs)}
              subtitle={`${data?.production?.overdue_jobs || 0} overdue`}
              icon={Wrench}
              color={data?.production?.overdue_jobs > 0 ? "#C08081" : "#1B4D3E"}
              onClick={() => navigate("/admin/production-jobs")}
            />
            <KpiCard
              title="Completed This Week"
              value={fmt(data?.production?.completed_this_week)}
              subtitle="production jobs"
              icon={CheckCircle}
              color="#2d6e2d"
              onClick={() => navigate("/admin/production-jobs?status=completed")}
            />
            <KpiCard
              title="Finished Goods"
              value={fmt(data?.inventory?.total_finished_goods)}
              subtitle="units available"
              icon={Package}
              color="#1B4D3E"
              onClick={() => navigate("/admin/inventory")}
            />
            <KpiCard
              title="Low Stock Materials"
              value={fmt(data?.inventory?.low_stock_count)}
              subtitle="need restocking"
              icon={AlertTriangle}
              color={data?.inventory?.low_stock_count > 0 ? "#C08081" : "#1B4D3E"}
              onClick={() => navigate("/admin/materials")}
            />
            <KpiCard
              title="New Enquiries"
              value={fmt(data?.enquiries?.new_this_week)}
              subtitle="this week"
              icon={MessageSquare}
              color="#3a4a9a"
              onClick={() => navigate("/admin/enquiries")}
            />
            <KpiCard
              title="Orders This Month"
              value={fmt(data?.orders?.this_month)}
              subtitle={`${data?.orders?.this_week || 0} this week`}
              icon={ShoppingBag}
              color="#1B4D3E"
              onClick={() => navigate("/admin/orders")}
            />
            <KpiCard
              title="Revenue This Month"
              value={fmtCurrency(data?.orders?.revenue_this_month)}
              subtitle="confirmed orders"
              icon={TrendingUp}
              color="#2d6e2d"
            />
            <KpiCard
              title="Avg Order Value"
              value={fmtCurrency(data?.orders?.avg_order_value)}
              subtitle="this month"
              icon={DollarSign}
              color="#8a7340"
            />
          </>
        )}
      </div>

      <SectionHeader title="Production" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Open Jobs by Work Type
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <BarChart data={data?.production?.jobs_by_work_type} labelKey="work_type" valueKey="count" height={200} />
          )}
        </div>

        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Open Jobs
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <div style={{ overflowY: "auto", maxHeight: "200px" }}>
              {!data?.production?.open_jobs_list?.length ? (
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No open jobs</p>
              ) : (
                data.production.open_jobs_list.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/admin/production-jobs/${job.id}`)}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(218,203,160,0.2)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>
                          {job.job_code}
                        </p>
                        <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                          {job.product_name} • {job.work_type}
                        </p>
                      </div>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "#8a7340" }}>
                        Due {job.due_date || "-"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <SectionHeader title="Inventory" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Low Stock Materials
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <div style={{ overflowY: "auto", maxHeight: "200px" }}>
              {!data?.inventory?.low_stock_materials?.length ? (
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No low stock alerts</p>
              ) : (
                data.inventory.low_stock_materials.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(218,203,160,0.2)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>
                        {m.material_name}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                        {m.material_type}
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: SANS,
                        fontSize: "12px",
                        fontWeight: 600,
                        color: (m.current_stock_qty || 0) === 0 ? "#C08081" : "#8a7340",
                      }}
                    >
                      {m.current_stock_qty || 0} {m.unit_of_measure}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Finished Goods Snapshot
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <div style={{ overflowY: "auto", maxHeight: "200px" }}>
              {!data?.inventory?.finished_goods?.length ? (
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No finished goods yet</p>
              ) : (
                data.inventory.finished_goods.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(218,203,160,0.2)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 600 }}>
                        {p.product_name}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                        {p.product_code}
                      </p>
                    </div>
                    <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E" }}>
                      {p.quantity || 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <SectionHeader title="Enquiries" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Enquiries by Source
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <PieChart data={data?.enquiries?.by_source} labelKey="source" valueKey="count" height={200} />
          )}
        </div>

        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            Most Enquired Products
          </p>
          {loading ? (
            <Skeleton h={200} />
          ) : (
            <BarChart data={data?.enquiries?.most_enquired} labelKey="product_name" valueKey="count" color="#3a4a9a" height={200} />
          )}
        </div>
      </div>

      {!loading && data?.enquiries?.by_status && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
          {data.enquiries.by_status.map((s, i) => (
            <div
              key={i}
              onClick={() => navigate(`/admin/enquiries?status=${s.status}`)}
              style={{
                background: "white",
                border: "1px solid rgba(218,203,160,0.3)",
                padding: "12px 20px",
                cursor: "pointer",
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: SERIF, fontSize: "22px", color: "#1B4D3E" }}>{s.count}</span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  letterSpacing: "0.06em",
                  textTransform: "capitalize",
                  color: "rgba(27,77,62,0.6)",
                }}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <SectionHeader title="Revenue & Orders" />
      <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
        <p
          style={{
            fontFamily: SANS,
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(27,77,62,0.5)",
            marginBottom: "16px",
          }}
        >
          Revenue Trend
        </p>
        {loading ? <Skeleton h={220} /> : <LineChart data={data?.orders?.revenue_trend} height={220} />}
      </div>
    </div>
  );
};

export default AdminDashboard;
