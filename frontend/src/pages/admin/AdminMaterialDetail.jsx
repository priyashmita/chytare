import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
 "./AdminLayout";
import { API } from "@/App";
import { Edit, UserX, UserCheck, ArrowLeft, ShoppingCart, Hammer, Layers } from "lucide-react";
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
    <div style={{ display: "flex", gap: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(218,203,160,0.15)" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(27,77,62,0.4)", minWidth: "140px", paddingTop: "2px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: "14px", color: "#1B4D3E", lineHeight: 1.5 }}>{value}</span>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <h3 style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400, color: "#1B4D3E", marginBottom: "20px" }}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{children}</div>
  </div>
);

const PlaceholderSection = ({ icon: Icon, title, description }) => (
  <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px", marginBottom: "16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
      <Icon style={{ width: 16, height: 16, color: "rgba(218,203,160,0.7)" }} />
      <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>{title}</h3>
    </div>
    <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>{description}</p>
  </div>
);

const TYPE_COLORS = {
  fabric: { bg: "rgba(27,77,62,0.08)", color: "#1B4D3E" },
  thread: { bg: "rgba(218,203,160,0.25)", color: "#8a7340" },
  trim: { bg: "rgba(192,128,129,0.12)", color: "#8a4445" },
  accessory: { bg: "rgba(100,120,200,0.1)", color: "#3a4a9a" },
  packaging: { bg: "rgba(150,150,150,0.12)", color: "#555" },
  dye: { bg: "rgba(180,80,180,0.1)", color: "#7a207a" },
  other: { bg: "rgba(180,180,180,0.12)", color: "#666" },
};

const AdminMaterialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMaterial(); }, [id]);

  const fetchMaterial = async () => {
    try {
      const res = await axios.get(`${API}/admin/materials/${id}`);
      setMaterial(res.data);
    } catch {
      toast.error("Material not found");
      navigate("/admin/materials");
    } finally { setLoading(false); }
  };

  const handleDeactivate = async () => {
    try { await axios.post(`${API}/admin/materials/${id}/deactivate`); toast.success("Material deactivated"); fetchMaterial(); }
    catch { toast.error("Failed"); }
  };

  const handleReactivate = async () => {
    try { await axios.post(`${API}/admin/materials/${id}/reactivate`); toast.success("Material reactivated"); fetchMaterial(); }
    catch { toast.error("Failed"); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  if (!material) return null;

  const isActive = (material.status || "active") === "active";
  const isFabric = material.material_type === "fabric";
  const typeStyle = TYPE_COLORS[material.material_type] || TYPE_COLORS.other;
  const hasFabricDetails = isFabric && (material.fabric_type || material.weave_type || material.gsm || material.origin_region || material.composition);

  return (
    
      <div style={{ maxWidth: "800px" }}>

        {/* Back */}
        <button onClick={() => navigate("/admin/materials")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Materials
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{material.material_code}</span>
              <span style={{ ...typeStyle, fontFamily: SANS, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500 }}>{material.material_type}</span>
              <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", fontWeight: 500, background: isActive ? "rgba(27,77,62,0.08)" : "rgba(192,128,129,0.1)", color: isActive ? "#1B4D3E" : "#C08081" }}>
                {material.status || "active"}
              </span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: "#1B4D3E" }}>{material.material_name}</h1>
            {material.color && <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{material.color}</p>}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => navigate(`/admin/materials/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
              <Edit style={{ width: 14, height: 14 }} /> Edit
            </button>
            {isActive ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="btn-luxury" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px", background: "transparent", border: "1px solid #C08081", color: "#C08081", cursor: "pointer" }}>
                    <UserX style={{ width: 14, height: 14 }} /> Deactivate
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FFFFF0]">
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Deactivate Material</AlertDialogTitle>
                    <AlertDialogDescription>Deactivate {material.material_name}? It will remain in the system but cannot be used for new purchases.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate} style={{ background: "#C08081", color: "white" }}>Deactivate</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <button onClick={handleReactivate} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
                <UserCheck style={{ width: 14, height: 14 }} /> Reactivate
              </button>
            )}
          </div>
        </div>

        {/* Swatch */}
        {material.swatch_url && (
          <div style={{ marginBottom: "16px" }}>
            <img src={material.swatch_url} alt="Material swatch" style={{ width: "160px", height: "160px", objectFit: "cover", border: "1px solid rgba(218,203,160,0.4)" }} />
            <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: "11px", color: "rgba(27,77,62,0.4)", marginTop: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Material Swatch</p>
          </div>
        )}

        {/* Core details */}
        <Section title="Material Details">
          <InfoRow label="Material Name" value={material.material_name} />
          <InfoRow label="Material Type" value={material.material_type} />
          <InfoRow label="Unit of Measure" value={material.unit_of_measure} />
          <InfoRow label="Colour" value={material.color} />
          <InfoRow label="In Stock" value={material.current_stock_qty !== undefined ? `${material.current_stock_qty} ${material.unit_of_measure}` : null} />
          <InfoRow label="Storage Location" value={material.storage_location} />
          {material.description && <InfoRow label="Description" value={material.description} />}
        </Section>

        {/* Fabric-specific */}
        {hasFabricDetails && (
          <Section title="Fabric Details">
            <InfoRow label="Fabric Type" value={material.fabric_type} />
            <InfoRow label="Weave Type" value={material.weave_type} />
            <InfoRow label="GSM" value={material.gsm ? `${material.gsm} g/m²` : null} />
            <InfoRow label="Origin Region" value={material.origin_region} />
            <InfoRow label="Composition" value={material.composition} />
          </Section>
        )}

        {/* Linked records — placeholders for future modules */}
        <PlaceholderSection
          icon={ShoppingCart}
          title="Material Purchases"
          description="Purchase batches for this material will appear here once the Purchases module is active. Each batch will show supplier, quantity, unit price, and received date."
        />
        <PlaceholderSection
          icon={Hammer}
          title="Production Jobs"
          description="Production jobs that use this material will appear here once the Production module is active."
        />
        <PlaceholderSection
          icon={Layers}
          title="Material Allocations"
          description="Allocation records showing which production batches consumed this material will appear here."
        />

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {material.created_at ? new Date(material.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {material.created_by_name && ` by ${material.created_by_name}`}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Last Updated</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {material.updated_at ? new Date(material.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {material.updated_by_name && ` by ${material.updated_by_name}`}
              </p>
            </div>
          </div>
        </div>

      </div>
    
  );
};

export default AdminMaterialDetail;
