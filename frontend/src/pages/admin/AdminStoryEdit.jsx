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

const AdminStoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "maison_journal",
    hero_media_url: "",
    hero_media_type: "image",
    content: "",
    pull_quote: "",
    gallery: [],
    related_product_ids: [],
    seo_title: "",
    seo_description: "",
    is_published: false,
  });

  const categories = [
    { id: "maison_journal", name: "The Maison Journal" },
    { id: "craft_clusters", name: "Craft & Clusters" },
    { id: "wearable_whispers", name: "Wearable Whispers" },
    { id: "collections_campaigns", name: "Collections & Campaigns" },
    { id: "care_keeping", name: "Care & Keeping" },
    { id: "press_features", name: "Press & Features" },
  ];

  useEffect(() => {
    if (!isNew) {
      fetchStory();
    }
  }, [id]);

  const fetchStory = async () => {
    try {
      const res = await axios.get(`${API}/stories/${id}`);
      setForm(res.data);
    } catch (error) {
      toast.error("Story not found");
      navigate("/admin/stories");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setForm({
      ...form,
      title,
      slug: isNew ? generateSlug(title) : form.slug,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isNew) {
        await axios.post(`${API}/stories`, form);
        toast.success("Story created");
      } else {
        await axios.put(`${API}/stories/${id}`, form);
        toast.success("Story updated");
      }
      navigate("/admin/stories");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save story");
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
      <div data-testid="admin-story-edit">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">
            {isNew ? "Add Story" : "Edit Story"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Title *</Label>
                <Input
                  value={form.title}
                  onChange={handleTitleChange}
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
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                />
                <Label>Published</Label>
              </div>
            </div>
          </section>

          {/* Hero Media */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Hero Media</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Hero Image/Video URL</Label>
                <Input
                  value={form.hero_media_url}
                  onChange={(e) => setForm({ ...form, hero_media_url: e.target.value })}
                  className="mt-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Media Type</Label>
                <Select
                  value={form.hero_media_type}
                  onValueChange={(v) => setForm({ ...form, hero_media_type: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.hero_media_url && (
              <div className="mt-4">
                {form.hero_media_type === "video" ? (
                  <video
                    src={form.hero_media_url}
                    className="w-full max-w-md aspect-video object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={form.hero_media_url}
                    alt="Hero preview"
                    className="w-full max-w-md aspect-video object-cover"
                  />
                )}
              </div>
            )}
          </section>

          {/* Content */}
          <section className="bg-white border border-[#DACBA0]/30 p-6">
            <h2 className="font-serif text-xl text-[#1B4D3E] mb-6">Content</h2>
            
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Pull Quote</Label>
                <Textarea
                  value={form.pull_quote}
                  onChange={(e) => setForm({ ...form, pull_quote: e.target.value })}
                  className="mt-2"
                  placeholder="A compelling quote from the story..."
                />
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Content (HTML supported)</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="mt-2 min-h-[300px] font-mono text-sm"
                  placeholder="<p>Your story content here...</p>"
                />
                <p className="text-xs text-[#1B4D3E]/50 mt-2">
                  Use HTML tags: &lt;p&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;
                </p>
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
                  placeholder="Leave empty to use story title"
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
              data-testid="save-story"
              className="btn-luxury btn-luxury-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : isNew ? "Create Story" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/stories")}
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

export default AdminStoryEdit;
