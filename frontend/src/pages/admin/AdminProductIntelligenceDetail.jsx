import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const FLAG_STYLE = {
  repeat:                { bg: "rgba(100,160,100,0.12)",  color: "#2d6e2d",  label: "Repeat" },
  repeat_with_variation: { bg: "rgba(27,77,62,0.08)",    color: "#1B4D3E",  label: "Repeat with Variation" },
  improve:               { bg: "rgba(100,120,200,0.1)",  color: "#3a4a9a",  label: "Improve" },
  monitor:               { bg: "rgba(218,203,160,0.25)", color: "#8a7340",  label: "Monitor" },
  low_performer:         { bg: "rgba(192,128,129,0.1)",  color: "#C08081",  label: "Low Performer" },
  discontinue:           { bg: "rgba(192,128,129,0.2)",  color: "#8a4445",  label: "Discontinue" },
};

const FLAG_INSIGHT = {
  repeat:                "Strong demand and sales. This design is proven. Produce more.",
  repeat_with_variation: "Solid performance. Consider a colour or material variation for the next drop.",
  improve:               "High interest but low conversion. Review pricing, imagery, or concierge response time.",
  monitor:               "Moderate performance. Watch over next season before deciding.",
  low_performer:         "Limited traction. Review whether to continue or retire.",
  discontinue:           "Minimal demand and no orders. Consider retiring this design.",
};

const KpiCard = ({ label, value, sub, highlight }) => (
  <div style={{ background: "white", border: `1px solid ${highlight ? "rgba(27,77,62,0.2)" : "rgba(218,203,160,0.3)"}`, padding: "20px 24px" }}>
    <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", marginBottom: "8px" }}>{label}</p>
    <p style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: "#1B4D3E", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>{sub}</p>}
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    {children}
  </div>
);

const Row = ({ label, value }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "10px", borderBottom: "1px solid rgba(218,203,160,0.1)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "180px", flexShrink: 0, paddingTop: "2px" }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E" }}>{value}</span>
    </div>
  );
};

const AdminProductIntelligenceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`${API}/admin/product-intelligence/${id}`);
      setData(res.data);
    } catch {
      toast.error("Product not found");
      navigate("/admin/product-intelligence");
    } finally { setLoading(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.08)" }} />)}
      </div>
    </AdminLayout>
  );

  if (!data) return null;

  const flagStyle = FLAG_STYLE[data.recommendation_flag] || FLAG_STYLE.monitor;
  const flagInsight = FLAG_INSIGHT[data.recommendation_flag] || "";
  const convPct = data.enquiry_count > 0 ? Math.round(data.conversion_rate * 100) : null;

  return (
    <AdminLayout>
      <div style={{ maxWidth: "900px" }}>

        <button onClick={() => navigate("/admin/product-intelligence")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Product Intelligence
        </button>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)" }}>{data.product_code}</span>
            <span style={{ fontFamily: SANS, fontSize: "11px", background: "rgba(27,77,62,0.05)", color: "#1B4D3E", padding: "2px 8px", textTransform: "capitalize" }}>{data.category}</span>
            <span style={{ ...flagStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{flagStyle.label}</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>{data.product_name}</h1>
        </div>

        {/* Recommendation Banner */}
        <div style={{ ...flagStyle, border: `1px solid ${flagStyle.color}30`, padding: "16px 20px", marginBottom: "24px" }}>
          <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: flagStyle.color, marginBottom: "4px", fontWeight: 600 }}>Recommendation · {flagStyle.label}</p>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.6 }}>{flagInsight}</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          <KpiCard label="Enquiries" value={data.enquiry_count} />
          <KpiCard label="Orders" value={data.order_count} />
          <KpiCard label="Qty Sold" value={data.quantity_sold} />
          <KpiCard label="Revenue" value={`₹${(data.revenue || 0).toLocaleString("en-IN")}`} highlight />
          <KpiCard label="Conversion" value={convPct !== null ? `${convPct}%` : "—"} sub={data.enquiry_count > 0 ? `${data.order_count} of ${data.enquiry_count} enquiries` : "No enquiries yet"} />
          <KpiCard label="Stock" value={data.current_finished_stock ?? "—"} sub="finished units" />
        </div>

        {/* Product Identity */}
        <Section title="Product Identity">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Row label="Product Code" value={data.product_code} />
            <Row label="Category" value={data.category} />
            <Row label="Pricing Mode" value={data.pricing_mode?.replace(/_/g, " ")} />
            <Row label="Edition Size" value={data.edition_size} />
            <Row label="Status" value={data.status} />
          </div>
        </Section>

        {/* Product Attributes */}
        {(data.fabric_type || data.primary_color || data.craft_technique || data.design_category) && (
          <Section title="Design Attributes">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Row label="Fabric Type" value={data.fabric_type} />
              <Row label="Primary Colour" value={data.primary_color} />
              <Row label="Craft Technique" value={data.craft_technique} />
              <Row label="Design Category" value={data.design_category} />
            </div>
          </Section>
        )}

        {/* Demand & Sales */}
        <Section title="Demand & Sales Performance">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Row label="Total Enquiries" value={data.enquiry_count} />
            <Row label="Total Orders" value={data.order_count} />
            <Row label="Quantity Sold" value={data.quantity_sold} />
            <Row label="Revenue" value={`₹${(data.revenue || 0).toLocaleString("en-IN")}`} />
            <Row label="Avg Selling Price" value={data.average_selling_price ? `₹${data.average_selling_price.toLocaleString("en-IN")}` : "—"} />
            <Row label="Conversion Rate" value={convPct !== null ? `${convPct}%` : "—"} />
          </div>
        </Section>

        {/* Cost & Margin */}
        <Section title="Cost & Estimated Margin">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Row label="Production Cost" value={data.production_cost > 0 ? `₹${data.production_cost.toLocaleString("en-IN")}` : "—"} />
            <Row label="Est. Material Cost" value={data.estimated_material_cost > 0 ? `₹${data.estimated_material_cost.toLocaleString("en-IN")}` : "—"} />
            <Row label="Total Est. Cost" value={data.total_estimated_cost > 0 ? `₹${data.total_estimated_cost.toLocaleString("en-IN")}` : "—"} />
            <Row label="Est. Margin" value={
              data.estimated_margin !== null && data.estimated_margin !== undefined
                ? <span style={{ color: data.estimated_margin >= 0 ? "#2d6e2d" : "#C08081", fontWeight: 600 }}>₹{data.estimated_margin.toLocaleString("en-IN")}</span>
                : "—"
            } />
          </div>
          <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "12px" }}>* Estimates based on recorded production costs and material allocations only.</p>
        </Section>

        {/* Production */}
        <Section title="Production">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            <Row label="Avg Production Time" value={data.average_production_days !== null ? `${data.average_production_days} days` : "No completed jobs"} />
            <Row label="Current Stock" value={`${data.current_finished_stock ?? 0} units`} />
          </div>
          {(data._production_jobs || []).length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(218,203,160,0.2)" }}>
                  {["Job", "Work Type", "Planned", "Completed", "Status", "Dates"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data._production_jobs.map((j, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(218,203,160,0.08)" }}>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E" }}>{j.job_code}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.6)", textTransform: "capitalize" }}>{j.work_type?.replace(/_/g," ") || "—"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E" }}>{j.quantity_planned}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E" }}>{j.quantity_completed || 0}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", background: j.status === "completed" ? "rgba(100,160,100,0.12)" : "rgba(218,203,160,0.2)", color: j.status === "completed" ? "#2d6e2d" : "#8a7340", padding: "2px 6px" }}>
                        {j.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>
                      {j.start_date && `${j.start_date} → ${j.actual_completion_date || "ongoing"}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Recent Enquiries */}
        {(data._recent_enquiries || []).length > 0 && (
          <Section title="Recent Enquiries">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(218,203,160,0.2)" }}>
                  {["Code", "Customer", "Source", "Status", "Date"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data._recent_enquiries.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(218,203,160,0.08)" }}>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E" }}>{e.enquiry_code || "—"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E" }}>{e.customer_name}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", textTransform: "capitalize" }}>{e.enquiry_source || "website"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "12px", textTransform: "capitalize", color: "rgba(27,77,62,0.6)" }}>{e.status}</td>
                    <td style={{ padding: "8px 10px", fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)" }}>
                      {e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminProductIntelligenceDetail;
