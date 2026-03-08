import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NewsletterForm from "@/components/NewsletterForm";
import { API, useSettings } from "@/App";
import { ArrowRight } from "lucide-react";

const HomePage = () => {
  const { homeSettings, siteSettings } = useSettings();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get(`${API}/categories?type=design_category&collection_type=sarees`)
      .then(res => setCategories(res.data.slice(0, 8)))
      .catch(() => {});
  }, []);

  const hero = homeSettings?.hero || {};
  const exploreTiles = (homeSettings?.explore_tiles || []).filter(t => t.is_visible !== false);

  // Build grid tiles: use CMS category_grid_tiles if set, otherwise merge from categories API
  const slugify = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
  const cmsGridTiles = (homeSettings?.category_grid_tiles || []).filter(t => t.is_visible !== false).map(t => ({
    ...t,
    slug: t.slug || slugify(t.title),
    link: t.link || `/collections/${t.slug || slugify(t.title)}`,
  }));
  const gridTiles = cmsGridTiles.length > 0
    ? cmsGridTiles
    : categories.map(c => ({
        id: c.id, title: c.name, slug: c.slug || slugify(c.name),
        image_url: c.image_url || "",
        focal_point: "50% 15%",
        link: `/collections/${c.slug || slugify(c.name)}`,
        bg_color: "#1B4D3E", is_visible: c.is_visible !== false,
      })).filter(t => t.is_visible);

  // Hero text styling from CMS
  const isDarkText = hero.hero_text_theme !== "light";
  const textColor = isDarkText ? "#1B4D3E" : "#FFFFF0";
  const accentColor = "#DACBA0";
  const overlayOpacity = (hero.hero_overlay_opacity ?? 40) / 100;
  const textShadow = hero.hero_text_shadow !== false ? "0 2px 20px rgba(0,0,0,0.4)" : "none";
  const overlayStyle = hero.hero_overlay_gradient !== false
    ? { background: `linear-gradient(to top, rgba(27,77,62,${overlayOpacity * 0.7}) 0%, rgba(27,77,62,${overlayOpacity * 0.3}) 40%, transparent 70%)` }
    : { background: `rgba(0,0,0,${overlayOpacity * 0.5})` };

  // Loading skeleton
  if (!homeSettings) {
    return (
      <div data-testid="home-page" className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="hero-aspect-desktop relative flex items-end pt-24">
          <div className="absolute inset-0 bg-[#1B4D3E]/5 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="home-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* ===== HERO — Fixed aspect ratio, CMS-driven ===== */}
      <section data-testid="hero-section" className="relative hero-aspect-desktop flex items-end pt-24">
        <div className="absolute inset-0 overflow-hidden">
          {hero.hero_image_url ? (
            <img
              src={hero.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: hero.hero_focal_point || "top center" }}
            />
          ) : (
            <div className="w-full h-full bg-[#1B4D3E]/10" />
          )}
          <div className="absolute inset-0" style={overlayStyle} />
        </div>

        <div className="container-luxury relative z-10 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl"
            style={{ textShadow }}
          >
            {hero.hero_eyebrow && (
              <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: accentColor }}>
                {hero.hero_eyebrow}
              </p>
            )}
            {hero.hero_title && (
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl mb-6 leading-[1.1]" style={{ color: textColor }}>
                {hero.hero_title}
                {hero.hero_subtitle && (
                  <>
                    <br />
                    <span className="font-script" style={{ color: accentColor }}>{hero.hero_subtitle}</span>
                  </>
                )}
              </h1>
            )}
            {hero.hero_cta_text && hero.hero_cta_link && (
              <Link
                to={hero.hero_cta_link}
                data-testid="hero-cta"
                className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.2em] transition-colors group"
                style={{ color: textColor }}
              >
                <span>{hero.hero_cta_text}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== SAREES / SCARVES TILES — CMS explore_tiles ===== */}
      {exploreTiles.length > 0 && (
        <section data-testid="explore-tiles-section" className="py-24 md:py-32">
          <div className="container-luxury">
            <div className="flex flex-col gap-8">
              {exploreTiles.map((tile, index) => (
                <motion.div
                  key={tile.id || index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  <Link
                    to={tile.cta_link || tile.link || "#"}
                    data-testid={`explore-tile-${index}`}
                    className="group block relative aspect-[4/5] overflow-hidden"
                  >
                    {tile.image_url ? (
                      <img
                        src={tile.image_url}
                        alt={tile.title || ""}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{ objectPosition: tile.focal_point || "center center" }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1B4D3E]/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1B4D3E]/70 via-[#1B4D3E]/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                      {tile.title && (
                        <h3 className="font-serif text-3xl md:text-4xl text-[#FFFFF0] mb-2">{tile.title}</h3>
                      )}
                      {tile.subtitle && (
                        <p className="text-sm text-[#FFFFF0]/80 mb-6">{tile.subtitle}</p>
                      )}
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#DACBA0] group-hover:text-[#FFFFF0] transition-colors">
                        {tile.cta_text || "View Collection"}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 8 COLLECTION GRID — CMS-driven ===== */}
      {homeSettings?.show_categories_grid !== false && (
        <section data-testid="categories-section" className="py-24 md:py-32 bg-[#1B4D3E]/5">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="font-serif text-3xl md:text-5xl text-[#1B4D3E] mb-4">
                {homeSettings?.categories_grid_title || "Explore Our Sarees"}
              </h2>
              <p className="text-sm text-[#1B4D3E]/60 max-w-md mx-auto">
                {homeSettings?.categories_grid_subtitle || ""}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {gridTiles.map((tile, index) => (
                <motion.div
                  key={tile.id || tile.slug || index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link
                    to={tile.link || `/collections/${tile.slug}`}
                    data-testid={`category-tile-${index}`}
                    className="group block relative aspect-[4/5] overflow-hidden rounded-2xl"
                  >
                    {tile.image_url ? (
                      <>
                        <img
                          src={tile.image_url}
                          alt={tile.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{ objectPosition: tile.focal_point || "50% 15%" }}
                          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                        />
                        <div className="hidden absolute inset-0 items-center justify-center p-4" style={{ background: tile.bg_color || "#1B4D3E" }}>
                          <h4 className="font-serif text-sm md:text-base text-[#DACBA0] text-center">{tile.title}</h4>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1B4D3E]/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                          <h4 className="font-serif text-sm md:text-base text-[#FFFFF0] text-center">{tile.title}</h4>
                        </div>
                      </>
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center p-4 transition-all duration-300 group-hover:brightness-110 rounded-2xl"
                        style={{ background: `linear-gradient(135deg, ${tile.bg_color || "#1B4D3E"}, ${tile.bg_color || "#1B4D3E"}dd)` }}
                      >
                        <h4 className="font-serif text-sm md:text-base text-[#DACBA0] group-hover:text-[#FFFFF0] transition-colors text-center">
                          {tile.title}
                        </h4>
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PHILOSOPHY QUOTE ===== */}
      {homeSettings?.show_philosophy !== false && homeSettings?.philosophy_quote && (
        <section data-testid="philosophy-section" className="py-24 md:py-32 bg-[#1B4D3E]">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <p className="font-script text-4xl md:text-6xl text-[#DACBA0] mb-8">"</p>
              <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-[#FFFFF0] leading-relaxed mb-8">
                {homeSettings.philosophy_quote}
              </blockquote>
              <Link
                to="/about"
                data-testid="philosophy-cta"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#DACBA0] hover:text-[#FFFFF0] transition-colors"
              >
                Our Philosophy <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== CONCIERGE CTA ===== */}
      {homeSettings?.show_concierge !== false && (
        <section data-testid="concierge-section" className="py-24 md:py-32">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="font-serif text-3xl md:text-5xl text-[#1B4D3E] mb-4">
                {homeSettings?.concierge_heading || "Begin Your Journey"}
              </h2>
              <p className="text-lg font-light text-[#1B4D3E]/70 mb-10">
                {homeSettings?.concierge_subheading || "Connect with our concierge for personalized guidance."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="concierge-whatsapp"
                  className="btn-luxury btn-luxury-primary"
                >
                  WhatsApp
                </a>
                <a
                  href={`mailto:${siteSettings?.contact_email || "enquiries@chytare.com"}`}
                  data-testid="concierge-email"
                  className="btn-luxury btn-luxury-secondary"
                >
                  Email Us
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== NEWSLETTER ===== */}
      {homeSettings?.show_newsletter !== false && (
        <section data-testid="newsletter-section" className="py-24 md:py-32 bg-[#1B4D3E]/5">
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-xl mx-auto text-center"
            >
              <h3 className="font-serif text-2xl md:text-3xl text-[#1B4D3E] mb-4">Private Access</h3>
              <p className="text-sm text-[#1B4D3E]/70 mb-8">Be the first to discover new collections and exclusive pieces.</p>
              <NewsletterForm />
            </motion.div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default HomePage;
