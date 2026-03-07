import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArrowRight } from "lucide-react";

const CollectionsPage = () => {
  const collections = [
    {
      name: "Sarees",
      slug: "sarees",
      description: "Heritage woven in every thread. Discover our curated collection of handcrafted sarees.",
      image: "https://images.unsplash.com/photo-1589734785216-51dd5feacd1c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
      available: true,
    },
    {
      name: "Scarves",
      slug: "scarves",
      description: "Elegance in every drape. Artisanal scarves that make a statement.",
      image: "https://images.unsplash.com/photo-1610047592780-aa246f5635c2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
      available: true,
    },
    {
      name: "Ready-to-Wear",
      slug: "ready-to-wear",
      description: "Contemporary silhouettes rooted in tradition.",
      image: "https://images.unsplash.com/photo-1648538604499-d1f6bee958ab?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
      available: false,
      comingSoon: true,
    },
    {
      name: "Blouses",
      slug: "blouses",
      description: "The perfect complement to every saree.",
      image: "https://images.unsplash.com/photo-1599362593923-d5bd7c916eae?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
      available: false,
      comingSoon: true,
    },
  ];

  return (
    <div data-testid="collections-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* Header */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-[#1B4D3E] mb-6">
              Collections
            </h1>
            <p className="text-lg font-light text-[#1B4D3E]/70 max-w-xl mx-auto">
              Each piece in our collection is a canvas of heritage, crafted with intention and care.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="pb-24 md:pb-32">
        <div className="container-luxury">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {collections.map((collection, index) => (
              <motion.div
                key={collection.slug}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                {collection.available ? (
                  <Link
                    to={`/collections/${collection.slug}`}
                    data-testid={`collection-link-${collection.slug}`}
                    className="group block relative aspect-[4/5] overflow-hidden rounded-2xl"
                  >
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      style={{ objectPosition: "50% 15%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1B4D3E]/80 via-[#1B4D3E]/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#FFFFF0] mb-3">
                        {collection.name}
                      </h2>
                      <p className="text-sm md:text-base text-[#FFFFF0]/80 mb-6 max-w-md">
                        {collection.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#DACBA0] group-hover:text-[#FFFFF0] transition-colors">
                        View Collection
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div
                    data-testid={`collection-coming-${collection.slug}`}
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl"
                  >
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover grayscale opacity-60"
                      style={{ objectPosition: "50% 15%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1B4D3E]/80 via-[#1B4D3E]/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                      <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#FFFFF0] mb-3">
                        {collection.name}
                      </h2>
                      <p className="text-sm md:text-base text-[#FFFFF0]/80 mb-6 max-w-md">
                        {collection.description}
                      </p>
                      <span className="inline-block text-xs uppercase tracking-[0.2em] text-[#DACBA0] border border-[#DACBA0]/50 px-4 py-2">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CollectionsPage;
