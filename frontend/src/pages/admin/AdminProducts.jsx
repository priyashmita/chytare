import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Plus, Edit, Trash2, Eye, EyeOff, Star } from "lucide-react";
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products?include_hidden=true`);
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
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
          <Link
            to="/admin/products/new"
            data-testid="add-product-btn"
            className="btn-luxury btn-luxury-primary flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 border-b border-[#DACBA0]/30 pb-4">
          {["all", "sarees", "scarves"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs uppercase tracking-wider transition-colors ${
                filter === f ? "text-[#1B4D3E]" : "text-[#1B4D3E]/50 hover:text-[#DACBA0]"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
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
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Collection</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Price</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Status</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Featured</th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DACBA0]/20">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#FFFFF0]">
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
