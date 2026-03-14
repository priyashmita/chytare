import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { useSettings } from "@/App";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const location = useLocation();
  const { siteSettings } = useSettings();

  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location]);

  const logoSrc = "/assets/chytare_english_green_logo.png";
  const logoSize = isHomePage ? "h-20 md:h-28 w-auto" : "h-16 md:h-24 w-auto";

  const navTextColor =
    isHomePage && !isScrolled
      ? "text-[#FFFFF0] hover:text-[#DACBA0]"
      : "text-[#1B4D3E] hover:text-[#DACBA0]";

  const activeColor = "text-[#DACBA0]";

  // ── New nav structure ────────────────────────────────────────────
  const leftLinks = [
    {
      name: "Collections",
      path: "/collections",
      submenu: [
        { name: "Sarees", path: "/collections/sarees" },
        { name: "Scarves", path: "/collections/scarves" },
      ],
    },
    {
      name: "The Maison",
      submenu: [
        { name: "About Chytare", path: "/about" },
        { name: "Our Philosophy", path: "/about#philosophy" },
        { name: "The Craft", path: "/stories/category/craft-clusters" },
      ],
    },
    {
      name: "Journal",
      submenu: [
        { name: "The Maison Journal", path: "/stories/category/maison-journal" },
        { name: "Collections & Campaigns", path: "/stories/category/collections-campaigns" },
        { name: "Care & Keeping", path: "/stories/category/care-keeping" },
        { name: "Press & Features", path: "/stories/category/press-features" },
      ],
    },
  ];

  const rightLinks = [
    { name: "Bespoke", path: "/wearable-whispers" },
    { name: "Enquiries", path: "/contact" },
  ];

  const allLinks = [...leftLinks, ...rightLinks];

  const NavItem = ({ link, isMobile = false }) => {
    const isActive = link.path && location.pathname === link.path;
    const isOpen = openDropdown === link.name;

    if (link.submenu) {
      return (
        <div
          className="relative"
          onMouseEnter={() => !isMobile && setOpenDropdown(link.name)}
          onMouseLeave={() => !isMobile && setOpenDropdown(null)}
        >
          <button
            onClick={() => isMobile && setOpenDropdown(isOpen ? null : link.name)}
            className={`flex items-center gap-1 text-xs uppercase tracking-[0.2em] transition-colors font-medium ${
              isMobile ? "text-[#1B4D3E]" : navTextColor
            } ${isOpen ? activeColor : ""}`}
          >
            {link.name}
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: isMobile ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isMobile ? 0 : 10 }}
                transition={{ duration: 0.2 }}
                className={isMobile ? "mt-3 ml-4 space-y-2" : "absolute top-full left-0 pt-4 z-50"}
              >
                {!isMobile && (
                  <div className="bg-[#FFFFF0] border border-[#DACBA0]/30 py-4 px-6 min-w-[200px]">
                    {link.submenu.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.path}
                        className="block py-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
                {isMobile && link.submenu.map((sub) => (
                  <Link
                    key={sub.name}
                    to={sub.path}
                    className="block py-1.5 text-base font-light text-[#1B4D3E]/70 hover:text-[#DACBA0] transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link
        to={link.path}
        className={`text-xs uppercase tracking-[0.2em] transition-colors font-medium ${
          isMobile ? "text-[#1B4D3E] hover:text-[#DACBA0]" : navTextColor
        } ${isActive ? activeColor : ""}`}
      >
        {link.name}
      </Link>
    );
  };

  return (
    <>
      <motion.nav
        data-testid="main-navigation"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled || !isHomePage
            ? "bg-[#FFFFF0]/95 backdrop-blur-md border-b border-[#DACBA0]/30"
            : "bg-transparent"
        }`}
      >
        <div className="container-luxury">
          <div className={`flex items-center justify-between ${isHomePage ? "h-24 md:h-32" : "h-20 md:h-24"}`}>

            {/* Left Nav */}
            <div className="hidden lg:flex items-center gap-10">
              {leftLinks.map((link) => (
                <NavItem key={link.name} link={link} />
              ))}
            </div>

            {/* Center Logo */}
            <Link to="/" data-testid="nav-logo" className="flex-shrink-0 px-6">
              <motion.img
                src={logoSrc}
                alt="Chytare"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`${logoSize} transition-all duration-500`}
              />
            </Link>

            {/* Right Nav */}
            <div className="hidden lg:flex items-center gap-10">
              {rightLinks.map((link) => (
                <NavItem key={link.name} link={link} />
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              data-testid="mobile-menu-toggle"
              className={`lg:hidden p-2 ${isHomePage && !isScrolled ? "text-[#FFFFF0]" : "text-[#1B4D3E]"}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-[#1B4D3E]/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#FFFFF0] shadow-xl overflow-y-auto"
            >
              <div className="p-8 pt-24">
                <nav className="space-y-6">
                  {allLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                    >
                      {link.submenu ? (
                        <div>
                          <NavItem link={link} isMobile />
                        </div>
                      ) : (
                        <Link
                          to={link.path}
                          className="block text-xl font-light text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                        >
                          {link.name}
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </nav>

                <div className="mt-12 pt-8 border-t border-[#DACBA0]/30">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/50 mb-4">Connect</p>
                  <a href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors">WhatsApp</a>
                  <a href={`mailto:${siteSettings?.contact_email}`} className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors">Email</a>
                  {siteSettings?.instagram_visible && (
                    <a href={`https://instagram.com/${siteSettings.instagram_handle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors">Instagram</a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
