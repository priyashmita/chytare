import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Plus, Edit, Trash2, Eye, EyeOff, Star, ChevronUp, ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [collectionTypes, setCollectionTypes] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCollectionTypes();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products?include_hidden=true`);
      // Sort by display_order if present, otherwise by created date
      const sorted = [...res.data].sort((a, b) => {
        const aOrder = a.display_order ?? 9999;
        const bOrder = b.display_order ?? 9999;
        return aOrder - bOrder;
      });
      setProducts(sorted);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionTypes = async () => {
    try {
      const res = await axios.get(`${API}/categories?type=collection_type`);
      setCollectionTypes(res.data);
    } catch (error) {
      console.error("Error fetching collection types:", error);
    }
  };

  const handleDelete = async (productId) => {
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success("Product deleted");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const moveProduct = (index, direction) => {
    const list = [...filteredProducts];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    // Swap in the filtered list
    const temp = list[index];
    list[index] = list[swapIndex];
    list[swapIndex] = temp;

    // Rebuild full products list preserving non-filtered items
    const filteredIds = new Set(list.map(p => p.id));
    const others = products.filter(p => !filteredIds.has(p.id));
    const reordered = [...list, ...others].map((p, i) => ({ ...p, display_order: i }));
    setProducts(reordered);
    setOrderChanged(true);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      // Save display_order for each product individually
      await Promise.all(
        products.map((p) =>
          axios.put(`${API}/products/${p.id}`, { ...p, display_order: p.display_order })
        )
      );
      toast.success("Order saved");
      setOrderChanged(false);
    } catch (error) {
      toast.error("Failed to save order");
    } finally {
      setSavingOrder(false);
    }
  };

  const filteredProducts = filter === "all"
    ? products
    : products.filter(p => p.collection_type === filter);

  return (
    <AdminLayout>
      <div data-testid="admin-products">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Products</h1>
            <p className="text-[#1B4D3E]/60 mt-1">{products.length} total products</p>
          </div>
          <div className="flex items-center gap-3">
            {orderChanged && (
              <button
                onClick={saveOrder}
                disabled={savingOrder}
                className="btn-luxury btn-luxury-secondary flex items-center gap-2 w-fit disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingOrder ? "Saving..." : "Save Order"}
              </button>
            )}
            <Link
              to="/admin/products/new"
              data-testid="add-product-btn"
              className="btn-luxury btn-luxury-primary flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        </div>

        {orderChanged && (
          <div className="mb-4 p-3 bg-[#DACBA0]/20 border border-[#DACBA0]/40 text-xs text-[#1B4D3E]/70">
            You have unsaved order changes. Click <strong>Save Order</strong> to apply them to the site.
          </div>
        )}

        {/* Filters — dynamic from database */}
        <div className="flex gap-4 mb-6 border-b border-[#DACBA0]/30 pb-4 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs uppercase tracking-wider transition-colors ${
              filter === "all" ? "text-[#1B4D3E]" : "text-[#1B4D3E]/50 hover:text-[#DACBA0]"
            }`}
          >
            All
          </button>
          {collectionTypes.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setFilter(ct.slug)}
              className={`text-xs uppercase tracking-wider transition-colors ${
                filter === ct.slug ? "text-[#1B4D3E]" : "text-[#1B4D3E]/50 hover:text-[#DACBA0]"
              }`}
            >
              {ct.name}
            </button>
          ))}
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[#DACBA0]/10 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
            <p className="text-[#1B4D3E]/60 mb-4">No products found</p>
            <Link to="/admin/products/new" className="btn-luxury btn-luxury-secondary">
              Add Your First Product
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1B4D3E]/5">
                  <tr>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60 w-20">Order</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Price</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Status</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Featured</th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DACBA0]/20">
                  {filteredProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-[#FFFFF0]">
                      {/* Order controls */}
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveProduct(index, -1)}
                            disabled={index === 0}
                            className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-[#1B4D3E]/40 w-5 text-center">{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => moveProduct(index, 1)}
                            disabled={index === filteredProducts.length - 1}
                            className="p-0.5 text-[#1B4D3E]/40 hover:text-[#1B4D3E] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 bg-[#DACBA0]/10 flex-shrink-0">
                            {product.media?.[0]?.url && (
                              <img
                                src={product.media[0].url}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#1B4D3E]">{product.name}</p>
                            <p className="text-xs text-[#1B4D3E]/50">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#1B4D3E] capitalize">
                          {product.collection_type}
                        </span>
                      </td>
                      <td className="p-4">
                        {product.price_on_request ? (
                          <span className="text-sm text-[#DACBA0]">On Request</span>
                        ) : product.price ? (
                          <span className="text-sm text-[#1B4D3E]">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-sm text-[#1B4D3E]/50">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {product.is_hidden ? (
                          <span className="flex items-center gap-1 text-xs text-[#1B4D3E]/50">
                            <EyeOff className="w-3 h-3" /> Hidden
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[#1B4D3E]">
                            <Eye className="w-3 h-3" /> Visible
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {product.is_hero && (
                          <span className="inline-flex items-center gap-1 text-xs bg-[#DACBA0]/20 text-[#1B4D3E] px-2 py-1">
                            <Star className="w-3 h-3 fill-current" /> Hero
                          </span>
                        )}
                        {product.is_secondary_highlight && (
                          <span className="inline-flex items-center gap-1 text-xs bg-[#1B4D3E]/10 text-[#1B4D3E] px-2 py-1">
                            Featured
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-2 text-[#C08081]/60 hover:text-[#C08081] transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#FFFFF0]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-serif text-[#1B4D3E]">
                                  Delete Product
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-[#DACBA0]/50">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
                                  className="bg-[#C08081] text-white hover:bg-[#C08081]/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
