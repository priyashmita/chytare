import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/ProductGallery";
import CollapsibleSection from "@/components/CollapsibleSection";
import { API, useSettings } from "@/App";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle, Mail, Eye } from "lucide-react";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { siteSettings } = useSettings();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enquiryForm, setEnquiryForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/slug/${slug}`);
      setProduct(res.data);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/enquiries`, {
        ...enquiryForm,
        product_id: product.id,
        enquiry_type: "product",
      });
      toast.success("Enquiry submitted. We'll be in touch shortly.");
      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
      setDialogOpen(false);
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappMessage = product
    ? `Hello, I'm interested in ${product.name}. Could you please share more details?`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="pt-32 container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-[#DACBA0]/20 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-[#DACBA0]/20 w-3/4 animate-pulse" />
              <div className="h-4 bg-[#DACBA0]/20 w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="pt-32 pb-24 container-luxury text-center">
          <h1 className="font-serif text-3xl text-[#1B4D3E] mb-4">
            Product Not Found
          </h1>
          <Link to="/collections" className="btn-luxury btn-luxury-primary">
            View Collections
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div data-testid="product-detail-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      <div className="pt-28 md:pt-32 pb-16 md:pb-24">
        <div className="container-luxury">
          {/* Breadcrumb */}
          <nav className="mb-8 text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60">
            <Link to="/" className="hover:text-[#DACBA0] transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to={`/collections/${product.collection_type}`} className="hover:text-[#DACBA0] transition-colors">
              {product.collection_type?.charAt(0).toUpperCase() + product.collection_type?.slice(1)}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#1B4D3E]">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductGallery media={product.media} />
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:sticky lg:top-32 lg:self-start"
            >
              {/* Title & Category */}
              <div className="mb-8">
                {product.design_category && (
                  <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-3">
                    {product.design_category}
                  </p>
                )}
                <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#1B4D3E] mb-4">
                  {product.name}
                </h1>
                
                {/* Price & Stock */}
                <div className="flex items-center gap-4 mb-6">
                  {product.price_on_request ? (
                    <span className="text-lg text-[#DACBA0]">Price on Request</span>
                  ) : product.price ? (
                    <span className="text-xl text-[#1B4D3E]">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  ) : null}
                  
                  {product.stock_status === "in_stock" && (
                    <span className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 border border-[#1B4D3E]/20 px-3 py-1">
                      In Stock
                    </span>
                  )}
                  {product.stock_status === "made_to_order" && (
                    <span className="text-xs uppercase tracking-wider text-[#DACBA0] border border-[#DACBA0]/50 px-3 py-1">
                      Made to Order
                    </span>
                  )}
                </div>
              </div>

              {/* Narrative Introduction */}
              {product.narrative_intro && (
                <div className="mb-8">
                  <p className="text-base md:text-lg font-light text-[#1B4D3E]/80 leading-relaxed italic">
                    {product.narrative_intro}
                  </p>
                </div>
              )}

              {/* Product Description - rendered as paragraphs */}
              {product.description && (
                <div data-testid="product-description" className="mb-10">
                  {product.description.split(/\n\s*\n/).map((paragraph, idx) => (
                    <p key={idx} className="text-sm md:text-base font-light text-[#1B4D3E]/80 leading-relaxed mb-4 last:mb-0 whitespace-pre-line">
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <button data-testid="enquire-btn" className="btn-luxury btn-luxury-primary flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4" />
                      Enquire
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#FFFFF0] border-[#DACBA0]/30 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl text-[#1B4D3E]">
                        Enquire About This Piece
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEnquiry} className="space-y-4 mt-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name</Label>
                        <Input
                          value={enquiryForm.name}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                          className="mt-1 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email</Label>
                        <Input
                          type="email"
                          value={enquiryForm.email}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                          className="mt-1 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone (Optional)</Label>
                        <Input
                          value={enquiryForm.phone}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                          className="mt-1 border-[#DACBA0]/50 focus:border-[#1B4D3E]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Message</Label>
                        <Textarea
                          value={enquiryForm.message}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                          className="mt-1 border-[#DACBA0]/50 focus:border-[#1B4D3E] min-h-[100px]"
                          placeholder="Tell us what you'd like to know..."
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
                      >
                        {submitting ? "Sending..." : "Send Enquiry"}
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>

                <a
                  href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="whatsapp-btn"
                  className="btn-luxury btn-luxury-secondary flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>

                <button
                  data-testid="private-viewing-btn"
                  onClick={() => {
                    setEnquiryForm({ ...enquiryForm, message: "I would like to request a private viewing of this piece." });
                    setDialogOpen(true);
                  }}
                  className="btn-luxury btn-luxury-gold flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Private Viewing
                </button>
              </div>

              {/* Structured Details Section */}
              {product.details && product.details.length > 0 && (
                <div data-testid="product-details-section" className="mb-8 border-t border-[#DACBA0]/30 pt-8">
                  <h3 className="text-sm uppercase tracking-[0.2em] text-[#1B4D3E] mb-6">
                    Details
                  </h3>
                  <dl className="space-y-3">
                    {product.details.map((detail, index) => (
                      <div key={index} className="flex items-baseline gap-3">
                        <dt className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 min-w-[120px] shrink-0">
                          {detail.label}
                        </dt>
                        <dd className="text-sm text-[#1B4D3E]">
                          {detail.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* The Story - Key Details */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="mb-8 border-t border-[#DACBA0]/30 pt-8">
                  <h3 className="text-sm uppercase tracking-[0.2em] text-[#1B4D3E] mb-6">
                    The Story
                  </h3>
                  <dl className="space-y-4">
                    {product.attributes.filter(a => a.visible !== false).map((attr, index) => (
                      <div key={index} className="w-full">
                        <dt className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1">
                          {attr.key}
                        </dt>
                        <dd className="text-sm text-[#1B4D3E]">{attr.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Disclaimer */}
              {product.disclaimer && (
                <div className="mb-8 p-6 bg-[#1B4D3E]/5 border-l-2 border-[#DACBA0]">
                  <p className="text-sm font-light text-[#1B4D3E]/80 italic">
                    {product.disclaimer}
                  </p>
                </div>
              )}

              {/* The Craft */}
              {(product.craft_fabric || product.craft_technique) && (
                <div className="mb-6 border-t border-[#DACBA0]/30 pt-6">
                  <h3 className="text-sm uppercase tracking-[0.2em] text-[#1B4D3E] mb-4">
                    The Craft
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {product.craft_fabric && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1">Fabric</dt>
                        <dd className="text-sm text-[#1B4D3E]">{product.craft_fabric}</dd>
                      </div>
                    )}
                    {product.craft_technique && (
                      <div>
                        <dt className="text-xs uppercase tracking-wider text-[#1B4D3E]/50 mb-1">Technique</dt>
                        <dd className="text-sm text-[#1B4D3E]">{product.craft_technique}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsible Sections */}
              <div className="border-t border-[#DACBA0]/30">
                {product.care_instructions && (
                  <CollapsibleSection title="Care Instructions">
                    {product.care_instructions}
                  </CollapsibleSection>
                )}
                
                {product.delivery_info && (
                  <CollapsibleSection title="Delivery & Shipping">
                    {product.delivery_info}
                  </CollapsibleSection>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
