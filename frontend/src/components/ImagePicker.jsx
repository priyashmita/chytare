import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Image, Upload, X, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ImagePicker = ({ value, onChange, label, testId }) => {
  const [mode, setMode] = useState("url"); // url | browse | upload
  const [productMedia, setProductMedia] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchProductMedia = async () => {
    if (productMedia.length > 0) return;
    setLoadingMedia(true);
    try {
      const res = await axios.get(`${API}/products/media/all`);
      setProductMedia(res.data || []);
    } catch {
      toast.error("Failed to load product media");
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/upload`, formData);
      onChange(res.data.url);
      setMode("url");
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = productMedia.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.collection_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div data-testid={testId}>
      <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-2 block">{label}</Label>

      {/* Current image preview */}
      {value && (
        <div className="relative mb-3 border border-[#DACBA0]/20 bg-[#1B4D3E]/5 aspect-video max-w-xs overflow-hidden group">
          <img src={value} alt="Selected" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-white/90 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-[#C08081]" />
          </button>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {[
          { key: "url", label: "URL" },
          { key: "browse", label: "Product Media" },
          { key: "upload", label: "Upload" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setMode(tab.key);
              if (tab.key === "browse") fetchProductMedia();
            }}
            className={`text-xs px-3 py-1.5 border transition-colors ${
              mode === tab.key
                ? "bg-[#1B4D3E] text-[#FFFFF0] border-[#1B4D3E]"
                : "border-[#DACBA0]/30 text-[#1B4D3E]/60 hover:border-[#DACBA0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste image URL..."
          className="text-sm"
          data-testid={`${testId}-url-input`}
        />
      )}

      {/* Browse product media */}
      {mode === "browse" && (
        <div className="border border-[#DACBA0]/20 max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-[#DACBA0]/10 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#1B4D3E]/40" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="pl-7 text-xs h-8"
              />
            </div>
          </div>

          {loadingMedia ? (
            <div className="p-4 text-center text-xs text-[#1B4D3E]/40 animate-pulse">Loading media...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#1B4D3E]/40">
              {productMedia.length === 0 ? "No products have images yet" : "No matching products"}
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {filteredProducts.map((product) => (
                <div key={product.id}>
                  <p className="text-xs font-medium text-[#1B4D3E] px-1 mb-1">{product.name}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {product.media.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { onChange(m.url); setMode("url"); }}
                        className={`relative aspect-square border-2 overflow-hidden transition-all ${
                          value === m.url ? "border-[#DACBA0]" : "border-transparent hover:border-[#DACBA0]/50"
                        }`}
                      >
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                        {value === m.url && (
                          <div className="absolute inset-0 bg-[#1B4D3E]/40 flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#FFFFF0]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          <input type="file" accept="image/*" ref={fileRef} onChange={handleUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-[#DACBA0]/40 hover:border-[#DACBA0] transition-colors w-full text-sm text-[#1B4D3E]/60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Click to upload an image (max 10MB)"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
