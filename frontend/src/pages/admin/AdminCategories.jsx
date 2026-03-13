import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "all", collection: "all" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [collectionTypes, setCollectionTypes] = useState([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "design_category",
    collection_type: "sarees",
    image_url: "",
    order: 0,
    is_visible: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data);
      // Extract collection types for the dropdown
      const cts = res.data.filter(c => c.type === "collection_type");
      setCollectionTypes(cts);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
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
      slug: !editingCategory ? generateSlug(name) : form.slug,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, form);
        toast.success("Category updated");
      } else {
        await axios.post(`${API}/categories`, form);
        toast.success("Category created");
      }
      setDialogOpen(false);
      setEditingCategory(null);
      setForm({ name: "", slug: "", type: "design_category", collection_type: "sarees", image_url: "", order: 0, is_visible: true });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save category");
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      type: category.type,
      collection_type: category.collection_type || "",
      image_url: category.image_url || "",
      order: category.order,
      is_visible: category.is_visible,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await axios.delete(`${API}/categories/${categoryId}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const typeLabels = {
    collection_type: "Collection Type",
    material: "Material",
    work: "Work / Technique",
    design_category: "Design Category",
  };

  const filteredCategories = categories.filter((c) => {
    if (filter.type !== "all" && c.type !== filter.type) return false;
    if (filter.collection !== "all" && c.collection_type !== filter.collection) return false;
    return true;
  });

  // Collection options for dropdowns — always include sarees/scarves as fallback
  const collectionOptions = collectionTypes.length > 0
    ? collectionTypes
    : [{ slug: "sarees", name: "Sarees" }, { slug: "scarves", name: "Scarves" }];

  return (
    <AdminLayout>
      <div data-testid="admin-categories">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Categories</h1>
            <p className="text-[#1B4D3E]/60 mt-1">Manage materials, techniques, and design categories</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) {
              setEditingCategory(null);
              setForm({ name: "", slug: "", type: "design_category", collection_type: "sarees", image_url: "", order: 0, is_visible: true });
            }
          }}>
            <DialogTrigger asChild>
              <button data-testid="add-category-btn" className="btn-luxury btn-luxury-primary flex items-center gap-2 w-fit">
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#FFFFF0]">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-[#1B4D3E]">
                  {editingCategory ? "Edit Category" : "Add Category"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name</Label>
                  <Input
                    value={form.name}
                    onChange={handleNameChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="collection_type">Collection Type</SelectItem>
                      <SelectItem value="design_category">Design Category</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="work">Work / Technique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.type !== "collection_type" && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection</Label>
                    <Select value={form.collection_type} onValueChange={(v) => setForm({ ...form, collection_type: v })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collectionOptions.map((ct) => (
                          <SelectItem key={ct.slug} value={ct.slug}>{ct.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Order</Label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Representative Image URL</Label>
                  <Input
                    value={form.image_url || ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="mt-2"
                    placeholder="Paste image URL for homepage grid tile..."
                  />
                  {form.image_url && (
                    <div className="mt-2 w-20 h-20 border border-[#DACBA0]/20 overflow-hidden">
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-xs text-[#1B4D3E]/40 mt-1">Used as the tile image in the homepage collection grid.</p>
                </div>
                <button type="submit" className="w-full btn-luxury btn-luxury-primary">
                  {editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 border-b border-[#DACBA0]/30 pb-4 flex-wrap">
          <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="collection_type">Collection Type</SelectItem>
              <SelectItem value="design_category">Design Category</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="work">Work / Technique</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.collection} onValueChange={(v) => setFilter({ ...filter, collection: v })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Collections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Collections</SelectItem>
              {collectionOptions.map((ct) => (
                <SelectItem key={ct.slug} value={ct.slug}>{ct.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#DACBA0]/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1B4D3E]/5">
                <tr>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Type</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Order</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DACBA0]/20">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-[#FFFFF0]">
                    <td className="p-4">
                      <p className="font-medium text-[#1B4D3E]">{category.name}</p>
                      <p className="text-xs text-[#1B4D3E]/50">{category.slug}</p>
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E]">
                      {typeLabels[category.type] || category.type}
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E] capitalize">
                      {category.collection_type}
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E]">
                      {category.order}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 text-[#C08081]/60 hover:text-[#C08081] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
