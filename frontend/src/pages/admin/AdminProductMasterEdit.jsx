import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;
const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
});

// Validated HSN codes — update by pasting new rows in AdminProductMasterEdit
const HSN_OPTIONS = [
  // ── SAREES · Silk ──────────────────────────────────────────────────────────
  { code: "50072010", label: "Sarees · Silk / silk waste" },
  // ── SAREES · Cotton ≥85%, ≤200 g/m² ───────────────────────────────────────
  { code: "52081120", label: "Sarees · Cotton ≥85%, plain weave ≤100 g/m²" },
  { code: "52081220", label: "Sarees · Cotton ≥85%, plain weave >100 g/m²" },
  { code: "52082120", label: "Sarees · Cotton ≥85%, printed, plain weave ≤100 g/m²" },
  { code: "52082220", label: "Sarees · Cotton ≥85%, printed, plain weave >100 g/m²" },
  { code: "52082910", label: "Dhoti & Sarees, Zari bordered · Cotton ≥85%, printed" },
  { code: "52083220", label: "Sarees · Cotton ≥85%, dyed, plain weave >100 g/m²" },
  { code: "52083910", label: "Zari bordered sarees · Cotton ≥85%, dyed" },
  { code: "52084120", label: "Sarees · Cotton ≥85%, yarn-dyed, plain weave ≤100 g/m²" },
  { code: "52084220", label: "Sarees · Cotton ≥85%, yarn-dyed, plain weave >100 g/m²" },
  { code: "52084910", label: "Zari bordered sarees · Cotton ≥85%, yarn-dyed" },
  { code: "52085910", label: "Zari bordered sarees · Cotton ≥85%" },
  { code: "52085920", label: "Sarees, handloom · Cotton ≥85%" },
  // ── SAREES · Cotton ≥85%, >200 g/m² ───────────────────────────────────────
  { code: "52091112", label: "Sarees · Cotton ≥85%, >200 g/m²" },
  { code: "52091210", label: "Sarees · Cotton ≥85%, >200 g/m², 3-4 thread twill" },
  { code: "52092110", label: "Sarees · Cotton ≥85%, >200 g/m², printed plain weave" },
  { code: "52092910", label: "Dhoti & Sarees, Zari bordered · Cotton ≥85%, >200 g/m²" },
  { code: "52093120", label: "Sarees · Cotton ≥85%, >200 g/m², dyed plain weave" },
  { code: "52093910", label: "Zari bordered sarees · Cotton ≥85%, >200 g/m², dyed" },
  { code: "52094120", label: "Sarees · Cotton ≥85%, >200 g/m², yarn-dyed plain weave" },
  { code: "52094910", label: "Zari bordered sari · Cotton ≥85%, >200 g/m², yarn-dyed" },
  { code: "52095120", label: "Sarees · Cotton ≥85%, >200 g/m², printed plain weave" },
  { code: "52095910", label: "Zari bordered saree · Cotton ≥85%, >200 g/m², printed" },
  // ── SAREES · Cotton/man-made mix, ≤200 g/m² ───────────────────────────────
  { code: "52101120", label: "Sarees · Cotton/man-made mix, ≤200 g/m²" },
  { code: "52102130", label: "Sarees · Cotton/man-made mix, ≤200 g/m², printed" },
  { code: "52102910", label: "Dhoti & Sarees, Zari bordered · Cotton/man-made mix, ≤200 g/m²" },
  { code: "52103150", label: "Sarees · Cotton/man-made mix, ≤200 g/m², dyed" },
  { code: "52103910", label: "Zari bordered saree · Cotton/man-made mix, ≤200 g/m², dyed" },
  { code: "52104160", label: "Sarees · Cotton/man-made mix, ≤200 g/m², yarn-dyed" },
  { code: "52104910", label: "Zari bordered saree · Cotton/man-made mix, ≤200 g/m², yarn-dyed" },
  { code: "52105130", label: "Sarees · Cotton/man-made mix, ≤200 g/m², printed" },
  { code: "52105910", label: "Zari bordered saree · Cotton/man-made mix, ≤200 g/m², printed" },
  // ── SAREES · Cotton/man-made mix, >200 g/m² ───────────────────────────────
  { code: "52111120", label: "Sarees · Cotton/man-made mix, >200 g/m²" },
  { code: "52112040", label: "Sarees · Cotton/man-made mix, >200 g/m², bleached" },
  { code: "52112091", label: "Zari bordered sari · Cotton/man-made mix, >200 g/m², bleached" },
  { code: "52112140", label: "Sarees · Cotton/man-made mix, >200 g/m², bleached plain weave" },
  { code: "52112910", label: "Zari bordered sari · Cotton/man-made mix, >200 g/m%" },
  { code: "52113150", label: "Sarees · Cotton/man-made mix, >200 g/m², dyed" },
  { code: "52113910", label: "Zari bordered sarees · Cotton/man-made mix, >200 g/m², dyed" },
  { code: "52114160", label: "Sarees · Cotton/man-made mix, >200 g/m², yarn-dyed" },
  { code: "52114910", label: "Zari bordered sarees · Cotton/man-made mix, >200 g/m², yarn-dyed" },
  { code: "52115150", label: "Sarees · Cotton/man-made mix, >200 g/m², printed" },
  { code: "52115910", label: "Zari bordered saree · Cotton/man-made mix, >200 g/m², printed" },
  // ── SAREES · Synthetic filament yarn ──────────────────────────────────────
  { code: "54074114", label: "Nylon sarees · Synthetic filament yarn" },
  { code: "54074124", label: "Nylon sarees · Synthetic filament yarn" },
  { code: "54074240", label: "Nylon sarees · Synthetic filament yarn, dyed" },
  { code: "54074440", label: "Nylon sarees · Synthetic filament yarn, printed" },
  { code: "54075230", label: "Terylene / Dacron sarees · Synthetic filament yarn, dyed" },
  { code: "54075240", label: "Polyester sarees · Synthetic filament yarn, dyed" },
  { code: "54075410", label: "Terylene / Dacron sarees · Synthetic filament yarn, printed" },
  { code: "54075430", label: "Polyester sarees · Synthetic filament yarn, printed" },
  { code: "54078112", label: "Nylon sarees · Synthetic filament yarn, unbleached/bleached" },
  { code: "54078115", label: "Terylene / Dacron sarees · Synthetic, unbleached/bleached" },
  { code: "54078122", label: "Nylon sarees · Synthetic filament yarn" },
  { code: "54078125", label: "Terylene / Dacron sarees · Synthetic filament yarn" },
  { code: "54078220", label: "Nylon sarees · Synthetic filament yarn, dyed" },
  { code: "54078250", label: "Terylene / Dacron sarees · Synthetic filament yarn, dyed" },
  { code: "54078420", label: "Nylon sarees · Synthetic filament yarn, printed" },
  { code: "54078450", label: "Terylene / Dacron sarees · Synthetic filament yarn, printed" },
  { code: "54078470", label: "Polyester sarees · Synthetic filament yarn, printed" },
  // ── SAREES · Artificial filament yarn (rayon) ──────────────────────────────
  { code: "54082218", label: "Rayon sarees · Artificial filament yarn, dyed" },
  { code: "54082418", label: "Rayon sarees · Artificial filament yarn, printed" },
  { code: "54083418", label: "Rayon sarees · Artificial filament yarn, printed" },
  // ── TRIMMINGS · Saree falls / borders ─────────────────────────────────────
  { code: "58089050", label: "Saree falls / borders · Cotton trimmings" },
  { code: "58089060", label: "Saree falls / borders · Man-made fibre trimmings" },
  // ── SHAWLS / SCARVES · Knitted or crocheted ───────────────────────────────
  { code: "61171010", label: "Shawls / scarves, silk · Knitted / crocheted" },
  { code: "61171020", label: "Shawls / scarves, wool · Knitted / crocheted" },
  { code: "61171030", label: "Shawls / scarves, cotton · Knitted / crocheted" },
  { code: "61171040", label: "Shawls / scarves, man-made fibres · Knitted / crocheted" },
  { code: "61171090", label: "Shawls / scarves, other · Knitted / crocheted" },
  // ── SHAWLS / SCARVES · Not knitted · Silk ─────────────────────────────────
  { code: "62141010", label: "Scarves, silk ≤60 cm" },
  { code: "62141020", label: "Shawls / scarves, silk >60 cm" },
  { code: "62141030", label: "Shawls / scarves, silk, handloom" },
  { code: "62141040", label: "Shawls / scarves, silk, Lucknow Chikan" },
  { code: "62141090", label: "Shawls / scarves, silk, other" },
  // ── SHAWLS / SCARVES · Not knitted · Wool / fine animal hair ──────────────
  { code: "62142010", label: "Shawls, wool / fine animal hair" },
  { code: "62142020", label: "Shawls / scarves, wool / fine animal hair" },
  { code: "62142021", label: "Shawls / scarves, wool, Khadi" },
  { code: "62142029", label: "Shawls / scarves, wool, other" },
  { code: "62142030", label: "Mufflers, wool / fine animal hair" },
  { code: "62142031", label: "Mufflers, wool, Khadi" },
  { code: "62142039", label: "Mufflers, wool, other" },
  { code: "62142090", label: "Shawls / scarves / mufflers, wool, other" },
  // ── SHAWLS / SCARVES · Not knitted · Synthetic ────────────────────────────
  { code: "62143000", label: "Shawls / scarves, synthetic fibres" },
  { code: "62143010", label: "Shawls / scarves, synthetic, Lucknow Chikan" },
  { code: "62143090", label: "Shawls / scarves, synthetic, other" },
  // ── SHAWLS / SCARVES · Not knitted · Artificial fibres ────────────────────
  { code: "62144000", label: "Shawls / scarves, artificial fibres" },
  { code: "62144010", label: "Shawls / scarves, artificial fibres, Lucknow Chikan" },
  { code: "62144090", label: "Shawls / scarves, artificial fibres, other" },
  // ── SHAWLS / SCARVES · Not knitted · Other textiles ───────────────────────
  { code: "62149010", label: "Abrabroomal, cotton · Other textiles" },
  { code: "62149021", label: "Shawls / scarves, other textiles, grey" },
  { code: "62149022", label: "Shawls / scarves, other textiles, white bleached" },
  { code: "62149029", label: "Shawls / scarves, other textiles, other" },
  { code: "62149031", label: "Shawls / scarves, other textiles, grey" },
  { code: "62149032", label: "Shawls / scarves, other textiles, white bleached" },
  { code: "62149039", label: "Shawls / scarves, other textiles, other" },
  { code: "62149040", label: "Scarves, cotton · Not knitted, other textiles" },
  { code: "62149041", label: "Scarves, cotton, Lucknow Chikan" },
  { code: "62149049", label: "Scarves, cotton, other" },
  { code: "62149050", label: "Shawls / mufflers, cotton · Other textiles" },
  { code: "62149051", label: "Shawls / mufflers, cotton, Lucknow Chikan" },
  { code: "62149059", label: "Shawls / mufflers, cotton, other" },
  { code: "62149060", label: "Shawls / mufflers, man-made fibres" },
  { code: "62149061", label: "Shawls / mufflers, man-made fibres, Lucknow Chikan" },
  { code: "62149069", label: "Shawls / mufflers, man-made fibres, other" },
  { code: "62149090", label: "Shawls / scarves / mufflers, other materials" },
  { code: "62149091", label: "Other, Lucknow Chikan" },
  { code: "62149099", label: "Other" },
];

