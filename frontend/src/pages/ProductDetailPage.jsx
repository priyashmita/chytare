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

const SERIF = "'Playfair Display', serif";
const SANS = "'Manrope', sans-serif";

const remapDetail = (d) => {
  if (d.label === "Technique") return { ...d, label: "Craft" };
  if (d.label === "Made in India" && d.value === "Yes") return { label: "Origin", value: "India" };
  return d;
};

const DETAIL_ORDER = ["Colour", "Fabric", "Craft", "Motif", "Finish", "Saree Length", "Origin", "Release", "Production"];

const sortDetails = (details) => {
  const remapped = details.map(remapDetail).filter(d => d.value);
  return [
    ...DETAIL_ORDER.map(label => remapped.find(d => d.label === label)).filter(Boolean),
    ...remapped.filter(d => !DETAIL_ORDER.includes(d.label)),
  ];
};

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

const OCCASION_OPTIONS = ["Wedding", "Reception", "Festival", "Puja / Religious Ceremony", "Corporate Event", "Travel / Leisure", "Gifting", "Other"];

const EnquiryForm = ({ product, onClose, onSuccess, context = "enquiry" }) => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", country_city: "",
    message: context === "purchase" ? `I would like to purchase ${product.name}. Please share payment and delivery details.` : "",
    occasion: "", product_id: product.id, product_name: product.name,
    enquiry_type: context === "purchase" ? "purchase" : "product",
  });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try { await axios.post(`${API}/enquiries`, form); onSuccess(); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.4 }} style={{ background: "#FFFFF0", border: "1px solid rgba(218,203,160,0.5)", padding: "32px", marginTop: "24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "6px" }}>{context === "purchase" ? "Order Confirmation" : "Private Enquiry"}</p>
          <h3 style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: "#1B4D3E" }}>{context === "purchase" ? "Complete Your Order" : "Enquire About This Piece"}</h3>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.6)", marginTop: "4px", lineHeight: 1.6 }}>{context === "purchase" ? "We'll confirm your order and payment details within 24 hours." : "Our concierge will be in touch within 24 hours."}</p>
        </div>
        {onClose && <button onClick={onClose} style={{ padding: "8px", color: "rgba(27,77,62,0.4)", background: "none", border: "none", cursor: "pointer" }}><X style={{ width: "20px", height: "20px" }} /></button>}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" required /></div>
          <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Email Address *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" required /></div>
          <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Phone Number</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" placeholder="+91 98765 43210" /></div>
          <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>City / Country</Label><Input value={form.country_city} onChange={(e) => setForm({ ...form, country_city: e.target.value })} className="mt-2 bg-white border-[#DACBA0]/50" placeholder="Mumbai, India" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Product</Label><Input value={product.name} readOnly className="mt-2 bg-[#DACBA0]/10 border-[#DACBA0]/30 cursor-not-allowed" /></div>
          <div>
            <Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Occasion (optional)</Label>
            <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} style={{ fontFamily: SANS, fontSize: "14px", marginTop: "8px", width: "100%", height: "40px", padding: "0 12px", border: "1px solid rgba(218,203,160,0.5)", background: "white", color: "#1B4D3E" }}>
              <option value="">Select occasion...</option>
              {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div><Label style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="mt-2 min-h-[100px] bg-white border-[#DACBA0]/50" required /></div>
        <button type="submit" disabled={submitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 32px", background: "#1B4D3E", color: "#FFFFF0", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer", opacity: submitting ? 0.5 : 1 }}>
          <Send style={{ width: "16px", height: "16px" }} />
          {submitting ? "Sending..." : context === "purchase" ? "Confirm Order Request" : "Send Enquiry"}
        </button>
      </form>
    </motion.div>
  );
};

