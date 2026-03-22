import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Edit, Archive, CheckCircle, ArrowLeft, Hammer, Layers, MessageSquare, ShoppingBag, Copy} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

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

const PlaceholderCard = ({ icon: Icon, title, description, count }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon style={{ width: 15, height: 15, color: "rgba(218,203,160,0.8)" }} />
        <h4 style={{ fontFamily: SERIF, fontSize: "14px", fontWeight: 400, color: "#1B4D3E" }}>{title}</h4>
      </div>
      {count > 0 && <span style={{ fontFamily: SANS, fontSize: "12px", fontWeight: 600, color: "#1B4D3E", background: "rgba(27,77,62,0.08)", padding: "2px 8px" }}>{count}</span>}
    </div>
    <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>{description}</p>
  </div>
);

const STATUS_STYLE = {
  draft:    { bg: "rgba(218,203,160,0.2)",  color: "#8a7340" },
  active:   { bg: "rgba(27,77,62,0.08)",    color: "#1B4D3E" },
  archived: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
};

const AdminProductMasterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProduct(); }, [id]);

  const handleDuplicate = async () => {
    try {
      const res = await axios.post(`${API}/admin/product-master/${id}/duplicate`);
      toast.success(res.data.message);
      navigate(`/admin/product-master/${res.data.id}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Duplicate failed"); }
  };

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/admin/product-master/${id}`);
      setProduct(res.data);
    } catch {
      toast.error("Product not found");
      navigate("/admin/product-master");
    } finally { setLoading(false); }
  };

  const handleActivate = async () => {
    try { await axios.post(`${API}/admin/product-master/${id}/activate`); toast.success("Product activated"); fetchProduct(); }
    catch (err) { toast.error(err.response?.data?.detail || "Cannot activate — check edition size and price"); }
  };

  const handleArchive = async () => {
    try { await axios.post(`${API}/admin/product-master/${id}/archive`); toast.success("Product archived"); fetchProduct(); }
    catch { toast.error("Failed"); }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    </AdminLayout>
  );

  if (!product) return null;

  const statusStyle = STATUS_STYLE[product.status] || STATUS_STYLE.draft;
  const attrs = product.attributes || {};
  const hasAttrs = Object.values(attrs).some(v => v && v !== product.id);
  const linked = product._linked || {};

  return (
    <AdminLayout>
      <div style={{ maxWidth: "860px" }}>

        {/* Back */}
        <button onClick={() => navigate("/admin/product-master")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Product Master
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "13px", letterSpacing: "0.1em", color: "rgba(27,77,62,0.4)", fontWeight: 600 }}>{product.product_code}</span>
              <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", background: "rgba(218,203,160,0.15)", color: "rgba(27,77,62,0.6)" }}>{product.category}</span>
              <span style={{ ...statusStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{product.status}</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: "#1B4D3E" }}>{product.product_name}</h1>
            {product.collection_name && <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{product.collection_name}{product.drop_name ? ` · ${product.drop_name}` : ""}</p>}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {product.status !== "archived" && (
              <button onClick={() => navigate(`/admin/product-master/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <Edit style={{ width: 14, height: 14 }} /> Edit</button>
              <button onClick={handleDuplicate} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                Duplicate
              </button>
            )}
            {product.status === "draft" && (
              <button onClick={handleActivate} className="btn-luxury btn-luxury-primary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <CheckCircle style={{ width: 14, height: 14 }} /> Activate
              </button>
            )}
            {product.status === "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="btn-luxury" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", background: "transparent", border: "1px solid #C08081", color: "#C08081", cursor: "pointer" }}>
                    <Archive style={{ width: 14, height: 14 }} /> Archive
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FFFFF0]">
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Archive Product</AlertDialogTitle>
                    <AlertDialogDescription>Archive {product.product_name}? It will no longer be available for new orders or enquiries.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} style={{ background: "#C08081", color: "white" }}>Archive</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Draft warning */}
        {product.status === "draft" && (
          <div style={{ background: "rgba(218,203,160,0.15)", border: "1px solid rgba(218,203,160,0.4)", padding: "12px 16px", marginBottom: "20px", fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.7)" }}>
            ⚠ This product is in Draft. It will not appear on the public site or be available for orders until activated.
          </div>
        )}

        {/* Core details */}
        <Card title="Product Details">
          <InfoRow label="Product Code" value={product.product_code} />
          <InfoRow label="Product Name" value={product.product_name} />
          <InfoRow label="Category" value={product.category} />
          <InfoRow label="Subcategory" value={product.subcategory} />
          <InfoRow label="Collection" value={product.collection_name} />
          <InfoRow label="Drop" value={product.drop_name} />
          <InfoRow label="Edition Size" value={product.edition_size ? `${product.edition_size} pieces` : null} />
          <InfoRow label="Release Date" value={product.release_date} />
          {product.description && <InfoRow label="Description" value={product.description} />}
          {product.website_product_id && (
            <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.12)" }}>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "160px", paddingTop: "2px", flexShrink: 0 }}>Website Product</span>
              <a href={`/admin/products/${product.website_product_id}`} style={{ fontFamily: "'Manrope', sans-serif", fontSize: "13px", color: "#1B4D3E", textDecoration: "underline" }}>View on website admin →</a>
            </div>
          )}
        </Card>

        {/* Pricing */}
        <Card title="Pricing">
          <InfoRow label="Pricing Mode" value={product.pricing_mode === "direct_purchase" ? "Direct Purchase" : "Price on Request"} />
          <InfoRow label="Price" value={product.price ? `₹${product.price.toLocaleString("en-IN")}` : (product.pricing_mode === "price_on_request" ? "Available upon enquiry" : null)} />
          <InfoRow label="Currency" value={product.currency} />
        </Card>

        {/* Design attributes */}
        {hasAttrs && (
          <Card title="Design Attributes">
            <InfoRow label="Primary Colour" value={attrs.primary_color} />
            <InfoRow label="Secondary Colour" value={attrs.secondary_color} />
            <InfoRow label="Accent Colour" value={attrs.accent_color} />
            <InfoRow label="Fabric Type" value={attrs.fabric_type} />
            <InfoRow label="Craft Technique" value={attrs.craft_technique} />
            <InfoRow label="Motif Type" value={attrs.motif_type} />
            <InfoRow label="Motif Subject" value={attrs.motif_subject} />
            <InfoRow label="Embroidery Type" value={attrs.embroidery_type} />
            <InfoRow label="Embroidery Density" value={attrs.embroidery_density} />
            <InfoRow label="Border Type" value={attrs.border_type} />
            <InfoRow label="Pattern Scale" value={attrs.pattern_scale} />
            <InfoRow label="Art Inspiration" value={attrs.art_inspiration} />
            <InfoRow label="Aesthetic Category" value={attrs.aesthetic_category} />
          </Card>
        )}

        {/* Linked modules — placeholders */}
        <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "12px", marginTop: "8px" }}>Linked Records</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <PlaceholderCard icon={Hammer} title="Production Jobs" description="Production runs for this product will appear here once the Production module is active." count={linked.production_jobs} />
          <PlaceholderCard icon={Layers} title="Inventory" description="Finished goods units for this product will appear here once production is completed." count={linked.inventory_units} />
          <PlaceholderCard icon={MessageSquare} title="Enquiries" description="Customer enquiries for this product." count={linked.enquiries} />
          <PlaceholderCard icon={ShoppingBag} title="Orders" description="Orders placed for this product will appear here once the Orders module is active." count={linked.orders} />
        </div>

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {product.created_at ? new Date(product.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {product.created_by_name && ` by ${product.created_by_name}`}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Last Updated</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {product.updated_at ? new Date(product.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {product.updated_by_name && ` by ${product.updated_by_name}`}
              </p>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminProductMasterDetail;
