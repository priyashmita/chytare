import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API } from "@/App";
import { ChevronLeft, ChevronRight, X, Send, CheckCircle, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Commerce logic helper ──────────────────────────────────────────────────
const getCommerceState = (product) => {
  if (!product) return { mode: "none" };
  const { pricing_mode, is_purchasable, is_enquiry_only, stock_status, is_hidden, continue_selling_out_of_stock, price } = product;

  if (is_hidden) return { mode: "hidden" };

  const outOfStock = stock_status === "out_of_stock" && !continue_selling_out_of_stock;

  if (pricing_mode === "fixed_price" && price) {
    if (outOfStock) return { mode: "fixed_sold_out" };
    return { mode: "fixed_price" };
  }

  // price_on_request or legacy price_on_request=true
  if (outOfStock) return { mode: "por_sold_out" };
  return { mode: "price_on_request" };
};
// ────────────────────────────────────────────────────────────────────────────

const OCCASION_OPTIONS = [
  "Wedding", "Reception", "Festival", "Puja / Religious Ceremony",
  "Corporate Event", "Travel / Leisure", "Gifting", "Other"
];

const EnquiryForm = ({ product, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country_city: "",
    message: "", occasion: "",
    product_id: product.id,
    product_name: product.name,
    enquiry_type: "product",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/enquiries`, form);
      onSuccess();
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.4 }}
      className="bg-[#FFFFF0] border border-[#DACBA0]/50 p-8 mt-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-1">Private Enquiry</p>
          <h3 className="font-serif text-2xl text-[#1B4D3E]">Request for {product.name}</h3>
          <p className="text-sm text-[#1B4D3E]/60 mt-1">Our concierge will be in touch within 24 hours.</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-[#1B4D3E]/40 hover:text-[#1B4D3E] transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Full Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 bg-white border-[#DACBA0]/50 focus:border-[#1B4D3E]"
              required
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email Address *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 bg-white border-[#DACBA0]/50 focus:border-[#1B4D3E]"
              required
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-2 bg-white border-[#DACBA0]/50 focus:border-[#1B4D3E]"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">City / Country</Label>
            <Input
              value={form.country_city}
              onChange={(e) => setForm({ ...form, country_city: e.target.value })}
              className="mt-2 bg-white border-[#DACBA0]/50 focus:border-[#1B4D3E]"
              placeholder="Mumbai, India"
            />
          </div>
        </div>

        {/* Auto-filled, read-only product info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product</Label>
            <Input value={product.name} readOnly className="mt-2 bg-[#DACBA0]/10 border-[#DACBA0]/30 text-[#1B4D3E]/70 cursor-not-allowed" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Occasion (optional)</Label>
            <select
              value={form.occasion}
              onChange={(e) => setForm({ ...form, occasion: e.target.value })}
              className="mt-2 w-full h-10 px-3 border border-[#DACBA0]/50 bg-white text-sm text-[#1B4D3E] focus:outline-none focus:border-[#1B4D3E]"
            >
              <option value="">Select occasion...</option>
              {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Message / Requirement *</Label>
          <Textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="mt-2 min-h-[120px] bg-white border-[#DACBA0]/50 focus:border-[#1B4D3E]"
            placeholder="Tell us about your requirements, preferred colours, occasion details, or any questions you have..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Sending..." : "Send Enquiry"}
        </button>
      </form>
    </motion.div>
  );
};

const EnquirySuccess = ({ product, onReset }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-[#FFFFF0] border border-[#DACBA0]/50 p-8 mt-6 text-center"
  >
    <CheckCircle className="w-10 h-10 text-[#1B4D3E] mx-auto mb-4" />
    <h3 className="font-serif text-2xl text-[#1B4D3E] mb-2">Enquiry Received</h3>
    <p className="text-[#1B4D3E]/70 mb-1">
      Thank you for your interest in <em>{product.name}</em>.
    </p>
    <p className="text-[#1B4D3E]/70 mb-6">
      Our concierge team will reach out to you within 24 hours.
    </p>
    <button onClick={onReset} className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/50 underline hover:text-[#1B4D3E] transition-colors">
      Submit another enquiry
    </button>
  </motion.div>
);

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const enquiryRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products/slug/${slug}`);
        setProduct(res.data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleEnquireClick = () => {
    setShowEnquiry(true);
    setEnquirySuccess(false);
    setTimeout(() => enquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="container-luxury pt-32 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="animate-pulse aspect-[3/4] bg-[#DACBA0]/20" />
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-[#DACBA0]/20 w-1/3" />
              <div className="h-10 bg-[#DACBA0]/20 w-3/4" />
              <div className="h-4 bg-[#DACBA0]/20 w-full" />
              <div className="h-4 bg-[#DACBA0]/20 w-2/3" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="container-luxury pt-32 pb-16 text-center">
          <h1 className="font-serif text-3xl text-[#1B4D3E] mb-4">Piece Not Found</h1>
          <Link to="/collections/sarees" className="btn-luxury btn-luxury-secondary">View Collection</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const commerce = getCommerceState(product);
  const images = (product.media || []).filter(m => m.type === "image");
  const activeImg = images[activeImage];

  const formatPrice = (price, currency = "INR") => {
    if (currency === "INR") return `₹${price.toLocaleString("en-IN")}`;
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(price);
  };

  const paragraphs = (product.description || "").split(/\n\n+/).filter(Boolean);
  const visibleDetails = (product.details || []).filter(d => d.value);

  return (
    <div className="min-h-screen bg-[#FFFFF0]" data-testid="product-detail-page">
      <Navigation />

      <div className="container-luxury pt-24 md:pt-32 pb-24">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/40 mb-10">
          <Link to="/" className="hover:text-[#1B4D3E] transition-colors">Home</Link>
          <span>/</span>
          <Link to={`/collections/${product.collection_type}`} className="hover:text-[#1B4D3E] transition-colors capitalize">{product.collection_type}</Link>
          {product.design_category && (<><span>/</span><span className="text-[#1B4D3E]/60">{product.design_category}</span></>)}
        </nav>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">

          {/* ── Left: Image Gallery ── */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-[3/4] bg-[#F5F0E8] overflow-hidden">
              <AnimatePresence mode="wait">
                {activeImg && (
                  <motion.img
                    key={activeImg.url}
                    src={activeImg.url}
                    alt={activeImg.alt || product.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${activeImg.focal_x ?? 50}% ${activeImg.focal_y ?? 50}%` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>

              {/* Edition badge */}
              {product.edition_size && (
                <div className="absolute top-4 left-4 bg-[#1B4D3E] text-[#FFFFF0] text-xs px-3 py-1.5 uppercase tracking-[0.15em]">
                  Edition of {product.edition_size}
                </div>
              )}

              {/* Stock badge */}
              {product.stock_status === "out_of_stock" && (
                <div className="absolute top-4 right-4 bg-[#C08081] text-white text-xs px-3 py-1.5 uppercase tracking-[0.1em]">
                  Sold
                </div>
              )}
              {product.units_available === 1 && product.stock_status === "in_stock" && (
                <div className="absolute top-4 right-4 bg-[#DACBA0] text-[#1B4D3E] text-xs px-3 py-1.5 uppercase tracking-[0.1em]">
                  Last Piece
                </div>
              )}

              {/* Prev / Next arrows */}
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors">
                    <ChevronLeft className="w-5 h-5 text-[#1B4D3E]" />
                  </button>
                  <button onClick={() => setActiveImage(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors">
                    <ChevronRight className="w-5 h-5 text-[#1B4D3E]" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={img.id || i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-16 aspect-[3/4] overflow-hidden border-2 transition-colors ${activeImage === i ? "border-[#1B4D3E]" : "border-transparent"}`}>
                    <img src={img.url} alt={img.alt || `View ${i + 1}`} className="w-full h-full object-cover" style={{ objectPosition: `${img.focal_x ?? 50}% ${img.focal_y ?? 50}%` }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product Info & Commerce ── */}
          <div>
            {/* Eyebrow */}
            {product.design_category && (
              <p className="text-xs uppercase tracking-[0.25em] text-[#DACBA0] mb-3">{product.design_category}</p>
            )}

            {/* Product name */}
            <h1 className="font-serif text-3xl md:text-4xl text-[#1B4D3E] leading-tight mb-3">{product.name}</h1>

            {/* Narrative intro */}
            {product.narrative_intro && (
              <p className="text-[#1B4D3E]/70 italic mb-6 text-base leading-relaxed">{product.narrative_intro}</p>
            )}

            {/* ── COMMERCE BLOCK ── */}
            <div className="border-t border-b border-[#DACBA0]/30 py-6 mb-8 space-y-4">

              {/* FIXED PRICE — normal purchase flow */}
              {commerce.mode === "fixed_price" && (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-3xl text-[#1B4D3E]">{formatPrice(product.price, product.currency)}</span>
                    {product.units_available === 1 && <span className="text-xs uppercase tracking-wider text-[#C08081]">Last Piece</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Qty</Label>
                    <div className="flex items-center border border-[#DACBA0]/50">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors">−</button>
                      <span className="px-4 py-2 text-sm text-[#1B4D3E] min-w-[3rem] text-center">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(q => q + 1)} className="px-3 py-2 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors">+</button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="flex-1 py-3 px-6 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 transition-colors">
                      Add to Cart
                    </button>
                    <button className="flex-1 py-3 px-6 border border-[#1B4D3E] text-[#1B4D3E] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors">
                      Buy Now
                    </button>
                  </div>
                </>
              )}

              {/* FIXED PRICE SOLD OUT */}
              {commerce.mode === "fixed_sold_out" && (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-3xl text-[#1B4D3E]/40 line-through">{formatPrice(product.price, product.currency)}</span>
                    <span className="text-xs uppercase tracking-wider text-[#C08081]">Sold Out</span>
                  </div>
                  <div className="py-3 px-6 border border-[#DACBA0]/40 text-center text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/40">
                    This Edition is Complete
                  </div>
                  <p className="text-xs text-[#1B4D3E]/50 text-center">
                    Enquire below if you'd like to be notified of future editions.
                  </p>
                  <button onClick={handleEnquireClick} className="w-full py-3 border border-[#1B4D3E]/30 text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/60 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">
                    Register Interest
                  </button>
                </>
              )}

              {/* PRICE ON REQUEST — enquiry only */}
              {commerce.mode === "price_on_request" && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-1">Available by Private Enquiry</p>
                    <p className="font-serif text-2xl text-[#1B4D3E]">Price on Request</p>
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60 leading-relaxed">
                    This piece is available exclusively through our concierge service. Enquire to receive pricing, availability, and personalised guidance.
                  </p>
                  <button
                    onClick={handleEnquireClick}
                    className="w-full py-3.5 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Enquire for Price
                  </button>
                  <div className="flex items-center gap-2 text-xs text-[#1B4D3E]/40">
                    <Lock className="w-3 h-3" />
                    <span>Private & confidential. Response within 24 hours.</span>
                  </div>
                </>
              )}

              {/* PRICE ON REQUEST SOLD OUT */}
              {commerce.mode === "por_sold_out" && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#C08081] mb-1">Edition Complete</p>
                    <p className="font-serif text-2xl text-[#1B4D3E]/50">Price on Request</p>
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60">This edition has been completed. Register your interest to be considered for future runs.</p>
                  <button onClick={handleEnquireClick} className="w-full py-3 border border-[#DACBA0]/50 text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/60 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">
                    Register Interest
                  </button>
                </>
              )}
            </div>

            {/* Quick details strip */}
            {visibleDetails.length > 0 && (
              <div className="space-y-2 mb-8">
                {visibleDetails.map((d, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="text-[#1B4D3E]/50 min-w-[100px] uppercase text-xs tracking-wider">{d.label}</span>
                    <span className="text-[#1B4D3E]">{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Edition note */}
            {product.edition && (
              <div className="flex gap-3 p-4 border-l-2 border-[#DACBA0] bg-[#DACBA0]/10 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1">Edition</p>
                  <p className="text-sm text-[#1B4D3E]/80 leading-relaxed">{product.edition}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Enquiry Form (inline, scrolls into view) ── */}
        <div ref={enquiryRef}>
          <AnimatePresence>
            {showEnquiry && !enquirySuccess && (
              <EnquiryForm
                product={product}
                onClose={() => setShowEnquiry(false)}
                onSuccess={() => { setEnquirySuccess(true); }}
              />
            )}
            {enquirySuccess && (
              <EnquirySuccess
                product={product}
                onReset={() => { setEnquirySuccess(false); setShowEnquiry(true); }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Description ── */}
        {paragraphs.length > 0 && (
          <section className="mt-20 max-w-2xl">
            <h2 className="font-serif text-2xl text-[#1B4D3E] mb-6">About This Piece</h2>
            <div className="space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[#1B4D3E]/80 leading-relaxed text-base">{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* ── Attributes (The Story) ── */}
        {product.attributes?.length > 0 && (
          <section className="mt-16 border-t border-[#DACBA0]/30 pt-12">
            <h2 className="font-serif text-2xl text-[#1B4D3E] mb-8">The Story</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {product.attributes.map((attr, i) => (
                <div key={i}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-2">{attr.key}</p>
                  <p className="text-[#1B4D3E]/80 leading-relaxed text-sm">{attr.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Care, Delivery, Craft ── */}
        {(product.care_instructions || product.delivery_info || product.craft_fabric || product.craft_technique) && (
          <section className="mt-16 border-t border-[#DACBA0]/30 pt-12">
            <h2 className="font-serif text-2xl text-[#1B4D3E] mb-8">Care & Craft</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {product.craft_fabric && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-2">Fabric</p>
                  <p className="text-sm text-[#1B4D3E]/80">{product.craft_fabric}</p>
                </div>
              )}
              {product.craft_technique && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-2">Technique</p>
                  <p className="text-sm text-[#1B4D3E]/80">{product.craft_technique}</p>
                </div>
              )}
              {product.care_instructions && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-2">Care</p>
                  <p className="text-sm text-[#1B4D3E]/80 leading-relaxed">{product.care_instructions}</p>
                </div>
              )}
              {product.delivery_info && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-2">Delivery</p>
                  <p className="text-sm text-[#1B4D3E]/80 leading-relaxed">{product.delivery_info}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Disclaimer ── */}
        {product.disclaimer && (
          <section className="mt-12 border-t border-[#DACBA0]/20 pt-8">
            <p className="text-xs text-[#1B4D3E]/50 italic leading-relaxed max-w-2xl">{product.disclaimer}</p>
          </section>
        )}

      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
