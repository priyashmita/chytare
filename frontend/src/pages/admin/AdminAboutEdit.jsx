import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { toast } from "sonner";

const AdminAboutEdit = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
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
  });

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

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

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

  const Field = ({ label, name, multiline = false, hint }) => (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1">{label}</label>
      {hint && <p className="text-xs text-[#1B4D3E]/40 mb-2 italic">{hint}</p>}
      {multiline ? (
        <textarea
          value={form[name] || ""}
          onChange={e => set(name, e.target.value)}
          rows={4}
          className="w-full border border-[#DACBA0]/40 px-4 py-3 text-sm text-[#1B4D3E] bg-white focus:outline-none focus:border-[#1B4D3E] resize-y"
        />
      ) : (
        <input
          type="text"
          value={form[name] || ""}
          onChange={e => set(name, e.target.value)}
          className="w-full border border-[#DACBA0]/40 px-4 py-3 text-sm text-[#1B4D3E] bg-white focus:outline-none focus:border-[#1B4D3E]"
        />
      )}
    </div>
  );

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
        <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3">Hero Section</h2>
          <Field label="Eyebrow (small gold text above title)" name="eyebrow" />
          <Field label="Main Title" name="hero_title" hint='e.g. "Where Heritage Meets"' />
          <Field label="Script Subtitle (appears in gold italic below title)" name="hero_subtitle" hint='e.g. "Contemporary Design"' />
        </div>

        {/* Philosophy */}
        <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3">Philosophy Section</h2>
          <Field label="Section Heading" name="philosophy_heading" />
          <Field label="Image URL" name="philosophy_image_url" hint="Paste a Cloudinary URL or any image URL" />
          {form.philosophy_image_url && (
            <img src={form.philosophy_image_url} alt="Preview" className="h-32 object-cover border border-[#DACBA0]/20" />
          )}
          <Field label="Paragraph 1" name="philosophy_paragraph_1" multiline />
          <Field label="Paragraph 2" name="philosophy_paragraph_2" multiline />
          <Field label="Paragraph 3" name="philosophy_paragraph_3" multiline />
        </div>

        {/* Values */}
        <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3">Our Values (dark green band)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Field label="Value 1 Title" name="value_1_title" />
              <Field label="Value 1 Description" name="value_1_description" multiline />
            </div>
            <div className="space-y-3">
              <Field label="Value 2 Title" name="value_2_title" />
              <Field label="Value 2 Description" name="value_2_description" multiline />
            </div>
            <div className="space-y-3">
              <Field label="Value 3 Title" name="value_3_title" />
              <Field label="Value 3 Description" name="value_3_description" multiline />
            </div>
          </div>
        </div>

        {/* Craft */}
        <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3">The Craft Section</h2>
          <Field label="Section Heading" name="craft_heading" />
          <Field label="Image URL" name="craft_image_url" hint="Paste a Cloudinary URL or any image URL" />
          {form.craft_image_url && (
            <img src={form.craft_image_url} alt="Preview" className="h-32 object-cover border border-[#DACBA0]/20" />
          )}
          <Field label="Paragraph 1" name="craft_paragraph_1" multiline />
          <Field label="Paragraph 2" name="craft_paragraph_2" multiline />
        </div>

        {/* CTA */}
        <div className="bg-white border border-[#DACBA0]/30 p-6 space-y-4">
          <h2 className="font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3">Bottom CTA Section</h2>
          <Field label="Heading" name="cta_heading" />
          <Field label="Subheading" name="cta_subheading" />
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
