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
import { Plus, X, Upload, GripVertical } from "lucide-react";

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState({ materials: [], works: [], design_categories: [], collection_types: [] });

  const PREDEFINED_DETAIL_LABELS = [
    "Colour", "Fabric", "Technique", "Motif", "Finish", "Saree Length"
  ];

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
    disclaimer: "",
    craft_fabric: "",
    craft_technique: "",
    care_instructions: "",
    delivery_info: "",
    price: "",
    price_on_request: false,
    stock_status: "in_stock",
    stock_quantity: 0,
    continue_selling_out_of_stock: false,
    is_hero: false,
    is_secondary_highlight: false,
    secondary_highlight_order: 0,
    is_hidden: false,
    is_invite_only: false,
    seo_title: "",
    seo_description: "",
    made_in_india: true,
  });

  useEffect(() => {
    fetchCategories();
    if (!isNew) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      const data = res.data;
      const madeInIndia = (data.details || []).some(d => d.label === "Made in India");
      const predefinedValues = {};
      const customDetails = [];
      (data.details || []).forEach(d => {
        if (d.label === "Made in India") return;
        if (PREDEFINED_DETAIL_LABELS.includes(d.label)) {
          predefinedValues[d.label] = d.value;
        } else {
          customDetails.push(d);
        }
      });
      setForm({
        ...data,
        price: data.price || "",
        description: data.description || "",
        details: customDetails,
        made_in_india: madeInIndia,
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
      setCategories({
        materials: materials.data,
        works: works.data,
        design_categories: designs.data,
        collection_types: collections.data,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm({
      ...form,
      name,
      slug: isNew ? generateSlug(name) : form.slug,
    });
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (form.media.length + files.length > 10) {
      toast.error("Maximum 10 media files allowed");
      return;
    }

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axios.post(`${API}/upload`, formData);
        setForm((prev) => ({
          ...prev,
          media: [
            ...prev.media,
            {
              id: res.data.id,
              url: res.data.url,
              type: res.data.type,
              alt: file.name,
              order: prev.media.length,
            },
          ],
        }));
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleMediaUrlAdd = () => {
    const url = prompt("Enter image/video URL:");
    if (url) {
      const type = url.match(/\.(mp4|mov|webm)$/i) ? "video" : "image";
      setForm((prev) => ({
        ...prev,
        media: [
          ...prev.media,
          {
            id: Date.now().toString(),
            url,
            type,
            alt: "",
            order: prev.media.length,
          },
        ],
      }));
    }
  };

  const removeMedia = (index) => {
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };

  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { key: "", value: "", visible: true }],
    }));
  };

  const addCustomDetail = () => {
    setForm((prev) => ({
      ...prev,
      details: [...prev.details, { label: "", value: "" }],
    }));
  };

  const updateCustomDetail = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      details: prev.details.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));
  };

  const removeCustomDetail = (index) => {
    setForm((prev) => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index),
    }));
  };

  const updateAttribute = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  const removeAttribute = (index) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const allDetails = [];
      PREDEFINED_DETAIL_LABELS.forEach((label) => {
        const val = form[`detail_${label}`];
        if (val && val.trim()) {
          allDetails.push({ label, value: val.trim() });
        }
      });
      if (form.made_in_india) {
        allDetails.push({ label: "Made in India", value: "Yes" });
      }
      form.details.forEach((d) => {
        if (d.label && d.label.trim() && d.value && d.value.trim()) {
          allDetails.push({ label: d.label.trim(), value: d.value.trim() });
        }
      });

      const data = {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        details: allDetails,
      };
      delete data.made_in_india;
      PREDEFINED_DETAIL_LABELS.forEach((l) => delete data[`detail_${l}`]);

      if (isNew) {
        await axios.post(`${API}/products`, data);
        toast.success("Product created");
      } else {
        await axios.put(`${API}/products/${id}`, data);
        toast.success("Product updated");
      }
      navigate("/admin/products");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#DACBA0]/20 w-1/3" />
          <div className="h-64 bg-[#DACBA0]/20" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div data-testid="admin-product-edit">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">
            {isNew ? "Add Product" : "Edit Product"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name *</Label>
                <Input
                  value={form.name}
                  onChange={handleNameChange}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection Type *</Label>
                <Select
                  value={form.collection_type}
                  onValueChange={(v) => setForm({ ...form, collection_type: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sarees">Sarees</SelectItem>
                    <SelectItem value="scarves">Scarves</SelectItem>
                    {categories.collection_types
                      .filter(c => c.slug !== "sarees" && c.slug !== "scarves")
                      .map((ct) => (
                        <SelectItem key={ct.id} value={ct.slug}>{ct.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Design Category</Label>
                <Select
                  value={form.design_category || "none"}
                  onValueChange={(v) => setForm({ ...form, design_category: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.design_categories
                      .filter(c => c.collection_type === form.collection_type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Material</Label>
                <Select
                  value={form.material || "none"}
                  onValueChange={(v) => setForm({ ...form, material: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.materials
                      .filter(c => c.collection_type === form.collection_type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Work / Technique</Label>
                <Select
                  value={form.work || "none"}
                  onValueChange={(v) => setForm({ ...form, work: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select technique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.works
                      .filter(c => c.collection_type === form.collection_type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Media */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Media (1-10 files)</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
              {form.media.map((item, index) => (
                <div key={item.id || index} className="relative aspect-[3/4] bg-[#FFFFF0] border border-[#DACBA0]/30">
                  {item.type === "video" ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.alt} className="w-full h-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-[#C08081] text-white flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1 left-1 w-6 h-6 bg-[#1B4D3E]/50 text-white flex items-center justify-center text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
              
              {form.media.length < 10 && (
                <label className="aspect-[3/4] border-2 border-dashed border-[#DACBA0]/50 flex flex-col items-center justify-center cursor-pointer hover:border-[#DACBA0] transition-colors">
                  <Upload className="w-8 h-8 text-[#DACBA0] mb-2" />
                  <span className="text-xs text-[#1B4D3E]/60">Upload</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={handleMediaUrlAdd}
              className="text-xs text-[#1B4D3E] underline"
            >
              + Add from URL
            </button>
          </section>

          {/* Narrative */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Story & Description</h2>
            
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Narrative Introduction</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">A brief tagline or opening line shown below the product name.</p>
                <Textarea
                  value={form.narrative_intro}
                  onChange={(e) => setForm({ ...form, narrative_intro: e.target.value })}
                  className="mt-1 min-h-[80px]"
                  placeholder="A brief intro line for this piece..."
                  data-testid="narrative-intro-input"
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product Description</Label>
                <p className="text-xs text-[#1B4D3E]/40 mt-1 mb-2">Rich description. Use blank lines to separate paragraphs. Line breaks will be preserved exactly as entered.</p>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 min-h-[200px] font-mono text-sm"
                  placeholder={"Paragraph 1 about the piece...\n\nParagraph 2 about craftsmanship...\n\nParagraph 3 about the inspiration..."}
                  data-testid="description-input"
                />
              </div>
            </div>
          </section>

          {/* Structured Details */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-2">Details</h2>
            <p className="text-xs text-[#1B4D3E]/40 mb-6">Structured product details. These appear in a separate "Details" section on the product page. Empty fields are auto-hidden.</p>

            <div className="space-y-4">
              {PREDEFINED_DETAIL_LABELS.map((label) => (
                <div key={label} className="grid grid-cols-[160px_1fr] items-center gap-4">
                  <Label className="text-sm text-[#1B4D3E]/70">{label}</Label>
                  <Input
                    value={form[`detail_${label}`] || ""}
                    onChange={(e) => setForm({ ...form, [`detail_${label}`]: e.target.value })}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className="max-w-md"
                    data-testid={`detail-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                </div>
              ))}

              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <Label className="text-sm text-[#1B4D3E]/70">Made in India</Label>
                <Switch
                  checked={form.made_in_india}
                  onCheckedChange={(v) => setForm({ ...form, made_in_india: v })}
                  data-testid="detail-made-in-india"
                />
              </div>

              {/* Custom detail rows */}
              <div className="border-t border-[#DACBA0]/20 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Custom Details</Label>
                  <button
                    type="button"
                    onClick={addCustomDetail}
                    className="text-xs text-[#1B4D3E] flex items-center gap-1"
                    data-testid="add-custom-detail-btn"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Detail
                  </button>
                </div>
                <div className="space-y-3">
                  {form.details.map((d, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Input
                        value={d.label}
                        onChange={(e) => updateCustomDetail(index, "label", e.target.value)}
                        placeholder="Label"
                        className="w-1/3"
                      />
                      <Input
                        value={d.value}
                        onChange={(e) => updateCustomDetail(index, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomDetail(index)}
                        className="p-2 text-[#C08081]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Legacy Attributes & Craft */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Craft & Additional Info</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Key Attributes (The Story)</Label>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="text-xs text-[#1B4D3E] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Attribute
                  </button>
                </div>
                
                <div className="space-y-3">
                  {form.attributes.map((attr, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Input
                        value={attr.key}
                        onChange={(e) => updateAttribute(index, "key", e.target.value)}
                        placeholder="e.g., Origin"
                        className="w-1/3"
                      />
                      <Input
                        value={attr.value}
                        onChange={(e) => updateAttribute(index, "value", e.target.value)}
                        placeholder="e.g., Varanasi"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="p-2 text-[#C08081]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Disclaimer</Label>
                <Textarea
                  value={form.disclaimer}
                  onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
                  className="mt-2"
                  placeholder="Note about handcrafted variations..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft - Fabric</Label>
                  <Input
                    value={form.craft_fabric}
                    onChange={(e) => setForm({ ...form, craft_fabric: e.target.value })}
                    className="mt-2"
                    placeholder="e.g., Pure Mulberry Silk"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Craft - Technique</Label>
                  <Input
                    value={form.craft_technique}
                    onChange={(e) => setForm({ ...form, craft_technique: e.target.value })}
                    className="mt-2"
                    placeholder="e.g., Hand Block Print"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Care Instructions</Label>
                <Textarea
                  value={form.care_instructions}
                  onChange={(e) => setForm({ ...form, care_instructions: e.target.value })}
                  className="mt-2"
                  placeholder="e.g., Dry clean only..."
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Delivery & Shipping</Label>
                <Textarea
                  value={form.delivery_info}
                  onChange={(e) => setForm({ ...form, delivery_info: e.target.value })}
                  className="mt-2"
                  placeholder="e.g., Ships within 7 days..."
                />
              </div>
            </div>
          </section>

          {/* Pricing & Stock */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Pricing & Stock</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Price (₹)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-2"
                  disabled={form.price_on_request}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.price_on_request}
                  onCheckedChange={(v) => setForm({ ...form, price_on_request: v })}
                />
                <Label>Price on Request</Label>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock Status</Label>
                <Select
                  value={form.stock_status}
                  onValueChange={(v) => setForm({ ...form, stock_status: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="made_to_order">Made to Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Stock Quantity</Label>
                <Input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className="mt-2"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.continue_selling_out_of_stock}
                  onCheckedChange={(v) => setForm({ ...form, continue_selling_out_of_stock: v })}
                />
                <Label className="text-sm">Continue selling when out of stock</Label>
              </div>
            </div>
          </section>

          {/* Visibility & Featured */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Visibility & Featured</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_hidden}
                  onCheckedChange={(v) => setForm({ ...form, is_hidden: v })}
                />
                <Label>Hide from public</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_invite_only}
                  onCheckedChange={(v) => setForm({ ...form, is_invite_only: v })}
                />
                <Label>Invite only</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_hero}
                  onCheckedChange={(v) => setForm({ ...form, is_hero: v, is_secondary_highlight: v ? false : form.is_secondary_highlight })}
                />
                <Label>Set as Hero (Homepage)</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_secondary_highlight}
                  onCheckedChange={(v) => setForm({ ...form, is_secondary_highlight: v, is_hero: v ? false : form.is_hero })}
                />
                <Label>Featured in Next Lot</Label>
              </div>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">SEO</h2>
            
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Title</Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                  className="mt-2"
                  placeholder="Leave empty to use product name"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">SEO Description</Label>
                <Textarea
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  className="mt-2"
                  placeholder="Meta description for search engines"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              data-testid="save-product"
              className="btn-luxury btn-luxury-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="btn-luxury btn-luxury-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProductEdit;
