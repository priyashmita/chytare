import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { useSettings } from "@/App";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const location = useLocation();
  const { siteSettings } = useSettings();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: "Home", path: "/" },
    {
      name: "Collections",
      path: "/collections",
      submenu: [
        { name: "Sarees", path: "/collections/sarees" },
        { name: "Scarves", path: "/collections/scarves" },
      ],
    },
    { name: "Wearable Whispers", path: "/wearable-whispers" },
    { name: "Stories", path: "/stories" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  if (siteSettings?.private_access_enabled) {
    navLinks.push({ name: "Private Access", path: "/private-access" });
  }

  return (
    <>
      <motion.nav
        data-testid="main-navigation"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#FFFFF0]/95 backdrop-blur-md border-b border-[#DACBA0]/30"
            : "bg-transparent"
        }`}
      >
        <div className="container-luxury">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Left Nav Links - Desktop */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.slice(0, 3).map((link) => (
                <div key={link.name} className="relative group">
                  {link.submenu ? (
                    <button
                      data-testid={`nav-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors font-medium"
                      onMouseEnter={() => setIsCollectionsOpen(true)}
                      onMouseLeave={() => setIsCollectionsOpen(false)}
                    >
                      {link.name}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  ) : (
                    <Link
                      to={link.path}
                      data-testid={`nav-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`text-xs uppercase tracking-[0.2em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors font-medium ${
                        location.pathname === link.path ? "text-[#DACBA0]" : ""
                      }`}
                    >
                      {link.name}
                    </Link>
                  )}

                  {/* Submenu */}
                  {link.submenu && (
                    <AnimatePresence>
                      {isCollectionsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 pt-4"
                          onMouseEnter={() => setIsCollectionsOpen(true)}
                          onMouseLeave={() => setIsCollectionsOpen(false)}
                        >
                          <div className="bg-[#FFFFF0] border border-[#DACBA0]/30 py-4 px-6 min-w-[180px]">
                            {link.submenu.map((sub) => (
                              <Link
                                key={sub.name}
                                to={sub.path}
                                data-testid={`nav-sub-${sub.name.toLowerCase()}`}
                                className="block py-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>

            {/* Center Logo */}
            <Link to="/" data-testid="nav-logo" className="flex-shrink-0">
              <img
                src="/assets/logo-gold.png"
                alt="Chytare"
                className="h-16 md:h-24 w-auto"
              />
            </Link>

            {/* Right Nav Links - Desktop */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.slice(3).map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  data-testid={`nav-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`text-xs uppercase tracking-[0.2em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors font-medium ${
                    location.pathname === link.path ? "text-[#DACBA0]" : ""
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              data-testid="mobile-menu-toggle"
              className="lg:hidden p-2 text-[#1B4D3E]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
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
            <div
              className="absolute inset-0 bg-[#1B4D3E]/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#FFFFF0] shadow-xl"
            >
              <div className="p-8 pt-24">
                <nav className="space-y-6">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {link.submenu ? (
                        <div>
                          <span className="block text-sm uppercase tracking-[0.2em] text-[#1B4D3E]/50 mb-3">
                            {link.name}
                          </span>
                          {link.submenu.map((sub) => (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              data-testid={`mobile-nav-${sub.name.toLowerCase()}`}
                              className="block py-2 pl-4 text-lg font-light text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <Link
                          to={link.path}
                          data-testid={`mobile-nav-${link.name.toLowerCase().replace(/\s+/g, "-")}`}
                          className="block text-xl font-light text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                        >
                          {link.name}
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </nav>

                <div className="mt-12 pt-8 border-t border-[#DACBA0]/30">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/50 mb-4">
                    Connect
                  </p>
                  <a
                    href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:${siteSettings?.contact_email}`}
                    className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                  >
                    Email
                  </a>
                  {siteSettings?.instagram_visible && (
                    <a
                      href={`https://instagram.com/${siteSettings.instagram_handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-2 text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                    >
                      Instagram
                    </a>
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
