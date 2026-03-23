import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
 "./AdminLayout";
import { API } from "@/App";
import { Edit, UserX, UserCheck, ArrowLeft, Package, Hammer } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const InfoRow = ({ label, value }) => {
  if (!value) return null;
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

const AdminSupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState([]);
  const [capMeta, setCapMeta] = useState({ capability_types: [] });
  const [addingCap, setAddingCap] = useState(false);
  const [newCap, setNewCap] = useState("");

  useEffect(() => { fetchSupplier(); fetchCapabilities(); fetchCapMeta(); }, [id]);

  const fetchCapMeta = async () => {
    try { const res = await axios.get(`${API}/admin/supplier-capabilities/meta`); setCapMeta(res.data); }
    catch {}
  };

  const fetchCapabilities = async () => {
    try { const res = await axios.get(`${API}/admin/suppliers/${id}/capabilities`); setCapabilities(res.data); }
    catch {}
  };

  const handleAddCapability = async () => {
    if (!newCap) return;
    try {
      await axios.post(`${API}/admin/suppliers/${id}/capabilities`, { capability_type: newCap });
      toast.success("Capability added");
      setNewCap(""); setAddingCap(false);
      fetchCapabilities();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleRemoveCapability = async (capId) => {
    try {
      await axios.delete(`${API}/admin/suppliers/${id}/capabilities/${capId}`);
      toast.success("Capability removed");
      fetchCapabilities();
    } catch { toast.error("Failed"); }
  };

  const fetchSupplier = async () => {
    try {
      const res = await axios.get(`${API}/admin/suppliers/${id}`);
      setSupplier(res.data);
    } catch {
      toast.error("Supplier not found");
      navigate("/admin/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await axios.post(`${API}/admin/suppliers/${id}/deactivate`);
      toast.success("Supplier deactivated");
      fetchSupplier();
    } catch { toast.error("Failed"); }
  };

  const handleReactivate = async () => {
    try {
      await axios.post(`${API}/admin/suppliers/${id}/reactivate`);
      toast.success("Supplier reactivated");
      fetchSupplier();
    } catch { toast.error("Failed"); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  if (!supplier) return null;

  const isActive = (supplier.status || "active") === "active";
  const address = [supplier.address_line_1, supplier.address_line_2, supplier.city, supplier.state, supplier.country].filter(Boolean).join(", ");

  return (
    
      <div style={{ maxWidth: "800px" }}>

        {/* Back */}
        <button onClick={() => navigate("/admin/suppliers")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Suppliers
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{supplier.supplier_code}</span>
              <span style={{
                fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "2px 8px", fontWeight: 500,
                background: isActive ? "rgba(27,77,62,0.08)" : "rgba(192,128,129,0.1)",
                color: isActive ? "#1B4D3E" : "#C08081"
              }}>{supplier.status || "active"}</span>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: "#1B4D3E" }}>{supplier.supplier_name}</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>{supplier.supplier_type}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => navigate(`/admin/suppliers/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
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
                    <AlertDialogTitle style={{ fontFamily: SERIF, color: "#1B4D3E" }}>Deactivate Supplier</AlertDialogTitle>
                    <AlertDialogDescription>Deactivate {supplier.supplier_name}? They will remain in the system but cannot be linked to new purchases or production jobs.</AlertDialogDescription>
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

        {/* Contact */}
        <Section title="Contact Information">
          <InfoRow label="Contact Person" value={supplier.contact_person} />
          <InfoRow label="Phone" value={supplier.phone} />
          <InfoRow label="Alternate Phone" value={supplier.alternate_phone} />
          <InfoRow label="Email" value={supplier.email} />
          <InfoRow label="Address" value={address} />
        </Section>

        {/* Business */}
        <Section title="Business Details">
          <InfoRow label="Supplier Type" value={supplier.supplier_type} />
          <InfoRow label="GST Number" value={supplier.gst_number} />
          <InfoRow label="Payment Terms" value={supplier.payment_terms} />
          <InfoRow label="Lead Time" value={supplier.lead_time_days ? `${supplier.lead_time_days} days` : null} />
        </Section>

        {/* Notes */}
        {supplier.notes && (
          <Section title="Notes">
            <p style={{ fontFamily: SANS, fontSize: "14px", color: "rgba(27,77,62,0.75)", lineHeight: 1.7 }}>{supplier.notes}</p>
          </Section>
        )}

        {/* Linked Records — placeholders for future modules */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Package style={{ width: 16, height: 16, color: "rgba(218,203,160,0.8)" }} />
              <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Raw Material Purchases</h3>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>Purchase history from this supplier will appear here once the Purchases module is active.</p>
          </div>
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Hammer style={{ width: 16, height: 16, color: "rgba(218,203,160,0.8)" }} />
              <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E" }}>Production Jobs</h3>
            </div>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)", lineHeight: 1.6 }}>Production jobs assigned to this supplier will appear here once the Production module is active.</p>
          </div>
        </div>

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {supplier.created_by_name && ` by ${supplier.created_by_name}`}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Last Updated</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {supplier.updated_at ? new Date(supplier.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {supplier.updated_by_name && ` by ${supplier.updated_by_name}`}
              </p>
            </div>
          </div>
        </div>

      </div>
    
  );
};

export default AdminSupplierDetail;
