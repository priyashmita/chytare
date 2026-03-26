import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Plus, Search, Edit, Eye, UserX, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ExportImportBar from "./ExportImportBar";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const TYPE_COLORS = {
  fabric:    { bg: "rgba(27,77,62,0.08)",      color: "#1B4D3E" },
  thread:    { bg: "rgba(218,203,160,0.25)",   color: "#8a7340" },
  trim:      { bg: "rgba(192,128,129,0.12)",   color: "#8a4445" },
  accessory: { bg: "rgba(100,120,200,0.1)",    color: "#3a4a9a" },
  packaging: { bg: "rgba(150,150,150,0.12)",   color: "#555" },
  dye:       { bg: "rgba(180,80,180,0.1)",     color: "#7a207a" },
  other:     { bg: "rgba(180,180,180,0.12)",   color: "#666" },
};

const AdminMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [meta, setMeta] = useState({ material_types: [], units_of_measure: [], fabric_types: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFabric, setFilterFabric] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchMeta(); fetchMaterials(); }, []);
  useEffect(() => { fetchMaterials(); }, [filterType, filterFabric, filterStatus]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/materials/meta`);
      setMeta(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMaterials = async () => {
    try {
      const params = {};
      if (filterType) params.material_type = filterType;
      if (filterFabric) params.fabric_type = filterFabric;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${API}/admin/materials`, { params });
      setMaterials(res.data);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.post(`${API}/admin/materials/${id}/deactivate`);
      toast.success("Material deactivated");
      fetchMaterials();
    } catch { toast.error("Failed to deactivate"); }
  };

  const handleReactivate = async (id) => {
    try {
      await axios.post(`${API}/admin/materials/${id}/reactivate`);
      toast.success("Material reactivated");
      fetchMaterials();
    } catch { toast.error("Failed to reactivate"); }
  };

  const filtered = materials.filter(
    (m) =>
      !search ||
      m.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.material_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-testid="admin-materials">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", color: "#1B4D3E" }}>Materials Master</h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)" }}>{materials.length} materials defined</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ExportImportBar
            module="materials"
            filters={{ material_type: filterType, status: filterStatus, search }}
            onImportDone={fetchMaterials}
          />
          <Link to="/admin/materials/new" className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Material
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setFilterFabric(""); }}
          style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "150px" }}
        >
          <option value="">All Types</option>
          {meta.material_types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {filterType === "fabric" && (
          <select
            value={filterFabric}
            onChange={(e) => setFilterFabric(e.target.value)}
            style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "160px" }}
          >
            <option value="">All Fabric Types</option>
            {meta.fabric_types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "130px" }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)", animation: "pulse 1.5s infinite" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>No materials found</p>
          <Link to="/admin/materials/new" className="btn-luxury btn-luxury-secondary">Add First Material</Link>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "rgba(27,77,62,0.04)" }}>
              <tr>
                {["Code", "Name", "Type", "Stock", "Unit", "Location", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const typeStyle = TYPE_COLORS[m.material_type] || TYPE_COLORS.other;
                return (
                  <tr key={m.id} style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.5)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.05em", color: "rgba(27,77,62,0.5)", fontWeight: 500 }}>{m.material_code}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 500 }}>{m.material_name}</p>
                      {m.color && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{m.color}</p>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ ...typeStyle, fontFamily: SANS, fontSize: "12px", padding: "3px 8px" }}>{m.material_type}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: m.current_stock_qty > 0 ? "#1B4D3E" : "#C08081" }}>{m.current_stock_qty ?? "—"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>{m.unit_of_measure || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>{m.storage_location || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500,
                        background: m.status === "active" ? "rgba(27,77,62,0.08)" : "rgba(192,128,129,0.1)",
                        color: m.status === "active" ? "#1B4D3E" : "#C08081",
                      }}>{m.status || "active"}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button onClick={() => navigate(`/admin/materials/${m.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View">
                          <Eye style={{ width: 16, height: 16 }} />
                        </button>
                        <button onClick={() => navigate(`/admin/materials/${m.id}/edit`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Edit">
                          <Edit style={{ width: 16, height: 16 }} />
                        </button>
                        {m.status === "active" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button style={{ padding: "6px", color: "rgba(192,128,129,0.6)", background: "none", border: "none", cursor: "pointer" }} title="Deactivate">
                                <UserX style={{ width: 16, height: 16 }} />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#FFFFF0]">
                              <AlertDialogHeader>
                                <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Deactivate Material</AlertDialogTitle>
                                <AlertDialogDescription>Deactivate {m.material_name}? It will remain in the system but cannot be used in new purchases.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeactivate(m.id)} style={{ background: "#C08081", color: "white" }}>Deactivate</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <button onClick={() => handleReactivate(m.id)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Reactivate">
                            <UserCheck style={{ width: 16, height: 16 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMaterials;
