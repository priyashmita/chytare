import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ProductCard = ({ product, index = 0 }) => {
  const mainImage = product.media?.[0]?.url || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link
        to={`/product/${product.slug}`}
        data-testid={`product-card-${product.slug}`}
        className="group block"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl mb-4">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ objectPosition: "50% 15%" }}
            />
          ) : (
            <div className="w-full h-full bg-[#1B4D3E]/10 flex items-center justify-center">
              <span className="font-serif text-sm text-[#DACBA0]">{product.name}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-[#1B4D3E]/0 group-hover:bg-[#1B4D3E]/5 transition-colors duration-500" />

          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <span className="block w-full py-3 text-center text-xs uppercase tracking-[0.2em] bg-[#FFFFF0]/95 text-[#1B4D3E] rounded-lg">
              View Details
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-serif text-lg text-[#1B4D3E] group-hover:text-[#DACBA0] transition-colors">
            {product.name}
          </h3>

          {product.design_category && (
            <p className="text-xs uppercase tracking-[0.15em] text-[#1B4D3E]/60">
              {product.design_category}
            </p>
          )}

          {product.price_on_request ? (
            <p className="text-sm text-[#DACBA0]">Price on Request</p>
          ) : product.price ? (
            <p className="text-sm text-[#1B4D3E]">
              ₹{product.price.toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
