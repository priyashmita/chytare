import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { toast } from "sonner";

const DEFAULTS = {
  eyebrow: "The Maison",
  hero_title: "Where Heritage Meets",
  hero_subtitle: "Contemporary Design",
  philosophy_heading: "Our Philosophy",
  philosophy_image_url: "https://images.unsplash.com/photo-1702631778198-239c76842dd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  philosophy_paragraph_1: 'At Chytare, we believe that every garment is a canvas—a canvas for your life\'s most treasured moments. Our name, derived from the Bengali word "চিত্রে" (meaning "in pictures" or "on canvas"), reflects our commitment to creating wearable art.',
  philosophy_paragraph_2: "We work with master craftspeople across India, preserving age-old techniques while infusing them with contemporary sensibilities. Each piece is a dialogue between past and present, tradition and innovation.",
  philosophy_paragraph_3: "This is slow fashion at its most intentional—pieces meant to be cherished, passed down, and woven into the fabric of your family's story.",
  value_1_title: "Heritage",
  value_1_description: "We honor the rich textile traditions of India, working with artisan communities to preserve and celebrate their craft.",
  value_2_title: "Craftsmanship",
  value_2_description: "Every piece is handcrafted with meticulous attention to detail, ensuring the highest quality and uniqueness.",
  value_3_title: "Sustainability",
  value_3_description: "We embrace slow fashion, creating timeless pieces designed to be treasured for generations.",
  craft_heading: "The Craft",
  craft_image_url: "https://images.unsplash.com/photo-1734980620393-d145b2f6ddf7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  craft_paragraph_1: "Our sarees and scarves are created in collaboration with skilled artisans from weaving clusters across India. From the handlooms of Bengal to the block printers of Rajasthan, each technique carries centuries of wisdom.",
  craft_paragraph_2: "We source the finest natural fabrics—pure silks, handspun cottons, and luxurious blends—ensuring that every piece feels as beautiful as it looks.",
  cta_heading: "Begin Your Journey",
  cta_subheading: "Discover our collections and find the piece that speaks to your story.",
};

const inputClass = "w-full border border-[#DACBA0]/40 px-4 py-3 text-sm text-[#1B4D3E] bg-white focus:outline-none focus:border-[#1B4D3E]";
const labelClass = "block text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1";
const hintClass = "text-xs text-[#1B4D3E]/40 mb-2 italic";
const sectionClass = "bg-white border border-[#DACBA0]/30 p-6 space-y-4";
const headingClass = "font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3";