// Auto-HSN lookup — returns best-match 8-digit code for category + fabric
const HSN_MAP = {
  "saree|silk": "50072010", "saree|tussar silk": "50072010", "saree|mulberry silk": "50072010",
  "saree|satin": "50072010", "saree|cotton": "52085920", "saree|cotton tussar": "52085920",
  "saree|georgette": "54075240", "saree|crepe": "54075240",
  "saree|chiffon": "54075240", "saree|polyester": "54075240",
  "saree|rayon": "54082218", "saree|nylon": "54074240",
  "saree|": "50072010",
  "scarf|silk": "62141020", "scarf|cotton": "62149040",
  "scarf|wool": "62142020", "scarf|": "62141020",
  "shawl|silk": "62141020", "shawl|wool": "62142010", "shawl|cotton": "62149050",
  "shawl|": "62141020",
};

function getAutoHSN(category, fabricType) {
  const cat = (category || "").toLowerCase();
  const mat = (fabricType || "").toLowerCase();
  return HSN_MAP[`${cat}|${mat}`] || HSN_MAP[`${cat}|`] || "";
}

function generateSKU(category, fabricType, productCode, collectionName) {
  const cat = (category || "").slice(0, 3).toUpperCase();
  const mat = (fabricType || "GEN").slice(0, 3).toUpperCase();
  const des = (collectionName || "GEN").slice(0, 3).toUpperCase();
  const seq = (productCode || "").split("-").pop() || "000";
  return `${cat}-${mat}-${des}-${seq}`;
}

