import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Plus, Search, Edit, Eye, Archive, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ExportImportBar from "./ExportImportBar";
import AuditHistoryModal from "./AuditHistoryModal";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";
const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem("chytare_token")}` });

const STATUS_STYLE = {
  draft:    { bg: "rgba(218,203,160,0.2)",  color: "#8a7340" },
  active:   { bg: "rgba(27,77,62,0.08)",    color: "#1B4D3E" },
  archived: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
};

const PRICING_STYLE = {
  direct_purchase:  { bg: "rgba(27,77,62,0.06)", color: "#1B4D3E" },
  price_on_request: { bg: "rgba(218,203,160,0.2)", color: "#8a7340" },
};

const AdminProductMaster = () => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ categories: [], pricing_modes: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCollection, setFilterCollection] = useState("");
  const [filterPricing, setFilterPricing] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const navigate = useNavigate();

  const handleImportFromWebsite = async () => {
    setImporting(true);
    try {
      const res = await axios.post(`${API}/admin/product-master/import-from-website`);
      toast.success(res.data.message);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally { setImporting(false); }
  };

  useEffect(() => { fetchMeta(); fetchProducts(); }, []);
  useEffect(() => { fetchProducts(); }, [filterCategory, filterCollection, filterPricing, filterStatus]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/product-master/meta`); setMeta(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterCollection) params.collection_name = filterCollection;
      if (filterPricing) params.pricing_mode = filterPricing;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${API}/admin/product-master`, { params });
      setProducts(res.data);
      setSelected(new Set());
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  const handleActivate = async (id, name) => {
    try { await axios.post(`${API}/admin/product-master/${id}/activate`, {}, { headers: AUTH() }); toast.success(`${name} activated`); fetchProducts(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to activate"); }
  };

  const handleArchive = async (id) => {
    try { await axios.post(`${API}/admin/product-master/${id}/archive`, {}, { headers: AUTH() }); toast.success("Product archived"); fetchProducts(); }
    catch { toast.error("Failed to archive"); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkActivate = async () => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/admin/product-master/bulk-activate`, { ids: [...selected] }, { headers: AUTH() });
      toast.success(`${res.data.updated} product(s) activated`);
      fetchProducts();
    } catch { toast.error("Bulk activate failed"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkArchive = async () => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/admin/product-master/bulk-archive`, { ids: [...selected] }, { headers: AUTH() });
      toast.success(`${res.data.updated} product(s) archived`);
      fetchProducts();
    } catch { toast.error("Bulk archive failed"); }
    finally { setBulkLoading(false); }
  };

  const filtered = products.filter(p =>
    !search ||
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  const counts = { draft: 0, active: 0, archived: 0 };
  products.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Product Master</h1>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>Design identity records — independent of stock and production</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <ExportImportBar module="products" filters={{ category: filterCategory, pricing_mode: filterPricing, status: filterStatus, search }} onImportDone={fetchProducts} />
          <button onClick={handleImportFromWebsite} disabled={importing} className="btn-luxury btn-luxury-secondary" style={{ whiteSpace: "nowrap", opacity: importing ? 0.6 : 1 }}>
            {importing ? "Importing..." : "↓ Import from Website"}
          </button>
          <Link to="/admin/product-master/new" className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            <Plus style={{ width: 16, height: 16 }} /> New Product
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ ...STATUS_STYLE[status], fontFamily: SANS, fontSize: "12px", padding: "6px 14px", letterSpacing: "0.05em" }}>
            {count} {status}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(27,77,62,0.3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or code..." style={{ paddingLeft: "30px", fontFamily: SANS, fontSize: "13px" }} />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "140px" }}>
          <option value="">All Categories</option>
          {meta.categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filterPricing} onChange={(e) => setFilterPricing(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "160px" }}>
          <option value="">All Pricing</option>
          <option value="direct_purchase">Direct Purchase</option>
          <option value="price_on_request">Price on Request</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontFamily: SANS, fontSize: "13px", padding: "8px 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E", minWidth: "130px" }}>
          <option value="">All Status</option>
          {meta.statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", background: "rgba(27,77,62,0.06)", border: "1px solid rgba(27,77,62,0.15)", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", fontWeight: 500 }}>{selected.size} selected</span>
          <button onClick={handleBulkActivate} disabled={bulkLoading} className="btn-luxury btn-luxury-secondary" style={{ fontSize: "12px", padding: "6px 14px" }}>Activate</button>
          <button onClick={handleBulkArchive} disabled={bulkLoading} style={{ fontFamily: SANS, fontSize: "12px", padding: "6px 14px", background: "rgba(192,128,129,0.1)", color: "#8a4445", border: "1px solid rgba(192,128,129,0.3)", cursor: "pointer" }}>Archive</button>
          <button onClick={() => setSelected(new Set())} style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: "56px", background: "rgba(218,203,160,0.1)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", background: "white", border: "1px solid rgba(218,203,160,0.3)" }}>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.5)", marginBottom: "16px" }}>No products found</p>
          <Link to="/admin/product-master/new" className="btn-luxury btn-luxury-secondary">Create First Product</Link>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "rgba(27,77,62,0.04)" }}>
              <tr>
                <th style={{ padding: "12px 16px", width: "36px" }}>
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
                {["Code", "Product Name", "Category", "Collection", "Edition", "Pricing", "Price", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const statusStyle = STATUS_STYLE[p.status] || STATUS_STYLE.draft;
                const pricingStyle = PRICING_STYLE[p.pricing_mode] || PRICING_STYLE.price_on_request;
                const isSelected = selected.has(p.id);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid rgba(218,203,160,0.15)", background: isSelected ? "rgba(27,77,62,0.03)" : i % 2 === 0 ? "white" : "rgba(255,255,240,0.4)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.06em", color: "rgba(27,77,62,0.5)", fontWeight: 600 }}>{p.product_code}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <p style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", fontWeight: 500 }}>{p.product_name}</p>
                      {p.drop_name && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "2px" }}>{p.drop_name}</p>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.7)", background: "rgba(218,203,160,0.15)", padding: "3px 8px" }}>{p.category}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.6)" }}>{p.collection_name || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: p.edition_size ? "#1B4D3E" : "rgba(27,77,62,0.3)" }}>{p.edition_size || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ ...pricingStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.05em", padding: "3px 8px" }}>
                        {p.pricing_mode === "direct_purchase" ? "Direct" : "On Request"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E" }}>
                        {p.price ? `₹${p.price.toLocaleString("en-IN")}` : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", fontWeight: 500 }}>{p.status}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <button onClick={() => navigate(`/admin/product-master/${p.id}`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="View"><Eye style={{ width: 15, height: 15 }} /></button>
                        <button onClick={() => navigate(`/admin/product-master/${p.id}/edit`)} style={{ padding: "6px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer" }} title="Edit"><Edit style={{ width: 15, height: 15 }} /></button>
                        {p.status === "draft" && (
                          <button onClick={() => handleActivate(p.id, p.product_name)} style={{ padding: "6px", color: "rgba(27,77,62,0.6)", background: "none", border: "none", cursor: "pointer" }} title="Activate">
                            <CheckCircle style={{ width: 15, height: 15 }} />
                          </button>
                        )}
                        {p.status === "active" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button style={{ padding: "6px", color: "rgba(192,128,129,0.6)", background: "none", border: "none", cursor: "pointer" }} title="Archive"><Archive style={{ width: 15, height: 15 }} /></button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#FFFFF0]">
                              <AlertDialogHeader>
                                <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Archive Product</AlertDialogTitle>
                                <AlertDialogDescription>Archive {p.product_name}? It will no longer be available for new orders or enquiries.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleArchive(p.id)} style={{ background: "#C08081", color: "white" }}>Archive</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AuditHistoryModal entityType="product_master" entityId={p.id} entityName={p.product_name} />
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

export default AdminProductMaster;
