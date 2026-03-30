import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Plus, Search, Eye, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const AdminMaterialAllocations = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const jobFilter = searchParams.get("job");
  const navigate = useNavigate();

  useEffect(() => { fetchAllocations(); }, [jobFilter]);

  const fetchAllocations = async () => {
    try {
      const params = {};
      if (jobFilter) params.production_job_id = jobFilter;
      const res = await axios.get(`${API}/admin/material-allocations`, { params });
      setAllocations(res.data);
    } catch { toast.error("Failed to load allocations"); }
    finally { setLoading(false); }
  };

  const filtered = allocations.filter(a =>
    !search ||
    a.allocation_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.job_code?.toLowerCase().includes(search.toLowerCase()) ||
    a.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.material_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Material Allocations</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
              {jobFilter ? `Filtered by job — ` : ""}{allocations.length} allocations
            </p>
          </div>
          <Link to="/admin/material-allocations/new" className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Plus style={{ width: 16, height: 16 }} /> New Allocation
          </Link>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code, job, or material..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[...Array(4)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>No allocations found</p>
            <Link to="/admin/material-allocations/new" className="btn-luxury btn-luxury-secondary">Create First Allocation</Link>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(27,77,62,0.04)" }}>
                <tr>
                  {["Code", "Production Job", "Product", "Material", "Allocated", "Used", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", color: "#1B4D3E" }}>{a.allocation_code}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{a.job_code}</p>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)" }}>{a.product_name || "—"}</p>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{a.material_name || a.material_purchase_id}</p>
                      {a.material_code && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{a.material_code}</p>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{a.quantity_allocated} {a.unit_of_measure || ""}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: a.quantity_used > 0 ? "#1B4D3E" : "rgba(27,77,62,0.3)" }}>
                        {a.quantity_used || 0} {a.unit_of_measure || ""}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => navigate(`/admin/material-allocations/${a.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View"><Eye style={{ width: 15, height: 15 }} /></button>
                        <button onClick={() => navigate(`/admin/material-allocations/${a.id}/edit`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    
  );
};

export default AdminMaterialAllocations;