const SECTION_STYLE = "bg-white border border-gray-200 rounded-lg p-5 space-y-4";
const LABEL_STYLE = "block text-xs font-medium text-gray-600 mb-1";
const INPUT_STYLE = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]";
const SELECT_STYLE = INPUT_STYLE;

function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative mt-0.5">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-10 h-5 rounded-full transition-colors ${checked ? "bg-[#1B4D3E]" : "bg-gray-300"}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
}

const BLANK = {
  product_name: "", category: "", subcategory: "", collection_name: "", drop_name: "",
  pricing_mode: "price_on_request", price: "", currency: "INR",
  edition_size: "", release_date: "", description: "", website_product_id: "",
  // attributes
  primary_color: "", secondary_color: "", accent_color: "", fabric_type: "",
  craft_technique: "", motif_type: "", motif_subject: "", embroidery_type: "",
  embroidery_density: "", border_type: "", pattern_scale: "", art_inspiration: "",
  aesthetic_category: "",
  occasion: "", season: "", customer_age_range: "", how_sold: "",
  style_region: "", buyer_geography: "", formality: "",
  // commerce & compliance
  product_type: "", composition_pct: "", hsn_code: "", gst_rate: "",
  cost_price: "", selling_price: "", hide_price: false, display_edition: true, sku: "",
  production_job_id: "",
};

