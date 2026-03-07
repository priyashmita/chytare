import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

const ProductGallery = ({ media = [] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const currentMedia = media[activeIndex] || {
    url: "https://images.pexels.com/photos/2723623/pexels-photo-2723623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    type: "image",
    alt: "Product"
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % media.length);
    setIsVideoPlaying(false);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + media.length) % media.length);
    setIsVideoPlaying(false);
  };

  const isVideo = currentMedia.type === "video";

  return (
    <div data-testid="product-gallery" className="space-y-4">
      {/* Main Image/Video */}
      <div className="relative aspect-[3/4] md:aspect-[4/5] bg-[#FFFFF0] border border-[#DACBA0]/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center p-4"
          >
            {isVideo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  src={currentMedia.url}
                  className="max-w-full max-h-full object-contain"
                  controls={isVideoPlaying}
                  autoPlay={isVideoPlaying}
                  loop
                  playsInline
                />
                {!isVideoPlaying && (
                  <button
                    onClick={() => setIsVideoPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center bg-[#1B4D3E]/10 hover:bg-[#1B4D3E]/20 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#FFFFF0] flex items-center justify-center">
                      <Play className="w-6 h-6 text-[#1B4D3E] ml-1" />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <img
                src={currentMedia.url}
                alt={currentMedia.alt || "Product"}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              data-testid="gallery-prev"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FFFFF0]/90 flex items-center justify-center hover:bg-[#DACBA0] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#1B4D3E]" />
            </button>
            <button
              onClick={goToNext}
              data-testid="gallery-next"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FFFFF0]/90 flex items-center justify-center hover:bg-[#DACBA0] transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#1B4D3E]" />
            </button>
          </>
        )}

        {/* Counter */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tracking-wider text-[#1B4D3E]/60 bg-[#FFFFF0]/90 px-4 py-2">
            {activeIndex + 1} / {media.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {media.map((item, index) => (
            <button
              key={item.id || index}
              onClick={() => {
                setActiveIndex(index);
                setIsVideoPlaying(false);
              }}
              data-testid={`gallery-thumb-${index}`}
              className={`relative flex-shrink-0 w-16 h-20 md:w-20 md:h-24 border transition-all ${
                index === activeIndex
                  ? "border-[#1B4D3E]"
                  : "border-[#DACBA0]/30 hover:border-[#DACBA0]"
              }`}
            >
              {item.type === "video" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1B4D3E]/10">
                  <Play className="w-4 h-4 text-[#1B4D3E]" />
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.alt || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-contain p-1"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
