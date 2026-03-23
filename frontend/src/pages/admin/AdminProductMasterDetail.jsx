// FORCE-REBUILD-1774200650
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
 "./AdminLayout";
import { API } from "@/App";
import { Edit, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const STATUS_STYLE = {
  draft:    { bg: "rgba(218,203,160,0.2)",  color: "#8a7340" },
  active:   { bg: "rgba(27,77,62,0.08)",   color: "#1B4D3E" },
  archived: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
};

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.12)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "160px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
  </div>
);

const AdminProductMasterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/admin/product-master/${id}`);
      setProduct(res.data);
    } catch {
      toast.error("Product not found");
      navigate("/admin/product-master");
    } finally { setLoading(false); }
  };

  const handleDuplicate = async () => {
    try {
      const res = await axios.post(`${API}/admin/product-master/${id}/duplicate`);
      toast.success(`Duplicated as ${res.data.product_code}`);
      navigate(`/admin/product-master/${res.data.id}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to duplicate");
    }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  if (!product) return null;

  const statusStyle = STATUS_STYLE[product.status] || STATUS_STYLE.draft;
  const attrs = product.attributes || {};

  return (
    
      <div style={{ maxWidth: "860px" }}>
        <button onClick={() => navigate("/admin/product-master")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Product Master
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{product.product_code}</span>
              <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{product.status}</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E" }}>{product.product_name}</h1>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={handleDuplicate} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", fontFamily: SANS, background: "white", border: "1px solid rgba(218,203,160,0.5)", color: "#1B4D3E", cursor: "pointer" }}>
              <Copy style={{ width: 13, height: 13 }} /> Duplicate
            </button>
            {product.status !== "archived" && (
              <button onClick={() => navigate(`/admin/product-master/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <Edit style={{ width: 13, height: 13 }} /> Edit
              </button>
            )}
          </div>
        </div>

        <Card title="Product Details">
          <InfoRow label="Product Code" value={product.product_code} />
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Collection" value={product.collection_name} />
          <InfoRow label="Drop" value={product.drop_name} />
          <InfoRow label="Pricing Mode" value={product.pricing_mode?.replace(/_/g, " ")} />
          <InfoRow label="Price" value={product.price ? `₹${product.price.toLocaleString("en-IN")}` : null} />
          <InfoRow label="Edition Size" value={product.edition_size} />
          <InfoRow label="Release Date" value={product.release_date} />
          <InfoRow label="Description" value={product.description} />
        </Card>

        {Object.values(attrs).some(v => v && v !== product.product_id) && (
          <Card title="Design Attributes">
            <InfoRow label="Primary Colour" value={attrs.primary_color} />
            <InfoRow label="Secondary Colour" value={attrs.secondary_color} />
            <InfoRow label="Fabric Type" value={attrs.fabric_type} />
            <InfoRow label="Craft Technique" value={attrs.craft_technique} />
            <InfoRow label="Motif Type" value={attrs.motif_type} />
            <InfoRow label="Motif Subject" value={attrs.motif_subject} />
            <InfoRow label="Embroidery Type" value={attrs.embroidery_type} />
            <InfoRow label="Border Type" value={attrs.border_type} />
            <InfoRow label="Art Inspiration" value={attrs.art_inspiration} />
            <InfoRow label="Aesthetic Category" value={attrs.aesthetic_category} />
          </Card>
        )}

        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
            Created {product.created_at ? new Date(product.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
            {product.created_by_name && ` by ${product.created_by_name}`}
          </p>
        </div>
      </div>
    
  );
};

export default AdminProductMasterDetail;