const FLOW_GATE = new Date("2026-10-01");
const isAfterGate = () => new Date() >= FLOW_GATE;

export default function AdminProductMasterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(BLANK);
  const [meta, setMeta] = useState({ categories: [], product_types: [], gst_rates: [] });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hsnAutoFilled, setHsnAutoFilled] = useState(false);
  const [skuAutoFilled, setSkuAutoFilled] = useState(false);
  const [productCode, setProductCode] = useState(null);
  const [jobs, setJobs] = useState([]);
  const afterGate = isAfterGate();

  useEffect(() => {
    axios.get(`${API}/api/admin/product-master/meta`, authHeader()).then(r => setMeta(r.data)).catch(() => {});
    if (isNew) {
      axios.get(`${API}/api/admin/production-jobs`, authHeader()).then(r => setJobs(r.data)).catch(() => {});
    }
  }, [isNew]);

  useEffect(() => {
    if (!isNew) {
      axios.get(`${API}/api/admin/product-master/${id}`, authHeader())
        .then(r => {
          const d = r.data;
          const attrs = d.attributes || {};
          setForm({
            product_name: d.product_name || "",
            category: d.category || "",
            subcategory: d.subcategory || "",
            collection_name: d.collection_name || "",
            drop_name: d.drop_name || "",
            pricing_mode: d.pricing_mode || "price_on_request",
            price: d.price ?? "",
            currency: d.currency || "INR",
            edition_size: d.edition_size ?? "",
            release_date: d.release_date || "",
            description: d.description || "",
            website_product_id: d.website_product_id || "",
            primary_color: attrs.primary_color || "",
            secondary_color: attrs.secondary_color || "",
            accent_color: attrs.accent_color || "",
            fabric_type: attrs.fabric_type || "",
            craft_technique: attrs.craft_technique || "",
            motif_type: attrs.motif_type || "",
            motif_subject: attrs.motif_subject || "",
            embroidery_type: attrs.embroidery_type || "",
            embroidery_density: attrs.embroidery_density || "",
            border_type: attrs.border_type || "",
            pattern_scale: attrs.pattern_scale || "",
            art_inspiration: attrs.art_inspiration || "",
            aesthetic_category: attrs.aesthetic_category || "",
            occasion: attrs.occasion || "",
            season: attrs.season || "",
            customer_age_range: attrs.customer_age_range || "",
            how_sold: attrs.how_sold || "",
            style_region: attrs.style_region || "",
            buyer_geography: attrs.buyer_geography || "",
            formality: attrs.formality || "",
            // commerce
            product_type: d.product_type || "",
            composition_pct: d.composition_pct || "",
            hsn_code: d.hsn_code || "",
            gst_rate: d.gst_rate ?? "",
            cost_price: d.cost_price ?? "",
            selling_price: d.selling_price ?? "",
            hide_price: d.hide_price ?? false,
            display_edition: d.display_edition ?? true,
            sku: d.sku || "",
            production_job_id: d.production_job_id || "",
          });
          setProductCode(d.product_code);
        })
        .catch(() => toast.error("Failed to load product"))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-fill HSN when category or fabric changes (only if not manually edited)
  const handleCategoryOrFabricChange = useCallback((newCategory, newFabric) => {
    const cat = newCategory !== undefined ? newCategory : form.category;
    const fab = newFabric !== undefined ? newFabric : form.fabric_type;
    const auto = getAutoHSN(cat, fab);
    if (auto && (!form.hsn_code || hsnAutoFilled)) {
      setForm(f => ({ ...f, hsn_code: auto }));
      setHsnAutoFilled(true);
    }
    // Auto-fill SKU if not manually set
    if (!form.sku || skuAutoFilled) {
      const sku = generateSKU(cat, fab, productCode || "000", form.collection_name);
      setForm(f => ({ ...f, sku }));
      setSkuAutoFilled(true);
    }
  }, [form, hsnAutoFilled, skuAutoFilled, productCode]);

  const handleSave = async () => {
    if (!form.product_name.trim()) return toast.error("Product name is required");
    if (!form.category) return toast.error("Category is required");
    if (!form.pricing_mode) return toast.error("Pricing mode is required");
    if (isNew && afterGate && !form.production_job_id) return toast.error("A production job must be linked from 1 Oct 2026");
    setSaving(true);
    const payload = {
      product_name: form.product_name,
      category: form.category,
      subcategory: form.subcategory || null,
      collection_name: form.collection_name || null,
      drop_name: form.drop_name || null,
      pricing_mode: form.pricing_mode,
      price: form.price !== "" ? parseFloat(form.price) : null,
      currency: form.currency,
      edition_size: form.edition_size !== "" ? parseInt(form.edition_size) : null,
      release_date: form.release_date || null,
      description: form.description || null,
      website_product_id: form.website_product_id || null,
      attributes: {
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        accent_color: form.accent_color || null,
        fabric_type: form.fabric_type || null,
        craft_technique: form.craft_technique || null,
        motif_type: form.motif_type || null,
        motif_subject: form.motif_subject || null,
        embroidery_type: form.embroidery_type || null,
        embroidery_density: form.embroidery_density || null,
        border_type: form.border_type || null,
        pattern_scale: form.pattern_scale || null,
        art_inspiration: form.art_inspiration || null,
        aesthetic_category: form.aesthetic_category || null,
        occasion: form.occasion || null,
        season: form.season || null,
        customer_age_range: form.customer_age_range || null,
        how_sold: form.how_sold || null,
        style_region: form.style_region || null,
        buyer_geography: form.buyer_geography || null,
        formality: form.formality || null,
      },
      // commerce & compliance
      product_type: form.product_type || null,
      composition_pct: form.composition_pct || null,
      hsn_code: form.hsn_code || null,
      gst_rate: form.gst_rate !== "" ? parseFloat(form.gst_rate) : null,
      cost_price: form.cost_price !== "" ? parseFloat(form.cost_price) : null,
      selling_price: form.selling_price !== "" ? parseFloat(form.selling_price) : null,
      hide_price: form.hide_price,
      display_edition: form.display_edition,
      sku: form.sku || null,
      production_job_id: form.production_job_id || null,
    };
    try {
      if (isNew) {
        const res = await axios.post(`${API}/api/admin/product-master`, payload, authHeader());
        toast.success("Product created");
        navigate(`/admin/product-master/${res.data.id}`);
      } else {
        await axios.put(`${API}/api/admin/product-master/${id}`, payload, authHeader());
        toast.success("Product saved");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-500 text-center">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/admin/product-master")} className="text-xs text-gray-400 hover:text-gray-600 mb-1">
            ← Product Master
          </button>
          <h1 className="text-xl font-bold text-gray-900">{isNew ? "New Product" : form.product_name}</h1>
          {productCode && <p className="text-xs text-gray-400 mt-0.5">{productCode}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Production flow window banner */}
      {isNew && (
        <div style={{
          padding: "12px 16px",
          background: afterGate ? "rgba(192,64,64,0.07)" : "rgba(218,203,160,0.25)",
          border: `1px solid ${afterGate ? "rgba(192,64,64,0.25)" : "rgba(218,203,160,0.6)"}`,
          fontFamily: "'Manrope', sans-serif",
          fontSize: "13px",
          color: afterGate ? "#8a2020" : "#8a7340",
        }}>
          {afterGate
            ? "Production flow required. New products must be linked to a production job. Contact super admin to bypass."
            : "Direct upload window open until 30 Sep 2026 — products can be added without a production job while operations are being set up. After that, all new products must come through production."}
        </div>
      )}

      {/* ── Basic Info ── */}
      <div className={SECTION_STYLE}>
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={LABEL_STYLE}>Product Name <span className="text-red-400">*</span></label>
            <input className={INPUT_STYLE} value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="e.g. Ivory Kantha Tussar Saree" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Category <span className="text-red-400">*</span></label>
            <select className={SELECT_STYLE} value={form.category} onChange={e => {
              set("category", e.target.value);
              handleCategoryOrFabricChange(e.target.value, undefined);
            }}>
              <option value="">Select…</option>
              {(meta.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Pricing Mode <span className="text-red-400">*</span></label>
            <select className={SELECT_STYLE} value={form.pricing_mode} onChange={e => set("pricing_mode", e.target.value)}>
              <option value="price_on_request">Price on Request</option>
              <option value="direct_purchase">Direct Purchase</option>
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Collection</label>
            <input className={INPUT_STYLE} value={form.collection_name} onChange={e => set("collection_name", e.target.value)} placeholder="e.g. Blossom Chronicles" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Drop Name</label>
            <input className={INPUT_STYLE} value={form.drop_name} onChange={e => set("drop_name", e.target.value)} placeholder="e.g. Summer 2025" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Edition Size</label>
            <input type="number" className={INPUT_STYLE} value={form.edition_size} onChange={e => set("edition_size", e.target.value)} placeholder="e.g. 20" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Release Date</label>
            <input type="date" className={INPUT_STYLE} value={form.release_date} onChange={e => set("release_date", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_STYLE}>Description</label>
            <textarea rows={3} className={INPUT_STYLE} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_STYLE}>Linked Website Product ID</label>
            <input className={INPUT_STYLE} value={form.website_product_id} onChange={e => set("website_product_id", e.target.value)} placeholder="UUID from the products collection" />
          </div>
          {isNew && (
            <div className="col-span-2">
              <label className={LABEL_STYLE}>
                Production Job {afterGate && <span className="text-red-400">*</span>}
                {!afterGate && <span style={{ fontWeight: 400, color: "#aaa" }}> — optional until 30 Sep 2026</span>}
              </label>
              <select className={SELECT_STYLE} value={form.production_job_id} onChange={e => set("production_job_id", e.target.value)}>
                <option value="">— Direct upload (no production job) —</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.job_code} — {j.product_name}</option>
                ))}
              </select>
              {afterGate && !form.production_job_id && (
                <p className="text-xs text-red-400 mt-1">Required from 1 Oct 2026</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Design Attributes ── */}
      <div className={SECTION_STYLE}>
        <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Design Attributes</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_STYLE}>Fabric Type <span className="text-red-400">*</span></label>
            <input className={INPUT_STYLE} value={form.fabric_type} onChange={e => {
              set("fabric_type", e.target.value);
              handleCategoryOrFabricChange(undefined, e.target.value);
            }} placeholder="e.g. Tussar Silk" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Craft Technique</label>
            <input className={INPUT_STYLE} value={form.craft_technique} onChange={e => set("craft_technique", e.target.value)} placeholder="e.g. Hand Embroidery" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Primary Colour</label>
            <input className={INPUT_STYLE} value={form.primary_color} onChange={e => set("primary_color", e.target.value)} />
          </div>
          <div>
            <label className={LABEL_STYLE}>Secondary Colour</label>
            <input className={INPUT_STYLE} value={form.secondary_color} onChange={e => set("secondary_color", e.target.value)} />
          </div>
          <div>
            <label className={LABEL_STYLE}>Motif Type</label>
            <input className={INPUT_STYLE} value={form.motif_type} onChange={e => set("motif_type", e.target.value)} placeholder="e.g. Floral" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Motif Subject</label>
            <input className={INPUT_STYLE} value={form.motif_subject} onChange={e => set("motif_subject", e.target.value)} placeholder="e.g. Lotus" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Art Inspiration</label>
            <input className={INPUT_STYLE} value={form.art_inspiration} onChange={e => set("art_inspiration", e.target.value)} placeholder="e.g. Mughal miniature" />
          </div>
          <div>
            <label className={LABEL_STYLE}>Aesthetic Category</label>
            <input className={INPUT_STYLE} value={form.aesthetic_category} onChange={e => set("aesthetic_category", e.target.value)} placeholder="e.g. Heritage" />
          </div>
          <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Design Intelligence — fill in after each sale</p>
          </div>
          <div>
            <label className={LABEL_STYLE}>Occasion</label>
            <select className={SELECT_STYLE} value={form.occasion} onChange={e => set("occasion", e.target.value)}>
              <option value="">Select…</option>
              {["wedding", "festive", "casual", "office", "gifting", "everyday"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Season</label>
            <select className={SELECT_STYLE} value={form.season} onChange={e => set("season", e.target.value)}>
              <option value="">Select…</option>
              {["summer", "winter", "festive", "all-season"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Customer Age Range</label>
            <select className={SELECT_STYLE} value={form.customer_age_range} onChange={e => set("customer_age_range", e.target.value)}>
              <option value="">Select…</option>
              {["20s", "30s", "40s", "50+"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>How Sold</label>
            <select className={SELECT_STYLE} value={form.how_sold} onChange={e => set("how_sold", e.target.value)}>
              <option value="">Select…</option>
              {["online", "showroom", "offline", "gifted"].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Style Region</label>
            <select className={SELECT_STYLE} value={form.style_region} onChange={e => set("style_region", e.target.value)}>
              <option value="">Select…</option>
              {["Banarasi", "Kantha", "Kanjeevaram", "Kashmiri", "Rajasthani", "South Indian", "Lucknawi", "Odisha", "Contemporary", "Fusion", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Buyer Geography</label>
            <select className={SELECT_STYLE} value={form.buyer_geography} onChange={e => set("buyer_geography", e.target.value)}>
              <option value="">Select…</option>
              {["metro India", "tier-2 India", "international"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_STYLE}>Formality</label>
            <select className={SELECT_STYLE} value={form.formality} onChange={e => set("formality", e.target.value)}>
              <option value="">Select…</option>
              {["bridal", "ceremonial", "festive", "semi-formal", "casual"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ══ COMMERCE & COMPLIANCE — ADMIN ONLY ══ */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-5 space-y-5">
        {/* Header badge */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
            🔒 Commerce &amp; Compliance
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-200 text-amber-800">
            Admin only — not visible on website
          </span>
        </div>

        {/* ─ Product Classification ─ */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Product Classification</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_STYLE}>Product Type <span className="text-red-400">*</span></label>
              <select className={SELECT_STYLE} value={form.product_type} onChange={e => set("product_type", e.target.value)}>
                <option value="">Select…</option>
                {(meta.product_types || ["woven", "stitched", "accessory"]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_STYLE}>Composition %</label>
              <input className={INPUT_STYLE} value={form.composition_pct} onChange={e => set("composition_pct", e.target.value)} placeholder="e.g. 100% Tussar Silk" />
            </div>
          </div>
        </div>

        {/* ─ HSN & GST ─ */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tax &amp; Compliance</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_STYLE}>
                HSN Code
                {hsnAutoFilled && <span className="ml-2 text-xs text-blue-500 font-normal">auto-filled</span>}
              </label>
              <input
                className={INPUT_STYLE}
                value={form.hsn_code}
                onChange={e => {
                  let val = e.target.value;
                  // If user selected from datalist (contains " — "), keep only the code
                  if (val.includes(" — ")) val = val.split(" — ")[0].trim();
                  set("hsn_code", val);
                  setHsnAutoFilled(false);
                }}
                list="hsn-datalist"
                placeholder="Type code or keyword — e.g. silk, cotton, 5208"
                autoComplete="off"
              />
              <datalist id="hsn-datalist">
                {HSN_OPTIONS.map(o => (
                  <option key={o.code} value={`${o.code} — ${o.label}`} />
                ))}
              </datalist>
              <p className="text-xs text-gray-400 mt-1">Auto-filled from Category + Fabric. Type to search {HSN_OPTIONS.length} validated codes.</p>
            </div>
            <div>
              <label className={LABEL_STYLE}>GST Rate</label>
              <select className={SELECT_STYLE} value={form.gst_rate} onChange={e => set("gst_rate", e.target.value)}>
                <option value="">Select…</option>
                {(meta.gst_rates || [5, 12, 18]).map(r => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─ Pricing ─ */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pricing (Internal)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_STYLE}>Cost Price (Internal) — ₹</label>
              <input
                type="number"
                className={INPUT_STYLE}
                value={form.cost_price}
                onChange={e => set("cost_price", e.target.value)}
                placeholder="Your cost — never shown publicly"
              />
            </div>
            <div>
              <label className={LABEL_STYLE}>Selling Price (Master) — ₹ <span className="text-red-400">*</span></label>
              <input
                type="number"
                className={INPUT_STYLE}
                value={form.selling_price}
                onChange={e => set("selling_price", e.target.value)}
                placeholder="Master price for this product"
              />
            </div>
          </div>
          {form.cost_price && form.selling_price && (
            <p className="text-xs text-gray-500 mt-2">
              Margin: ₹{(parseFloat(form.selling_price) - parseFloat(form.cost_price)).toLocaleString()} 
              {" "}({Math.round(((form.selling_price - form.cost_price) / form.selling_price) * 100)}%)
            </p>
          )}
        </div>

        {/* ─ Price Display Control ─ */}
        <div className="p-3 bg-white rounded border border-amber-200 space-y-1">
          <Toggle
            checked={form.hide_price}
            onChange={v => set("hide_price", v)}
            label='Hide price on website (Show "Price on Request")'
            sublabel={
              form.hide_price
                ? '✓ Website will show "Price on Request" — price is hidden'
                : '✗ Website will show the selling price'
            }
          />
        </div>

        {/* ─ Edition Control ─ */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Edition Control</h3>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded border border-amber-200 space-y-1">
              <Toggle
                checked={form.display_edition}
                onChange={v => set("display_edition", v)}
                label="Display edition size on product page"
                sublabel={
                  form.display_edition
                    ? `✓ Product page will show "Edition: ${form.edition_size || "—"}"`
                    : "✗ Edition size will be hidden on the website"
                }
              />
            </div>
            {form.edition_size && (
              <p className="text-xs text-amber-700 bg-amber-100 rounded px-3 py-2">
                ⚠ Stock quantity cannot exceed edition size ({form.edition_size}). The system will block any inventory entry that exceeds this.
              </p>
            )}
          </div>
        </div>

        {/* ─ SKU ─ */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SKU</h3>
          <div>
            <label className={LABEL_STYLE}>
              Internal SKU
              {skuAutoFilled && <span className="ml-2 text-xs text-blue-500 font-normal">auto-generated</span>}
            </label>
            <input
              className={`${INPUT_STYLE} font-mono`}
              value={form.sku}
              onChange={e => {
                set("sku", e.target.value);
                setSkuAutoFilled(false);
              }}
              placeholder="CATEGORY-MATERIAL-DESIGN-XXXX"
            />
            <p className="text-xs text-gray-400 mt-1">
              Auto-generated as <span className="font-mono">CATEGORY-MATERIAL-DESIGN-SEQ</span>. Override if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Save button (bottom) */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => navigate("/admin/product-master")} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm font-medium rounded bg-[#1B4D3E] text-white hover:bg-[#163d31] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Product"}
        </button>
      </div>
    </div>
  );
}
