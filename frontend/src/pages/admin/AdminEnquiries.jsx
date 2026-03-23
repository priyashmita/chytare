import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Search, Eye, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const exportToExcel = async (endpoint, filename) => {
  try {
    const res = await axios.get(endpoint);
    const data = res.data;
    if (!data || data.length === 0) return toast.error("No data to export");

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] ?? "";
          return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Exported successfully");
  } catch {
    toast.error("Export failed");
  }
};

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const STATUS_STYLE = {
  new: { bg: "rgba(27,77,62,0.08)", color: "#1B4D3E" },
  contacted: { bg: "rgba(218,203,160,0.25)", color: "#8a7340" },
  negotiating: { bg: "rgba(100,120,200,0.1)", color: "#3a4a9a" },
  converted: { bg: "rgba(100,160,100,0.12)", color: "#2d6e2d" },
  closed: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
};

const SOURCE_STYLE = {
  website: "rgba(27,77,62,0.06)",
  whatsapp: "rgba(37,211,102,0.1)",
  instagram: "rgba(228,64,95,0.1)",
  phone: "rgba(218,203,160,0.2)",
  showroom: "rgba(100,120,200,0.1)",
  other: "rgba(180,180,180,0.1)",
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

  useEffect(() => {
    fetchMeta();
    fetchEnquiries();
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [filterStatus, filterSource, filterProduct]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/enquiries/meta`);
      setMeta(res.data);
    } catch {}
  };

  const fetchEnquiries = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.enquiry_source = filterSource;
      if (filterProduct) params.product_id = filterProduct;

      const res = await axios.get(`${API}/admin/enquiries/enhanced`, { params });
      setEnquiries(res.data);
    } catch {
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  const filtered = enquiries.filter(e =>
    !search ||
    e.enquiry_code?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    e.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { new: 0, contacted: 0, negotiating: 0, converted: 0, closed: 0 };
  enquiries.forEach(e => {
    if (counts[e.status] !== undefined) counts[e.status]++;
  });

  return (
    <div data-testid="admin-enquiries">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", color: "#1B4D3E" }}>
            Enquiries
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)" }}>
            {enquiries.length} total enquiries
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/enquiries/new")}
          className="btn-luxury btn-luxury-primary"
          style={{ display: "flex", gap: "8px" }}
        >
          <Plus style={{ width: 16, height: 16 }} /> New Enquiry
        </button>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {Object.entries(counts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            style={{
              ...STATUS_STYLE[status],
              padding: "6px 14px",
              cursor: "pointer",
              border: filterStatus === status ? `1px solid ${STATUS_STYLE[status].color}` : "none",
            }}
          >
            {count} {status}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14 }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ paddingLeft: "30px" }}
          />
        </div>

        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {meta.sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="">All Products</option>
          {meta.products.map(p => (
            <option key={p.id} value={p.id}>
              {p.product_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div>Loading...</div>
      ) : filtered.length === 0 ? (
        <div>No enquiries found</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>{e.enquiry_code}</td>
                <td>{e.customer_name}</td>
                <td>{e.product_name}</td>
                <td>{e.status}</td>
                <td>{e.created_at}</td>
                <td>
                  <button onClick={() => navigate(`/admin/enquiries/${e.id}`)}>
                    <Eye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminEnquiries;
