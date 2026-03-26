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

const STATUS_STYLE = {
  active: { background: "rgba(27,77,62,0.08)", color: "#1B4D3E" },
  inactive: { background: "rgba(192,128,129,0.1)", color: "#C08081" },
};

const AdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [meta, setMeta] = useState({ supplier_types: [], payment_terms: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeta();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [filterType, filterStatus]);

  const fetchMeta = async () => {
    try {
      const res = await axios.get(`${API}/admin/suppliers/meta`);
      setMeta(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const params = {};
      if (filterType) params.supplier_type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${API}/admin/suppliers`, { params });
      setSuppliers(res.data);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await axios.post(`${API}/admin/suppliers/${id}/deactivate`);
      toast.success("Supplier deactivated");
      fetchSuppliers();
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await axios.post(`${API}/admin/suppliers/${id}/reactivate`);
      toast.success("Supplier reactivated");
      fetchSuppliers();
    } catch {
      toast.error("Failed to reactivate");
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      !search ||
      s.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier_code?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div data-testid="admin-suppliers">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "28px",
              fontWeight: 400,
              color: "#1B4D3E",
            }}
          >
            Suppliers
          </h1>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "13px",
              color: "rgba(27,77,62,0.5)",
              marginTop: "4px",
            }}
          >
            {suppliers.length} suppliers in system
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ExportImportBar
            module="suppliers"
            filters={{ supplier_type: filterType, status: filterStatus, search }}
            onImportDone={fetchSuppliers}
          />
          <Link
            to="/admin/suppliers/new"
            className="btn-luxury btn-luxury-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Add Supplier
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 15,
              height: 15,
              color: "rgba(27,77,62,0.3)",
            }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, contact, city..."
            style={{ paddingLeft: "32px", fontFamily: SANS, fontSize: "13px" }}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            fontFamily: SANS,
            fontSize: "13px",
            padding: "8px 12px",
            border: "1px solid rgba(218,203,160,0.5)",
            background: "white",
            color: "#1B4D3E",
            minWidth: "180px",
          }}
        >
          <option value="">All Types</option>
          {meta.supplier_types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            fontFamily: SANS,
            fontSize: "13px",
            padding: "8px 12px",
            border: "1px solid rgba(218,203,160,0.5)",
            background: "white",
            color: "#1B4D3E",
            minWidth: "130px",
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "64px",
                background: "rgba(218,203,160,0.1)",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            background: "white",
            border: "1px solid rgba(218,203,160,0.3)",
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontSize: "14px",
              color: "rgba(27,77,62,0.5)",
              marginBottom: "16px",
            }}
          >
            No suppliers found
          </p>
          <Link to="/admin/suppliers/new" className="btn-luxury btn-luxury-secondary">
            Add First Supplier
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "white",
            border: "1px solid rgba(218,203,160,0.3)",
            overflowX: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "rgba(27,77,62,0.04)" }}>
              <tr>
                {["Code", "Supplier Name", "Type", "Contact", "City", "Lead Time", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontFamily: SANS,
                      fontSize: "11px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(27,77,62,0.5)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderTop: "1px solid rgba(218,203,160,0.15)",
                    background: i % 2 === 0 ? "white" : "rgba(255,255,240,0.5)",
                  }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.05em", color: "rgba(27,77,62,0.5)", fontWeight: 500 }}>
                      {s.supplier_code}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <p style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 500 }}>{s.supplier_name}</p>
                    {s.email && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{s.email}</p>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.7)", background: "rgba(218,203,160,0.15)", padding: "3px 8px" }}>
                      {s.supplier_type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <p style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>{s.contact_person || "—"}</p>
                    {s.phone && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{s.phone}</p>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)" }}>{s.city || "—"}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)" }}>
                      {s.lead_time_days ? `${s.lead_time_days} days` : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        ...(STATUS_STYLE[s.status] || STATUS_STYLE.active),
                        fontFamily: SANS,
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        fontWeight: 500,
                      }}
                    >
                      {s.status || "active"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button onClick={() => navigate(`/admin/suppliers/${s.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View details">
                        <Eye style={{ width: 16, height: 16 }} />
                      </button>
                      <button onClick={() => navigate(`/admin/suppliers/${s.id}/edit`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Edit">
                        <Edit style={{ width: 16, height: 16 }} />
                      </button>
                      {(s.status || "active") === "active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button style={{ padding: "6px", color: "rgba(192,128,129,0.6)", background: "none", border: "none", cursor: "pointer" }} title="Deactivate">
                              <UserX style={{ width: 16, height: 16 }} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#FFFFF0]">
                            <AlertDialogHeader>
                              <AlertDialogTitle style={{ fontFamily: "'Playfair Display', serif", color: "#1B4D3E" }}>Deactivate Supplier</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deactivate {s.supplier_name}? They will remain in the system but cannot be linked to new purchases.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeactivate(s.id)} style={{ background: "#C08081", color: "white" }}>Deactivate</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <button onClick={() => handleReactivate(s.id)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Reactivate">
                          <UserCheck style={{ width: 16, height: 16 }} />
                        </button>
                      )}
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

export default AdminSuppliers;
