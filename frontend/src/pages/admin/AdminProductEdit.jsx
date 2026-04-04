import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, X, Upload, Settings2, Sparkles,
  ChevronUp, ChevronDown, Lock, ChevronRight,
  Clock, Package, ExternalLink, GitBranch, Wrench,
  ArrowUpDown, Activity, Loader2, Copy, CheckCheck,
} from "lucide-react";
import InventoryAdjustmentModal from "./InventoryAdjustmentModal";

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

const DEFAULT_DISCLAIMER = "This piece is hand embroidered. Slight variations in stitch placement, texture, and colour are natural characteristics of handcrafted textiles and make every piece unique.";
const PREDEFINED_DETAIL_LABELS = ["Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"];

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
// SECTION ACCORDION
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
        <ChevronRight className={`w-4 h-4 text-[#1B4D3E]/40 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 border-t border-[#DACBA0]/20 pt-6">{children}</div>}
    </div>
  );
}

function SubSection({ label }) {
  return (
    <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 pb-2 border-b border-[#DACBA0]/20">
      {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT HISTORY
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
    <div>
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
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === 0 ? "bg-[#1B4D3E]" : "bg-[#DACBA0]"}`} />
                    {i < logs.length - 1 && <div className="w-px flex-1 bg-[#DACBA0]/40 my-1" />}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[#1B4D3E]">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.user_name && <span className="text-xs text-[#1B4D3E]/50">by {log.user_name}</span>}
                      <span className="text-xs text-[#1B4D3E]/30">{formatDate(log.created_at)}</span>
                    </div>
                    {log.details?.changes && log.details.changes.length > 0 && (
                      <p className="text-xs text-[#1B4D3E]/40 mt-0.5 truncate">
                        Fields: {log.details.changes
                          .filter(f => !["updated_at", "updated_by", "updated_by_name", "_id"].includes(f))
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

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState({});
  const [focalEditIndex, setFocalEditIndex] = useState(null);
  const [customMaterial, setCustomMaterial] = useState(false);
  const [customWork, setCustomWork] = useState(false);
  const [hsnOverride, setHsnOverride] = useState(false);
  const [skuAutoFilled, setSkuAutoFilled] = useState(false);
  const [lastEdited, setLastEdited] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // ── AI Engine state ──
  const [generateContent, setGenerateContent] = useState(false);
  const [generateSocial, setGenerateSocial] = useState(false);
  const generateContentRef = useRef(false);
  const generateSocialRef = useRef(false);
  const [primaryTones, setPrimaryTones] = useState(["Luxury"]);
  const [secondaryTones, setSecondaryTones] = useState(["Editorial"]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGeneratedFields, setAiGeneratedFields] = useState(new Set());
  const [socialContent, setSocialContent] = useState(null);
  const [socialOpen, setSocialOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  // feedback_patterns: grows as admin logs corrections — sent with every AI call
  const [feedbackPatterns, setFeedbackPatterns] = useState([]);

  // Only Basic Identity open by default
  const [openSections, setOpenSections] = useState(new Set(["basic"]));

  const [categories, setCategories] = useState({
    materials: [], works: [], design_categories: [], collection_types: [],
  });

  // Traceability — lazy-loaded when section opens
  const [traceability, setTraceability] = useState({
    loading: false, loaded: false, product_master: null, jobs: [],
  });

  const toggleSection = (sid) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });

  const blankForm = {
    name: "", slug: "", collection_type: "sarees", material: "", work: "",
    design_category: "", status: "active",
    details: [], made_in_india: true,
    ...Object.fromEntries(PREDEFINED_DETAIL_LABELS.map(l => [`detail_${l}`, ""])),
    narrative_intro: "", description: "",
    edition: "", disclaimer: DEFAULT_DISCLAIMER,
    craft_fabric: "", craft_technique: "",
    care_instructions: "", delivery_info: "",
    attributes: [], seo_title: "", seo_description: "",
    price_display_mode: "price_on_request",
    selling_price: "", cost_price: "", currency: "INR",
    product_type: "", composition_pct: "",
    hsn_code: "", gst_rate: "", sku: "",
    edition_size: "", display_edition: true,
    stock_status: "in_stock",
    stock_quantity: 0, units_available: 0,
    continue_selling_out_of_stock: false, made_to_order_days: 30,
    is_hidden: false, is_invite_only: false, is_hero: false,
    is_secondary_highlight: false, secondary_highlight_order: 0,
    display_order: 9999, media: [],
  };

  const [form, setForm] = useState(blankForm);
  const sf = (field, val) => setForm(f => ({ ...f, [field]: val }));

  useEffect(() => {
    fetchCategories();
    if (!isNew) fetchProduct();
  }, [id]);

  // Prefill from sessionStorage when creating a product from a completed job
  useEffect(() => {
    if (!isNew) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("from_job")) return;
    try {
      const raw = sessionStorage.getItem("product_prefill");
      if (!raw) return;
      const prefill = JSON.parse(raw);
      sessionStorage.removeItem("product_prefill");
      setForm(f => ({
        ...f,
        name: prefill.name || f.name,
        collection_type: prefill.collection_type || f.collection_type,
        material: prefill.material || f.material,
        work: prefill.work || f.work,
        design_category: prefill.design_category || f.design_category,
        description: prefill.description || f.description,
        edition: prefill.edition || f.edition,
        disclaimer: prefill.disclaimer || f.disclaimer,
        craft_fabric: prefill.craft_fabric || f.craft_fabric,
        craft_technique: prefill.craft_technique || f.craft_technique,
        price_display_mode: prefill.pricing_mode === "price_on_request" ? "price_on_request" : "show_price",
        selling_price: prefill.selling_price ?? f.selling_price,
        cost_price: prefill.cost_price ?? f.cost_price,
        hsn_code: prefill.hsn_code || f.hsn_code,
        gst_rate: prefill.gst_rate ?? f.gst_rate,
        sku: prefill.sku || f.sku,
        currency: prefill.currency || f.currency,
        edition_size: prefill.edition_size ?? f.edition_size,
        stock_quantity: prefill.stock_quantity ?? f.stock_quantity,
        units_available: prefill.units_available ?? f.units_available,
        stock_status: prefill.stock_status || f.stock_status,
        display_edition: prefill.display_edition ?? f.display_edition,
        is_hidden: true,
      }));
      toast.info(`Pre-filled from job ${prefill._source_job_code || ""}. Review and complete before publishing.`, { duration: 6000 });
    } catch { /* silent */ }
  }, [isNew]);

  useEffect(() => {
    if (!isNew && categories.materials.length > 0 && form.material) {
      if (!categories.materials.some(c => c.name === form.material)) setCustomMaterial(true);
    }
    if (!isNew && categories.works.length > 0 && form.work) {
      if (!categories.works.some(c => c.name === form.work)) setCustomWork(true);
    }
  }, [categories, isNew]);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("chytare_token")}` },
  });

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/admin/products/${id}/full`, authHeader());
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
      const status = d.is_archived ? "archived" : d.is_hidden ? "hidden" : "active";
      setForm({
        name: d.name || "", slug: d.slug || "",
        collection_type: d.collection_type || "sarees", material: d.material || "",
        work: d.work || "", design_category: d.design_category || "", status,
        details: custom, made_in_india: madeInIndia,
        ...Object.fromEntries(PREDEFINED_DETAIL_LABELS.map(l => [`detail_${l}`, predefined[l] || ""])),
        product_type: d.product_type || "", composition_pct: d.composition_pct || "",
        narrative_intro: d.narrative_intro || "", description: d.description || "",
        edition: d.edition || "", disclaimer: d.disclaimer || DEFAULT_DISCLAIMER,
        craft_fabric: d.craft_fabric || "", craft_technique: d.craft_technique || "",
        care_instructions: d.care_instructions || "", delivery_info: d.delivery_info || "",
        attributes: d.attributes || [], seo_title: d.seo_title || "", seo_description: d.seo_description || "",
        price_display_mode: isPOR ? "price_on_request" : "show_price",
        selling_price: d.selling_price ?? d.price ?? "", cost_price: d.cost_price ?? "",
        currency: d.currency || "INR", hsn_code: d.hsn_code || "", gst_rate: d.gst_rate ?? "",
        sku: d.sku || "",
        edition_size: d.edition_size ?? "", display_edition: d.display_edition ?? true,
        stock_status: d.stock_status || "in_stock",
        stock_quantity: d.stock_quantity || 0,
        units_available: d.units_available || 0,
        continue_selling_out_of_stock: d.continue_selling_out_of_stock || false,
        made_to_order_days: d.made_to_order_days || 30,
        is_hidden: d.is_hidden || false, is_invite_only: d.is_invite_only || false,
        is_hero: d.is_hero || false, is_secondary_highlight: d.is_secondary_highlight || false,
        secondary_highlight_order: d.secondary_highlight_order || 0,
        display_order: d.display_order ?? 9999, media: d.media || [],
      });
      if (d.updated_at) setLastEdited({ at: d.updated_at, by: d.updated_by_name || null });
      if (d.social_content) setSocialContent(d.social_content);
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

  const fetchTraceability = useCallback(async () => {
    if (!id || traceability.loaded) return;
    setTraceability(t => ({ ...t, loading: true }));
    try {
      const pmRes = await axios.get(`${API}/admin/product-master?limit=500`, authHeader());
      const pm = (pmRes.data || []).find(p => p.website_product_id === id);
      let jobs = [];
      if (pm?.id) {
        const jRes = await axios.get(`${API}/admin/production-jobs?product_id=${pm.id}&limit=20`, authHeader());
        jobs = jRes.data || [];
      }
      setTraceability({ loading: false, loaded: true, product_master: pm || null, jobs });
    } catch {
      setTraceability({ loading: false, loaded: true, product_master: null, jobs: [] });
    }
  }, [id, traceability.loaded]);

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

  // ── Media ──
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
        product_id: id, image_type: form.media[index]?.image_type || "product_display",
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

  // ── AI merge helper ──
  const mergeAIIntoForm = (cf, aiData) => {
    const filled = new Set();
    const textFields = [
      "name", "slug", "narrative_intro", "description",
      "craft_fabric", "craft_technique", "edition", "disclaimer",
      "care_instructions", "delivery_info", "seo_title", "seo_description",
    ];
    textFields.forEach(field => {
      if (!cf[field]?.trim() && aiData[field]) {
        cf = { ...cf, [field]: aiData[field] };
        filled.add(field);
      }
    });
    // design_category
    if (!cf.design_category?.trim() && aiData.design_category) {
      cf = { ...cf, design_category: aiData.design_category };
      filled.add("design_category");
    }
    // detail fields
    ["Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"].forEach(label => {
      const key = `detail_${label}`;
      if (!cf[key]?.trim() && aiData[key]) {
        cf = { ...cf, [key]: aiData[key] };
        filled.add(key);
      }
    });
    // key attributes — only if empty
    if ((!cf.attributes || cf.attributes.length === 0) && aiData.key_attributes?.length) {
      cf = { ...cf, attributes: aiData.key_attributes };
      filled.add("attributes");
    }
    return { merged: cf, filled };
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const doGenContent = generateContentRef.current;
    const doGenSocial = generateSocialRef.current;
    console.log("AI Trigger Check:", doGenContent, doGenSocial);
    setSaving(true);

    // Work on a local copy so AI results are immediately available for the save
    let cf = { ...form };
    let latestSocialContent = socialContent;

    try {
      // ── AI generation runs first so saveNewCategory errors can't block it ──
      if (doGenContent || doGenSocial) {
        setGeneratingAI(true);
        try {
          const formPayload = {
            name: cf.name, collection_type: cf.collection_type,
            material: cf.material, work: cf.work, design_category: cf.design_category,
            narrative_intro: cf.narrative_intro, description: cf.description,
            detail_Colour: cf["detail_Colour"], detail_Fabric: cf["detail_Fabric"],
            detail_Technique: cf["detail_Technique"], detail_Motif: cf["detail_Motif"],
            detail_Finish: cf["detail_Finish"],
            craft_fabric: cf.craft_fabric, craft_technique: cf.craft_technique,
            care_instructions: cf.care_instructions, delivery_info: cf.delivery_info,
            edition: cf.edition, disclaimer: cf.disclaimer,
            seo_title: cf.seo_title, seo_description: cf.seo_description,
          };
          const aiRes = await axios.post(
            `${API}/admin/products/generate-content`,
            {
              form_data: formPayload,
              generate_content: doGenContent,
              generate_social: doGenSocial,
              primary_tones: primaryTones,
              secondary_tones: secondaryTones,
              feedback_patterns: feedbackPatterns,
            },
            authHeader()
          );
          const aiData = aiRes.data.product ?? aiRes.data;
          if (doGenContent) {
            const updatedForm = { ...cf };
            for (const key in aiData) {
              if (key === "social_content") continue;
              if (!updatedForm[key] || updatedForm[key] === "") {
                updatedForm[key] = aiData[key];
              }
            }
            const filled = new Set(
              Object.keys(aiData).filter(k => k !== "social_content" && (!cf[k] || cf[k] === ""))
            );
            cf = updatedForm;
            setAiGeneratedFields(filled);
            setForm(cf);
            toast.success(`AI filled ${filled.size} field${filled.size !== 1 ? "s" : ""}`);
          }
          if (doGenSocial && aiData.social_content) {
            latestSocialContent = aiData.social_content;
            setSocialContent(aiData.social_content);
            setSocialOpen(true);
          }
        } catch (aiErr) {
          console.error("AI generation error:", aiErr);
          toast.error("AI generation failed — saving without AI content");
        } finally {
          setGeneratingAI(false);
        }
      }

      if (customMaterial && cf.material?.trim())
        await saveNewCategory("material", cf.material, cf.collection_type);
      if (customWork && cf.work?.trim())
        await saveNewCategory("work", cf.work, cf.collection_type);

      const allDetails = [];
      PREDEFINED_DETAIL_LABELS.forEach(label => {
        const v = cf[`detail_${label}`];
        if (v?.trim()) allDetails.push({ label, value: v.trim() });
      });
      if (cf.made_in_india) allDetails.push({ label: "Origin: India", value: "Yes" });
      cf.details.forEach(d => { if (d.label?.trim() && d.value?.trim()) allDetails.push(d); });

      const isPOR = cf.price_display_mode === "price_on_request";
      const sellingPrice = cf.selling_price !== "" ? parseFloat(cf.selling_price) : null;

      const data = {
        name: cf.name, slug: cf.slug,
        collection_type: cf.collection_type, material: cf.material,
        work: cf.work, design_category: cf.design_category,
        is_hidden: cf.status !== "active",
        is_archived: cf.status === "archived",
        is_invite_only: cf.is_invite_only,
        pricing_mode: isPOR ? "price_on_request" : "fixed_price",
        price: isPOR ? null : sellingPrice,
        currency: cf.currency,
        hide_price: isPOR,
        is_purchasable: !isPOR && !!sellingPrice,
        is_enquiry_only: isPOR,
        price_on_request: isPOR,
        selling_price: sellingPrice,
        cost_price: cf.cost_price !== "" ? parseFloat(cf.cost_price) : null,
        hsn_code: cf.hsn_code || null,
        gst_rate: cf.gst_rate !== "" ? parseFloat(cf.gst_rate) : null,
        product_type: cf.product_type || null,
        composition_pct: cf.composition_pct || null,
        sku: cf.sku || null,
        edition_size: cf.edition_size ? parseInt(cf.edition_size) : null,
        display_edition: cf.display_edition,
        stock_status: cf.stock_status,
        stock_quantity: parseInt(cf.stock_quantity) || 0,
        units_available: parseInt(cf.units_available) || 0,
        continue_selling_out_of_stock: cf.continue_selling_out_of_stock,
        made_to_order_days: parseInt(cf.made_to_order_days) || 30,
        narrative_intro: cf.narrative_intro,
        description: cf.description,
        edition: cf.edition,
        disclaimer: cf.disclaimer,
        craft_fabric: cf.craft_fabric,
        craft_technique: cf.craft_technique,
        care_instructions: cf.care_instructions,
        delivery_info: cf.delivery_info,
        attributes: cf.attributes,
        seo_title: cf.seo_title,
        seo_description: cf.seo_description,
        details: allDetails,
        is_hero: cf.is_hero,
        is_secondary_highlight: cf.is_secondary_highlight,
        secondary_highlight_order: cf.secondary_highlight_order,
        display_order: cf.display_order,
        media: cf.media,
        social_content: latestSocialContent || null,
      };

      if (isNew) {
        await axios.post(`${API}/products`, data, authHeader());
        toast.success("Product created");
      } else {
        await axios.put(`${API}/products/${id}`, data, authHeader());
        toast.success("Product updated");
      }
      navigate("/admin/products");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    } finally { setSaving(false); }
  };

  // ── Standalone AI regenerate (without saving) ──
  const handleRegenerate = async () => {
    const doGenContent = generateContentRef.current;
    const doGenSocial = generateSocialRef.current;
    console.log("Regenerate Empty — flags:", doGenContent, doGenSocial);
    setGeneratingAI(true);
    try {
      const formPayload = {
        name: form.name, collection_type: form.collection_type,
        material: form.material, work: form.work, design_category: form.design_category,
        narrative_intro: form.narrative_intro, description: form.description,
        detail_Colour: form["detail_Colour"], detail_Fabric: form["detail_Fabric"],
        detail_Technique: form["detail_Technique"], detail_Motif: form["detail_Motif"],
        detail_Finish: form["detail_Finish"],
        craft_fabric: form.craft_fabric, craft_technique: form.craft_technique,
        care_instructions: form.care_instructions, delivery_info: form.delivery_info,
        edition: form.edition, disclaimer: form.disclaimer,
        seo_title: form.seo_title, seo_description: form.seo_description,
      };
      const aiRes = await axios.post(
        `${API}/admin/products/generate-content`,
        {
          form_data: formPayload,
          generate_content: doGenContent,
          generate_social: doGenSocial,
          primary_tones: primaryTones,
          secondary_tones: secondaryTones,
          feedback_patterns: feedbackPatterns,
        },
        authHeader()
      );
      const aiData = aiRes.data.product ?? aiRes.data;
      if (doGenContent) {
        const { merged, filled } = mergeAIIntoForm({ ...form }, aiData);
        setForm(merged);
        setAiGeneratedFields(filled);
        toast.success(`AI filled ${filled.size} field${filled.size !== 1 ? "s" : ""}`);
      }
      if (doGenSocial && aiData.social_content) {
        setSocialContent(aiData.social_content);
        setSocialOpen(true);
        toast.success("Social content regenerated");
      }
    } catch (err) {
      console.error("Regeneration error:", err);
      toast.error("Regeneration failed");
    } finally {
      setGeneratingAI(false);
    }
  };

  // ── Force regenerate ALL fields ──
  const handleRegenerateAll = async () => {
    const doGenContent = generateContentRef.current;
    const doGenSocial = generateSocialRef.current;
    console.log("Regenerate All — flags:", doGenContent, doGenSocial);
    setGeneratingAI(true);
    try {
      const aiRes = await axios.post(
        `${API}/admin/products/generate-content`,
        {
          form_data: {},  // empty form forces AI to generate everything
          generate_content: doGenContent,
          generate_social: doGenSocial,
          primary_tones: primaryTones,
          secondary_tones: secondaryTones,
          feedback_patterns: feedbackPatterns,
        },
        authHeader()
      );
      const aiData = aiRes.data.product ?? aiRes.data;
      if (doGenContent) {
        const textFields = [
          "name", "slug", "narrative_intro", "description", "craft_fabric",
          "craft_technique", "edition", "disclaimer", "care_instructions",
          "delivery_info", "seo_title", "seo_description", "design_category",
        ];
        let cf = { ...form };
        const filled = new Set();
        textFields.forEach(f => {
          if (aiData[f]) { cf = { ...cf, [f]: aiData[f] }; filled.add(f); }
        });
        ["Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"].forEach(l => {
          const k = `detail_${l}`;
          if (aiData[k]) { cf = { ...cf, [k]: aiData[k] }; filled.add(k); }
        });
        if (aiData.key_attributes?.length) { cf = { ...cf, attributes: aiData.key_attributes }; filled.add("attributes"); }
        setForm(cf);
        setAiGeneratedFields(filled);
        toast.success("All fields regenerated");
      }
      if (doGenSocial && aiData.social_content) {
        setSocialContent(aiData.social_content);
        setSocialOpen(true);
      }
    } catch (err) {
      console.error("Regenerate All error:", err);
      toast.error("Regeneration failed");
    } finally {
      setGeneratingAI(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  if (loading) return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 bg-[#DACBA0]/20 w-1/3" />
      <div className="h-48 bg-[#DACBA0]/10" />
      <div className="h-48 bg-[#DACBA0]/10" />
    </div>
  );

  const isPOR = form.price_display_mode === "price_on_request";
  const margin = (form.cost_price && form.selling_price)
    ? parseFloat(form.selling_price) - parseFloat(form.cost_price) : null;
  const marginPct = (margin !== null && form.selling_price)
    ? Math.round((margin / parseFloat(form.selling_price)) * 100) : null;

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="admin-product-edit">

      {showAdjustModal && (
        <InventoryAdjustmentModal
          productId={id}
          productName={form.name}
          currentStock={form.stock_quantity}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={(newQty) => {
            setForm(f => ({ ...f, stock_quantity: newQty }));
            setShowAdjustModal(false);
          }}
        />
      )}

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <button type="button" onClick={() => navigate("/admin/products")}
            className="text-xs text-[#1B4D3E]/40 hover:text-[#1B4D3E] mb-1">
            ← Products
          </button>
          <h1 className="font-serif text-3xl text-[#1B4D3E]">
            {isNew ? "Add Product" : "Edit Product"}
          </h1>
          {lastEdited && (
            <p className="text-xs text-[#1B4D3E]/40 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last edited {new Date(lastEdited.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {lastEdited.by && ` by ${lastEdited.by}`}
            </p>
          )}
        </div>
        <button type="button" onClick={handleSubmit} disabled={saving || generatingAI}
          className="btn-luxury btn-luxury-primary disabled:opacity-50 flex items-center gap-2">
          {(saving || generatingAI) && <Loader2 className="w-4 h-4 animate-spin" />}
          {generatingAI ? "Generating..." : saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">

        {/* ══════════════════════════════════════════════════════
            0 — AI ENGINE
            ══════════════════════════════════════════════════════ */}
        <div className="border border-[#1B4D3E]/25 bg-[#1B4D3E]/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B4D3E]" />
              <span className="font-serif text-xl text-[#1B4D3E]">AI Content Engine</span>
              <span className="text-xs px-2 py-0.5 bg-[#1B4D3E] text-[#FFFFF0] uppercase tracking-wide">Beta</span>
            </div>
            {(generateContent || generateSocial) && (
              <div className="flex gap-2">
                <button type="button" onClick={handleRegenerate} disabled={generatingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#1B4D3E] text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors disabled:opacity-40">
                  {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Regenerate Empty Fields
                </button>
                <button type="button" onClick={handleRegenerateAll} disabled={generatingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#DACBA0] text-[#1B4D3E]/70 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors disabled:opacity-40">
                  Regenerate All
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={generateContent} onChange={e => {
                console.log("Generate Content changed:", e.target.checked);
                generateContentRef.current = e.target.checked;
                setGenerateContent(e.target.checked);
              }} className="accent-[#1B4D3E] w-4 h-4" />
              <span className="text-sm text-[#1B4D3E]">Generate product content</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={generateSocial} onChange={e => {
                console.log("Generate Social changed:", e.target.checked);
                generateSocialRef.current = e.target.checked;
                setGenerateSocial(e.target.checked);
              }} className="accent-[#1B4D3E] w-4 h-4" />
              <span className="text-sm text-[#1B4D3E]">Generate social media content</span>
            </label>
          </div>

          {(generateContent || generateSocial) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-2">Primary Tone</p>
                  <div className="flex gap-2 flex-wrap">
                    {["Luxury", "Editorial", "Minimal", "Commercial", "Cultural"].map(tone => (
                      <button key={tone} type="button"
                        onClick={() => setPrimaryTones(prev =>
                          prev.includes(tone) ? prev.filter(t => t !== tone) : [...prev, tone])}
                        className={`px-3 py-1 text-xs border transition-colors ${
                          primaryTones.includes(tone)
                            ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]"
                            : "border-[#DACBA0] text-[#1B4D3E]/60 hover:border-[#1B4D3E]"
                        }`}>
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-2">Social Intent</p>
                  <div className="flex gap-2 flex-wrap">
                    {["Storytelling", "Factual", "Emotional", "Sharp", "Playful", "Aspirational"].map(tone => (
                      <button key={tone} type="button"
                        onClick={() => setSecondaryTones(prev =>
                          prev.includes(tone) ? prev.filter(t => t !== tone) : [...prev, tone])}
                        className={`px-3 py-1 text-xs border transition-colors ${
                          secondaryTones.includes(tone)
                            ? "border-[#DACBA0] bg-[#DACBA0] text-[#1B4D3E]"
                            : "border-[#DACBA0]/50 text-[#1B4D3E]/50 hover:border-[#DACBA0]"
                        }`}>
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#1B4D3E]/40 italic">
                AI fills only empty fields on save. Fields you've entered are never overwritten.
                {aiGeneratedFields.size > 0 && (
                  <span className="ml-2 text-[#1B4D3E]/60 not-italic">
                    {aiGeneratedFields.size} field{aiGeneratedFields.size !== 1 ? "s" : ""} currently AI-generated.
                  </span>
                )}
              </p>

              {/* Feedback patterns */}
              <div className="border-t border-[#1B4D3E]/10 pt-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Feedback — tell AI what to avoid</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="ai-feedback-input"
                    placeholder='e.g. "Too generic", "Wrong fabric", "Tone too formal"'
                    className="flex-1 text-xs border border-[#DACBA0]/50 px-3 py-1.5 bg-white text-[#1B4D3E] placeholder:text-[#1B4D3E]/30 focus:outline-none focus:border-[#1B4D3E]"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const v = e.target.value.trim();
                        if (v) { setFeedbackPatterns(p => [...p, v]); e.target.value = ""; }
                      }
                    }}
                  />
                  <button type="button"
                    onClick={() => {
                      const el = document.getElementById("ai-feedback-input");
                      const v = el?.value?.trim();
                      if (v) { setFeedbackPatterns(p => [...p, v]); el.value = ""; }
                    }}
                    className="px-3 py-1.5 text-xs border border-[#DACBA0] text-[#1B4D3E]/60 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">
                    Add
                  </button>
                </div>
                {feedbackPatterns.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {feedbackPatterns.map((p, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-[#C08081]/10 border border-[#C08081]/30 text-xs text-[#1B4D3E]">
                        {p}
                        <button type="button" onClick={() => setFeedbackPatterns(prev => prev.filter((_, j) => j !== i))}
                          className="text-[#C08081] hover:text-[#C08081]/70 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#1B4D3E]/30 italic">
                  These notes are sent with every AI call in this session. Clear them to reset.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            1 — BASIC IDENTITY
            ══════════════════════════════════════════════════════ */}
        <Section id="basic" title="Basic Identity"
          subtitle="Name, classification, and product status"
          open={openSections.has("basic")} onToggle={toggleSection}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Name *</Label>
              <Input value={form.name} onChange={e => {
                const n = e.target.value;
                setForm(f => ({ ...f, name: n, slug: isNew ? genSlug(n) : f.slug }));
              }} className="mt-2" required />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Slug *</Label>
              <Input value={form.slug} onChange={e => sf("slug", e.target.value)} className="mt-2" required />
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
                    <Input value={form.material}
                      onChange={e => { const u = { ...form, material: e.target.value }; setForm({ ...u, ...applyAutoFields(u) }); }}
                      placeholder="e.g., Chiffon, Cotton Silk..." className="flex-1" autoFocus />
                    <button type="button" onClick={() => { setCustomMaterial(false); sf("material", ""); }}
                      className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap">Use list</button>
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
                    {categories.materials.filter(c => c.collection_type === form.collection_type)
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
                    <Input value={form.work} onChange={e => sf("work", e.target.value)}
                      placeholder="e.g., Hand Painted, Block Print..." className="flex-1" autoFocus />
                    <button type="button" onClick={() => { setCustomWork(false); sf("work", ""); }}
                      className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap">Use list</button>
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
                    {categories.works.filter(c => c.collection_type === form.collection_type)
                      .map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                    <SelectItem value="__custom__">✏️ Add new technique...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Status</Label>
              <Select value={form.status} onValueChange={v => sf("status", v)}>
                <SelectTrigger className="mt-2 max-w-sm"><SelectValue /></SelectTrigger>
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
        </Section>

        {/* ══════════════════════════════════════════════════════
            2 — PRODUCT SPECIFICATIONS
            ══════════════════════════════════════════════════════ */}
        <Section id="specs" title="Product Specifications"
          subtitle="Physical details shown on the product page"
          open={openSections.has("specs")} onToggle={toggleSection}>
          <div className="space-y-4">
            {PREDEFINED_DETAIL_LABELS.map(label => (
              <div key={label} className="grid grid-cols-[160px_1fr] items-center gap-4">
                <Label className="text-sm text-[#1B4D3E]/70">{label}</Label>
                <Input value={form[`detail_${label}`] || ""}
                  onChange={e => sf(`detail_${label}`, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}...`} className="max-w-md" />
              </div>
            ))}
            <div className="grid grid-cols-[160px_1fr] items-center gap-4">
              <Label className="text-sm text-[#1B4D3E]/70">Origin: India</Label>
              <Switch checked={form.made_in_india} onCheckedChange={v => sf("made_in_india", v)} />
            </div>
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
                    <button type="button" onClick={() => rmDetail(i)} className="p-2 text-[#C08081]"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════
            3 — PRODUCTION & TRACEABILITY
            ══════════════════════════════════════════════════════ */}
        <Section id="traceability" title="Production & Traceability"
          subtitle="Where this product came from — linked jobs, artisans, and materials"
          open={openSections.has("traceability")}
          onToggle={(sid) => {
            toggleSection(sid);
            if (!openSections.has(sid) && !isNew && !traceability.loaded && !traceability.loading) {
              fetchTraceability();
            }
          }}>
          {isNew ? (
            <p className="text-sm text-[#1B4D3E]/40 italic">
              Save this product first, then link it to a Product Master record to see traceability data.
            </p>
          ) : traceability.loading ? (
            <div className="py-6 text-sm text-[#1B4D3E]/40 animate-pulse">Loading traceability data…</div>
          ) : !traceability.product_master ? (
            <div className="space-y-3">
              <p className="text-sm text-[#1B4D3E]/50">No Product Master record is linked to this product.</p>
              <p className="text-xs text-[#1B4D3E]/30">
                To link: open the Product Master record and enter this product's ID as the Website Product ID.
                Or complete a Production Job and use "Create Website Product" — it sets the link automatically.
              </p>
              <div className="flex gap-4">
                <Link to="/admin/product-master"
                  className="inline-flex items-center gap-1.5 text-xs text-[#1B4D3E] underline">
                  <ExternalLink className="w-3 h-3" /> Browse Product Master
                </Link>
                <button type="button" onClick={fetchTraceability}
                  className="text-xs text-[#1B4D3E]/40 underline">
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              <div className="space-y-3">
                <SubSection label="Product Master Record" />
                <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-[#1B4D3E]/50">{traceability.product_master.product_code}</span>
                      <span className="text-sm font-medium text-[#1B4D3E]">{traceability.product_master.product_name}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-[#1B4D3E]/50 flex-wrap">
                      <span>{traceability.product_master.category}</span>
                      {traceability.product_master.collection_name && <span>{traceability.product_master.collection_name}</span>}
                      {traceability.product_master.edition_size && <span>Edition: {traceability.product_master.edition_size} pieces</span>}
                      {traceability.product_master.listing_status && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          traceability.product_master.listing_status === "website_listed" ? "bg-green-100 text-green-700"
                          : traceability.product_master.listing_status === "website_linked" ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                        }`}>
                          {traceability.product_master.listing_status.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/admin/product-master/${traceability.product_master.id}`}
                    className="shrink-0 text-xs flex items-center gap-1 text-[#1B4D3E] underline">
                    <ExternalLink className="w-3 h-3" /> View
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SubSection label={`Production Jobs (${traceability.jobs.length})`} />
                  {traceability.product_master?.id && (
                    <Link to={`/admin/production-jobs?product_id=${traceability.product_master.id}`}
                      className="text-xs text-[#1B4D3E] underline flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> View all
                    </Link>
                  )}
                </div>

                {traceability.jobs.length === 0 ? (
                  <p className="text-xs text-[#1B4D3E]/40 italic">No production jobs recorded for this design.</p>
                ) : (
                  <div className="space-y-2">
                    {traceability.jobs.slice(0, 5).map(job => (
                      <Link key={job.id} to={`/admin/production-jobs/${job.id}`}
                        className="flex items-center justify-between p-3 border border-[#DACBA0]/20 hover:bg-[#FFFFF0] transition-colors">
                        <div className="flex items-center gap-3">
                          <GitBranch className="w-3.5 h-3.5 text-[#1B4D3E]/40 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[#1B4D3E]/50">{job.job_code}</span>
                              <span className="text-sm text-[#1B4D3E]">{job.work_type?.replace(/_/g, " ")}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-[#1B4D3E]/40">
                              {job.supplier_name && <span>{job.supplier_name}</span>}
                              {job.actual_completion_date && <span>Completed {job.actual_completion_date}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          job.status === "completed" ? "bg-green-100 text-green-700"
                          : job.status === "in_progress" ? "bg-blue-100 text-blue-700"
                          : job.status === "cancelled" ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {job.status.replace(/_/g, " ")}
                        </span>
                      </Link>
                    ))}
                    {traceability.jobs.length > 5 && (
                      <p className="text-xs text-[#1B4D3E]/40 italic">
                        + {traceability.jobs.length - 5} more — view all in Production
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════
            4 — WEBSITE CONTENT
            ══════════════════════════════════════════════════════ */}
        <Section id="content" title="Website Content"
          subtitle="Everything the customer reads on the product page"
          open={openSections.has("content")} onToggle={toggleSection}>
          <div className="space-y-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Short Introduction</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">One line shown below the product name.</p>
              <Textarea value={form.narrative_intro} onChange={e => sf("narrative_intro", e.target.value)}
                className="min-h-[70px]" placeholder="A brief tagline..." data-testid="narrative-intro-input" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Full Description</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Use blank lines to separate paragraphs.</p>
              <Textarea value={form.description} onChange={e => sf("description", e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder={"Paragraph 1...\n\nParagraph 2..."} data-testid="description-input" />
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
            {/* Edition note auto-generates from Edition Size (Section 5) */}
            {form.edition_size && (
              <div className="px-4 py-3 bg-[#FFFFF0] border border-[#DACBA0]/30 text-xs text-[#1B4D3E]/50 flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-[#1B4D3E]/30">ℹ</span>
                <span>
                  Edition note auto-generated: <em className="text-[#1B4D3E]/70">
                    Limited to {form.edition_size} pieces. Each Chytare design is produced in strictly limited editions and will not be recreated once the edition is complete.
                  </em>
                  {" "}Edit edition size in <button type="button" onClick={() => {
                    setOpenSections(prev => { const n = new Set(prev); n.add("inventory"); return n; });
                    setTimeout(() => document.getElementById("section-inventory")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }} className="underline text-[#1B4D3E]">Edition &amp; Inventory ↓</button>
                </span>
              </div>
            )}
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Disclaimer</Label>
              <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Clear to hide.</p>
              <Textarea value={form.disclaimer} onChange={e => sf("disclaimer", e.target.value)}
                className="min-h-[80px]" placeholder="e.g., Slight variations in colour are natural..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Care Instructions</Label>
              <Textarea value={form.care_instructions} onChange={e => sf("care_instructions", e.target.value)}
                className="mt-2" placeholder="e.g., Dry clean only..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Delivery & Shipping</Label>
              <Textarea value={form.delivery_info} onChange={e => sf("delivery_info", e.target.value)}
                className="mt-2" placeholder="e.g., Ships within 7 days..." />
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

        {/* ══════════════════════════════════════════════════════
            5 — EDITION & INVENTORY (controlled)
            ══════════════════════════════════════════════════════ */}
        <Section id="inventory" title="Edition & Inventory"
          subtitle="Edition limits and stock status — quantity adjusted via inventory controls"
          open={openSections.has("inventory")} onToggle={toggleSection}>
          <div className="space-y-6">

            <div className="space-y-4">
              <SubSection label="Edition" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Edition Size</Label>
                  <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">
                    Single source of truth. Sets the edition note text automatically.
                  </p>
                  <Input type="number"
                    value={form.edition_size}
                    onChange={e => {
                      const val = e.target.value;
                      const editionText = val
                        ? `Limited to ${val} pieces. Each Chytare design is produced in strictly limited editions and will not be recreated once the edition is complete.`
                        : "";
                      setForm(f => ({ ...f, edition_size: val, edition: editionText }));
                    }}
                    min="1" placeholder="e.g. 15" />
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
            </div>

            <div className="space-y-4">
              <SubSection label="Stock" />

              <div className="max-w-sm">
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

              {form.stock_status === "made_to_order" && (
                <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30 space-y-3 max-w-lg">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.continue_selling_out_of_stock} onCheckedChange={v => sf("continue_selling_out_of_stock", v)} />
                    <Label className="text-sm">Continue selling when out of stock</Label>
                  </div>
                  {form.continue_selling_out_of_stock && (
                    <div>
                      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Days to Make & Dispatch</Label>
                      <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">
                        e.g. 50 → site shows: <span className="italic">"dispatched within 57 days."</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <Input type="number" value={form.made_to_order_days}
                          onChange={e => sf("made_to_order_days", e.target.value)}
                          className="max-w-[120px]" min="1" placeholder="30" />
                        <span className="text-sm text-[#1B4D3E]/60">days + 7 shipping</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inventory snapshot + controls — existing products only */}
              {!isNew && (
                <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Current Inventory</p>
                    <p className="text-xs text-[#1B4D3E]/30 italic">Read only — use controls below to change</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "In Stock", value: form.stock_quantity ?? 0 },
                      { label: "Units Available", value: form.units_available ?? 0 },
                      { label: "Edition Size", value: form.edition_size || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 bg-white border border-[#DACBA0]/20 text-center">
                        <p className="text-xs text-[#1B4D3E]/40 uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-xl font-semibold text-[#1B4D3E]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => setShowAdjustModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#1B4D3E] text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Adjust Inventory
                    </button>
                    <Link to={`/admin/inventory/history?product_id=${id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#DACBA0] text-[#1B4D3E]/70 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">
                      <Activity className="w-3.5 h-3.5" />
                      Inventory History
                    </Link>
                    <Link to="/admin/inventory"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[#DACBA0] text-[#1B4D3E]/70 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">
                      <Package className="w-3.5 h-3.5" />
                      View All Inventory
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════
            6 — MEDIA & VISIBILITY
            ══════════════════════════════════════════════════════ */}
        <Section id="media" title="Media & Visibility"
          subtitle="Images, featured settings, and public visibility controls"
          open={openSections.has("media")} onToggle={toggleSection}>
          <div className="space-y-8">

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
                    <Switch checked={form[field]}
                      onCheckedChange={v => setForm(f => ({ ...f, [field]: v, ...(mutual ? { [mutual]: v ? false : f[mutual] } : {}) }))} />
                    <div>
                      <Label className="text-sm">{label}</Label>
                      <p className="text-xs text-[#1B4D3E]/40">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                        <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0}
                          className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === form.media.length - 1}
                          className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative w-24 shrink-0">
                        <div className="relative aspect-[3/4] bg-[#FFFFF0] border border-[#DACBA0]/30 overflow-hidden">
                          {item.type === "video"
                            ? <video src={item.url} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                            : <img src={item.url} alt={item.alt} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                          }
                          <button type="button" onClick={() => removeMedia(index)}
                            className="absolute top-1 right-1 w-5 h-5 bg-[#C08081] text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => setFocalEditIndex(focalEditIndex === index ? null : index)}
                            className={`absolute top-1 left-1 w-5 h-5 flex items-center justify-center ${focalEditIndex === index ? "bg-[#1B4D3E] text-white" : "bg-white/80 text-[#1B4D3E]"}`}>
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
                            <button type="button" onClick={() => handleGenerateAlt(index)} disabled={generatingAlt[index]}
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1B4D3E] text-[#FFFFF0] hover:bg-[#1B4D3E]/80 disabled:opacity-50">
                              <Sparkles className="w-3 h-3" />
                              {generatingAlt[index] ? "Generating..." : "Generate ALT"}
                            </button>
                          </div>
                          <Input value={item.alt || ""} onChange={e => updateMedia(index, "alt", e.target.value)}
                            placeholder="Describe this image for accessibility & SEO..." className="text-sm" />
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
                            <input type="range" min="0" max="100" value={item[field] ?? 50}
                              onChange={e => updateMedia(index, field, parseInt(e.target.value))}
                              className="w-full accent-[#1B4D3E]" />
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


        <Section id="commerce" title="Commerce"
          subtitle="Pricing and how this product appears to buyers"
          open={openSections.has("commerce")} onToggle={toggleSection}>
          <div className="space-y-6">

            <div className="space-y-3">
              <SubSection label="Price Display Mode" />
              <div className="max-w-sm">
                <Select value={form.price_display_mode} onValueChange={v => sf("price_display_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_on_request">Price on Request — customer must enquire</SelectItem>
                    <SelectItem value="show_price">Show Price — price displayed on product page</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#1B4D3E]/40 mt-2">
                  {isPOR
                    ? "Selling price stored internally but NOT shown publicly. Enquiry form is shown."
                    : "Selling price shown on product page. Customer can purchase directly."}
                </p>
              </div>
              {!isPOR && (
                <div className="max-w-[160px]">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Currency</Label>
                  <Select value={form.currency} onValueChange={v => sf("currency", v)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
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
                  <p className="text-xs text-[#1B4D3E]/30 mt-1 mb-2">Always stored, even if not shown publicly.</p>
                  <Input type="number" value={form.selling_price} onChange={e => sf("selling_price", e.target.value)} placeholder="e.g. 18500" />
                </div>
              </div>
              {margin !== null && (
                <div className="flex items-center gap-6 px-4 py-3 bg-[#FFFFF0] border border-[#DACBA0]/30 text-sm">
                  <span className="text-[#1B4D3E]/50 text-xs uppercase tracking-wide">Margin</span>
                  <span className="font-medium text-[#1B4D3E]">₹{margin.toLocaleString("en-IN")}</span>
                  <span className={`font-semibold text-base ${marginPct >= 50 ? "text-green-600" : marginPct >= 30 ? "text-yellow-600" : "text-red-500"}`}>
                    {marginPct}%
                  </span>
                  <span className="text-xs text-[#1B4D3E]/30 ml-auto">
                    {marginPct < 30 ? "Low — review pricing" : marginPct >= 60 ? "Healthy" : "Acceptable"}
                  </span>
                </div>
              )}
            </div>

          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════
            8 — COMPLIANCE  (admin only, last editable section)
            ══════════════════════════════════════════════════════ */}
        <Section id="compliance" title="Compliance"
          subtitle="Tax codes, product classification, and internal identifiers"
          badge="Admin only" adminOnly
          open={openSections.has("compliance")} onToggle={toggleSection}>
          <div className="space-y-6">

            <div>
              <SubSection label="Internal Identifier" />
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SKU / Product Code</Label>
                  {skuAutoFilled && <span className="text-xs text-[#1B4D3E]/40 italic">auto-generated</span>}
                </div>
                <Input value={form.sku} onChange={e => { sf("sku", e.target.value); setSkuAutoFilled(false); }}
                  className="font-mono max-w-sm" placeholder="e.g. SAR-TUS-BLO-001" />
                <p className="text-xs text-[#1B4D3E]/30 mt-1">Auto-fills from Collection + Material + Design. Override anytime.</p>
              </div>
            </div>

            <div className="space-y-4">
              <SubSection label="Product Classification" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Type</Label>
                  <Select value={form.product_type || "none"} onValueChange={v => sf("product_type", v === "none" ? "" : v)}>
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
                  <Input value={form.composition_pct} onChange={e => sf("composition_pct", e.target.value)}
                    className="mt-2" placeholder="e.g. 100% Tussar Silk" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SubSection label="Tax & HSN" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">HSN Code</Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-[#1B4D3E]/50">Manual override</span>
                      <Switch checked={hsnOverride} onCheckedChange={v => {
                        setHsnOverride(v);
                        if (!v) {
                          const auto = getAutoHSN(form.collection_type, form.material);
                          if (auto) sf("hsn_code", auto);
                        }
                      }} />
                    </label>
                  </div>
                  <Input value={form.hsn_code} onChange={e => sf("hsn_code", e.target.value)}
                    disabled={!hsnOverride}
                    className={`font-mono ${!hsnOverride ? "bg-[#FFFFF0]/60 text-[#1B4D3E]/50" : ""}`}
                    placeholder="e.g. 5007" />
                  <p className="text-xs text-[#1B4D3E]/30 mt-1">
                    {hsnOverride ? "Manual override active." : "Auto-filled from Collection + Material. Toggle to override."}
                  </p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">GST Rate</Label>
                  <Select value={form.gst_rate !== "" ? String(form.gst_rate) : "none"}
                    onValueChange={v => sf("gst_rate", v === "none" ? "" : v)}>
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

          </div>
        </Section>

        {/* ══════════════════════════════════════════════════════
            9 — AUDIT / HISTORY
            ══════════════════════════════════════════════════════ */}
        {!isNew && (
          <Section id="audit" title="Audit & History"
            subtitle="Record of every change made to this product"
            open={openSections.has("audit")} onToggle={toggleSection}>
            <ProductEditHistory productId={id} />
          </Section>
        )}

        {/* ══════════════════════════════════════════════════════
            SOCIAL MEDIA CONTENT
            ══════════════════════════════════════════════════════ */}
        {socialContent && (
          <div className="border border-[#DACBA0]/30 bg-white">
            <button type="button" onClick={() => setSocialOpen(o => !o)}
              className="w-full flex items-center justify-between p-6 text-left group">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1B4D3E]" />
                <span className="font-serif text-xl text-[#1B4D3E]">Social Media Content</span>
                <span className="text-xs px-2 py-0.5 bg-[#DACBA0] text-[#1B4D3E] uppercase tracking-wide">AI Generated</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-[#1B4D3E]/40 transition-transform ${socialOpen ? "rotate-90" : ""}`} />
            </button>

            {socialOpen && (
              <div className="px-6 pb-6 border-t border-[#DACBA0]/20 pt-6 space-y-8">

                {/* Helper: copy button */}
                {(() => {
                  const CopyBtn = ({ text, id }) => (
                    <button type="button" onClick={() => copyToClipboard(text, id)}
                      className="ml-2 p-1 text-[#1B4D3E]/40 hover:text-[#1B4D3E] transition-colors shrink-0" title="Copy">
                      {copiedKey === id ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  );

                  const ig = socialContent.instagram || {};
                  const fb = socialContent.facebook || {};
                  const tw = socialContent.twitter || {};
                  const wa = socialContent.whatsapp || {};
                  const tags = socialContent.taglines || [];

                  return (
                    <>
                      {/* TAGLINES */}
                      {tags.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-3">Taglines</p>
                          <div className="space-y-2">
                            {tags.map((t, i) => (
                              <div key={i} className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                <span className="text-sm text-[#1B4D3E] flex-1 italic">"{t}"</span>
                                <CopyBtn text={t} id={`tag-${i}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* INSTAGRAM */}
                      {Object.keys(ig).length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-3">Instagram</p>
                          <div className="space-y-4">
                            {[
                              ["caption_storytelling", "Caption — Storytelling"],
                              ["caption_factual", "Caption — Factual"],
                              ["caption_aspirational", "Caption — Aspirational"],
                            ].map(([key, label]) => ig[key] && (
                              <div key={key}>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">{label}</p>
                                <div className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                  <p className="text-sm text-[#1B4D3E] flex-1 whitespace-pre-wrap">{ig[key]}</p>
                                  <CopyBtn text={ig[key]} id={`ig-${key}`} />
                                </div>
                              </div>
                            ))}

                            {[ig.reel_1, ig.reel_2].map((reel, i) => reel && (
                              <div key={i}>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">Reel {i + 1}</p>
                                <div className="p-3 bg-[#FFFFF0] border border-[#DACBA0]/30 space-y-2">
                                  {[["Hook", "hook"], ["Script", "script"], ["On-screen Text", "onscreen_text"]].map(([l, k]) => reel[k] && (
                                    <div key={k} className="flex items-start gap-2">
                                      <div className="flex-1">
                                        <span className="text-xs text-[#1B4D3E]/40 uppercase tracking-wide">{l}: </span>
                                        <span className="text-sm text-[#1B4D3E]">{reel[k]}</span>
                                      </div>
                                      <CopyBtn text={reel[k]} id={`reel-${i}-${k}`} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {ig.carousel?.length > 0 && (
                              <div>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">Carousel Structure</p>
                                <div className="p-3 bg-[#FFFFF0] border border-[#DACBA0]/30 space-y-1">
                                  {ig.carousel.map((slide, i) => (
                                    <p key={i} className="text-sm text-[#1B4D3E]">{slide}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ig.hashtags && (
                              <div>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">Hashtags</p>
                                <div className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                  <p className="text-sm text-[#1B4D3E]/70 flex-1">{ig.hashtags}</p>
                                  <CopyBtn text={ig.hashtags} id="ig-hashtags" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* FACEBOOK */}
                      {Object.keys(fb).length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-3">Facebook</p>
                          <div className="space-y-3">
                            {["caption_1", "caption_2"].map((k, i) => fb[k] && (
                              <div key={k}>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">Caption {i + 1}</p>
                                <div className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                  <p className="text-sm text-[#1B4D3E] flex-1 whitespace-pre-wrap">{fb[k]}</p>
                                  <CopyBtn text={fb[k]} id={`fb-${k}`} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TWITTER */}
                      {Object.keys(tw).length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-3">Twitter / X</p>
                          <div className="space-y-2">
                            {[
                              ["tweet_sharp", "Sharp"],
                              ["tweet_craft", "Craft"],
                              ["tweet_story", "Story"],
                              ["tweet_minimal", "Minimal"],
                              ["tweet_commercial", "Commercial"],
                            ].map(([k, label]) => tw[k] && (
                              <div key={k} className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                <div className="flex-1">
                                  <span className="text-xs text-[#1B4D3E]/40 uppercase tracking-wide">{label}: </span>
                                  <span className="text-sm text-[#1B4D3E]">{tw[k]}</span>
                                </div>
                                <CopyBtn text={tw[k]} id={`tw-${k}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* WHATSAPP */}
                      {Object.keys(wa).length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-3">WhatsApp</p>
                          <div className="space-y-3">
                            {[["short", "Short"], ["descriptive", "Descriptive"]].map(([k, label]) => wa[k] && (
                              <div key={k}>
                                <p className="text-xs text-[#1B4D3E]/50 mb-1">{label}</p>
                                <div className="flex items-start gap-2 p-3 bg-[#FFFFF0] border border-[#DACBA0]/30">
                                  <p className="text-sm text-[#1B4D3E] flex-1 whitespace-pre-wrap">{wa[k]}</p>
                                  <CopyBtn text={wa[k]} id={`wa-${k}`} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 pb-8">
          <button type="submit" disabled={saving || generatingAI} data-testid="save-product"
            className="btn-luxury btn-luxury-primary disabled:opacity-50 flex items-center gap-2">
            {(saving || generatingAI) && <Loader2 className="w-4 h-4 animate-spin" />}
            {generatingAI ? "Generating..." : saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </button>
          <button type="button" onClick={() => navigate("/admin/products")}
            className="btn-luxury btn-luxury-secondary">
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminProductEdit;
