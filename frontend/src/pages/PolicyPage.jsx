import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { API } from "@/App";

// Map standalone routes to policy keys
const ROUTE_TO_KEY = {
  "/limited-edition-policy": "limited-edition",
  "/authenticity-craftsmanship": "authenticity",
  "/made-to-order-policy": "made-to-order",
};

// Convert plain text (with \n) into proper HTML paragraphs
const formatContent = (raw) => {
  if (!raw) return "";
  // If content already has HTML block tags, return as-is
  if (/<(p|h[1-6]|ul|ol|div|br)\b/i.test(raw)) return raw;
  // Plain text: split on double newlines for paragraphs, single \n for <br>
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
};

const PolicyPage = () => {
  const { type } = useParams();
  const location = useLocation();
  const policyKey = type || ROUTE_TO_KEY[location.pathname];
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings/site`);
      setSettings(res.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const policyContent = {
    shipping: {
      title: "Shipping Policy",
      content: formatContent(settings?.shipping_policy) || `
        <h2>Delivery Timeline</h2>
        <p>All orders are carefully prepared and dispatched within 7-10 business days. Each piece undergoes a final quality check before shipping to ensure it meets our exacting standards.</p>
        
        <h2>Domestic Shipping (India)</h2>
        <p>We offer complimentary shipping across India on all orders. Delivery typically takes 5-7 business days after dispatch, depending on your location.</p>
        
        <h2>International Shipping</h2>
        <p>We ship worldwide. International orders typically arrive within 10-15 business days after dispatch. Shipping charges and any applicable customs duties will be calculated at checkout.</p>
        
        <h2>Tracking</h2>
        <p>Once your order is dispatched, you will receive a tracking number via email to monitor your shipment's journey.</p>
      `,
    },
    returns: {
      title: "Returns & Exchanges",
      content: formatContent(settings?.returns_policy) || `
        <h2>Our Commitment</h2>
        <p>We want you to love your Chytare piece. If for any reason you're not completely satisfied, we're here to help.</p>
        
        <h2>Return Window</h2>
        <p>Items may be returned within 14 days of delivery for a full refund or exchange, provided they are unworn, unwashed, and in their original condition with all tags attached.</p>
        
        <h2>Exceptions</h2>
        <p>Custom commissions (Wearable Whispers) and made-to-order pieces cannot be returned or exchanged due to their bespoke nature.</p>
        
        <h2>Process</h2>
        <p>To initiate a return, please contact our concierge team via WhatsApp or email. We'll guide you through the process and arrange for pickup.</p>
      `,
    },
    privacy: {
      title: "Privacy Policy",
      content: formatContent(settings?.privacy_policy) || `
        <h2>Information We Collect</h2>
        <p>We collect information you provide directly to us, including name, email address, phone number, and shipping address when you make a purchase or enquiry.</p>
        
        <h2>How We Use Your Information</h2>
        <p>We use your information to process orders, respond to enquiries, send order updates, and (with your consent) share news about collections and events.</p>
        
        <h2>Data Protection</h2>
        <p>We implement appropriate security measures to protect your personal information. We never sell or share your data with third parties for marketing purposes.</p>
        
        <h2>Contact</h2>
        <p>For any privacy-related questions, please contact us at enquiries@chytare.com.</p>
      `,
    },
    terms: {
      title: "Terms & Conditions",
      content: formatContent(settings?.terms_conditions) || `
        <h2>General</h2>
        <p>By accessing and using the Chytare website, you agree to be bound by these terms and conditions.</p>
        
        <h2>Products</h2>
        <p>All products are handcrafted and may have slight variations in color, texture, and pattern. These variations are a natural characteristic of handmade goods and add to their unique beauty.</p>
        
        <h2>Pricing</h2>
        <p>Prices are displayed in Indian Rupees (INR) and are subject to change without notice. For "Price on Request" items, please contact our team for current pricing.</p>
        
        <h2>Intellectual Property</h2>
        <p>All content on this website, including images, text, and designs, is the property of Chytare and may not be reproduced without permission.</p>
      `,
    },
    care: {
      title: "Care Guide",
      content: formatContent(settings?.care_guide) || `
        <h2>General Care</h2>
        <p>Your Chytare piece is crafted from fine, natural materials that deserve gentle care to maintain their beauty for years to come.</p>
        
        <h2>Sarees</h2>
        <ul>
          <li>We recommend dry cleaning for all sarees</li>
          <li>Store folded with tissue paper in a cool, dry place</li>
          <li>Avoid prolonged exposure to direct sunlight</li>
          <li>Air out your saree after wearing before storing</li>
        </ul>
        
        <h2>Scarves</h2>
        <ul>
          <li>Hand wash in cold water with mild detergent, or dry clean</li>
          <li>Do not wring; gently press out excess water</li>
          <li>Dry flat away from direct sunlight</li>
          <li>Iron on low heat if needed</li>
        </ul>
        
        <h2>Special Care Notes</h2>
        <p>Handwoven and embroidered pieces require extra care. Always check the individual care instructions provided with your piece.</p>
      `,
    },
    faqs: {
      title: "Frequently Asked Questions",
      content: formatContent(settings?.faqs) || `
        <h2>Orders & Shipping</h2>
        <p><strong>How long will my order take?</strong><br/>Orders are typically dispatched within 7-10 business days. Delivery time depends on your location.</p>
        
        <p><strong>Do you ship internationally?</strong><br/>Yes, we ship worldwide. International shipping charges and customs duties apply.</p>
        
        <h2>Products</h2>
        <p><strong>Are your products handmade?</strong><br/>Yes, all our sarees and scarves are handcrafted by skilled artisans using traditional techniques.</p>
        
        <p><strong>Why do colors vary slightly?</strong><br/>Due to the handcrafted nature of our products and natural dyes used, slight color variations may occur. This is part of the charm of artisanal goods.</p>
        
        <h2>Custom Orders</h2>
        <p><strong>Can I request a custom piece?</strong><br/>Absolutely! Visit our Wearable Whispers page to submit a custom commission request.</p>
        
        <p><strong>How long does a custom order take?</strong><br/>Custom orders typically take 4-8 weeks, depending on complexity. We'll provide a timeline during consultation.</p>
      `,
    },
    authenticity: {
      title: "Authenticity & Craftsmanship",
      content: formatContent(settings?.authenticity_craftsmanship) || `
        <h2>Our Promise</h2>
        <p>Every Chytare piece is an authentic work of art, handcrafted by master artisans using time-honoured techniques passed down through generations.</p>

        <h2>Artisan Heritage</h2>
        <p>We work directly with weaving communities across India, ensuring fair compensation and preserving traditional craftsmanship that might otherwise be lost.</p>

        <h2>Certificate of Authenticity</h2>
        <p>Each piece comes with a certificate of authenticity detailing the artisan, region of origin, and the specific techniques used in its creation.</p>
      `,
    },
    "limited-edition": {
      title: "Limited Edition Policy",
      content: formatContent(settings?.limited_edition_policy) || `
        <h2>Limited Runs</h2>
        <p>Many of our collections are produced in limited quantities. Once a design sells out, it may not be reproduced.</p>

        <h2>Pre-Orders</h2>
        <p>For upcoming limited edition releases, we offer a pre-order option. Contact our concierge team to be notified of new drops.</p>

        <h2>Exclusivity</h2>
        <p>Our limited edition pieces are numbered and come with documentation of their edition run, making each piece a collector's item.</p>
      `,
    },
    "made-to-order": {
      title: "Made-to-Order Policy",
      content: formatContent(settings?.made_to_order_policy) || `
        <h2>Custom Creations</h2>
        <p>Our made-to-order service allows you to commission a unique piece tailored to your specifications — from colour palette to motif selection.</p>

        <h2>Timeline</h2>
        <p>Made-to-order pieces typically require 4–8 weeks from confirmation to delivery, depending on complexity and artisan availability.</p>

        <h2>Returns</h2>
        <p>Due to the bespoke nature of made-to-order pieces, they cannot be returned or exchanged. We ensure thorough consultation before production begins.</p>
      `,
    },
  };

  const policy = policyContent[policyKey] || {
    title: "Page Not Found",
    content: "<p>The page you're looking for doesn't exist.</p>",
  };


  return (
    <div data-testid="policy-page" className="min-h-screen bg-[#FFFFF0]">
      <Navigation />

      <div className="pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <Link
              to="/"
              className="inline-block text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60 hover:text-[#DACBA0] transition-colors mb-8"
            >
              ← Back to Home
            </Link>

            <h1 className="font-serif text-4xl md:text-5xl text-[#1B4D3E] mb-12">
              {policy.title}
            </h1>

            <div
              className="prose prose-lg max-w-none policy-content"
              dangerouslySetInnerHTML={{ __html: policy.content }}
            />
          </motion.div>
        </div>
      </div>

      <style>{`
        .policy-content h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          color: #1B4D3E;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .policy-content p {
          color: rgba(27, 77, 62, 0.8);
          line-height: 1.8;
          margin-bottom: 1rem;
          font-weight: 300;
        }
        .policy-content ul {
          list-style: none;
          padding-left: 0;
          margin-bottom: 1rem;
        }
        .policy-content ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .policy-content ol li {
          padding-left: 0.25rem;
          margin-bottom: 0.5rem;
          color: rgba(27, 77, 62, 0.8);
          font-weight: 300;
        }
        .policy-content ol li::before {
          content: none;
        }
        .policy-content ul li {
          position: relative;
          padding-left: 1.5rem;
          margin-bottom: 0.5rem;
          color: rgba(27, 77, 62, 0.8);
          font-weight: 300;
        }
        .policy-content li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.7em;
          width: 6px;
          height: 6px;
          background: #DACBA0;
        }
        .policy-content strong {
          color: #1B4D3E;
          font-weight: 500;
        }
        .policy-content em {
          font-style: italic;
        }
        .policy-content u {
          text-decoration: underline;
        }
      `}</style>

      <Footer />
    </div>
  );
};

export default PolicyPage;
