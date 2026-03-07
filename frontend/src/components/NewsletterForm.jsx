import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { API } from "@/App";

const NewsletterForm = ({ variant = "light" }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      toast.success("Welcome to the Chytare family");
      setEmail("");
    } catch (error) {
      if (error.response?.data?.message === "Already subscribed") {
        toast.info("You're already part of our family");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} data-testid="newsletter-form" className="w-full">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          data-testid="newsletter-email-input"
          className={`flex-1 px-6 py-4 text-sm tracking-wide border transition-colors focus:outline-none ${
            isDark
              ? "bg-transparent border-[#FFFFF0]/30 text-[#FFFFF0] placeholder-[#FFFFF0]/50 focus:border-[#DACBA0]"
              : "bg-transparent border-[#1B4D3E]/30 text-[#1B4D3E] placeholder-[#1B4D3E]/50 focus:border-[#DACBA0]"
          }`}
          required
        />
        <motion.button
          type="submit"
          disabled={loading}
          data-testid="newsletter-submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium transition-colors disabled:opacity-50 ${
            isDark
              ? "bg-[#DACBA0] text-[#1B4D3E] hover:bg-[#FFFFF0]"
              : "bg-[#1B4D3E] text-[#FFFFF0] hover:bg-[#DACBA0] hover:text-[#1B4D3E]"
          }`}
        >
          {loading ? "..." : "Subscribe"}
        </motion.button>
      </div>
      <p className={`mt-4 text-xs ${isDark ? "text-[#FFFFF0]/50" : "text-[#1B4D3E]/50"}`}>
        Join our private list for exclusive previews and first access to new collections.
      </p>
    </form>
  );
};

export default NewsletterForm;
