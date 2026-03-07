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

const WearableWhispersPage = () => {
  const { siteSettings } = useSettings();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    occasion: "",
    vision: "",
    budget: "",
    timeline: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const message = `
Occasion: ${form.occasion}
Vision: ${form.vision}
Budget Range: ${form.budget}
Timeline: ${form.timeline}
      `.trim();

      await axios.post(`${API}/enquiries`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        message,
        enquiry_type: "wearable_whispers",
      });
      toast.success("Your commission request has been received. Our team will be in touch.");
      setForm({ name: "", email: "", phone: "", occasion: "", vision: "", budget: "", timeline: "" });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="wearable-whispers-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#DACBA0] mb-6">
              Custom Commissions
            </p>
            <h1 className="font-serif text-4xl md:text-6xl text-[#1B4D3E] mb-6">
              Wearable Whispers
            </h1>
            <p className="text-lg font-light text-[#1B4D3E]/70 leading-relaxed">
              Your vision, our craftsmanship. Work with our atelier to create a bespoke piece that tells your unique story—a garment designed exclusively for you and the moments that matter most.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-24 bg-[#1B4D3E]">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#FFFFF0]">
              The Journey
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Share Your Vision", desc: "Tell us about the occasion, your style preferences, and any inspirations." },
              { step: "02", title: "Consultation", desc: "Our design team will connect with you to understand your needs and suggest possibilities." },
              { step: "03", title: "Design & Craft", desc: "Watch your piece come to life as our artisans bring your vision to reality." },
              { step: "04", title: "Delivery", desc: "Receive your one-of-a-kind piece, ready for your special moment." },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <span className="font-script text-4xl text-[#DACBA0]">{item.step}</span>
                <h3 className="font-serif text-xl text-[#FFFFF0] mt-4 mb-3">{item.title}</h3>
                <p className="text-sm text-[#FFFFF0]/70 font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl text-[#1B4D3E] mb-4">
                Begin Your Commission
              </h2>
              <p className="text-[#1B4D3E]/70">
                Share your vision with us and we'll get back to you within 48 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} data-testid="commission-form" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Occasion</Label>
                  <Input
                    value={form.occasion}
                    onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                    placeholder="e.g., Wedding, Anniversary, Special Event"
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Your Vision</Label>
                <Textarea
                  value={form.vision}
                  onChange={(e) => setForm({ ...form, vision: e.target.value })}
                  placeholder="Describe your dream piece—colors, styles, inspirations, any details that matter to you..."
                  className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent min-h-[150px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Budget Range</Label>
                  <Input
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="e.g., ₹50,000 - ₹1,00,000"
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Timeline</Label>
                  <Input
                    value={form.timeline}
                    onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                    placeholder="When do you need it by?"
                    className="mt-2 border-[#DACBA0]/50 focus:border-[#1B4D3E] bg-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                data-testid="commission-submit"
                className="w-full btn-luxury btn-luxury-primary disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Submit Commission Request"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Contact Alternative */}
      <section className="py-16 md:py-24 bg-[#1B4D3E]/5">
        <div className="container-luxury text-center">
          <p className="text-[#1B4D3E]/70 mb-6">
            Prefer a direct conversation?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`https://wa.me/${siteSettings?.whatsapp_number?.replace(/\D/g, "")}?text=${encodeURIComponent("Hello, I'm interested in a custom commission.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury btn-luxury-primary"
            >
              WhatsApp Us
            </a>
            <a
              href={`mailto:${siteSettings?.contact_email || "enquiries@chytare.com"}?subject=Custom Commission Inquiry`}
              className="btn-luxury btn-luxury-secondary"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WearableWhispersPage;
