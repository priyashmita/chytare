import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Upload } from "lucide-react";

const DEFAULTS = {
  eyebrow: "The Maison",
  hero_title: "Where Heritage Meets",
  hero_subtitle: "Contemporary Design",
  philosophy_heading: "Our Philosophy",
  philosophy_image_url: "",
  philosophy_paragraph_1: "",
  philosophy_paragraph_2: "",
  philosophy_paragraph_3: "",
  value_1_title: "Heritage",
  value_1_description: "",
  value_2_title: "Craftsmanship",
  value_2_description: "",
  value_3_title: "Sustainability",
  value_3_description: "",
  craft_heading: "The Craft",
  craft_image_url: "",
  craft_paragraph_1: "",
  craft_paragraph_2: "",
  cta_heading: "Begin Your Journey",
  cta_subheading: "",
};

const inputClass = "w-full border border-[#DACBA0]/40 px-4 py-3 text-sm text-[#1B4D3E] bg-white focus:outline-none focus:border-[#1B4D3E]";
const labelClass = "block text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1";
const sectionClass = "bg-white border border-[#DACBA0]/30 p-6 space-y-4";
const headingClass = "font-serif text-lg text-[#1B4D3E] border-b border-[#DACBA0]/20 pb-3";

const AdminAboutEdit = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    axios.get(`${API}/settings/about`)
      .then(res => {
        if (res.data) {
          setForm(f => ({ ...f, ...res.data }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const handleUpload = (key) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(u => ({ ...u, [key]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API}/upload`, formData);

      setForm(f => ({ ...f, [key]: res.data.url }));
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API}/settings/about`, form);
      toast.success("Saved");
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  const ImageField = ({ label, keyName }) => (
    <div>
      <label className={labelClass}>{label}</label>

      <div className="flex gap-2">
        <input
          type="text"
          className={inputClass}
          value={form[keyName] || ""}
          onChange={handleChange(keyName)}
        />

        <label className="bg-[#1B4D3E] text-white px-3 py-2 cursor-pointer flex items-center gap-2 text-xs">
          <Upload className="w-4 h-4" />
          {uploading[keyName] ? "..." : "Upload"}
          <input type="file" className="hidden" onChange={handleUpload(keyName)} />
        </label>
      </div>

      {form[keyName] && (
        <img src={form[keyName]} className="h-24 mt-2 border" />
      )}
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div data-testid="admin-about-edit">

      <h1 className="font-serif text-3xl text-[#1B4D3E] mb-6">
        About Page
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

        <div className={sectionClass}>
          <h2 className={headingClass}>Hero</h2>

          <input className={inputClass} value={form.eyebrow} onChange={handleChange("eyebrow")} />
          <input className={inputClass} value={form.hero_title} onChange={handleChange("hero_title")} />
          <input className={inputClass} value={form.hero_subtitle} onChange={handleChange("hero_subtitle")} />
        </div>

        <div className={sectionClass}>
          <h2 className={headingClass}>Philosophy</h2>

          <ImageField label="Image" keyName="philosophy_image_url" />

          <textarea className={inputClass} value={form.philosophy_paragraph_1} onChange={handleChange("philosophy_paragraph_1")} />
          <textarea className={inputClass} value={form.philosophy_paragraph_2} onChange={handleChange("philosophy_paragraph_2")} />
          <textarea className={inputClass} value={form.philosophy_paragraph_3} onChange={handleChange("philosophy_paragraph_3")} />
        </div>

        <div className={sectionClass}>
          <h2 className={headingClass}>Craft</h2>

          <ImageField label="Image" keyName="craft_image_url" />

          <textarea className={inputClass} value={form.craft_paragraph_1} onChange={handleChange("craft_paragraph_1")} />
          <textarea className={inputClass} value={form.craft_paragraph_2} onChange={handleChange("craft_paragraph_2")} />
        </div>

        <button className="bg-[#1B4D3E] text-white px-6 py-3">
          {saving ? "Saving..." : "Save"}
        </button>

      </form>
    </div>
  );
};

export default AdminAboutEdit;
