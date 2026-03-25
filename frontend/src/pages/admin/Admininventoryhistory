import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Activity, ArrowUpCircle, ArrowDownCircle, RefreshCw, Search } from "lucide-react";
import { API } from "@/App";

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
});

const MOVEMENT_META = {
  purchase_received:    { label: "Purchase Received",    color: "text-green-600",  bg: "bg-green-50",  dir: "in" },
  material_allocated:   { label: "Material Allocated",   color: "text-blue-600",   bg: "bg-blue-50",   dir: "out" },
  production_completed: { label: "Production Completed", color: "text-emerald-600",bg: "bg-emerald-50",dir: "in" },
  order_fulfilled:      { label: "Order Fulfilled",      color: "text-orange-600", bg: "bg-orange-50", dir: "out" },
  inventory_adjustment: { label: "Adjustment",           color: "text-purple-600", bg: "bg-purple-50", dir: "adj" },
};

function MovementIcon({ movementType, quantity }) {
  const meta = MOVEMENT_META[movementType] || { dir: "adj" };
  if (meta.dir === "in") return <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />;
  if (meta.dir === "out") return <ArrowDownCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return <Activity className="w-4 h-4 text-purple-400 shrink-0" />;
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtQty(qty, entityType) {
  const sign = qty >= 0 ? "+" : "";
  return `${sign}${qty}`;
}

export default function AdminInventoryHistory() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity_type: params.get("entity_type") || "",
    movement_type: params.get("movement_type") || "",
    product_id: params.get("product_id") || "",
    material_id: params.get("material_id") || "",
    search: "",
  });

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.entity_type) p.append("entity_type", filters.entity_type);
      if (filters.movement_type) p.append("movement_type", filters.movement_type);
      if (filters.product_id) p.append("product_id", filters.product_id);
      if (filters.material_id) p.append("material_id", filters.material_id);
      p.append("limit", "300");
      const res = await axios.get(
        `${API}/api/admin/inventory/movements?${p}`,
        authHeader()
      );
      setMovements(res.data);
    } catch {
      toast.error("Failed to load movement history");
    } finally {
      setLoading(false);
    }
  }, [filters.entity_type, filters.movement_type, filters.product_id, filters.material_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = movements.filter(m => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      m.movement_type?.includes(s) ||
      m.created_by_name?.toLowerCase().includes(s) ||
      m.reference_type?.includes(s) ||
      m.reference_id?.includes(s) ||
      m.reason?.toLowerCase().includes(s)
    );
  });

  // Stats
  const totalIn = filtered.filter(m => (m.quantity || 0) > 0).reduce((s, m) => s + (m.quantity || 0), 0);
  const totalOut = Math.abs(filtered.filter(m => (m.quantity || 0) < 0).reduce((s, m) => s + (m.quantity || 0), 0));

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Inventory Movement History</h1>
          <p className="text-xs text-[#1B4D3E]/50 mt-1">
            Complete audit trail of all stock changes — purchases, allocations, production, orders, adjustments
          </p>
        </div>
        <button
          onClick={fetch}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#DACBA0] text-[#1B4D3E] hover:bg-[#DACBA0]/10 rounded"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#DACBA0]/30 p-4">
          <p className="text-xs text-[#1B4D3E]/50 uppercase tracking-wide mb-1">Total Records</p>
          <p className="text-2xl font-bold text-[#1B4D3E]">{filtered.length}</p>
        </div>
        <div className="bg-white border border-[#DACBA0]/30 p-4">
          <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Total Stock In</p>
          <p className="text-2xl font-bold text-green-600">+{totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-[#DACBA0]/30 p-4">
          <p className="text-xs text-red-500 uppercase tracking-wide mb-1">Total Stock Out</p>
          <p className="text-2xl font-bold text-red-500">-{totalOut.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-[#DACBA0]/30 p-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            placeholder="Search by type, user, reason…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
          />
        </div>

        <select
          value={filters.entity_type}
          onChange={e => setFilter("entity_type", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none"
        >
          <option value="">All entities</option>
          <option value="finished_good">Finished Goods</option>
          <option value="material">Raw Materials</option>
        </select>

        <select
          value={filters.movement_type}
          onChange={e => setFilter("movement_type", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none"
        >
          <option value="">All movement types</option>
          {Object.entries(MOVEMENT_META).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {(filters.entity_type || filters.movement_type || filters.product_id || filters.material_id) && (
          <button
            onClick={() => setFilters({ entity_type: "", movement_type: "", product_id: "", material_id: "", search: "" })}
            className="text-xs text-red-500 underline"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex gap-3 text-xs text-[#1B4D3E]/60">
          <Link to="/admin/inventory" className="underline">Finished Goods →</Link>
          <Link to="/admin/inventory/raw-materials" className="underline">Raw Material Stock →</Link>
        </div>
      </div>

      {/* Movement list */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No movements found</p>
        </div>
      ) : (
        <div className="bg-white border border-[#DACBA0]/30 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-[#1B4D3E]/5 text-xs uppercase tracking-wider text-[#1B4D3E]/50 font-semibold border-b border-[#DACBA0]/20">
            <span className="w-5" />
            <span>Description</span>
            <span className="w-24 text-right">Qty</span>
            <span className="w-36 text-right">Date</span>
            <span className="w-28 text-right">By</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((m, i) => {
              const meta = MOVEMENT_META[m.movement_type] || { label: m.movement_type, color: "text-gray-600", bg: "bg-gray-50", dir: "adj" };
              const isIn = (m.quantity || 0) > 0;
              const isOut = (m.quantity || 0) < 0;

              return (
                <div key={m.id || i} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-gray-50">
                  <MovementIcon movementType={m.movement_type} quantity={m.quantity} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {m.entity_type?.replace("_", " ")}
                      </span>
                      {m.reference_type && (
                        <span className="text-xs text-gray-400">
                          via {m.reference_type.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {m.reason && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">"{m.reason}"</p>
                    )}
                    {m.location && (
                      <p className="text-xs text-gray-400 mt-0.5">📍 {m.location}</p>
                    )}
                  </div>

                  <div className={`text-sm font-bold w-24 text-right ${isIn ? "text-green-600" : isOut ? "text-red-500" : "text-purple-600"}`}>
                    {fmtQty(m.quantity, m.entity_type)}
                  </div>

                  <div className="text-xs text-gray-400 w-36 text-right">
                    {fmt(m.created_at)}
                  </div>

                  <div className="text-xs text-gray-500 w-28 text-right truncate">
                    {m.created_by_name || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
