import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { API } from "@/App";
import { ArrowLeft } from "lucide-react";

const StoryDetailPage = () => {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStory();
  }, [slug]);

  const fetchStory = async () => {
    try {
      const res = await axios.get(`${API}/stories/slug/${slug}`);
      setStory(res.data);
      
      if (res.data.related_product_ids?.length > 0) {
        const productPromises = res.data.related_product_ids.map(id =>
          axios.get(`${API}/products/${id}`).catch(() => null)
        );
        const products = await Promise.all(productPromises);
        setRelatedProducts(products.filter(p => p?.data).map(p => p.data));
      }
    } catch (error) {
      console.error("Error fetching story:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = {
    maison_journal: "The Maison Journal",
    craft_clusters: "Craft & Clusters",
    wearable_whispers: "Wearable Whispers",
    collections_campaigns: "Collections & Campaigns",
    care_keeping: "Care & Keeping",
    press_features: "Press & Features",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="pt-32 container-luxury">
          <div className="max-w-4xl mx-auto">
            <div className="aspect-[16/9] bg-[#DACBA0]/20 animate-pulse mb-12" />
            <div className="h-8 bg-[#DACBA0]/20 w-3/4 mb-4 animate-pulse" />
            <div className="h-4 bg-[#DACBA0]/20 w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#FFFFF0]">
        <Navigation />
        <div className="pt-32 pb-24 container-luxury text-center">
          <h1 className="font-serif text-3xl text-[#1B4D3E] mb-4">
            Story Not Found
          </h1>
          <Link to="/stories" className="btn-luxury btn-luxury-primary">
            View All Stories
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div data-testid="story-detail-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      {/* Hero */}
      <section className="pt-24">
        {story.hero_media_url && (
          <div className="relative h-[60vh] md:h-[70vh]">
            {story.hero_media_type === "video" ? (
              <video
                src={story.hero_media_url}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={story.hero_media_url}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFF0] via-transparent to-transparent" />
          </div>
        )}
      </section>

      {/* Content */}
      <article className="container-luxury py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            to="/stories"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors mb-12"
          >
            <ArrowLeft className="w-3 h-3" />
            All Stories
          </Link>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-4">
              {categoryLabels[story.category] || "Story"}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1B4D3E] mb-6 leading-tight">
              {story.title}
            </h1>
            {story.published_at && (
              <p className="text-sm text-[#1B4D3E]/50">
                {new Date(story.published_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </motion.header>

          {/* Pull Quote */}
          {story.pull_quote && (
            <motion.blockquote
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="my-12 py-8 border-l-2 border-[#DACBA0] pl-8"
            >
              <p className="font-serif text-2xl md:text-3xl text-[#1B4D3E]/80 italic leading-relaxed">
                "{story.pull_quote}"
              </p>
            </motion.blockquote>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="prose prose-lg max-w-none"
          >
            <div 
              className="text-base md:text-lg font-light text-[#1B4D3E]/80 leading-relaxed space-y-6"
              dangerouslySetInnerHTML={{ __html: story.content || "<p>Story content coming soon...</p>" }}
            />
          </motion.div>

          {/* Inline Gallery */}
          {story.gallery && story.gallery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="my-16"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {story.gallery.map((item, index) => (
                  <div key={index} className="aspect-[4/3] bg-[#1B4D3E]/5">
                    <img
                      src={item.url}
                      alt={item.alt || `Gallery image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-24 pt-16 border-t border-[#DACBA0]/30"
          >
            <div className="text-center mb-12">
              <h2 className="font-serif text-2xl md:text-3xl text-[#1B4D3E]">
                Explore Pieces
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {relatedProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </motion.section>
        )}
      </article>

      <Footer />
    </div>
  );
};

export default StoryDetailPage;
