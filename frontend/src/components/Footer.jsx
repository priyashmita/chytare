import { Link } from "react-router-dom";
import { useSettings } from "@/App";
import { motion } from "framer-motion";

const Footer = () => {
  const { siteSettings } = useSettings();

  const footerSections = [
    {
      title: "Customer Care",
      links: [
        { name: "Shipping Policy", path: "/policy/shipping" },
        { name: "Returns & Exchanges", path: "/policy/returns" },
        { name: "Privacy Policy", path: "/policy/privacy" },
        { name: "Terms & Conditions", path: "/policy/terms" },
        { name: "Care Guide", path: "/policy/care" },
        { name: "FAQs", path: "/policy/faqs" },
        { name: "Limited Edition Policy", path: "/limited-edition-policy" },
        { name: "Authenticity & Craftsmanship", path: "/authenticity-craftsmanship" },
        { name: "Made-to-Order Policy", path: "/made-to-order-policy" },
      ],
    },
    {
      title: "The Maison",
      links: [
        { name: "About", path: "/about" },
        { name: "Stories", path: "/stories" },
        { name: "Wearable Whispers", path: "/wearable-whispers" },
        { name: "Contact", path: "/contact" },
      ],
    },
    {
      title: "Collections",
      links: [
        { name: "Sarees", path: "/collections/sarees" },
        { name: "Scarves", path: "/collections/scarves" },
      ],
    },
  ];

  return (
    <footer data-testid="main-footer" className="bg-[#1B4D3E] text-[#FFFFF0]">
      {/* Main Footer */}
      <div className="container-luxury py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/">
              <img
                src="/assets/logo-gold.png"
                alt="Chytare"
                className="h-28 w-auto mb-8 brightness-110"
              />
            </Link>
            <p className="text-sm font-light leading-relaxed text-[#FFFFF0]/80 mb-8">
              Where heritage meets contemporary design. Handcrafted sarees and
              scarves for life's most treasured moments.
            </p>
            <p className="font-script text-2xl text-[#DACBA0]">
              Your Life | Your Canvas
            </p>
          </div>

          {/* Link Columns */}
          {footerSections.map((section, index) => (
            <div key={section.title}>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      data-testid={`footer-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-sm font-light text-[#FFFFF0]/80 hover:text-[#DACBA0] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social & Contact */}
        <div className="mt-16 pt-16 border-t border-[#FFFFF0]/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <a
                href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="footer-whatsapp"
                className="text-xs uppercase tracking-[0.2em] text-[#FFFFF0]/80 hover:text-[#DACBA0] transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${siteSettings?.contact_email || "enquiries@chytare.com"}`}
                data-testid="footer-email"
                className="text-xs uppercase tracking-[0.2em] text-[#FFFFF0]/80 hover:text-[#DACBA0] transition-colors"
              >
                Email
              </a>
              {siteSettings?.instagram_visible && (
                <a
                  href={`https://instagram.com/${siteSettings.instagram_handle?.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="footer-instagram"
                  className="text-xs uppercase tracking-[0.2em] text-[#FFFFF0]/80 hover:text-[#DACBA0] transition-colors"
                >
                  Instagram
                </a>
              )}
            </div>

            <p className="text-xs text-[#FFFFF0]/50">
              © 2026 Chytare. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
