import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { API } from "@/App";
import { X, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CollectionListingPage = () => {
  const { type } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ materials: [], works: [], design_categories: [] });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [collectionMeta, setCollectionMeta] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [type]);

  const knownCollectionTypes = ["sarees", "scarves", "ready-to-wear", "blouses"];
  const isDesignCategory = !knownCollectionTypes.includes(type);

  const activeMaterial = searchParams.get("material");
  const activeWork = searchParams.get("work");
  const activeCategory = isDesignCategory ? type : searchParams.get("design_category");

  const collectionTitle = isDesignCategory
    ? (collectionMeta?.name || type?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "))
    : type === "sarees" ? "Sarees" : type === "scarves" ? "Scarves" : type?.charAt(0).toUpperCase() + type?.slice(1);

  useEffect(() => {
    if (isDesignCategory) {
      axios.get(`${API}/categories?type=design_category`)
        .then(res => {
          const match = res.data.find(c => c.slug === type);
          if (match) setCollectionMeta(match);
        })
        .catch(() => {});
    }
    fetchFilters();
    fetchProducts();
  }, [type, activeMaterial, activeWork, activeCategory]);

  const fetchFilters = async () => {
    try {
      const filterType = isDesignCategory ? "sarees" : type;
      const res = await axios.get(`${API}/categories/filters/${filterType}`);
      setFilters(res.data);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isDesignCategory) {
        params.append("collection_type", "sarees");
        params.append("design_category", type);
      } else {
        params.append("collection_type", type);
        if (activeCategory) params.append("design_category", activeCategory);
      }
      if (activeMaterial) params.append("material", activeMaterial);
      if (activeWork) params.append("work", activeWork);

      const res = await axios.get(`${API}/products?${params.toString()}`);
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = activeMaterial || activeWork || (!isDesignCategory && activeCategory);
  const hasFilters = filters.materials.length > 0 || filters.works.length > 0 || (!isDesignCategory && filters.design_categories.length > 0);

  return (
    <div data-testid="collection-listing-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* Header */}
      <section className="pt-24 pb-6 md:pt-32 md:pb-10">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#DACBA0] mb-4">
              Collection
            </p>
            <h1 className="font-serif text-4xl md:text-6xl text-[#1B4D3E]">
              {collectionTitle}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      {hasFilters && (
        <section className="border-y border-[#DACBA0]/30">
          <div className="container-luxury py-6">
            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-6 flex-wrap">
              {filters.materials.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60">
                    Material
                  </span>
                  <Select
                    value={activeMaterial || "all"}
                    onValueChange={(value) => updateFilter("material", value)}
                  >
                    <SelectTrigger data-testid="filter-material" className="w-[160px] border-[#DACBA0]/50">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {filters.materials.map((m) => (
                        <SelectItem key={m.id || m.slug} value={m.slug || m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filters.works.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60">
                    Technique
                  </span>
                  <Select
                    value={activeWork || "all"}
                    onValueChange={(value) => updateFilter("work", value)}
                  >
                    <SelectTrigger data-testid="filter-work" className="w-[160px] border-[#DACBA0]/50">
                      <SelectValue placeholder="All Techniques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Techniques</SelectItem>
                      {filters.works.map((w) => (
                        <SelectItem key={w.id || w.slug} value={w.slug || w.name}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isDesignCategory && filters.design_categories.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60">
                    Design
                  </span>
                  <Select
                    value={activeCategory || "all"}
                    onValueChange={(value) => updateFilter("design_category", value)}
                  >
                    <SelectTrigger data-testid="filter-category" className="w-[180px] border-[#DACBA0]/50">
                      <SelectValue placeholder="All Designs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designs</SelectItem>
                      {filters.design_categories.map((c) => (
                        <SelectItem key={c.id || c.slug} value={c.slug || c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  data-testid="clear-filters"
                  className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#C08081] hover:text-[#1B4D3E] transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle */}
            <div className="md:hidden flex items-center justify-between">
              <span className="text-sm text-[#1B4D3E]/60">
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                data-testid="toggle-filters"
                className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-[#DACBA0] rounded-full text-[10px] flex items-center justify-center">
                    {[activeMaterial, activeWork, activeCategory].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Filters Expanded */}
            {showFilters && (
              <div className="md:hidden mt-6 space-y-4 pt-6 border-t border-[#DACBA0]/30">
                {filters.materials.length > 0 && (
                  <Select
                    value={activeMaterial || "all"}
                    onValueChange={(value) => updateFilter("material", value)}
                  >
                    <SelectTrigger className="w-full border-[#DACBA0]/50">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {filters.materials.map((m) => (
                        <SelectItem key={m.id || m.slug} value={m.slug || m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filters.works.length > 0 && (
                  <Select
                    value={activeWork || "all"}
                    onValueChange={(value) => updateFilter("work", value)}
                  >
                    <SelectTrigger className="w-full border-[#DACBA0]/50">
                      <SelectValue placeholder="All Techniques" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Techniques</SelectItem>
                      {filters.works.map((w) => (
                        <SelectItem key={w.id || w.slug} value={w.slug || w.name}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {!isDesignCategory && filters.design_categories.length > 0 && (
                  <Select
                    value={activeCategory || "all"}
                    onValueChange={(value) => updateFilter("design_category", value)}
                  >
                    <SelectTrigger className="w-full border-[#DACBA0]/50">
                      <SelectValue placeholder="All Designs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designs</SelectItem>
                      {filters.design_categories.map((c) => (
                        <SelectItem key={c.id || c.slug} value={c.slug || c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-3 text-xs uppercase tracking-[0.15em] text-[#C08081] border border-[#C08081]/50"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="py-16 md:py-24">
        <div className="container-luxury">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-[#DACBA0]/20 mb-4" />
                  <div className="h-4 bg-[#DACBA0]/20 w-3/4 mb-2" />
                  <div className="h-3 bg-[#DACBA0]/20 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="font-serif text-2xl text-[#1B4D3E] mb-4">
                No pieces found
              </h3>
              <p className="text-[#1B4D3E]/60 mb-8">
                {hasActiveFilters
                  ? "Try adjusting your filters to discover more pieces."
                  : "New pieces are being added to this collection soon."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-luxury btn-luxury-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CollectionListingPage;
