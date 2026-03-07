import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import NewsletterForm from "@/components/NewsletterForm";

const PrivateAccessPage = () => {
  return (
    <div data-testid="private-access-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      <div className="pt-32 pb-24 md:pt-40">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#DACBA0] mb-6">
              Exclusive
            </p>
            <h1 className="font-serif text-4xl md:text-6xl text-[#1B4D3E] mb-6">
              Private Access
            </h1>
            <p className="text-lg font-light text-[#1B4D3E]/70 mb-12 leading-relaxed">
              Join our inner circle for first access to new collections, exclusive pieces, and private events. Experience Chytare as only a few do.
            </p>

            <div className="bg-[#1B4D3E]/5 p-8 md:p-12 border border-[#DACBA0]/30">
              <h2 className="font-serif text-2xl text-[#1B4D3E] mb-4">
                Request Access
              </h2>
              <p className="text-sm text-[#1B4D3E]/70 mb-8">
                Enter your email to join our waitlist. We'll be in touch when spaces open.
              </p>
              <NewsletterForm />
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                { title: "Early Access", desc: "Preview new collections 48 hours before public release" },
                { title: "Private Viewings", desc: "Exclusive appointments at our atelier" },
                { title: "Members Pricing", desc: "Special pricing on select pieces" },
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  className="p-6 border border-[#DACBA0]/30"
                >
                  <h3 className="font-serif text-lg text-[#1B4D3E] mb-2">{benefit.title}</h3>
                  <p className="text-sm text-[#1B4D3E]/70 font-light">{benefit.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivateAccessPage;
