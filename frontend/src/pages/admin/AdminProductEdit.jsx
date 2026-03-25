import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Upload, Settings2, Sparkles, ChevronUp, ChevronDown, Lock, ChevronRight, Clock, Package } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const IMAGE_TYPE_OPTIONS = [
  { value: "product_display", label: "Product Display" },
  { value: "hero", label: "Hero" },
  { value: "close_up", label: "Close-Up" },
  { value: "embroidery_detail", label: "Embroidery Detail" },
  { value: "model", label: "Model" },
];

const DEFAULT_EDITION_TEXT = "Limited to 15 pieces. Each Chytare design is produced in strictly limited editions and will not be recreated once the edition is complete.";
const DEFAULT_DISCLAIMER = "This piece is hand embroidered. Slight variations in stitch placement, texture, and colour are natural characteristics of handcrafted textiles and make every piece unique.";
const PREDEFINED_DETAIL_LABELS = ["Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"];

// HSN auto-mapping — mirrors server-side logic
const HSN_MAP = {
  "sarees|silk": "5007", "sarees|tussar silk": "5007", "sarees|mulberry silk": "5007",
  "sarees|satin": "5007", "sarees|cotton": "5208", "sarees|cotton tussar": "5208",
  "sarees|linen": "5309", "sarees|georgette": "5407", "sarees|crepe": "5407",
  "sarees|chiffon": "5407",
  "scarves|": "6214", "blouses|": "6206", "dresses|": "6204",
  "jackets|": "6201", "accessories|": "6217", "jewelry|": "7117",
};

function getAutoHSN(ct, mat) {
  const c = (ct || "").toLowerCase();
  const m = (mat || "").toLowerCase();
  return HSN_MAP[`${c}|${m}`] || HSN_MAP[`${c}|`] || "";
}

function generateSKU(ct, mat, des, pid) {
  const c = (ct || "SAR").slice(0, 3).toUpperCase();
  const m = (mat || "GEN").replace(/\s/g, "").slice(0, 3).toUpperCase();
  const d = (des || "GEN").replace(/\s/g, "").slice(0, 3).toUpperCase();
  const s = pid ? pid.slice(-4).toUpperCase() : "XXXX";
  return `${c}-${m}-${d}-${s}`;
}

// ─────────────────────────────────────────────────────────────
// SECTION ACCORDION COMPONENT
// ─────────────────────────────────────────────────────────────

