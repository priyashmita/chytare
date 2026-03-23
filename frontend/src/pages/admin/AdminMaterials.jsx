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

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const TYPE_COLORS = {
  fabric: { bg: "rgba(27,77,62,0.08)", color: "#1B4D3E" },
  thread: { bg: "rgba(218,203,160,0.25)", color: "#8a7340" },
  trim: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
  accessory: { bg: "rgba(100,120,200,0.1)", color: "#3a4a9a" },
  packaging: { bg: "rgba(150,150,150,0.12)", color: "#555" },
  dye: { bg: "rgba(180,80,180,0.1)", color: "#7a207a" },
  other: { bg: "rgba(180,180,180,0.12)", color: "#666" },
};

const AdminMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [meta, setMeta] = useState({
    material_types: [],
    units_of_measure: [],
    fabric_types: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFabric, setFilterFabric] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeta();
    fetchMaterials();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [filterType, filterFabric, filterStatus]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/materials/meta`);
      setMeta(res.data);
    } catch (err) {
      console.error(err);
    }
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
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await axios.post(`${API}/admin/materials/${id}/reactivate`);
      toast.success("Material reactivated");
      fetchMaterials();
    } catch {
      toast.error("Failed to reactivate");
    }
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
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", color: "#1B4D3E" }}>
            Materials Master
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)" }}>
            {materials.length} materials defined
          </p>
        </div>

        <Link to="/admin/materials/new" className="btn-luxury btn-luxury-primary" style={{ display: "flex", gap: "8px" }}>
          <Plus style={{ width: 16, height: 16 }} /> Add Material
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14 }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ paddingLeft: "30px" }} />
        </div>

        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setFilterFabric(""); }}>
          <option value="">All Types</option>
          {meta.material_types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {filterType === "fabric" && (
          <select value={filterFabric} onChange={(e) => setFilterFabric(e.target.value)}>
            <option value="">All Fabric Types</option>
            {meta.fabric_types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div>Loading...</div>
      ) : filtered.length === 0 ? (
        <div>No materials found</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>{m.material_code}</td>
                <td>{m.material_name}</td>
                <td>{m.material_type}</td>
                <td>{m.current_stock_qty}</td>
                <td>{m.status}</td>
                <td>
                  <button onClick={() => navigate(`/admin/materials/${m.id}`)}>
                    <Eye />
                  </button>
                  <button onClick={() => navigate(`/admin/materials/${m.id}/edit`)}>
                    <Edit />
                  </button>
                  {m.status === "active" ? (
                    <button onClick={() => handleDeactivate(m.id)}>
                      <UserX />
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(m.id)}>
                      <UserCheck />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminMaterials;
