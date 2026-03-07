import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API } from "@/App";
import { ArrowRight } from "lucide-react";

const StoriesPage = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  const storyCategories = [
    { id: "all", name: "All Stories" },
    { id: "maison_journal", name: "The Maison Journal" },
    { id: "craft_clusters", name: "Craft & Clusters" },
    { id: "wearable_whispers", name: "Wearable Whispers" },
    { id: "collections_campaigns", name: "Collections & Campaigns" },
    { id: "care_keeping", name: "Care & Keeping" },
    { id: "press_features", name: "Press & Features" },
  ];

  useEffect(() => {
    fetchStories();
  }, [activeCategory]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const params = activeCategory !== "all" ? `?category=${activeCategory}` : "";
      const res = await axios.get(`${API}/stories${params}`);
      setStories(res.data);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Placeholder stories for when DB is empty
  const placeholderStories = [
    {
      id: "1",
      title: "The Art of Handloom",
      slug: "art-of-handloom",
      category: "craft_clusters",
      hero_media_url: "https://images.unsplash.com/photo-1702631778198-239c76842dd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
      pull_quote: "Where every thread tells a story of generations",
    },
    {
      id: "2",
      title: "Behind the Collection: Folk Tales",
      slug: "folk-tales-collection",
      category: "collections_campaigns",
      hero_media_url: "https://images.unsplash.com/photo-1769781383402-edacf5002b91?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
      pull_quote: "Inspiration drawn from village folklore",
    },
  ];

  const displayStories = stories.length > 0 ? stories : placeholderStories;

  return (
    <div data-testid="stories-page" className="min-h-screen bg-[#FFFFF0]">
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
              Stories
            </h1>
            <p className="text-lg font-light text-[#1B4D3E]/70 max-w-xl mx-auto">
              Narratives of craft, heritage, and the art of slow fashion.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-y border-[#DACBA0]/30">
        <div className="container-luxury py-6">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {storyCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`story-cat-${cat.id}`}
                className={`text-xs uppercase tracking-[0.15em] transition-colors ${
                  activeCategory === cat.id
                    ? "text-[#1B4D3E]"
                    : "text-[#1B4D3E]/50 hover:text-[#DACBA0]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stories Grid */}
      <section className="py-16 md:py-24">
        <div className="container-luxury">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] bg-[#DACBA0]/20 mb-6" />
                  <div className="h-6 bg-[#DACBA0]/20 w-3/4 mb-3" />
                  <div className="h-4 bg-[#DACBA0]/20 w-1/2" />
                </div>
              ))}
            </div>
          ) : displayStories.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="font-serif text-2xl text-[#1B4D3E] mb-4">
                Stories coming soon
              </h3>
              <p className="text-[#1B4D3E]/60">
                We're crafting beautiful narratives. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {displayStories.map((story, index) => (
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Link
                    to={`/stories/${story.slug}`}
                    data-testid={`story-card-${story.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden mb-6">
                      <img
                        src={story.hero_media_url || "https://images.unsplash.com/photo-1702631778198-239c76842dd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"}
                        alt={story.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[#1B4D3E]/0 group-hover:bg-[#1B4D3E]/10 transition-colors duration-500" />
                    </div>
                    
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#DACBA0] mb-3">
                        {storyCategories.find(c => c.id === story.category)?.name || "Story"}
                      </p>
                      <h2 className="font-serif text-2xl md:text-3xl text-[#1B4D3E] mb-3 group-hover:text-[#DACBA0] transition-colors">
                        {story.title}
                      </h2>
                      {story.pull_quote && (
                        <p className="text-sm font-light text-[#1B4D3E]/70 mb-4 line-clamp-2">
                          {story.pull_quote}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[#1B4D3E] group-hover:text-[#DACBA0] transition-colors">
                        Read Story
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StoriesPage;
