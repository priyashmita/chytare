import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Download, AlertTriangle, Warehouse, RefreshCw } from "lucide-react";
import { API } from "@/App";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
});

function exportCSV(rows) {
  if (!rows.length) return toast.error("No data to export");
  const headers = [
    "material_code", "material_name", "material_type", "unit_of_measure",
    "current_stock_qty", "reorder_level", "status", "supplier_name",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? "";
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "raw_material_stock.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${rows.length} rows exported`);
}

export default function AdminInventoryRawMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/materials`, authHeader());
      setMaterials(res.data);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const materialTypes = [...new Set(materials.map((m) => m.material_type).filter(Boolean))].sort();

  const filtered = materials.filter((m) => {
    const matchSearch =
      !search ||
      m.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.material_code?.toLowerCase().includes(search.toLowerCase()) ||
      m.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.material_type === typeFilter;
    return matchSearch && matchType;
  });

  const lowStockItems = filtered.filter(
    (m) => m.reorder_level != null && (m.current_stock_qty || 0) <= m.reorder_level
  );

  return (
    <div data-testid="admin-inventory-raw-materials">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Raw Material Stock</h1>
          <p className="text-[#1B4D3E]/60 mt-1 text-sm">
            {materials.length} materials · {lowStockItems.length > 0 && (
              <span className="text-[#C08081]">{lowStockItems.length} low stock</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#DACBA0] text-[#1B4D3E] hover:bg-[#DACBA0]/10"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#1B4D3E]/20 bg-[#1B4D3E]/04 text-[#1B4D3E] hover:bg-[#1B4D3E]/08"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-[#C08081]/10 border border-[#C08081]/30 p-3 mb-5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#C08081] shrink-0" />
          <p className="text-sm text-[#1B4D3E]">
            <strong>{lowStockItems.length}</strong> material(s) at or below reorder level
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, supplier…"
          className="flex-1 min-w-[200px] max-w-xs px-3 py-2 text-sm border border-[#DACBA0]/50 focus:outline-none focus:border-[#1B4D3E] bg-white"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#DACBA0]/50 focus:outline-none bg-white text-[#1B4D3E]"
        >
          <option value="all">All types</option>
          {materialTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-[#DACBA0]/10 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
          <Warehouse className="w-10 h-10 text-[#DACBA0] mx-auto mb-3" />
          <p className="text-[#1B4D3E]/60 text-sm">No materials found</p>
        </div>
      ) : (
        <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1B4D3E]/5">
                <tr>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Code</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Material</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Type</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Supplier</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Reorder At</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DACBA0]/20">
                {filtered.map((m) => {
                  const isLow =
                    m.reorder_level != null &&
                    (m.current_stock_qty || 0) <= m.reorder_level;
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[#FFFFF0] ${isLow ? "bg-[#C08081]/05" : ""}`}
                    >
                      <td className="p-4 text-xs font-mono text-[#1B4D3E]/60">{m.material_code || "—"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-[#C08081] shrink-0" />}
                          <div>
                            <p className="text-sm font-medium text-[#1B4D3E]">{m.material_name}</p>
                            {m.unit_of_measure && (
                              <p className="text-xs text-[#1B4D3E]/40">{m.unit_of_measure}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-[#1B4D3E] capitalize">{m.material_type || "—"}</td>
                      <td className="p-4 text-sm text-[#1B4D3E]/70">{m.supplier_name || "—"}</td>
                      <td className={`p-4 text-sm font-medium text-right ${isLow ? "text-[#C08081]" : "text-[#1B4D3E]"}`}>
                        {m.current_stock_qty ?? 0}
                      </td>
                      <td className="p-4 text-sm text-[#1B4D3E]/50 text-right">
                        {m.reorder_level ?? "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-0.5 ${
                            m.status === "active"
                              ? "bg-[#1B4D3E]/10 text-[#1B4D3E]"
                              : "bg-[#DACBA0]/30 text-[#1B4D3E]/60"
                          }`}
                        >
                          {m.status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-[#DACBA0]/20 text-xs text-[#1B4D3E]/40 text-right">
            {filtered.length} of {materials.length} materials
          </div>
        </div>
      )}
    </div>
  );
}
