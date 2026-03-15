import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const Field = ({ label, required, hint, children, span }) => (
  <div style={span ? { gridColumn: "1 / -1" } : {}}>
    <label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", display: "block", marginBottom: "6px" }}>
      {label}{required && <span style={{ color: "#C08081", marginLeft: "4px" }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.35)", marginTop: "4px" }}>{hint}</p>}
  </div>
);

const sel = (hasValue) => ({
  fontFamily: SANS, fontSize: "14px", width: "100%", height: "40px",
  padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)",
  background: "white", color: hasValue ? "#1B4D3E" : "rgba(27,77,62,0.4)",
});

const inp = { fontFamily: SANS, fontSize: "14px" };

const SectionCard = ({ title, subtitle, children }) => (
  <section style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
    <h2 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: subtitle ? "4px" : "20px" }}>{title}</h2>
    {subtitle && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginBottom: "20px" }}>{subtitle}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>{children}</div>
  </section>
);

const AdminProductMasterEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ categories: [], pricing_modes: [], statuses: [] });
  const [productCode, setProductCode] = useState(null);

  const emptyForm = {
    product_name: "", category: "", subcategory: "", collection_name: "",
    drop_name: "", pricing_mode: "", price: "", currency: "INR",
    edition_size: "", release_date: "", description: "", website_product_id: "",
  };

  const emptyAttrs = {
    primary_color: "", secondary_color: "", accent_color: "",
    fabric_type: "", craft_technique: "", motif_type: "", motif_subject: "",
    embroidery_type: "", embroidery_density: "", border_type: "",
    pattern_scale: "", art_inspiration: "", aesthetic_category: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [attrs, setAttrs] = useState(emptyAttrs);

  useEffect(() => { fetchMeta(); if (!isNew) fetchProduct(); }, [id]);

  const fetchMeta = async () => {
    try { const res = await axios.get(`${API}/admin/product-master/meta`); setMeta(res.data); }
    catch {}
  };

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/admin/product-master/${id}`);
      const p = res.data;
      setProductCode(p.product_code);
      setForm({
        product_name: p.product_name || "",
        category: p.category || "",
        subcategory: p.subcategory || "",
        collection_name: p.collection_name || "",
        drop_name: p.drop_name || "",
        pricing_mode: p.pricing_mode || "",
        price: p.price || "",
        currency: p.currency || "INR",
        edition_size: p.edition_size || "",
        release_date: p.release_date || "",
        description: p.description || "",
        website_product_id: p.website_product_id || "",
      });
      if (p.attributes) {
        setAttrs({
          primary_color: p.attributes.primary_color || "",
          secondary_color: p.attributes.secondary_color || "",
          accent_color: p.attributes.accent_color || "",
          fabric_type: p.attributes.fabric_type || "",
          craft_technique: p.attributes.craft_technique || "",
          motif_type: p.attributes.motif_type || "",
          motif_subject: p.attributes.motif_subject || "",
          embroidery_type: p.attributes.embroidery_type || "",
          embroidery_density: p.attributes.embroidery_density || "",
          border_type: p.attributes.border_type || "",
          pattern_scale: p.attributes.pattern_scale || "",
          art_inspiration: p.attributes.art_inspiration || "",
          aesthetic_category: p.attributes.aesthetic_category || "",
        });
      }
    } catch {
      toast.error("Product not found");
      navigate("/admin/product-master");
    } finally { setLoading(false); }
  };

  const setF = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setA = (field) => (e) => setAttrs({ ...attrs, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim()) return toast.error("Product name is required");
    if (!form.category) return toast.error("Category is required");
    if (!form.pricing_mode) return toast.error("Pricing mode is required");
    if (form.pricing_mode === "direct_purchase" && !form.price) return toast.error("Price is required for direct purchase products");
    if (form.edition_size && parseInt(form.edition_size) <= 0) return toast.error("Edition size must be greater than 0");

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        edition_size: form.edition_size ? parseInt(form.edition_size) : null,
        attributes: Object.values(attrs).some(v => v) ? attrs : null,
        website_product_id: form.website_product_id || null,
      };

      if (isNew) {
        const res = await axios.post(`${API}/admin/product-master`, payload);
        toast.success(`Product created — ${res.data.product_code}`);
        navigate(`/admin/product-master/${res.data.id}`);
      } else {
        await axios.put(`${API}/admin/product-master/${id}`, payload);
        toast.success("Product updated");
        navigate(`/admin/product-master/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  const showPrice = form.pricing_mode === "direct_purchase";

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>
            {isNew ? "New Product" : "Edit Product"}
          </h1>
          {productCode && <p style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>{productCode}</p>}
          {isNew && <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "4px" }}>Product code will be auto-generated on save (e.g. CH-SAR-001)</p>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Identity */}
          <SectionCard title="Product Identity" subtitle="Core design record — independent of stock and production">
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Product Name" required>
                <Input value={form.product_name} onChange={setF("product_name")} style={inp} required placeholder="e.g. Azure Meadow Embroidered Saree" />
              </Field>
            </div>
            <Field label="Category" required hint="Drives the product code prefix (SAR, SCF etc.)">
              <select value={form.category} onChange={setF("category")} required style={sel(!!form.category)}>
                <option value="">Select category...</option>
                {meta.categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Subcategory">
              <Input value={form.subcategory} onChange={setF("subcategory")} style={inp} placeholder="e.g. Hand Embroidered, Handloom" />
            </Field>
            <Field label="Collection Name">
              <Input value={form.collection_name} onChange={setF("collection_name")} style={inp} placeholder="e.g. Blossom Chronicles" />
            </Field>
            <Field label="Drop Name">
              <Input value={form.drop_name} onChange={setF("drop_name")} style={inp} placeholder="e.g. Summer Drop 2025" />
            </Field>
            <Field label="Edition Size" hint="Total number of pieces in this edition. Must be > 0.">
              <Input type="number" min="1" value={form.edition_size} onChange={setF("edition_size")} style={inp} placeholder="e.g. 10" />
            </Field>
            <Field label="Release Date">
              <Input type="date" value={form.release_date} onChange={setF("release_date")} style={inp} />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Description">
                <textarea value={form.description} onChange={setF("description")} placeholder="Internal description of this product..." style={{ ...inp, width: "100%", minHeight: "80px", padding: "10px 12px", border: "1px solid rgba(218,203,160,0.5)", resize: "vertical" }} />
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Linked Website Product ID" hint="UUID of the matching product on the public website. Auto-filled on import.">
                <Input value={form.website_product_id} onChange={setF("website_product_id")} style={{ ...inp, fontFamily: "'Courier New', monospace", fontSize: "12px" }} placeholder="Leave blank if not yet on website" />
              </Field>
            </div>
          </SectionCard>

          {/* Pricing */}
          <SectionCard title="Pricing & Commerce">
            <Field label="Pricing Mode" required hint="Direct purchase = price required. Price on request = enquiry flow.">
              <select value={form.pricing_mode} onChange={setF("pricing_mode")} required style={sel(!!form.pricing_mode)}>
                <option value="">Select pricing mode...</option>
                <option value="direct_purchase">Direct Purchase</option>
                <option value="price_on_request">Price on Request</option>
              </select>
            </Field>
            {showPrice && (
              <Field label="Price (INR)" required>
                <Input type="number" min="0" step="1" value={form.price} onChange={setF("price")} style={inp} placeholder="e.g. 45000" required={showPrice} />
              </Field>
            )}
            {!showPrice && form.pricing_mode === "price_on_request" && (
              <div style={{ display: "flex", alignItems: "center", padding: "12px", background: "rgba(218,203,160,0.1)", border: "1px solid rgba(218,203,160,0.3)" }}>
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.6)" }}>This product will use the enquiry flow. No price needed at this stage.</p>
              </div>
            )}
          </SectionCard>

          {/* Design Attributes */}
          <SectionCard title="Design Attributes" subtitle="Optional. Used for design intelligence and analytics later. Fill what you know now.">
            <Field label="Primary Colour">
              <Input value={attrs.primary_color} onChange={setA("primary_color")} style={inp} placeholder="e.g. Ivory" />
            </Field>
            <Field label="Secondary Colour">
              <Input value={attrs.secondary_color} onChange={setA("secondary_color")} style={inp} placeholder="e.g. Gold" />
            </Field>
            <Field label="Accent Colour">
              <Input value={attrs.accent_color} onChange={setA("accent_color")} style={inp} placeholder="e.g. Black" />
            </Field>
            <Field label="Fabric Type">
              <Input value={attrs.fabric_type} onChange={setA("fabric_type")} style={inp} placeholder="e.g. Tussar Silk" />
            </Field>
            <Field label="Craft Technique">
              <Input value={attrs.craft_technique} onChange={setA("craft_technique")} style={inp} placeholder="e.g. Hand Embroidery" />
            </Field>
            <Field label="Motif Type">
              <Input value={attrs.motif_type} onChange={setA("motif_type")} style={inp} placeholder="e.g. Floral, Geometric, Figurative" />
            </Field>
            <Field label="Motif Subject">
              <Input value={attrs.motif_subject} onChange={setA("motif_subject")} style={inp} placeholder="e.g. Bees, Fish, Lotus" />
            </Field>
            <Field label="Embroidery Type">
              <Input value={attrs.embroidery_type} onChange={setA("embroidery_type")} style={inp} placeholder="e.g. Kantha, Chikankari, Zardozi" />
            </Field>
            <Field label="Embroidery Density">
              <Input value={attrs.embroidery_density} onChange={setA("embroidery_density")} style={inp} placeholder="e.g. Sparse, Medium, Dense" />
            </Field>
            <Field label="Border Type">
              <Input value={attrs.border_type} onChange={setA("border_type")} style={inp} placeholder="e.g. Narrow, Wide, No Border" />
            </Field>
            <Field label="Pattern Scale">
              <Input value={attrs.pattern_scale} onChange={setA("pattern_scale")} style={inp} placeholder="e.g. Small, Medium, Large, All-over" />
            </Field>
            <Field label="Art Inspiration">
              <Input value={attrs.art_inspiration} onChange={setA("art_inspiration")} style={inp} placeholder="e.g. Mughal miniature, Bengal folk art" />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Aesthetic Category">
                <Input value={attrs.aesthetic_category} onChange={setA("aesthetic_category")} style={inp} placeholder="e.g. Heritage, Contemporary, Bridal, Everyday Luxury" />
              </Field>
            </div>
          </SectionCard>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary" style={{ opacity: saving ? 0.5 : 1 }}>
              {saving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate(isNew ? "/admin/product-master" : `/admin/product-master/${id}`)} className="btn-luxury btn-luxury-secondary">
              Cancel
            </button>
          </div>

          {isNew && (
            <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
              New products are created in <strong>Draft</strong> status. Activate them once edition size and pricing are confirmed.
            </p>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminProductMasterEdit;