const EnquirySuccess = ({ product, context, onReset }) => (
  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ background: "#FFFFF0", border: "1px solid rgba(218,203,160,0.5)", padding: "32px", marginTop: "24px", textAlign: "center" }}>
    <CheckCircle style={{ width: "40px", height: "40px", color: "#1B4D3E", margin: "0 auto 16px" }} />
    <h3 style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: "#1B4D3E", marginBottom: "8px" }}>{context === "purchase" ? "Order Request Received" : "Enquiry Received"}</h3>
    <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.7)", marginBottom: "4px" }}>Thank you for your interest in <em>{product.name}</em>.</p>
    <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.7)", marginBottom: "24px" }}>Our concierge team will reach out within 24 hours.</p>
    <button onClick={onReset} style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Submit another enquiry</button>
  </motion.div>
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
    const fetchProduct = async () => {
      setLoading(true);
      try { const res = await axios.get(`${API}/products/slug/${slug}`); setProduct(res.data); }
      catch { setProduct(null); }
      finally { setLoading(false); }
    };
    fetchProduct();
  }, [slug]);

  const openEnquiry = (ctx) => {
    setEnquiryContext(ctx); setShowEnquiry(true); setEnquirySuccess(false);
    setTimeout(() => enquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFFFF0" }}>
      <Navigation />
      <div className="container-luxury pt-32 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="animate-pulse aspect-[3/4] bg-[#DACBA0]/20" />
          <div className="space-y-4 animate-pulse pt-8"><div className="h-4 bg-[#DACBA0]/20 w-1/4" /><div className="h-8 bg-[#DACBA0]/20 w-3/4" /></div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: "100vh", background: "#FFFFF0" }}>
      <Navigation />
      <div className="container-luxury pt-32 pb-16" style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: "30px", fontWeight: 400, color: "#1B4D3E", marginBottom: "16px" }}>Piece Not Found</h1>
        <Link to="/collections/sarees" className="btn-luxury btn-luxury-secondary">View Collection</Link>
      </div>
      <Footer />
    </div>
  );

  const commerce = getCommerceState(product);
  const deliveryNotice = getDeliveryNotice(product, quantity);
  const images = (product.media || []).filter(m => m.type === "image");
  const activeImg = images[activeImage];
  const sortedDetails = sortDetails(product.details || []);
  const paragraphs = (product.description || "").split(/\n\n+/).filter(Boolean);
  const editorialImg = images.find(m => m.image_type === "close_up" || m.image_type === "embroidery_detail") || images.find(m => m.image_type === "model");
  const formatPrice = (price, currency = "INR") => currency === "INR" ? `₹${price.toLocaleString("en-IN")}` : new Intl.NumberFormat("en", { style: "currency", currency }).format(price);

  // Edition gate — admin toggle. Backend also strips edition fields when false
  // (server.py strip_internal_fields), but we gate here as a second layer.
  const showEdition = product.display_edition === true;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFF0" }} data-testid="product-detail-page">
      <Navigation />
      <div className="container-luxury pt-24 md:pt-32 pb-24">

        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.05em", color: "rgba(27,77,62,0.5)" }}>
          <Link to="/" style={{ fontFamily: SANS, color: "inherit" }}>Home</Link>
          <span>/</span>
          <Link to={`/collections/${product.collection_type}`} style={{ fontFamily: SANS, color: "inherit", textTransform: "capitalize" }}>{product.collection_type}</Link>
          {product.design_category && <><span>/</span><span>{product.design_category}</span></>}
        </nav>

        {/* ═══════════ HERO ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-start">

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ position: "relative", aspectRatio: "3/4", background: "#F5F0E8", overflow: "hidden" }}>
              <AnimatePresence mode="wait">
                {activeImg && (
                  <motion.img key={activeImg.url} src={activeImg.url} alt={activeImg.alt || product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${activeImg.focal_x ?? 50}% ${activeImg.focal_y ?? 30}%` }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
              {showEdition && product.edition_size && <div style={{ position: "absolute", top: 16, left: 16, background: "#1B4D3E", color: "#FFFFF0", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 12px" }}>Edition of {product.edition_size}</div>}
              {product.stock_status === "out_of_stock" && !product.continue_selling_out_of_stock && <div style={{ position: "absolute", top: 16, right: 16, background: "#C08081", color: "white", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px" }}>Sold</div>}
              {product.units_available === 1 && product.stock_status === "in_stock" && <div style={{ position: "absolute", top: 16, right: 16, background: "#DACBA0", color: "#1B4D3E", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px" }}>Last Piece</div>}
              {product.continue_selling_out_of_stock && product.stock_status === "out_of_stock" && <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(27,77,62,0.8)", color: "#FFFFF0", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px" }}>Made to Order</div>}
              {images.length > 1 && <>
                <button onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}><ChevronLeft style={{ width: 20, height: 20, color: "#1B4D3E" }} /></button>
                <button onClick={() => setActiveImage(i => (i + 1) % images.length)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}><ChevronRight style={{ width: 20, height: 20, color: "#1B4D3E" }} /></button>
              </>}
            </div>
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                {images.map((img, i) => (
                  <button key={img.id || i} onClick={() => setActiveImage(i)} style={{ flexShrink: 0, width: 56, aspectRatio: "3/4", overflow: "hidden", border: `2px solid ${activeImage === i ? "#1B4D3E" : "transparent"}`, background: "none", cursor: "pointer", padding: 0, opacity: activeImage === i ? 1 : 0.6 }}>
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${img.focal_x ?? 50}% ${img.focal_y ?? 30}%` }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* Title */}
            <div style={{ marginBottom: "20px" }}>
              {product.design_category && <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#DACBA0", marginBottom: "8px" }}>{product.design_category}</p>}
              <h1 style={{ fontFamily: SERIF, fontSize: "38px", fontWeight: 400, color: "#1B4D3E", lineHeight: 1.2, marginBottom: "10px" }}>{product.name}</h1>
              {product.narrative_intro && <p style={{ fontFamily: SANS, fontSize: "14px", fontStyle: "italic", color: "rgba(27,77,62,0.6)", lineHeight: 1.7 }}>{product.narrative_intro}</p>}
            </div>

            {/* Commerce */}
            <div style={{ borderTop: "1px solid rgba(218,203,160,0.3)", paddingTop: "20px" }}>

              {commerce.mode === "fixed_price" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{formatPrice(product.price, product.currency)}</span>
                    {product.units_available === 1 && <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#C08081" }}>Last Piece</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Qty</span>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(218,203,160,0.5)" }}>
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ padding: "6px 12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", background: "none", border: "none", cursor: "pointer" }}>−</button>
                      <span style={{ padding: "6px 16px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", minWidth: "40px", textAlign: "center" }}>{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)} style={{ padding: "6px 12px", fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", background: "none", border: "none", cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: deliveryNotice.type !== "normal" ? "10px" : "0", background: deliveryNotice.type !== "normal" ? "rgba(218,203,160,0.1)" : "transparent" }}>
                    {deliveryNotice.type === "mto" ? <Clock style={{ width: 14, height: 14, color: "rgba(27,77,62,0.6)", flexShrink: 0, marginTop: 2 }} /> : <Truck style={{ width: 14, height: 14, color: "rgba(27,77,62,0.4)", flexShrink: 0, marginTop: 2 }} />}
                    <span style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.6)" }}>{deliveryNotice.message}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button onClick={() => openEnquiry("purchase")} style={{ padding: "12px 20px", background: "#1B4D3E", color: "#FFFFF0", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>Add to Cart</button>
                    <button onClick={() => openEnquiry("purchase")} style={{ padding: "12px 20px", background: "transparent", color: "#1B4D3E", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid #1B4D3E", cursor: "pointer" }}>Buy Now</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Lock style={{ width: 12, height: 12, color: "rgba(27,77,62,0.3)" }} />
                    <span style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.3)" }}>Your details are private. Our team will confirm and process your order.</span>
                  </div>
                </div>
              )}

              {commerce.mode === "fixed_sold_out" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "rgba(27,77,62,0.4)", textDecoration: "line-through" }}>{formatPrice(product.price, product.currency)}</span>
                    <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#C08081" }}>Sold Out</span>
                  </div>
                  <div style={{ padding: "12px 20px", border: "1px solid rgba(218,203,160,0.4)", textAlign: "center", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)" }}>This Edition is Complete</div>
                  <button onClick={() => openEnquiry("enquiry")} style={{ padding: "12px 20px", background: "transparent", color: "rgba(27,77,62,0.6)", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(27,77,62,0.3)", cursor: "pointer" }}>Register Interest</button>
                </div>
              )}

              {commerce.mode === "price_on_request" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "6px" }}>Available by Private Enquiry</p>
                    <p style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: "#1B4D3E" }}>Pricing available through our concierge.</p>
                  </div>
                  <p style={{ fontFamily: SANS, fontSize: "14px", lineHeight: 1.7, color: "rgba(27,77,62,0.6)" }}>This piece is offered through our concierge service. Enquire to receive pricing and availability.</p>
                  <button onClick={() => openEnquiry("enquiry")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 20px", background: "#1B4D3E", color: "#FFFFF0", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "none", cursor: "pointer", width: "100%" }}>
                    <Send style={{ width: 14, height: 14 }} /> Enquire with Concierge
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Lock style={{ width: 12, height: 12, color: "rgba(27,77,62,0.3)" }} />
                    <span style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.3)" }}>Private and confidential service. Response within 24 working hours.</span>
                  </div>
                </div>
              )}

              {commerce.mode === "por_sold_out" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#C08081" }}>Edition Complete</p>
                  <p style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: "rgba(27,77,62,0.5)" }}>Pricing available through our concierge.</p>
                  <button onClick={() => openEnquiry("enquiry")} style={{ padding: "12px 20px", background: "transparent", color: "rgba(27,77,62,0.6)", fontFamily: SANS, fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", border: "1px solid rgba(218,203,160,0.5)", cursor: "pointer" }}>Register Interest</button>
                </div>
              )}
            </div>

            {/* Specifications */}
            {sortedDetails.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(218,203,160,0.2)", marginTop: "24px", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedDetails.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px" }}>
                    <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "80px", paddingTop: "2px", flexShrink: 0 }}>{d.label}</span>
                    <span style={{ fontFamily: SANS, fontSize: "14px", letterSpacing: "0.01em", lineHeight: 1.5, color: "#1B4D3E" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Edition note — only shown when admin has enabled edition display */}
            {showEdition && product.edition && (
              <div style={{ borderTop: "1px solid rgba(218,203,160,0.2)", marginTop: "20px", paddingTop: "20px" }}>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", marginBottom: "8px" }}>Edition</p>
                <p style={{ fontFamily: SANS, fontSize: "14px", lineHeight: 1.7, color: "rgba(27,77,62,0.7)" }}>{product.edition}</p>
              </div>
            )}
          </div>
        </div>

        {/* Enquiry form */}
        <div ref={enquiryRef}>
          <AnimatePresence>
            {showEnquiry && !enquirySuccess && <EnquiryForm product={product} context={enquiryContext} onClose={() => setShowEnquiry(false)} onSuccess={() => setEnquirySuccess(true)} />}
            {enquirySuccess && <EnquirySuccess product={product} context={enquiryContext} onReset={() => { setEnquirySuccess(false); setShowEnquiry(true); }} />}
          </AnimatePresence>
        </div>

        {/* ═══════════ ABOUT THIS PIECE ═══════════ */}
        {paragraphs.length > 0 && (
          <section style={{ paddingTop: "50px", paddingBottom: "20px" }}>
            <div style={{ maxWidth: "950px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: "#1B4D3E", letterSpacing: "0.02em", lineHeight: 1.3, marginBottom: "20px" }}>About This Piece</h2>
              {paragraphs.slice(0, 2).map((p, i) => (
                <p key={i} style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, letterSpacing: "0.01em", color: "rgba(27,77,62,0.8)", marginBottom: "18px" }}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* ═══════════ EDITORIAL IMAGE ═══════════ */}
        {editorialImg && (
          <div style={{ marginTop: "60px", marginBottom: "60px" }}>
            <img src={editorialImg.url} alt={editorialImg.alt || product.name} style={{ width: "100%", maxHeight: "700px", objectFit: "cover", objectPosition: `${editorialImg.focal_x ?? 50}% ${editorialImg.focal_y ?? 30}%`, display: "block" }} />
          </div>
        )}

        {/* ═══════════ THE STORY ═══════════ */}
        {product.attributes?.length > 0 && (
          <section style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "60px", paddingBottom: "60px" }}>
            <div style={{ maxWidth: "950px" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: "#1B4D3E", letterSpacing: "0.02em", lineHeight: 1.3, marginBottom: "32px" }}>The Story</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {product.attributes.map((attr, i) => (
                  <div key={i}>
                    <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "10px" }}>{attr.key}</p>
                    <p style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, letterSpacing: "0.01em", color: "rgba(27,77,62,0.8)" }}>{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════════ CARE & CRAFT ═══════════ */}
        {(product.care_instructions || product.delivery_info || product.craft_fabric || product.craft_technique) && (
          <section style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "60px", paddingBottom: "60px" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: "#1B4D3E", letterSpacing: "0.02em", lineHeight: 1.3, marginBottom: "28px" }}>Care & Craft</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "32px 48px" }}>
              {product.craft_fabric && <div>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "8px" }}>Fabric</p>
                <p style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, color: "rgba(27,77,62,0.8)" }}>{product.craft_fabric}</p>
              </div>}
              {product.craft_technique && <div>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "8px" }}>Craft</p>
                <p style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, color: "rgba(27,77,62,0.8)" }}>{product.craft_technique}</p>
              </div>}
              {product.care_instructions && <div>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "8px" }}>Care</p>
                <p style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, color: "rgba(27,77,62,0.8)" }}>{product.care_instructions}</p>
              </div>}
              {product.delivery_info && <div>
                <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#DACBA0", fontWeight: 500, marginBottom: "8px" }}>Delivery</p>
                <p style={{ fontFamily: SANS, fontSize: "15px", lineHeight: 1.75, color: "rgba(27,77,62,0.8)" }}>{product.delivery_info}</p>
              </div>}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        {product.disclaimer && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "28px", paddingBottom: "40px" }}>
            <p style={{ fontFamily: SANS, fontSize: "13px", fontStyle: "italic", color: "rgba(27,77,62,0.4)", maxWidth: "950px", lineHeight: 1.75 }}>{product.disclaimer}</p>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