const AdminAboutEdit = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    axios.get(`${API}/settings/about`)
      .then(res => {
        if (res.data && Object.keys(res.data).length > 1) {
          setForm(f => ({ ...f, ...res.data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/settings/about`, form);
      toast.success("About page saved!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AdminLayout>
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-[#DACBA0]/20 w-1/3 rounded" />
        <div className="h-48 bg-[#DACBA0]/20 rounded" />
        <div className="h-48 bg-[#DACBA0]/20 rounded" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1B4D3E]">About Page</h1>
        <p className="text-sm text-[#1B4D3E]/50 mt-1">Edit all content shown on your About page</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

        {/* Hero */}
        <div className={sectionClass}>
          <h2 className={headingClass}>Hero Section</h2>
          <div>
            <label className={labelClass}>Eyebrow (small gold text above title)</label>
            <input type="text" className={inputClass} value={form.eyebrow} onChange={handleChange("eyebrow")} />
          </div>
          <div>
            <label className={labelClass}>Main Title</label>
            <input type="text" className={inputClass} value={form.hero_title} onChange={handleChange("hero_title")} />
          </div>
          <div>
            <label className={labelClass}>Script Subtitle (appears in gold italic below title)</label>
            <input type="text" className={inputClass} value={form.hero_subtitle} onChange={handleChange("hero_subtitle")} />
          </div>
        </div>

        {/* Philosophy */}
        <div className={sectionClass}>
          <h2 className={headingClass}>Philosophy Section</h2>
          <div>
            <label className={labelClass}>Section Heading</label>
            <input type="text" className={inputClass} value={form.philosophy_heading} onChange={handleChange("philosophy_heading")} />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <p className={hintClass}>Paste a Cloudinary URL or any image URL</p>
            <input type="text" className={inputClass} value={form.philosophy_image_url} onChange={handleChange("philosophy_image_url")} />
            {form.philosophy_image_url && (
              <img src={form.philosophy_image_url} alt="Preview" className="h-32 object-cover border border-[#DACBA0]/20 mt-2" />
            )}
          </div>
          <div>
            <label className={labelClass}>Paragraph 1</label>
            <textarea rows={4} className={inputClass} value={form.philosophy_paragraph_1} onChange={handleChange("philosophy_paragraph_1")} />
          </div>
          <div>
            <label className={labelClass}>Paragraph 2</label>
            <textarea rows={4} className={inputClass} value={form.philosophy_paragraph_2} onChange={handleChange("philosophy_paragraph_2")} />
          </div>
          <div>
            <label className={labelClass}>Paragraph 3</label>
            <textarea rows={4} className={inputClass} value={form.philosophy_paragraph_3} onChange={handleChange("philosophy_paragraph_3")} />
          </div>
        </div>

        {/* Values */}
        <div className={sectionClass}>
          <h2 className={headingClass}>Our Values (dark green band)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Value 1 Title</label>
                <input type="text" className={inputClass} value={form.value_1_title} onChange={handleChange("value_1_title")} />
              </div>
              <div>
                <label className={labelClass}>Value 1 Description</label>
                <textarea rows={4} className={inputClass} value={form.value_1_description} onChange={handleChange("value_1_description")} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Value 2 Title</label>
                <input type="text" className={inputClass} value={form.value_2_title} onChange={handleChange("value_2_title")} />
              </div>
              <div>
                <label className={labelClass}>Value 2 Description</label>
                <textarea rows={4} className={inputClass} value={form.value_2_description} onChange={handleChange("value_2_description")} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Value 3 Title</label>
                <input type="text" className={inputClass} value={form.value_3_title} onChange={handleChange("value_3_title")} />
              </div>
              <div>
                <label className={labelClass}>Value 3 Description</label>
                <textarea rows={4} className={inputClass} value={form.value_3_description} onChange={handleChange("value_3_description")} />
              </div>
            </div>
          </div>
        </div>

        {/* Craft */}
        <div className={sectionClass}>
          <h2 className={headingClass}>The Craft Section</h2>
          <div>
            <label className={labelClass}>Section Heading</label>
            <input type="text" className={inputClass} value={form.craft_heading} onChange={handleChange("craft_heading")} />
          </div>
          <div>
            <label className={labelClass}>Image URL</label>
            <p className={hintClass}>Paste a Cloudinary URL or any image URL</p>
            <input type="text" className={inputClass} value={form.craft_image_url} onChange={handleChange("craft_image_url")} />
            {form.craft_image_url && (
              <img src={form.craft_image_url} alt="Preview" className="h-32 object-cover border border-[#DACBA0]/20 mt-2" />
            )}
          </div>
          <div>
            <label className={labelClass}>Paragraph 1</label>
            <textarea rows={4} className={inputClass} value={form.craft_paragraph_1} onChange={handleChange("craft_paragraph_1")} />
          </div>
          <div>
            <label className={labelClass}>Paragraph 2</label>
            <textarea rows={4} className={inputClass} value={form.craft_paragraph_2} onChange={handleChange("craft_paragraph_2")} />
          </div>
        </div>

        {/* CTA */}
        <div className={sectionClass}>
          <h2 className={headingClass}>Bottom CTA Section</h2>
          <div>
            <label className={labelClass}>Heading</label>
            <input type="text" className={inputClass} value={form.cta_heading} onChange={handleChange("cta_heading")} />
          </div>
          <div>
            <label className={labelClass}>Subheading</label>
            <input type="text" className={inputClass} value={form.cta_subheading} onChange={handleChange("cta_subheading")} />
          </div>
        </div>

        <div className="flex items-center gap-6 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#1B4D3E] text-white px-10 py-3 text-sm uppercase tracking-[0.2em] hover:bg-[#17382B] transition-all disabled:opacity-50"
            style={{ color: '#ffffff' }}
          >
            {saving ? "Saving..." : "Save About Page"}
          </button>
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 hover:text-[#1B4D3E] transition-colors"
          >
            Preview page →
          </a>
        </div>
      </form>
    </AdminLayout>
  );
};

export default AdminAboutEdit;
