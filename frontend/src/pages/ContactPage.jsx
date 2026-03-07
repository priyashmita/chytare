import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API, useSettings } from "@/App";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, MapPin } from "lucide-react";

const ContactPage = () => {
  const { siteSettings } = useSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/enquiries`, {
        ...form,
        enquiry_type: "general",
      });
      toast.success("Message sent. We'll be in touch shortly.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="contact-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      <div className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="font-serif text-4xl md:text-6xl text-[#1B4D3E] mb-6">
              Contact
            </h1>
            <p className="text-lg font-light text-[#1B4D3E]/70 max-w-xl mx-auto">
              We'd love to hear from you. Reach out for enquiries, collaborations, or simply to say hello.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-10"
            >
              <div>
                <h2 className="font-serif text-2xl text-[#1B4D3E] mb-6">
                  Get in Touch
                </h2>
                <div className="space-y-6">
                  <a
                    href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="contact-whatsapp"
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 flex items-center justify-center border border-[#DACBA0]/50 group-hover:border-[#DACBA0] group-hover:bg-[#DACBA0]/10 transition-colors">
                      <MessageCircle className="w-5 h-5 text-[#1B4D3E]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/50 mb-1">WhatsApp</p>
                      <p className="text-[#1B4D3E] group-hover:text-[#DACBA0] transition-colors">
                        {siteSettings?.whatsapp_number || "+91 9330117552"}
                      </p>
                    </div>
                  </a>

                  <a
                    href={`mailto:${siteSettings?.contact_email || "enquiries@chytare.com"}`}
                    data-testid="contact-email"
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-12 h-12 flex items-center justify-center border border-[#DACBA0]/50 group-hover:border-[#DACBA0] group-hover:bg-[#DACBA0]/10 transition-colors">
                      <Mail className="w-5 h-5 text-[#1B4D3E]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/50 mb-1">Email</p>
                      <p className="text-[#1B4D3E] group-hover:text-[#DACBA0] transition-colors">
                        {siteSettings?.contact_email || "enquiries@chytare.com"}
                      </p>
                    </div>
                  </a>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 flex items-center justify-center border border-[#DACBA0]/50">
                      <MapPin className="w-5 h-5 text-[#1B4D3E]" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/50 mb-1">Location</p>
                      <p className="text-[#1B4D3E]">Kolkata, India</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-[#DACBA0]/30">
                <h3 className="text-xs uppercase tracking-[0.2em] text-[#1B4D3E]/50 mb-4">
                  Follow Us
                </h3>
                {siteSettings?.instagram_visible && (
                  <a
                    href={`https://instagram.com/${siteSettings.instagram_handle?.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
                  >
                    {siteSettings.instagram_handle}
                  </a>
                )}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <form onSubmit={handleSubmit} data-testid="contact-form" className="space-y-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone (Optional)</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  />
                </div>
                
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent min-h-[150px]"
                    placeholder="How can we help you?"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="contact-submit"
                  className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;
