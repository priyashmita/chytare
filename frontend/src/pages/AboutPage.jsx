import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import axios from "axios";
import { API } from "@/App";

const DEFAULT = {
  eyebrow: "The Maison",
  hero_title: "Where Heritage Meets",
  hero_subtitle: "Contemporary Design",
  philosophy_heading: "Our Philosophy",
  philosophy_image_url: "https://images.unsplash.com/photo-1702631778198-239c76842dd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  philosophy_paragraph_1: 'At Chytare, we believe that every garment is a canvas—a canvas for your life\'s most treasured moments. Our name, derived from the Bengali word "চিত্রে" (meaning "in pictures" or "on canvas"), reflects our commitment to creating wearable art.',
  philosophy_paragraph_2: "We work with master craftspeople across India, preserving age-old techniques while infusing them with contemporary sensibilities. Each piece is a dialogue between past and present, tradition and innovation.",
  philosophy_paragraph_3: "This is slow fashion at its most intentional—pieces meant to be cherished, passed down, and woven into the fabric of your family's story.",
  value_1_title: "Heritage",
  value_1_description: "We honor the rich textile traditions of India, working with artisan communities to preserve and celebrate their craft.",
  value_2_title: "Craftsmanship",
  value_2_description: "Every piece is handcrafted with meticulous attention to detail, ensuring the highest quality and uniqueness.",
  value_3_title: "Sustainability",
  value_3_description: "We embrace slow fashion, creating timeless pieces designed to be treasured for generations.",
  craft_heading: "The Craft",
  craft_image_url: "https://images.unsplash.com/photo-1734980620393-d145b2f6ddf7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
  craft_paragraph_1: "Our sarees and scarves are created in collaboration with skilled artisans from weaving clusters across India. From the handlooms of Bengal to the block printers of Rajasthan, each technique carries centuries of wisdom.",
  craft_paragraph_2: "We source the finest natural fabrics—pure silks, handspun cottons, and luxurious blends—ensuring that every piece feels as beautiful as it looks.",
  cta_heading: "Begin Your Journey",
  cta_subheading: "Discover our collections and find the piece that speaks to your story.",
};

const AboutPage = () => {
  const [c, setC] = useState(DEFAULT);

  useEffect(() => {
    axios.get(`${API}/settings/about`)
      .then(res => {
        if (res.data && Object.keys(res.data).length > 1) {
          setC({ ...DEFAULT, ...res.data });
        }
      })
      .catch(() => {});
  }, []);

  const values = [
    { title: c.value_1_title, description: c.value_1_description },
    { title: c.value_2_title, description: c.value_2_description },
    { title: c.value_3_title, description: c.value_3_description },
  ];

  return (
    <div data-testid="about-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[#DACBA0] mb-6">
              {c.eyebrow}
            </p>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-[#1B4D3E] mb-8 leading-tight">
              {c.hero_title}
              <br />
              <span className="font-script text-[#DACBA0]">{c.hero_subtitle}</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16 md:py-24">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={c.philosophy_image_url}
                alt="Chytare Craft"
                className="w-full aspect-[4/5] object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-serif text-3xl md:text-4xl text-[#1B4D3E] mb-6">
                {c.philosophy_heading}
              </h2>
              <div className="space-y-6 text-base md:text-lg font-light text-[#1B4D3E]/80 leading-relaxed">
                {c.philosophy_paragraph_1 && <p>{c.philosophy_paragraph_1}</p>}
                {c.philosophy_paragraph_2 && <p>{c.philosophy_paragraph_2}</p>}
                {c.philosophy_paragraph_3 && <p>{c.philosophy_paragraph_3}</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-[#1B4D3E]">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#FFFFF0]">Our Values</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <h3 className="font-serif text-2xl text-[#DACBA0] mb-4">{value.title}</h3>
                <p className="text-[#FFFFF0]/80 font-light leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Craft Section */}
      <section className="py-16 md:py-24">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <h2 className="font-serif text-3xl md:text-4xl text-[#1B4D3E] mb-6">
                {c.craft_heading}
              </h2>
              <div className="space-y-6 text-base md:text-lg font-light text-[#1B4D3E]/80 leading-relaxed">
                {c.craft_paragraph_1 && <p>{c.craft_paragraph_1}</p>}
                {c.craft_paragraph_2 && <p>{c.craft_paragraph_2}</p>}
              </div>
              <Link
                to="/stories"
                className="inline-flex items-center gap-2 mt-8 text-xs uppercase tracking-[0.2em] text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
              >
                Explore Our Stories
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2"
            >
              <img
                src={c.craft_image_url}
                alt="Handloom Craft"
                className="w-full aspect-[4/5] object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-[#1B4D3E]/5">
        <div className="container-luxury text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#1B4D3E] mb-6">
              {c.cta_heading}
            </h2>
            <p className="text-lg font-light text-[#1B4D3E]/70 mb-10 max-w-xl mx-auto">
              {c.cta_subheading}
            </p>
            <Link
              to="/collections"
              className="bg-[#1B4D3E] text-white px-10 py-4 tracking-[0.2em] uppercase hover:bg-[#17382B] transition-all duration-300 text-sm font-medium"
              style={{ color: '#ffffff' }}
            >
              Explore Collections
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
