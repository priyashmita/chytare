import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X, Upload, Settings2, Sparkles } from "lucide-react";

const IMAGE_TYPE_OPTIONS = [
  { value: "product_display", label: "Product Display" },
  { value: "hero", label: "Hero" },
  { value: "close_up", label: "Close-Up" },
  { value: "embroidery_detail", label: "Embroidery Detail" },
  { value: "model", label: "Model" },
];

const DEFAULT_EDITION = "Limited to 15 pieces. Each Chytare design is produced in strictly limited editions and will not be recreated once the edition is complete.";
const DEFAULT_DISCLAIMER = "This piece is hand embroidered. Slight variations in stitch placement, texture, and colour are natural characteristics of handcrafted textiles and make every piece unique.";

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generatingAlt, setGeneratingAlt] = useState({});
  const [categories, setCategories] = useState({ materials: [], works: [], design_categories: [], collection_types: [] });
  const [focalEditIndex, setFocalEditIndex] = useState(null);
  const [customMaterial, setCustomMaterial] = useState(false);
  const [customWork, setCustomWork] = useState(false);

  const PREDEFINED_DETAIL_LABELS = ["Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"];

  const [form, setForm] = useState({
    name: "",
    slug: "",
    collection_type: "sarees",
    material: "",
    work: "",
    design_category: "",
    narrative_intro: "",
    description: "",
    details: [],
    media: [],
    attributes: [],
    edition: DEFAULT_EDITION,
    disclaimer: DEFAULT_DISCLAIMER,
    craft_fabric: "",
    craft_technique: "",
    care_instructions: "",
    delivery_info: "",
    // Commerce
    pricing_mode: "price_on_request",
    price: "",
    currency: "INR",
    stock_status: "in_stock",
    stock_quantity: 0,
    units_available: 0,
    edition_size: "",
    continue_selling_out_of_stock: false,
    // Visibility
    is_hero: false,
    is_secondary_highlight: false,
    secondary_highlight_order: 0,
    is_hidden: false,
    is_invite_only: false,
    display_order: 9999,
    seo_title: "",
    seo_description: "",
    made_in_india: true,
  });

  useEffect(() => {
    fetchCategories();
    if (!isNew) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!isNew && categories.materials.length > 0 && form.material) {
      const isKnown = categories.materials.some(c => c.name === form.material);
      if (!isKnown) setCustomMaterial(true);
    }
    if (!isNew && categories.works.length > 0 && form.work) {
      const isKnown = categories.works.some(c => c.name === form.work);
      if (!isKnown) setCustomWork(true);
    }
  }, [categories, isNew]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      const data = res.data;
      const madeInIndia = (data.details || []).some(d => d.label === "Made in India");
      const predefinedValues = {};
      const customDetails = [];
      (data.details || []).forEach(d => {
        if (d.label === "Made in India") return;
        if (PREDEFINED_DETAIL_LABELS.includes(d.label)) predefinedValues[d.label] = d.value;
        else customDetails.push(d);
      });
      setForm({
        ...data,
        price: data.price || "",
        edition_size: data.edition_size || "",
        description: data.description || "",
        details: customDetails,
        made_in_india: madeInIndia,
        edition: data.edition || DEFAULT_EDITION,
        disclaimer: data.disclaimer || DEFAULT_DISCLAIMER,
        pricing_mode: data.pricing_mode || (data.price_on_request ? "price_on_request" : "price_on_request"),
        ...Object.fromEntries(PREDEFINED_DETAIL_LABELS.map(l => [`detail_${l}`, predefinedValues[l] || ""])),
      });
    } catch (error) {
      toast.error("Product not found");
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [materials, works, designs, collections] = await Promise.all([
        axios.get(`${API}/categories?type=material`),
        axios.get(`${API}/categories?type=work`),
        axios.get(`${API}/categories?type=design_category`),
        axios.get(`${API}/categories?type=collection_type`),
      ]);
      setCategories({ materials: materials.data, works: works.data, design_categories: designs.data, collection_types: collections.data });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const saveNewCategory = async (type, name, collectionType) => {
    if (!name || !name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await axios.post(`${API}/categories`, { name: name.trim(), slug, type, collection_type: collectionType });
    } catch (err) {
      console.log(`Category "${name}" may already exist.`);
    }
  };

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm({ ...form, name, slug: isNew ? generateSlug(name) : form.slug });
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (form.media.length + files.length > 10) { toast.error("Maximum 10 media files allowed"); return; }
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await axios.post(`${API}/upload`, formData);
        setForm((prev) => ({ ...prev, media: [...prev.media, { id: res.data.id, url: res.data.url, type: res.data.type, alt: "", image_type: "product_display", order: prev.media.length, focal_x: 50, focal_y: 50 }] }));
      } catch (error) { toast.error(`Failed to upload ${file.name}`); }
    }
  };

  const handleMediaUrlAdd = () => {
    const url = prompt("Enter image/video URL:");
    if (url) {
      const type = url.match(/\.(mp4|mov|webm)$/i) ? "video" : "image";
      setForm((prev) => ({ ...prev, media: [...prev.media, { id: Date.now().toString(), url, type, alt: "", image_type: "product_display", order: prev.media.length, focal_x: 50, focal_y: 50 }] }));
    }
  };

  const removeMedia = (index) => {
    setForm((prev) => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
    if (focalEditIndex === index) setFocalEditIndex(null);
  };

  const updateMediaFocal = (index, axis, value) => {
    setForm((prev) => ({ ...prev, media: prev.media.map((m, i) => i === index ? { ...m, [axis === "x" ? "focal_x" : "focal_y"]: value } : m) }));
  };

  const updateMediaField = (index, field, value) => {
    setForm((prev) => ({ ...prev, media: prev.media.map((m, i) => i === index ? { ...m, [field]: value } : m) }));
  };

  const handleGenerateAlt = async (index) => {
    if (isNew) { toast.error("Please save the product first before generating ALT text"); return; }
    const imageType = form.media[index]?.image_type || "product_display";
    setGeneratingAlt((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await axios.post(`${API}/generate-alt`, { product_id: id, image_type: imageType });
      updateMediaField(index, "alt", res.data.alt_text);
      toast.success("ALT text generated");
    } catch (error) { toast.error("Failed to generate ALT text"); }
    finally { setGeneratingAlt((prev) => ({ ...prev, [index]: false })); }
  };

  const addAttribute = () => setForm((prev) => ({ ...prev, attributes: [...prev.attributes, { key: "", value: "", visible: true }] }));
  const addCustomDetail = () => setForm((prev) => ({ ...prev, details: [...prev.details, { label: "", value: "" }] }));
  const updateCustomDetail = (index, field, value) => setForm((prev) => ({ ...prev, details: prev.details.map((d, i) => i === index ? { ...d, [field]: value } : d) }));
  const removeCustomDetail = (index) => setForm((prev) => ({ ...prev, details: prev.details.filter((_, i) => i !== index) }));
  const updateAttribute = (index, field, value) => setForm((prev) => ({ ...prev, attributes: prev.attributes.map((attr, i) => i === index ? { ...attr, [field]: value } : attr) }));
  const removeAttribute = (index) => setForm((prev) => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (customMaterial && form.material?.trim()) await saveNewCategory("material", form.material, form.collection_type);
      if (customWork && form.work?.trim()) await saveNewCategory("work", form.work, form.collection_type);

      const allDetails = [];
      PREDEFINED_DETAIL_LABELS.forEach((label) => {
        const val = form[`detail_${label}`];
        if (val && val.trim()) allDetails.push({ label, value: val.trim() });
      });
      if (form.made_in_india) allDetails.push({ label: "Made in India", value: "Yes" });
      form.details.forEach((d) => { if (d.label?.trim() && d.value?.trim()) allDetails.push({ label: d.label.trim(), value: d.value.trim() }); });

      const data = {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        units_available: parseInt(form.units_available) || 0,
        edition_size: form.edition_size ? parseInt(form.edition_size) : null,
        details: allDetails,
        // Derive purchasable flags
        is_purchasable: form.pricing_mode === "fixed_price" && !!form.price,
        is_enquiry_only: form.pricing_mode === "price_on_request",
        price_on_request: form.pricing_mode === "price_on_request",
      };
      delete data.made_in_india;
      PREDEFINED_DETAIL_LABELS.forEach((l) => delete data[`detail_${l}`]);

      if (isNew) { await axios.post(`${API}/products`, data); toast.success("Product created"); }
      else { await axios.put(`${API}/products/${id}`, data); toast.success("Product updated"); }
      navigate("/admin/products");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save product");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <AdminLayout><div className="animate-pulse space-y-4"><div className="h-8 bg-[#DACBA0]/20 w-1/3" /><div className="h-64 bg-[#DACBA0]/20" /></div></AdminLayout>;
  }

  const isPriced = form.pricing_mode === "fixed_price";

  return (
    <AdminLayout>
      <div data-testid="admin-product-edit">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">{isNew ? "Add Product" : "Edit Product"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Basic Info */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name *</Label>
                <Input value={form.name} onChange={handleNameChange} className="mt-2" required />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-2" required />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection Type *</Label>
                <Select value={form.collection_type} onValueChange={(v) => setForm({ ...form, collection_type: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.collection_types.map((ct) => <SelectItem key={ct.id} value={ct.slug}>{ct.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Design Category</Label>
                <Select value={form.design_category || "none"} onValueChange={(v) => setForm({ ...form, design_category: v === "none" ? "" : v })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.design_categories.filter(c => c.collection_type === form.collection_type).map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Material */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Material</Label>
                {customMaterial ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-2">
                      <Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g., Chiffon, Cotton Silk..." className="flex-1" autoFocus />
                      <button type="button" onClick={() => { setCustomMaterial(false); setForm({ ...form, material: "" }); }} className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap">Use list</button>
                    </div>
                    <p className="text-xs text-[#1B4D3E]/40">Saved permanently to your materials list on save.</p>
                  </div>
                ) : (
                  <Select value={form.material || "none"} onValueChange={(v) => { if (v === "__custom__") { setCustomMaterial(true); setForm({ ...form, material: "" }); } else { setForm({ ...form, material: v === "none" ? "" : v }); } }}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.materials.filter(c => c.collection_type === form.collection_type).map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                      <SelectItem value="__custom__">✏️ Add new material...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              {/* Work */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Work / Technique</Label>
                {customWork ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-2">
                      <Input value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} placeholder="e.g., Hand Painted, Block Print..." className="flex-1" autoFocus />
                      <button type="button" onClick={() => { setCustomWork(false); setForm({ ...form, work: "" }); }} className="text-xs text-[#1B4D3E]/50 underline whitespace-nowrap">Use list</button>
                    </div>
                    <p className="text-xs text-[#1B4D3E]/40">Saved permanently to your techniques list on save.</p>
                  </div>
                ) : (
                  <Select value={form.work || "none"} onValueChange={(v) => { if (v === "__custom__") { setCustomWork(true); setForm({ ...form, work: "" }); } else { setForm({ ...form, work: v === "none" ? "" : v }); } }}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Select technique" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.works.filter(c => c.collection_type === form.collection_type).map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                      <SelectItem value="__custom__">✏️ Add new technique...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </section>

          {/* ── PRICING & COMMERCE ── */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-2">Pricing & Commerce</h2>
            <p className="text-xs text-[#1B4D3E]/40 mb-6">Controls what the customer sees and can do on the product page.</p>

            {/* Pricing mode toggle — the master switch */}
            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setForm({ ...form, pricing_mode: "fixed_price" })}
                className={`flex-1 py-3 px-4 border text-sm font-medium transition-colors ${
                  isPriced
                    ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]"
                    : "border-[#DACBA0]/50 text-[#1B4D3E]/60 hover:border-[#1B4D3E]"
                }`}
              >
                💰 Fixed Price
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, pricing_mode: "price_on_request" })}
                className={`flex-1 py-3 px-4 border text-sm font-medium transition-colors ${
                  !isPriced
                    ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]"
                    : "border-[#DACBA0]/50 text-[#1B4D3E]/60 hover:border-[#1B4D3E]"
                }`}
              >
                ✉️ Price on Request
              </button>
            </div>

            {/* Conditional fields */}
            {isPriced ? (
              <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30 space-y-4">
                <p className="text-xs text-[#1B4D3E]/60 uppercase tracking-wider">Fixed Price — customer sees price, Add to Cart, Buy Now</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Price *</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-2" placeholder="e.g. 18500" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR ₹</SelectItem>
                        <SelectItem value="USD">USD $</SelectItem>
                        <SelectItem value="GBP">GBP £</SelectItem>
                        <SelectItem value="EUR">EUR €</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#FFFFF0] border border-[#DACBA0]/30">
                <p className="text-xs text-[#1B4D3E]/60 uppercase tracking-wider">Price on Request — customer sees enquiry form only. No price shown.</p>
              </div>
            )}

            {/* Stock — always shown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock Status</Label>
                <Select value={form.stock_status} onValueChange={(v) => setForm({ ...form, stock_status: v })}>
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
                <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="mt-2" min="0" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Units Available (shown publicly)</Label>
                <Input type="number" value={form.units_available} onChange={(e) => setForm({ ...form, units_available: e.target.value })} className="mt-2" min="0" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Edition Size (total run)</Label>
                <Input type="number" value={form.edition_size} onChange={(e) => setForm({ ...form, edition_size: e.target.value })} className="mt-2" min="1" placeholder="e.g. 15" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Switch checked={form.continue_selling_out_of_stock} onCheckedChange={(v) => setForm({ ...form, continue_selling_out_of_stock: v })} />
              <Label className="text-sm">Continue selling when out of stock</Label>
            </div>
          </section>

          {/* Media */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-2">Media (1-10 files)</h2>
            <p className="text-xs text-[#1B4D3E]/40 mb-6">Click the ⚙️ icon to set focal point. Set image type and click ✨ to auto-generate ALT text.</p>
            <div className="space-y-6 mb-4">
              {form.media.map((item, index) => (
                <div key={item.id || index} className="border border-[#DACBA0]/20 p-4">
                  <div className="flex gap-4">
                    <div className="relative w-24 flex-shrink-0">
                      <div className="relative aspect-[3/4] bg-[#FFFFF0] border border-[#DACBA0]/30 overflow-hidden">
                        {item.type === "video" ? (
                          <video src={item.url} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                        ) : (
                          <img src={item.url} alt={item.alt} className="w-full h-full object-cover" style={{ objectPosition: `${item.focal_x ?? 50}% ${item.focal_y ?? 50}%` }} />
                        )}
                        <button type="button" onClick={() => removeMedia(index)} className="absolute top-1 right-1 w-5 h-5 bg-[#C08081] text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                        <button type="button" onClick={() => setFocalEditIndex(focalEditIndex === index ? null : index)} className={`absolute top-1 left-1 w-5 h-5 flex items-center justify-center transition-colors ${focalEditIndex === index ? "bg-[#1B4D3E] text-white" : "bg-white/80 text-[#1B4D3E]"}`} title="Set focal point"><Settings2 className="w-3 h-3" /></button>
                        <div className="absolute bottom-1 left-1 w-5 h-5 bg-[#1B4D3E]/50 text-white flex items-center justify-center text-xs">{index + 1}</div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Image Type</Label>
                        <Select value={item.image_type || "product_display"} onValueChange={(v) => updateMediaField(index, "image_type", v)}>
                          <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{IMAGE_TYPE_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">ALT Text</Label>
                          <button type="button" onClick={() => handleGenerateAlt(index)} disabled={generatingAlt[index]} className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1B4D3E] text-[#FFFFF0] hover:bg-[#1B4D3E]/80 disabled:opacity-50 transition-colors" title={isNew ? "Save product first" : "Auto-generate ALT text"}>
                            <Sparkles className="w-3 h-3" />
                            {generatingAlt[index] ? "Generating..." : "Generate ALT"}
                          </button>
                        </div>
                        <Input value={item.alt || ""} onChange={(e) => updateMediaField(index, "alt", e.target.value)} placeholder="Describe this image for accessibility & SEO..." className="text-sm" />
                      </div>
                    </div>
                  </div>
                  {focalEditIndex === index && (
                    <div className="mt-3 p-3 bg-[#FFFFF0] border border-[#DACBA0]/40 space-y-3">
                      <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Focal Point</p>
                      {[["x", "Horizontal"], ["y", "Vertical"]].map(([axis, label]) => (
                        <div key={axis}>
                          <div className="flex justify-between text-xs text-[#1B4D3E]/50 mb-1"><span>{label}</span><span>{axis === "x" ? item.focal_x ?? 50 : item.focal_y ?? 50}%</span></div>
                          <input type="range" min="0" max="100" value={axis === "x" ? item.focal_x ?? 50 : item.focal_y ?? 50} onChange={(e) => updateMediaFocal(index, axis, parseInt(e.target.value))} className="w-full accent-[#1B4D3E]" />
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
            <button type="button" onClick={handleMediaUrlAdd} className="ml-4 text-xs text-[#1B4D3E] underline">+ Add from URL</button>
          </section>

          {/* Narrative */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Story & Description</h2>
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Narrative Introduction</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">A brief tagline shown below the product name.</p>
                <Textarea value={form.narrative_intro} onChange={(e) => setForm({ ...form, narrative_intro: e.target.value })} className="mt-1 min-h-[80px]" placeholder="A brief intro line for this piece..." data-testid="narrative-intro-input" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Description</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Use blank lines to separate paragraphs.</p>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[200px] font-mono text-sm" placeholder={"Paragraph 1...\n\nParagraph 2..."} data-testid="description-input" />
              </div>
            </div>
          </section>

          {/* Details */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-2">Details</h2>
            <p className="text-xs text-[#1B4D3E]/40 mb-6">Empty fields are auto-hidden on the product page.</p>
            <div className="space-y-4">
              {PREDEFINED_DETAIL_LABELS.map((label) => (
                <div key={label} className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <Label className="text-sm text-[#1B4D3E]/70">{label}</Label>
                  <Input value={form[`detail_${label}`] || ""} onChange={(e) => setForm({ ...form, [`detail_${label}`]: e.target.value })} placeholder={`Enter ${label.toLowerCase()}...`} className="max-w-md" />
                </div>
              ))}
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <Label className="text-sm text-[#1B4D3E]/70">Made in India</Label>
                <Switch checked={form.made_in_india} onCheckedChange={(v) => setForm({ ...form, made_in_india: v })} />
              </div>
              <div className="border-t border-[#DACBA0]/20 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Custom Details</Label>
                  <button type="button" onClick={addCustomDetail} className="text-xs text-[#1B4D3E] flex items-center gap-1"><Plus className="w-3 h-3" /> Add Custom Detail</button>
                </div>
                <div className="space-y-3">
                  {form.details.map((d, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input value={d.label} onChange={(e) => updateCustomDetail(index, "label", e.target.value)} placeholder="Label" className="w-1/3" />
                      <Input value={d.value} onChange={(e) => updateCustomDetail(index, "value", e.target.value)} placeholder="Value" className="flex-1" />
                      <button type="button" onClick={() => removeCustomDetail(index)} className="p-2 text-[#C08081]"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Craft & Additional Info */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Craft & Additional Info</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Key Attributes (The Story)</Label>
                  <button type="button" onClick={addAttribute} className="text-xs text-[#1B4D3E] flex items-center gap-1"><Plus className="w-3 h-3" /> Add Attribute</button>
                </div>
                <div className="space-y-3">
                  {form.attributes.map((attr, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Input value={attr.key} onChange={(e) => updateAttribute(index, "key", e.target.value)} placeholder="e.g., Craft & Cultural Reference" className="w-1/3" />
                      <Textarea value={attr.value} onChange={(e) => updateAttribute(index, "value", e.target.value)} placeholder="e.g., The Bankura horse originates from..." className="flex-1 min-h-[80px]" />
                      <button type="button" onClick={() => removeAttribute(index)} className="p-2 text-[#C08081] mt-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Edition</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Clear entirely to hide on product page.</p>
                <Textarea value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} className="mt-1 min-h-[80px]" placeholder="e.g., Limited to 15 pieces..." />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Disclaimer</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Clear entirely to hide on product page.</p>
                <Textarea value={form.disclaimer} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} className="mt-1 min-h-[80px]" placeholder="e.g., Slight variations in colour are natural..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft - Fabric</Label>
                  <Input value={form.craft_fabric} onChange={(e) => setForm({ ...form, craft_fabric: e.target.value })} className="mt-2" placeholder="e.g., Pure Mulberry Silk" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft - Technique</Label>
                  <Input value={form.craft_technique} onChange={(e) => setForm({ ...form, craft_technique: e.target.value })} className="mt-2" placeholder="e.g., Hand Block Print" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Care Instructions</Label>
                <Textarea value={form.care_instructions} onChange={(e) => setForm({ ...form, care_instructions: e.target.value })} className="mt-2" placeholder="e.g., Dry clean only..." />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Delivery & Shipping</Label>
                <Textarea value={form.delivery_info} onChange={(e) => setForm({ ...form, delivery_info: e.target.value })} className="mt-2" placeholder="e.g., Ships within 7 days..." />
              </div>
            </div>
          </section>

          {/* Visibility */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Visibility & Featured</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3"><Switch checked={form.is_hidden} onCheckedChange={(v) => setForm({ ...form, is_hidden: v })} /><Label>Hide from public</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_invite_only} onCheckedChange={(v) => setForm({ ...form, is_invite_only: v })} /><Label>Invite only</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_hero} onCheckedChange={(v) => setForm({ ...form, is_hero: v, is_secondary_highlight: v ? false : form.is_secondary_highlight })} /><Label>Set as Hero (Homepage)</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.is_secondary_highlight} onCheckedChange={(v) => setForm({ ...form, is_secondary_highlight: v, is_hero: v ? false : form.is_hero })} /><Label>Featured in Next Lot</Label></div>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">SEO</h2>
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Title</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} className="mt-2" placeholder="Leave empty to use product name" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Description</Label>
                <Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} className="mt-2" placeholder="Meta description for search engines" />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} data-testid="save-product" className="btn-luxury btn-luxury-primary disabled:opacity-50">
              {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate("/admin/products")} className="btn-luxury btn-luxury-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProductEdit;