function Section({ id, title, subtitle, badge, open, onToggle, adminOnly, children }) {
  return (
    <div className={`border ${adminOnly ? "border-[#1B4D3E]/25 bg-[#1B4D3E]/[0.02]" : "border-[#DACBA0]/30 bg-white"}`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-6 text-left group"
      >
        <div className="flex items-center gap-3">
          {adminOnly && <Lock className="w-4 h-4 text-[#1B4D3E]/40 shrink-0" />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-xl text-[#1B4D3E]">{title}</span>
              {badge && (
                <span className="text-xs px-2 py-0.5 bg-[#1B4D3E] text-[#FFFFF0] uppercase tracking-wide">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[#1B4D3E]/40 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-[#1B4D3E]/40 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-6 border-t border-[#DACBA0]/20 pt-6">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-SECTION DIVIDER
// ─────────────────────────────────────────────────────────────

function SubSection({ label }) {
  return (
    <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 pb-2 border-b border-[#DACBA0]/20">
      {label}
    </p>
  );
}


// ─────────────────────────────────────────────────────────────
// PRODUCT EDIT HISTORY COMPONENT
// ─────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  "product.created": "Product created",
  "product.updated": "Product saved",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ProductEditHistory({ productId }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(async () => {
    if (fetched) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/admin/products/${productId}/history`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` } }
      );
      setLogs(res.data);
      setFetched(true);
      setOpen(true);
    } catch {
      toast.error("Could not load edit history");
    } finally { setLoading(false); }
  }, [productId, fetched]);

  return (
    <div className="pt-4 border-t border-[#DACBA0]/20">
      <button
        type="button"
        onClick={load}
        className="text-xs text-[#1B4D3E]/50 hover:text-[#1B4D3E] underline flex items-center gap-1"
      >
        <Clock className="w-3 h-3" />
        {loading ? "Loading..." : open ? "Hide edit history" : "View edit history"}
      </button>

      {open && (
        <div className="mt-4">
          {logs.length === 0 ? (
            <p className="text-xs text-[#1B4D3E]/40 italic">
              No history yet — edits from this point forward will appear here.
            </p>
          ) : (
            <div className="space-y-0">
              {logs.map((log, i) => (
                <div key={log.id || i} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === 0 ? "bg-[#1B4D3E]" : "bg-[#DACBA0]"}`} />
                    {i < logs.length - 1 && <div className="w-px flex-1 bg-[#DACBA0]/40 my-1" />}
                  </div>

                  {/* Entry */}
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[#1B4D3E]">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.user_name && (
                        <span className="text-xs text-[#1B4D3E]/50">by {log.user_name}</span>
                      )}
                      <span className="text-xs text-[#1B4D3E]/30">{formatDate(log.created_at)}</span>
                    </div>

                    {/* Show changed fields if present */}
                    {log.details?.changes && log.details.changes.length > 0 && (
                      <p className="text-xs text-[#1B4D3E]/40 mt-0.5 truncate">
                        Fields updated: {log.details.changes
                          .filter(f => !["updated_at","updated_by","updated_by_name","_id"].includes(f))
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // ── UI state ──
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState({});
  const [focalEditIndex, setFocalEditIndex] = useState(null);
  const [customMaterial, setCustomMaterial] = useState(false);
  const [customWork, setCustomWork] = useState(false);
  const [hsnOverride, setHsnOverride] = useState(false); // manual override toggle
  const [skuAutoFilled, setSkuAutoFilled] = useState(false);
  const [lastEdited, setLastEdited] = useState(null);
  // Basic Info + Commerce open by default per spec
  const [openSections, setOpenSections] = useState(new Set(["basic", "commerce"]));
  const [categories, setCategories] = useState({
    materials: [], works: [], design_categories: [], collection_types: [],
  });

  const toggleSection = (sid) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });

  // ── Form state ──
  const blankForm = {
    // Identity
    name: "", slug: "", collection_type: "sarees", material: "", work: "",
    design_category: "", status: "active",
    // Specs
    details: [], made_in_india: true,
    ...Object.fromEntries(PREDEFINED_DETAIL_LABELS.map(l => [`detail_${l}`, ""])),
    // Website content
    narrative_intro: "", description: "",
    edition: DEFAULT_EDITION_TEXT, disclaimer: DEFAULT_DISCLAIMER,
    craft_fabric: "", craft_technique: "",
    care_instructions: "", delivery_info: "",
    attributes: [], seo_title: "", seo_description: "",
    // Commerce & compliance
    product_type: "", composition_pct: "",
    price_display_mode: "price_on_request",
    selling_price: "", cost_price: "", currency: "INR",
    hsn_code: "", gst_rate: "", sku: "",
    // Edition & inventory
    edition_size: "", display_edition: true,
    stock_status: "in_stock", stock_quantity: 0, units_available: 0,
    continue_selling_out_of_stock: false, made_to_order_days: 30,
    // Visibility / media
    is_hidden: false, is_invite_only: false, is_hero: false,
    is_secondary_highlight: false, secondary_highlight_order: 0,
    display_order: 9999, media: [],
  };

  const [form, setForm] = useState(blankForm);
  const sf = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // ── Lifecycle ──
  useEffect(() => {
    fetchCategories();
    if (!isNew) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!isNew && categories.materials.length > 0 && form.material) {
      if (!categories.materials.some(c => c.name === form.material)) setCustomMaterial(true);
    }
    if (!isNew && categories.works.length > 0 && form.work) {
      if (!categories.works.some(c => c.name === form.work)) setCustomWork(true);
    }
  }, [categories, isNew]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
      });
      const d = res.data;
      const madeInIndia = (d.details || []).some(det => det.label === "Origin: India");
      const predefined = {};
      const custom = [];
      (d.details || []).forEach(det => {
        if (det.label === "Origin: India") return;
        if (PREDEFINED_DETAIL_LABELS.includes(det.label)) predefined[det.label] = det.value;
        else custom.push(det);
      });
      const isPOR = d.hide_price || d.pricing_mode === "price_on_request" || d.price_on_request;
      // Derive status from is_hidden
      const status = d.is_archived ? "archived" : d.is_hidden ? "hidden" : "active";
      setForm({
        name: d.name || "", slug: d.slug || "",
        collection_type: d.collection_type || "sarees", material: d.material || "",
        work: d.work || "", design_category: d.design_category || "", status,
        details: custom, made_in_india: madeInIndia,
        ...Object.fromEntries(PREDEFINED_DETAIL_LABELS.map(l => [`detail_${l}`, predefined[l] || ""])),
        product_type: d.product_type || "", composition_pct: d.composition_pct || "",
        narrative_intro: d.narrative_intro || "", description: d.description || "",
        edition: d.edition || DEFAULT_EDITION_TEXT, disclaimer: d.disclaimer || DEFAULT_DISCLAIMER,
        craft_fabric: d.craft_fabric || "", craft_technique: d.craft_technique || "",
        care_instructions: d.care_instructions || "", delivery_info: d.delivery_info || "",
        attributes: d.attributes || [], seo_title: d.seo_title || "", seo_description: d.seo_description || "",
        price_display_mode: isPOR ? "price_on_request" : "show_price",
        selling_price: d.selling_price ?? d.price ?? "", cost_price: d.cost_price ?? "",
        currency: d.currency || "INR", hsn_code: d.hsn_code || "", gst_rate: d.gst_rate ?? "",
        sku: d.sku || "",
        edition_size: d.edition_size ?? "", display_edition: d.display_edition ?? true,
        stock_status: d.stock_status || "in_stock", stock_quantity: d.stock_quantity || 0,
        units_available: d.units_available || 0,
        continue_selling_out_of_stock: d.continue_selling_out_of_stock || false,
        made_to_order_days: d.made_to_order_days || 30,
        is_hidden: d.is_hidden || false, is_invite_only: d.is_invite_only || false,
        is_hero: d.is_hero || false, is_secondary_highlight: d.is_secondary_highlight || false,
        secondary_highlight_order: d.secondary_highlight_order || 0,
        display_order: d.display_order ?? 9999, media: d.media || [],
      });
      if (d.updated_at) setLastEdited({ at: d.updated_at, by: d.updated_by_name || null });
      // If hsn_code was manually set previously, activate override mode
      if (d.hsn_code) {
        const autoHsn = getAutoHSN(d.collection_type, d.material);
        if (d.hsn_code !== autoHsn) setHsnOverride(true);
      }
      if (d.sku) setSkuAutoFilled(false);
    } catch {
      toast.error("Product not found");
      navigate("/admin/products");
    } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const [mat, wrk, des, col] = await Promise.all([
        axios.get(`${API}/categories?type=material`),
        axios.get(`${API}/categories?type=work`),
        axios.get(`${API}/categories?type=design_category`),
        axios.get(`${API}/categories?type=collection_type`),
      ]);
      setCategories({ materials: mat.data, works: wrk.data, design_categories: des.data, collection_types: col.data });
    } catch { /* silent */ }
  };

  const saveNewCategory = async (type, name, ct) => {
    if (!name?.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try { await axios.post(`${API}/categories`, { name: name.trim(), slug, type, collection_type: ct }); }
    catch { /* exists */ }
  };

  const genSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Auto-fill HSN and SKU when classification fields change
  const applyAutoFields = (updated) => {
    const changes = {};
    if (!hsnOverride) {
      const h = getAutoHSN(updated.collection_type, updated.material);
      if (h) changes.hsn_code = h;
    }
    if (!updated.sku || skuAutoFilled) {
      changes.sku = generateSKU(updated.collection_type, updated.material, updated.design_category, id);
      setSkuAutoFilled(true);
    }
    return changes;
  };

  // ── Media handlers ──
  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (form.media.length + files.length > 10) { toast.error("Maximum 10 media files"); return; }
    for (const file of files) {
      const fd = new FormData(); fd.append("file", file);
      try {
        const res = await axios.post(`${API}/upload`, fd);
        setForm(p => ({
          ...p,
          media: [...p.media, { id: res.data.id, url: res.data.url, type: res.data.type, alt: "", image_type: "product_display", order: p.media.length, focal_x: 50, focal_y: 50 }],
        }));
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
  };

  const handleMediaUrlAdd = () => {
    const url = prompt("Enter image/video URL:");
    if (!url) return;
    const type = url.match(/\.(mp4|mov|webm)$/i) ? "video" : "image";
    setForm(p => ({
      ...p,
      media: [...p.media, { id: Date.now().toString(), url, type, alt: "", image_type: "product_display", order: p.media.length, focal_x: 50, focal_y: 50 }],
    }));
  };

  const removeMedia = (i) => {
    setForm(p => ({ ...p, media: p.media.filter((_, idx) => idx !== i) }));
    if (focalEditIndex === i) setFocalEditIndex(null);
  };

  const moveMedia = (index, dir) => {
    const swap = index + dir;
    if (swap < 0 || swap >= form.media.length) return;
    setForm(p => {
      const m = [...p.media];
      [m[index], m[swap]] = [m[swap], m[index]];
      return { ...p, media: m.map((item, i) => ({ ...item, order: i })) };
    });
    if (focalEditIndex === index) setFocalEditIndex(swap);
    else if (focalEditIndex === swap) setFocalEditIndex(index);
  };

  const updateMedia = (i, field, val) =>
    setForm(p => ({ ...p, media: p.media.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));

  const handleGenerateAlt = async (index) => {
    if (isNew) { toast.error("Save the product first"); return; }
    setGeneratingAlt(p => ({ ...p, [index]: true }));
    try {
      const res = await axios.post(`${API}/generate-alt`, {
        product_id: id,
        image_type: form.media[index]?.image_type || "product_display",
      });
      updateMedia(index, "alt", res.data.alt_text);
      toast.success("ALT text generated");
    } catch { toast.error("Failed to generate ALT text"); }
    finally { setGeneratingAlt(p => ({ ...p, [index]: false })); }
  };

  // ── Attribute / detail helpers ──
  const addAttribute = () => setForm(p => ({ ...p, attributes: [...p.attributes, { key: "", value: "", visible: true }] }));
  const updAttr = (i, f, v) => setForm(p => ({ ...p, attributes: p.attributes.map((a, idx) => idx === i ? { ...a, [f]: v } : a) }));
  const rmAttr = (i) => setForm(p => ({ ...p, attributes: p.attributes.filter((_, idx) => idx !== i) }));
  const addDetail = () => setForm(p => ({ ...p, details: [...p.details, { label: "", value: "" }] }));
  const updDetail = (i, f, v) => setForm(p => ({ ...p, details: p.details.map((d, idx) => idx === i ? { ...d, [f]: v } : d) }));
  const rmDetail = (i) => setForm(p => ({ ...p, details: p.details.filter((_, idx) => idx !== i) }));

  // ── Submit ──
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      if (customMaterial && form.material?.trim())
        await saveNewCategory("material", form.material, form.collection_type);
      if (customWork && form.work?.trim())
        await saveNewCategory("work", form.work, form.collection_type);

      // Build details array
      const allDetails = [];
      PREDEFINED_DETAIL_LABELS.forEach(label => {
        const v = form[`detail_${label}`];
        if (v?.trim()) allDetails.push({ label, value: v.trim() });
      });
      if (form.made_in_india) allDetails.push({ label: "Origin: India", value: "Yes" });
      form.details.forEach(d => { if (d.label?.trim() && d.value?.trim()) allDetails.push(d); });

      // Edition vs stock validation
      if (form.edition_size && form.stock_quantity) {
        if (parseInt(form.stock_quantity) > parseInt(form.edition_size)) {
          toast.error(`Stock (${form.stock_quantity}) cannot exceed edition size (${form.edition_size})`);
          setSaving(false); return;
        }
      }

      // Map status → is_hidden / is_archived
      const isPOR = form.price_display_mode === "price_on_request";
      const sellingPrice = form.selling_price !== "" ? parseFloat(form.selling_price) : null;

      const data = {
        name: form.name, slug: form.slug,
        collection_type: form.collection_type, material: form.material,
        work: form.work, design_category: form.design_category,
        // status maps
        is_hidden: form.status !== "active",
        is_archived: form.status === "archived",
        is_invite_only: form.is_invite_only,
        // pricing
        pricing_mode: isPOR ? "price_on_request" : "fixed_price",
        price: isPOR ? null : sellingPrice,
        currency: form.currency,
        hide_price: isPOR,
        is_purchasable: !isPOR && !!sellingPrice,
        is_enquiry_only: isPOR,
        price_on_request: isPOR,
        // commerce & compliance (always stored, never sent to public)
        selling_price: sellingPrice,
        cost_price: form.cost_price !== "" ? parseFloat(form.cost_price) : null,
        hsn_code: form.hsn_code || null,
        gst_rate: form.gst_rate !== "" ? parseFloat(form.gst_rate) : null,
        product_type: form.product_type || null,
        composition_pct: form.composition_pct || null,
        sku: form.sku || null,
        // edition & inventory
        edition_size: form.edition_size ? parseInt(form.edition_size) : null,
        display_edition: form.display_edition,
        stock_status: form.stock_status,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        units_available: parseInt(form.units_available) || 0,
        continue_selling_out_of_stock: form.continue_selling_out_of_stock,
        made_to_order_days: parseInt(form.made_to_order_days) || 30,
        // content
        narrative_intro: form.narrative_intro,
        description: form.description,
        edition: form.edition,
        disclaimer: form.disclaimer,
        craft_fabric: form.craft_fabric,
        craft_technique: form.craft_technique,
        care_instructions: form.care_instructions,
        delivery_info: form.delivery_info,
        attributes: form.attributes,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        details: allDetails,
        // visibility
        is_hero: form.is_hero,
        is_secondary_highlight: form.is_secondary_highlight,
        secondary_highlight_order: form.secondary_highlight_order,
        display_order: form.display_order,
        media: form.media,
      };

      if (isNew) {
        await axios.post(`${API}/products`, data);
        toast.success("Product created");
      } else {
        await axios.put(`${API}/products/${id}`, data);
        toast.success("Product updated");
      }
      navigate("/admin/products");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    } finally { setSaving(false); }
  };

  // ── Loading skeleton ──
  if (loading) return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 bg-[#DACBA0]/20 w-1/3" />
      <div className="h-48 bg-[#DACBA0]/10" />
      <div className="h-48 bg-[#DACBA0]/10" />
    </div>
  );

  // ── Derived UI values ──
  const isPOR = form.price_display_mode === "price_on_request";
  const margin = (form.cost_price && form.selling_price)
    ? parseFloat(form.selling_price) - parseFloat(form.cost_price) : null;
  const marginPct = (margin !== null && form.selling_price)
    ? Math.round((margin / parseFloat(form.selling_price)) * 100) : null;
  const stockExceedsEdition = form.edition_size && form.stock_quantity &&
    parseInt(form.stock_quantity) > parseInt(form.edition_size);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="admin-product-edit">

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="text-xs text-[#1B4D3E]/40 hover:text-[#1B4D3E] mb-1"
          >
            ← Products
          </button>
          <h1 className="font-serif text-3xl text-[#1B4D3E]">
            {isNew ? "Add Product" : "Edit Product"}
          </h1>
          {lastEdited && (
            <p className="text-xs text-[#1B4D3E]/40 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last edited{" "}
              {new Date(lastEdited.at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
              {lastEdited.by && ` by ${lastEdited.by}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-luxury btn-luxury-primary disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">

        {/* ════════════════════════════════════════════════════
            SECTION 1 — BASIC INFORMATION
            ════════════════════════════════════════════════════ */}
        <Section
          id="basic"
          title="Basic Information"
          subtitle="Identity, classification, and product status"
          open={openSections.has("basic")}
          onToggle={toggleSection}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => {
                    const n = e.target.value;
                    setForm(f => ({ ...f, name: n, slug: isNew ? genSlug(n) : f.slug }));
                  }}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Slug *</Label>
                <Input value={form.slug} onChange={e => sf("slug", e.target.value)} className="mt-2" required />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SKU / Product Code</Label>
                  {skuAutoFilled && <span className="text-xs text-[#1B4D3E]/40 italic">auto-generated</span>}
                </div>
                <Input
                  value={form.sku}
                  onChange={e => { sf("sku", e.target.value); setSkuAutoFilled(false); }}
                  className="mt-2 font-mono"
                  placeholder="e.g. SAR-TUS-BLO-001"
                />
                <p className="text-xs text-[#1B4D3E]/30 mt-1">Auto-fills from Collection + Material + Design. Override anytime.</p>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection Type *</Label>
                <Select value={form.collection_type} onValueChange={v => {
                  const u = { ...form, collection_type: v };
                  setForm({ ...u, ...applyAutoFields(u) });
                }}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.collection_types.map(ct => (
                      <SelectItem key={ct.id} value={ct.slug}>{ct.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Design Category</Label>
                <Select value={form.design_category || "none"} onValueChange={v => {
                  const u = { ...form, design_category: v === "none" ? "" : v };
                  setForm({ ...u, ...applyAutoFields(u) });
                }}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.design_categories
                      .filter(c => c.collection_type === form.collection_type)
                      .map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Material</Label>
                {customMaterial ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={form.material}
                        onChange={e => {
                          const u = { ...form, material: e.target.value };
                          setForm({ ...u, ...applyAutoFields(u) });
                        }}
                        placeholder="e.g., Chiffon, Cotton Silk..."
                        className="flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setCustomMaterial(false); sf("material", ""); }}
                        className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap"
                      >
                        Use list
                      </button>
                    </div>
                    <p className="text-xs text-[#1B4D3E]/40">Added to your materials list on save.</p>
                  </div>
                ) : (
                  <Select value={form.material || "none"} onValueChange={v => {
                    if (v === "__custom__") { setCustomMaterial(true); sf("material", ""); return; }
                    const u = { ...form, material: v === "none" ? "" : v };
                    setForm({ ...u, ...applyAutoFields(u) });
                  }}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.materials
                        .filter(c => c.collection_type === form.collection_type)
                        .map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                      <SelectItem value="__custom__">✏️ Add new material...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft</Label>
                {customWork ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={form.work}
                        onChange={e => sf("work", e.target.value)}
                        placeholder="e.g., Hand Painted, Block Print..."
                        className="flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setCustomWork(false); sf("work", ""); }}
                        className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap"
                      >
                        Use list
                      </button>
                    </div>
                    <p className="text-xs text-[#1B4D3E]/40">Added to your techniques list on save.</p>
                  </div>
                ) : (
                  <Select value={form.work || "none"} onValueChange={v => {
                    if (v === "__custom__") { setCustomWork(true); sf("work", ""); return; }
                    sf("work", v === "none" ? "" : v);
                  }}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select technique" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.works
                        .filter(c => c.collection_type === form.collection_type)
                        .map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                      <SelectItem value="__custom__">✏️ Add new technique...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Product Status */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Status</Label>
                <Select value={form.status} onValueChange={v => sf("status", v)}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active — visible on website</SelectItem>
                    <SelectItem value="hidden">Hidden — saved but not public</SelectItem>
                    <SelectItem value="archived">Archived — retired product</SelectItem>
                  </SelectContent>
                </Select>
                {form.status === "archived" && (
                  <p className="text-xs text-amber-600 mt-1">Archived products are hidden and marked for retirement.</p>
                )}
              </div>

            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            SECTION 2 — PRODUCT SPECIFICATIONS
            ════════════════════════════════════════════════════ */}
        <Section
          id="specs"
          title="Product Specifications"
          subtitle="Physical details shown on the product page"
          open={openSections.has("specs")}
          onToggle={toggleSection}
        >
          <div className="space-y-4">
            {PREDEFINED_DETAIL_LABELS.map(label => (
              <div key={label} className="grid grid-cols-[160px_1fr] items-center gap-4">
                <Label className="text-sm text-[#1B4D3E]/70">{label}</Label>
                <Input
                  value={form[`detail_${label}`] || ""}
                  onChange={e => sf(`detail_${label}`, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  className="max-w-md"
                />
              </div>
            ))}
            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
              <Label className="text-sm text-[#1B4D3E]/70">Origin: India</Label>
              <Switch checked={form.made_in_india} onCheckedChange={v => sf("made_in_india", v)} />
            </div>
            {/* Custom details */}
            <div className="border-t border-[#DACBA0]/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Custom Details</Label>
                <button type="button" onClick={addDetail} className="text-xs text-[#1B4D3E] flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Input value={d.label} onChange={e => updDetail(i, "label", e.target.value)} placeholder="Label" className="w-1/3" />
                    <Input value={d.value} onChange={e => updDetail(i, "value", e.target.value)} placeholder="Value" className="flex-1" />
                    <button type="button" onClick={() => rmDetail(i)} className="p-2 text-[#C08081]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            SECTION 3 — WEBSITE CONTENT
            ════════════════════════════════════════════════════ */}
        <Section
          id="content"
          title="Website Content"
          subtitle="Everything the customer reads on the product page"
          open={openSections.has("content")}
          onToggle={toggleSection}
        >
          <div className="space-y-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Short Introduction</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">One line shown below the product name.</p>
              <Textarea
                value={form.narrative_intro}
                onChange={e => sf("narrative_intro", e.target.value)}
                className="min-h-[70px]"
                placeholder="A brief tagline..."
                data-testid="narrative-intro-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Full Description</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Use blank lines to separate paragraphs.</p>
              <Textarea
                value={form.description}
                onChange={e => sf("description", e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder={"Paragraph 1...\n\nParagraph 2..."}
                data-testid="description-input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Key Attributes</Label>
                  <p className="text-xs text-[#1B4D3E]/40 mt-0.5">Cultural context and craft story.</p>
                </div>
                <button type="button" onClick={addAttribute} className="text-xs text-[#1B4D3E] flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {form.attributes.map((attr, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Input value={attr.key} onChange={e => updAttr(i, "key", e.target.value)} placeholder="e.g., Craft & Cultural Reference" className="w-1/3" />
                    <Textarea value={attr.value} onChange={e => updAttr(i, "value", e.target.value)} placeholder="e.g., The Bankura horse originates from..." className="flex-1 min-h-[80px]" />
                    <button type="button" onClick={() => rmAttr(i)} className="p-2 text-[#C08081] mt-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft — Fabric</Label>
                <Input value={form.craft_fabric} onChange={e => sf("craft_fabric", e.target.value)} className="mt-2" placeholder="e.g., Pure Mulberry Silk" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft — Technique</Label>
                <Input value={form.craft_technique} onChange={e => sf("craft_technique", e.target.value)} className="mt-2" placeholder="e.g., Hand Block Print" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Edition Note</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Shown on product page. Clear to hide.</p>
              <Textarea value={form.edition} onChange={e => sf("edition", e.target.value)} className="min-h-[80px]" placeholder="e.g., Limited to 15 pieces..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Disclaimer</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Clear to hide.</p>
              <Textarea value={form.disclaimer} onChange={e => sf("disclaimer", e.target.value)} className="min-h-[80px]" placeholder="e.g., Slight variations in colour are natural..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Care Instructions</Label>
              <Textarea value={form.care_instructions} onChange={e => sf("care_instructions", e.target.value)} className="mt-2" placeholder="e.g., Dry clean only..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Delivery & Shipping</Label>
              <Textarea value={form.delivery_info} onChange={e => sf("delivery_info", e.target.value)} className="mt-2" placeholder="e.g., Ships within 7 days..." />
            </div>
            <div className="border-t border-[#DACBA0]/20 pt-6 space-y-4">
              <SubSection label="SEO" />
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Title</Label>
                <Input value={form.seo_title} onChange={e => sf("seo_title", e.target.value)} className="mt-2" placeholder="Leave empty to use product name" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Description</Label>
                <Textarea value={form.seo_description} onChange={e => sf("seo_description", e.target.value)} className="mt-2" placeholder="Meta description for search engines" />
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            SECTION 4 — COMMERCE & COMPLIANCE  (admin only)
            ════════════════════════════════════════════════════ */}
        <Section
          id="commerce"
          title="Commerce & Compliance"
          subtitle="Pricing, tax, and internal records — never shown on website"
          badge="Admin only"
          adminOnly
          open={openSections.has("commerce")}
          onToggle={toggleSection}
        >
          <div className="space-y-8">

            {/* Product Classification (required for HSN) */}
            <div className="space-y-4">
              <SubSection label="Product Classification — required for HSN" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Type</Label>
                  <Select value={form.product_type || "none"} onValueChange={v => {
                    sf("product_type", v === "none" ? "" : v);
                  }}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="woven">Woven</SelectItem>
                      <SelectItem value="stitched">Stitched</SelectItem>
                      <SelectItem value="accessory">Accessory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Composition %</Label>
                  <Input value={form.composition_pct} onChange={e => sf("composition_pct", e.target.value)} className="mt-2" placeholder="e.g. 100% Tussar Silk" />
                </div>
              </div>
            </div>

            {/* Internal Pricing */}
            <div className="space-y-4">
              <SubSection label="Internal Pricing" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Cost Price — ₹</Label>
                  <p className="text-xs text-[#1B4D3E]/30 mt-1 mb-2">Your actual cost. Never shown publicly.</p>
                  <Input type="number" value={form.cost_price} onChange={e => sf("cost_price", e.target.value)} placeholder="e.g. 4200" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Selling Price — ₹</Label>
                  <p className="text-xs text-[#1B4D3E]/30 mt-1 mb-2">Master price. Always stored even if hidden on site.</p>
                  <Input type="number" value={form.selling_price} onChange={e => sf("selling_price", e.target.value)} placeholder="e.g. 18500" />
                </div>
              </div>
              {margin !== null && (
                <div className="flex items-center gap-6 px-4 py-3 bg-white border border-[#DACBA0]/30 text-sm">
                  <span className="text-[#1B4D3E]/50">Margin:</span>
                  <span className="font-medium text-[#1B4D3E]">₹{margin.toLocaleString("en-IN")}</span>
                  <span className={`font-semibold ${marginPct >= 50 ? "text-green-600" : marginPct >= 30 ? "text-yellow-600" : "text-red-500"}`}>
                    {marginPct}%
                  </span>
                </div>
              )}
            </div>

            {/* Price display on website */}
            <div className="space-y-3">
              <SubSection label="Price Display on Website" />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => sf("price_display_mode", "show_price")}
                  className={`flex-1 py-3 px-4 border text-sm font-medium transition-colors ${!isPOR ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]" : "border-[#DACBA0]/50 text-[#1B4D3E]/60 hover:border-[#1B4D3E]"}`}
                >
                  💰 Show Price
                </button>
                <button
                  type="button"
                  onClick={() => sf("price_display_mode", "price_on_request")}
                  className={`flex-1 py-3 px-4 border text-sm font-medium transition-colors ${isPOR ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]" : "border-[#DACBA0]/50 text-[#1B4D3E]/60 hover:border-[#1B4D3E]"}`}
                >
                  ✉️ Price on Request
                </button>
              </div>
              <p className="text-xs text-[#1B4D3E]/40 p-3 bg-white border border-[#DACBA0]/20">
                {isPOR
                  ? 'Website shows enquiry form only. Selling price is stored internally but NOT shown to the customer.'
                  : 'Website shows the selling price and allows purchase or enquiry.'}
              </p>
              {!isPOR && (
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Currency</Label>
                  <Select value={form.currency} onValueChange={v => sf("currency", v)}>
                    <SelectTrigger className="mt-2 max-w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR ₹</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="GBP">GBP £</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Tax & HSN */}
            <div className="space-y-4">
              <SubSection label="Tax & Compliance" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">HSN Code</Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-[#1B4D3E]/50">Manual override</span>
                      <Switch
                        checked={hsnOverride}
                        onCheckedChange={v => {
                          setHsnOverride(v);
                          if (!v) {
                            // revert to auto
                            const auto = getAutoHSN(form.collection_type, form.material);
                            if (auto) sf("hsn_code", auto);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <Input
                    value={form.hsn_code}
                    onChange={e => sf("hsn_code", e.target.value)}
                    disabled={!hsnOverride}
                    className={`font-mono ${!hsnOverride ? "bg-[#FFFFF0]/60 text-[#1B4D3E]/50" : ""}`}
                    placeholder="e.g. 5007"
                  />
                  <p className="text-xs text-[#1B4D3E]/30 mt-1">
                    {hsnOverride ? "Manual override active." : "Auto-filled from Collection Type + Material. Toggle to override."}
                  </p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">GST Rate</Label>
                  <Select value={form.gst_rate !== "" ? String(form.gst_rate) : "none"} onValueChange={v => sf("gst_rate", v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Edit History */}
            {!isNew && <ProductEditHistory productId={id} />}

          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            SECTION 5 — EDITION & INVENTORY
            ════════════════════════════════════════════════════ */}
        <Section
          id="inventory"
          title="Edition & Inventory"
          subtitle="Stock, edition limits, and availability controls"
          open={openSections.has("inventory")}
          onToggle={toggleSection}
        >
          <div className="space-y-6">

            {/* Edition */}
            <div className="space-y-4">
              <SubSection label="Edition" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Total Edition Size</Label>
                  <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Single source of truth. Stock cannot exceed this.</p>
                  <Input
                    type="number"
                    value={form.edition_size}
                    onChange={e => sf("edition_size", e.target.value)}
                    min="1"
                    placeholder="e.g. 15"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-start gap-3 p-4 bg-white border border-[#DACBA0]/30">
                    <Switch checked={form.display_edition} onCheckedChange={v => sf("display_edition", v)} />
                    <div>
                      <Label className="text-sm font-medium text-[#1B4D3E]">Display edition on website</Label>
                      <p className="text-xs text-[#1B4D3E]/40 mt-0.5">
                        {form.display_edition
                          ? `Shows "Edition: ${form.edition_size || "—"}" on product page`
                          : "Edition size hidden from customers"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {stockExceedsEdition && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                  ⚠ Stock ({form.stock_quantity}) exceeds edition size ({form.edition_size}). Please correct before saving.
                </p>
              )}
            </div>

            {/* Stock */}
            <div className="space-y-4">
              <SubSection label="Stock" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock Status</Label>
                  <Select value={form.stock_status} onValueChange={v => sf("stock_status", v)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="made_to_order">Made to Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock Quantity</Label>
                  <Input type="number" value={form.stock_quantity} onChange={e => sf("stock_quantity", e.target.value)} className="mt-2" min="0" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Units Available (shown publicly)</Label>
                  <Input type="number" value={form.units_available} onChange={e => sf("units_available", e.target.value)} className="mt-2" min="0" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.continue_selling_out_of_stock} onCheckedChange={v => sf("continue_selling_out_of_stock", v)} />
                <Label className="text-sm">Continue selling when out of stock (made to order)</Label>
              </div>
              {form.continue_selling_out_of_stock && (
                <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Days to Make & Dispatch</Label>
                  <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-3">
                    e.g. 50 → site shows:{" "}
                    <span className="italic">"1 piece dispatched within 7 days · Additional pieces made to order, dispatched within 57 days."</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={form.made_to_order_days}
                      onChange={e => sf("made_to_order_days", e.target.value)}
                      className="max-w-[120px]"
                      min="1"
                      placeholder="30"
                    />
                    <span className="text-sm text-[#1B4D3E]/60">days + 7 shipping = shown to customer</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory Snapshot — read-only */}
            {!isNew && (
              <div className="space-y-3">
                <SubSection label="Inventory Snapshot" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Edition Size", value: form.edition_size || "—" },
                    { label: "In Stock", value: form.stock_quantity || 0 },
                    { label: "Units Available", value: form.units_available || 0 },
                    { label: "Status", value: form.stock_status?.replace(/_/g, " ") || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-white border border-[#DACBA0]/30 text-center">
                      <p className="text-xs text-[#1B4D3E]/40 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-lg font-semibold text-[#1B4D3E]">{value}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toast.info("Inventory history — coming soon")}
                  className="text-xs text-[#1B4D3E]/50 hover:text-[#1B4D3E] underline flex items-center gap-1"
                >
                  <Package className="w-3 h-3" /> View inventory history
                </button>
              </div>
            )}

          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            SECTION 6 — MEDIA & VISIBILITY
            ════════════════════════════════════════════════════ */}
        <Section
          id="media"
          title="Media & Visibility"
          subtitle="Images, featured settings, and public visibility controls"
          open={openSections.has("media")}
          onToggle={toggleSection}
        >
          <div className="space-y-8">

            {/* Visibility toggles */}
            <div>
              <SubSection label="Visibility" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {[
                  { field: "is_hidden", label: "Hide from public", sub: "Won't appear in collections or search" },
                  { field: "is_invite_only", label: "Invite only", sub: "Only visible with direct link" },
                  { field: "is_hero", label: "Set as Homepage Hero", sub: "Replaces current hero product", mutual: "is_secondary_highlight" },
                  { field: "is_secondary_highlight", label: "Featured in Next Drop", sub: "Shown in homepage highlights", mutual: "is_hero" },
                ].map(({ field, label, sub, mutual }) => (
                  <div key={field} className="flex items-center gap-3 p-3 border border-[#DACBA0]/20">
                    <Switch
                      checked={form[field]}
                      onCheckedChange={v =>
                        setForm(f => ({ ...f, [field]: v, ...(mutual ? { [mutual]: v ? false : f[mutual] } : {}) }))
                      }
                    />
                    <div>
                      <Label className="text-sm">{label}</Label>
                      <p className="text-xs text-[#1B4D3E]/40">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Images */}
            <div>
              <SubSection label="Images (1–10)" />
              <p className="text-xs text-[#1B4D3E]/40 mt-2 mb-6">
                ⚙️ = focal point &nbsp;·&nbsp; Set image type then ✨ for ALT text &nbsp;·&nbsp; Arrows to reorder
              </p>
              <div className="space-y-6 mb-4">
                {form.media.map((item, index) => (
                  <div key={item.id || index} className="border border-[#DACBA0]/20 p-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col justify-center gap-1 shrink-0">
                        <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0} className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === form.media.length - 1} className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative w-24 shrink-0">
                        <div className="relative aspect-[3/4] bg-[#FFFFF0] border border-[#DACBA0]/30 overflow-hidden">
                          {item.type === "video"
                            ? <video src={item.url} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                            : <img src={item.url} alt={item.alt} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                          }
                          <button type="button" onClick={() => removeMedia(index)} className="absolute top-1 right-1 w-5 h-5 bg-[#C08081] text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFocalEditIndex(focalEditIndex === index ? null : index)}
                            className={`absolute top-1 left-1 w-5 h-5 flex items-center justify-center ${focalEditIndex === index ? "bg-[#1B4D3E] text-white" : "bg-white/80 text-[#1B4D3E]"}`}
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#1B4D3E]/50 text-white flex items-center justify-center text-xs">{index + 1}</div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Image Type</Label>
                          <Select value={item.image_type || "product_display"} onValueChange={v => updateMedia(index, "image_type", v)}>
                            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {IMAGE_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">ALT Text</Label>
                            <button
                              type="button"
                              onClick={() => handleGenerateAlt(index)}
                              disabled={generatingAlt[index]}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1B4D3E] text-[#FFFFF0] hover:bg-[#1B4D3E]/80 disabled:opacity-50"
                            >
                              <Sparkles className="w-3 h-3" />
                              {generatingAlt[index] ? "Generating..." : "Generate ALT"}
                            </button>
                          </div>
                          <Input value={item.alt || ""} onChange={e => updateMedia(index, "alt", e.target.value)} placeholder="Describe this image for accessibility & SEO..." className="text-sm" />
                        </div>
                      </div>
                    </div>
                    {focalEditIndex === index && (
                      <div className="mt-3 p-3 bg-[#FFFFF0] border border-[#DACBA0]/40 space-y-3">
                        <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Focal Point</p>
                        {[["x", "Horizontal", "focal_x"], ["y", "Vertical", "focal_y"]].map(([axis, label, field]) => (
                          <div key={axis}>
                            <div className="flex justify-between text-xs text-[#1B4D3E]/50 mb-1">
                              <span>{label}</span><span>{item[field] ?? 50}%</span>
                            </div>
                            <input
                              type="range" min="0" max="100"
                              value={item[field] ?? 50}
                              onChange={e => updateMedia(index, field, parseInt(e.target.value))}
                              className="w-full accent-[#1B4D3E]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {form.media.length < 10 && (
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-[#DACBA0] cursor-pointer hover:border-[#1B4D3E] transition-colors">
                  <Upload className="w-4 h-4 text-[#DACBA0]" />
                  <span className="text-xs text-[#1B4D3E]/60">Upload Images</span>
                  <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} className="hidden" />
                </label>
              )}
              <button type="button" onClick={handleMediaUrlAdd} className="ml-4 text-xs text-[#1B4D3E] underline">
                + Add from URL
              </button>
            </div>

          </div>
        </Section>

        {/* Bottom save bar */}
        <div className="flex items-center gap-4 pt-4 pb-8">
          <button type="submit" disabled={saving} data-testid="save-product" className="btn-luxury btn-luxury-primary disabled:opacity-50">
            {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")} className="btn-luxury btn-luxury-secondary">
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminProductEdit;
