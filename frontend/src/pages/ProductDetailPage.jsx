import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API } from "@/App";
import { ChevronLeft, ChevronRight, X, Send, CheckCircle, Lock, Truck, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Label remapping ──────────────────────────────────────────────────────────
const remapDetail = (d) => {
  if (d.label === "Technique") return { ...d, label: "Craft" };
  if (d.label === "Made in India" && d.value === "Yes") return { label: "Origin", value: "India" };
  return d;
};

const DETAIL_ORDER = ["Colour", "Fabric", "Craft", "Technique", "Motif", "Finish", "Saree Length", "Origin", "Release", "Production"];

const sortDetails = (details) => {
  const remapped = details.map(remapDetail).filter(d => d.value);
  return [
    ...DETAIL_ORDER.map(label => remapped.find(d => d.label === label)).filter(Boolean),
    ...remapped.filter(d => !DETAIL_ORDER.includes(d.label)),
  ];
};

// ─── Commerce logic ───────────────────────────────────────────────────────────
const getCommerceState = (product) => {
  if (!product) return { mode: "none" };
  const { pricing_mode, stock_status, is_hidden, continue_selling_out_of_stock, price } = product;
  if (is_hidden) return { mode: "hidden" };
  const outOfStock = stock_status === "out_of_stock" && !continue_selling_out_of_stock;
  if (pricing_mode === "fixed_price" && price) {
    if (outOfStock) return { mode: "fixed_sold_out" };
    return { mode: "fixed_price" };
  }
  if (outOfStock) return { mode: "por_sold_out" };
  return { mode: "price_on_request" };
};

const getDeliveryNotice = (product, quantity) => {
  const { stock_status, stock_quantity, continue_selling_out_of_stock, made_to_order_days } = product;
  const SHIP = 7;
  const mto = made_to_order_days || 30;
  if (stock_status === "in_stock" && !continue_selling_out_of_stock)
    return { type: "normal", message: `Dispatched within ${SHIP} working days.` };
  if (stock_status === "out_of_stock" && continue_selling_out_of_stock)
    return { type: "mto", message: `Made to order. Dispatched within ${mto + SHIP} days.` };
  if (stock_status === "in_stock" && continue_selling_out_of_stock && quantity > stock_quantity) {
    const parts = [];
    if (stock_quantity > 0) parts.push(`${stock_quantity} piece${stock_quantity > 1 ? "s" : ""} dispatched within ${SHIP} days`);
    const mtoQty = quantity - stock_quantity;
    if (mtoQty > 0) parts.push(`${mtoQty} additional piece${mtoQty > 1 ? "s" : ""} made to order, dispatched within ${mto + SHIP} days`);
    return { type: "mixed", message: parts.join(" · ") + "." };
  }
  return { type: "normal", message: `Dispatched within ${SHIP} working days.` };
};

const OCCASION_OPTIONS = [
  "Wedding", "Reception", "Festival", "Puja / Religious Ceremony",
  "Corporate Event", "Travel / Leisure", "Gifting", "Other"
];

const EnquiryForm = ({ product, onClose, onSuccess, context = "enquiry" }) => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country_city: "",
    message: context === "purchase"
      ? `I would like to purchase ${product.name}. Please share payment and delivery details.`
      : "",
    occasion: "",
    product_id: product.id,
    product_name: product.name,
    enquiry_type: context === "purchase" ? "purchase" : "product",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/enquiries`, form);
      onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.4 }} className="bg-[#FFFFF0] border border-[#DACBA0]/50 p-8 mt-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-1">{context === "purchase" ? "Order Confirmation" : "Private Enquiry"}</p>
          <h3 className="font-serif text-xl text-[#1B4D3E]">{context === "purchase" ? "Complete Your Order" : "Enquire About This Piece"}</h3>
          <p className="text-sm text-[#1B4D3E]/60 mt-1">{context === "purchase" ? "Share your details and we'll confirm your order within 24 hours." : "Our concierge will be in touch within 24 hours."}</p>
        </div>
        {onClose && <button onClick={onClose} className="p-2 text-[#1B4D3E]/40 hover:text-[#1B4D3E] transition-colors"><X className="w-5 h-5" /></button>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" required /></div>
          <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email Address *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" required /></div>
          <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone Number</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" placeholder="+91 98765 43210" /></div>
          <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">City / Country</Label><Input value={form.country_city} onChange={(e) => setForm({ ...form, country_city: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" placeholder="Mumbai, India" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Product</Label><Input value={product.name} readOnly className="mt-2 bg-[#DACBA0]/10 border-[#DACBA0]/30 text-[#1B4D3E]/70 cursor-not-allowed" /></div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Occasion (optional)</Label>
            <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} className="mt-2 w-full h-10 px-3 border border-[#DACBA0]/50 bg-white text-sm text-[#1B4D3E] focus:outline-none focus:border-[#1B4D3E]">
              <option value="">Select occasion...</option>
              {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div><Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-2 min-h-[100px] bg-white border-[#DACBA0]/50" required /></div>
        <button type="submit" disabled={submitting} className="flex items-center gap-2 px-8 py-3 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4" />
          {submitting ? "Sending..." : context === "purchase" ? "Confirm Order Request" : "Send Enquiry"}
        </button>
      </form>
    </motion.div>
  );
};

const EnquirySuccess = ({ product, context, onReset }) => (
  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#FFFFF0] border border-[#DACBA0]/50 p-8 mt-6 text-center">
    <CheckCircle className="w-10 h-10 text-[#1B4D3E] mx-auto mb-4" />
    <h3 className="font-serif text-xl text-[#1B4D3E] mb-2">{context === "purchase" ? "Order Request Received" : "Enquiry Received"}</h3>
    <p className="text-[#1B4D3E]/70 mb-1">Thank you for your interest in <em>{product.name}</em>.</p>
    <p className="text-[#1B4D3E]/70 mb-6">Our concierge will reach out within 24 hours.</p>
    <button onClick={onReset} className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/50 underline hover:text-[#1B4D3E] transition-colors">Submit another enquiry</button>
  </motion.div>
);

const SectionHeading = ({ children }) => (
  <h2 className="font-serif text-[#1B4D3E]" style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "0.06em", marginBottom: "24px" }}>
    {children}
  </h2>
);

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryContext, setEnquiryContext] = useState("enquiry");
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const enquiryRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products/slug/${slug}`);
        setProduct(res.data);
      } catch { setProduct(null); }
      finally { setLoading(false); }
    };
    fetch();
  }, [slug]);

  const openEnquiry = (ctx) => {
    setEnquiryContext(ctx);
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
            <div className="space-y-4 animate-pulse pt-8">
              <div className="h-4 bg-[#DACBA0]/20 w-1/4" />
              <div className="h-8 bg-[#DACBA0]/20 w-3/4" />
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
  const deliveryNotice = getDeliveryNotice(product, quantity);
  const images = (product.media || []).filter(m => m.type === "image");
  const activeImg = images[activeImage];
  const sortedDetails = sortDetails(product.details || []);
  const paragraphs = (product.description || "").split(/\n\n+/).filter(Boolean);
  const editorialImg = images.find(m => m.image_type === "close_up" || m.image_type === "embroidery_detail")
    || images.find(m => m.image_type === "model");

  const formatPrice = (price, currency = "INR") => {
    if (currency === "INR") return `₹${price.toLocaleString("en-IN")}`;
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(price);
  };

  return (
    <div className="min-h-screen bg-[#FFFFF0]" data-testid="product-detail-page">
      <Navigation />

      <div className="container-luxury pt-24 md:pt-32 pb-24">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/40 mb-8">
          <Link to="/" className="hover:text-[#1B4D3E] transition-colors">Home</Link>
          <span>/</span>
          <Link to={`/collections/${product.collection_type}`} className="hover:text-[#1B4D3E] transition-colors capitalize">{product.collection_type}</Link>
          {product.design_category && (<><span>/</span><span className="text-[#1B4D3E]/60">{product.design_category}</span></>)}
        </nav>

        {/* ══════════════════════════════════
            HERO — image left, all info right
        ══════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-start">

          {/* LEFT — images */}
          <div className="space-y-3">
            <div className="relative aspect-[3/4] bg-[#F5F0E8] overflow-hidden">
              <AnimatePresence mode="wait">
                {activeImg && (
                  <motion.img key={activeImg.url} src={activeImg.url} alt={activeImg.alt || product.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${activeImg.focal_x ?? 50}% ${activeImg.focal_y ?? 30}%` }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
              {product.edition_size && <div className="absolute top-4 left-4 bg-[#1B4D3E] text-[#FFFFF0] text-xs px-3 py-1.5 uppercase tracking-[0.15em]">Edition of {product.edition_size}</div>}
              {product.stock_status === "out_of_stock" && !product.continue_selling_out_of_stock && <div className="absolute top-4 right-4 bg-[#C08081] text-white text-xs px-3 py-1.5 uppercase tracking-[0.1em]">Sold</div>}
              {product.units_available === 1 && product.stock_status === "in_stock" && <div className="absolute top-4 right-4 bg-[#DACBA0] text-[#1B4D3E] text-xs px-3 py-1.5 uppercase tracking-[0.1em]">Last Piece</div>}
              {product.continue_selling_out_of_stock && product.stock_status === "out_of_stock" && <div className="absolute top-4 right-4 bg-[#1B4D3E]/80 text-[#FFFFF0] text-xs px-3 py-1.5 uppercase tracking-[0.1em]">Made to Order</div>}
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors"><ChevronLeft className="w-5 h-5 text-[#1B4D3E]" /></button>
                  <button onClick={() => setActiveImage(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 flex items-center justify-center hover:bg-white transition-colors"><ChevronRight className="w-5 h-5 text-[#1B4D3E]" /></button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={img.id || i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-14 aspect-[3/4] overflow-hidden border-2 transition-colors ${activeImage === i ? "border-[#1B4D3E]" : "border-transparent"}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${img.focal_x ?? 50}% ${img.focal_y ?? 30}%` }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — title + commerce + specs + edition stacked tightly */}
          <div className="flex flex-col gap-0">

            {/* Collection label + title + descriptor */}
            <div className="mb-5">
              {product.design_category && <p className="text-xs uppercase tracking-[0.25em] text-[#DACBA0] mb-2">{product.design_category}</p>}
              <h1 className="font-serif text-3xl md:text-[2.25rem] text-[#1B4D3E] leading-tight mb-3">{product.name}</h1>
              {product.narrative_intro && <p className="text-[#1B4D3E]/60 text-sm italic" style={{ lineHeight: 1.7 }}>{product.narrative_intro}</p>}
            </div>

            {/* Commerce */}
            <div className="border-t border-[#DACBA0]/30 pt-5 mb-0 space-y-4">
              {commerce.mode === "fixed_price" && (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-2xl text-[#1B4D3E]">{formatPrice(product.price, product.currency)}</span>
                    {product.units_available === 1 && <span className="text-xs uppercase tracking-wider text-[#C08081]">Last Piece</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/50">Qty</Label>
                    <div className="flex items-center border border-[#DACBA0]/50">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-1.5 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors text-sm">−</button>
                      <span className="px-4 py-1.5 text-sm text-[#1B4D3E] min-w-[2.5rem] text-center">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(q => q + 1)} className="px-3 py-1.5 text-[#1B4D3E] hover:bg-[#DACBA0]/10 transition-colors text-sm">+</button>
                    </div>
                  </div>
                  <div className={`flex items-start gap-2 text-xs p-3 ${deliveryNotice.type === "mixed" ? "bg-[#DACBA0]/20 border border-[#DACBA0]/40" : deliveryNotice.type === "mto" ? "bg-[#1B4D3E]/5 border border-[#1B4D3E]/10" : "text-[#1B4D3E]/50"}`}>
                    {deliveryNotice.type === "mto" ? <Clock className="w-3.5 h-3.5 text-[#1B4D3E]/60 flex-shrink-0 mt-0.5" /> : <Truck className="w-3.5 h-3.5 text-[#1B4D3E]/40 flex-shrink-0 mt-0.5" />}
                    <span className="text-[#1B4D3E]/70">{deliveryNotice.message}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => openEnquiry("purchase")} className="flex-1 py-3 px-5 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 transition-colors">Add to Cart</button>
                    <button onClick={() => openEnquiry("purchase")} className="flex-1 py-3 px-5 border border-[#1B4D3E] text-[#1B4D3E] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors">Buy Now</button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#1B4D3E]/40"><Lock className="w-3 h-3" /><span>Your details are private. Our team will confirm and process your order.</span></div>
                </>
              )}
              {commerce.mode === "fixed_sold_out" && (
                <>
                  <div className="flex items-baseline gap-3"><span className="font-serif text-2xl text-[#1B4D3E]/40 line-through">{formatPrice(product.price, product.currency)}</span><span className="text-xs uppercase tracking-wider text-[#C08081]">Sold Out</span></div>
                  <div className="py-3 px-5 border border-[#DACBA0]/40 text-center text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/40">This Edition is Complete</div>
                  <button onClick={() => openEnquiry("enquiry")} className="w-full py-3 border border-[#1B4D3E]/30 text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/60 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">Register Interest</button>
                </>
              )}
              {commerce.mode === "price_on_request" && (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-1">Available by Private Enquiry</p>
                    <p className="font-serif text-xl text-[#1B4D3E]">Price on Request</p>
                  </div>
                  <p className="text-sm text-[#1B4D3E]/60" style={{ lineHeight: 1.7 }}>This piece is available exclusively through our concierge service.</p>
                  <button onClick={() => openEnquiry("enquiry")} className="w-full py-3 bg-[#1B4D3E] text-[#FFFFF0] text-xs uppercase tracking-[0.2em] hover:bg-[#1B4D3E]/90 transition-colors flex items-center justify-center gap-2"><Send className="w-4 h-4" />Enquire for Price</button>
                  <div className="flex items-center gap-2 text-xs text-[#1B4D3E]/40"><Lock className="w-3 h-3" /><span>Private & confidential. Response within 24 hours.</span></div>
                </>
              )}
              {commerce.mode === "por_sold_out" && (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#C08081]">Edition Complete</p>
                  <p className="font-serif text-xl text-[#1B4D3E]/50">Price on Request</p>
                  <button onClick={() => openEnquiry("enquiry")} className="w-full py-3 border border-[#DACBA0]/50 text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/60 hover:border-[#1B4D3E] hover:text-[#1B4D3E] transition-colors">Register Interest</button>
                </>
              )}
            </div>

            {/* Specifications — 24px below commerce */}
            {sortedDetails.length > 0 && (
              <div className="border-t border-[#DACBA0]/20 mt-6 pt-5 space-y-2.5">
                {sortedDetails.map((d, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-[#1B4D3E]/40 uppercase text-[10px] tracking-widest min-w-[80px] pt-0.5">{d.label}</span>
                    <span className="text-sm text-[#1B4D3E]" style={{ lineHeight: 1.5, letterSpacing: "0.01em" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Edition — below specs */}
            {product.edition && (
              <div className="border-t border-[#DACBA0]/20 mt-5 pt-5">
                <p className="text-[10px] uppercase tracking-widest text-[#1B4D3E]/40 mb-2">Edition</p>
                <p className="text-sm text-[#1B4D3E]/70" style={{ lineHeight: 1.7 }}>{product.edition}</p>
              </div>
            )}

          </div>{/* end right column */}
        </div>{/* end hero grid */}

        {/* Enquiry form */}
        <div ref={enquiryRef}>
          <AnimatePresence>
            {showEnquiry && !enquirySuccess && <EnquiryForm product={product} context={enquiryContext} onClose={() => setShowEnquiry(false)} onSuccess={() => setEnquirySuccess(true)} />}
            {enquirySuccess && <EnquirySuccess product={product} context={enquiryContext} onReset={() => { setEnquirySuccess(false); setShowEnquiry(true); }} />}
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════
            ABOUT THIS PIECE — 50px top
        ══════════════════════════════════ */}
        {paragraphs.length > 0 && (
          <section style={{ paddingTop: "50px" }}>
            <div style={{ maxWidth: "950px", marginLeft: 0, marginRight: "auto" }}>
              <SectionHeading>About This Piece</SectionHeading>
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[#1B4D3E]/80" style={{ lineHeight: 1.75, letterSpacing: "0.01em", fontWeight: 400, marginBottom: "18px" }}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════
            EDITORIAL IMAGE — 60px top & bottom
        ══════════════════════════════════ */}
        {editorialImg && (
          <div style={{ marginTop: "60px", marginBottom: "60px" }}>
            <img src={editorialImg.url} alt={editorialImg.alt || product.name}
              style={{ width: "100%", maxHeight: "700px", objectFit: "cover", objectPosition: `${editorialImg.focal_x ?? 50}% ${editorialImg.focal_y ?? 30}%`, display: "block" }}
            />
          </div>
        )}

        {/* ══════════════════════════════════
            THE STORY — 60px top
        ══════════════════════════════════ */}
        {product.attributes?.length > 0 && (
          <section style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "60px", paddingBottom: "60px" }}>
            <div style={{ maxWidth: "950px", marginLeft: 0, marginRight: "auto" }}>
              <SectionHeading>The Story</SectionHeading>
              <div className="space-y-8">
                {product.attributes.map((attr, i) => (
                  <div key={i}>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-3">{attr.key}</p>
                    <p className="text-[#1B4D3E]/80 text-sm" style={{ lineHeight: 1.75, letterSpacing: "0.01em" }}>{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════
            CARE & CRAFT — 60px top
        ══════════════════════════════════ */}
        {(product.care_instructions || product.delivery_info || product.craft_fabric || product.craft_technique) && (
          <section style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "60px", paddingBottom: "60px" }}>
            <SectionHeading>Care & Craft</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
              {product.craft_fabric && <div><p className="text-[10px] uppercase tracking-widest text-[#DACBA0] mb-2">Fabric</p><p className="text-sm text-[#1B4D3E]/80" style={{ lineHeight: 1.75 }}>{product.craft_fabric}</p></div>}
              {product.craft_technique && <div><p className="text-[10px] uppercase tracking-widest text-[#DACBA0] mb-2">Craft</p><p className="text-sm text-[#1B4D3E]/80" style={{ lineHeight: 1.75 }}>{product.craft_technique}</p></div>}
              {product.care_instructions && <div><p className="text-[10px] uppercase tracking-widest text-[#DACBA0] mb-2">Care</p><p className="text-sm text-[#1B4D3E]/80" style={{ lineHeight: 1.75 }}>{product.care_instructions}</p></div>}
              {product.delivery_info && <div><p className="text-[10px] uppercase tracking-widest text-[#DACBA0] mb-2">Delivery</p><p className="text-sm text-[#1B4D3E]/80" style={{ lineHeight: 1.75 }}>{product.delivery_info}</p></div>}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        {product.disclaimer && (
          <section style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "32px", paddingBottom: "40px" }}>
            <p className="text-xs text-[#1B4D3E]/40 italic" style={{ maxWidth: "650px", lineHeight: 1.75 }}>{product.disclaimer}</p>
          </section>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
