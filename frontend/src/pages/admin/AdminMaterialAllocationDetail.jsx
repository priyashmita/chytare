import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Edit, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

const AdminMaterialAllocationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alloc, setAlloc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAllocation(); }, [id]);

  const fetchAllocation = async () => {
    try {
      const res = await axios.get(`${API}/admin/material-allocations/${id}`);
      setAlloc(res.data);
    } catch {
      toast.error("Allocation not found");
      navigate("/admin/material-allocations");
    } finally { setLoading(false); }
  };

  if (loading) return (
    
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: "80px", background: "rgba(218,203,160,0.1)" }} />)}
      </div>
    
  );

  if (!alloc) return null;

  const job = alloc._job || {};
  const purchase = alloc._purchase || {};
  const movement = alloc._inventory_movement || {};
  const utilizationPct = alloc.quantity_allocated > 0 ? Math.round((alloc.quantity_used / alloc.quantity_allocated) * 100) : 0;

  return (
    
      <div style={{ maxWidth: "800px" }}>

        <button onClick={() => navigate("/admin/material-allocations")} style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Allocations
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)" }}>{alloc.allocation_code}</span>
            <h1 style={{ fontFamily: SERIF, fontSize: "24px", fontWeight: 400, color: "#1B4D3E", marginTop: "6px" }}>{alloc.material_name || "Material Allocation"}</h1>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
              {alloc.job_code} · {alloc.product_name}
            </p>
          </div>
          <button onClick={() => navigate(`/admin/material-allocations/${id}/edit`)} className="btn-luxury btn-luxury-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", fontSize: "11px" }}>
            <Edit style={{ width: 14, height: 14 }} /> Edit
          </button>
        </div>

        {/* Utilization bar */}
        <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontFamily: SANS, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.5)" }}>Material Utilisation</span>
            <span style={{ fontFamily: SANS, fontSize: "13px", fontWeight: 600, color: "#1B4D3E" }}>
              {alloc.quantity_used} / {alloc.quantity_allocated} {alloc.unit_of_measure}
            </span>
          </div>
          <div style={{ height: "8px", background: "rgba(218,203,160,0.3)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#1B4D3E", width: `${utilizationPct}%`, transition: "width 0.5s", borderRadius: "4px" }} />
          </div>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)", marginTop: "6px" }}>{utilizationPct}% used</p>
        </div>

        {/* Allocation Details */}
        <Card title="Allocation Details">
          <InfoRow label="Allocation Code" value={alloc.allocation_code} />
          <InfoRow label="Quantity Allocated" value={`${alloc.quantity_allocated} ${alloc.unit_of_measure || ""}`} />
          <InfoRow label="Quantity Used" value={alloc.quantity_used > 0 ? `${alloc.quantity_used} ${alloc.unit_of_measure || ""}` : "Not yet used"} />
          {alloc.notes && <InfoRow label="Notes" value={alloc.notes} />}
        </Card>

        {/* Production Job */}
        <Card title="Production Job">
          <InfoRow label="Job Code" value={job.job_code} />
          <InfoRow label="Product" value={job.product_name} />
          <InfoRow label="Supplier" value={job.supplier_name} />
          <InfoRow label="Work Type" value={job.work_type?.replace(/_/g, " ")} />
          <InfoRow label="Status" value={job.status?.replace(/_/g, " ")} />
          {job.id && (
            <div>
              <a href={`/admin/production-jobs/${job.id}`} style={{ fontFamily: SANS, fontSize: "13px", color: "#1B4D3E", textDecoration: "underline" }}>View production job →</a>
            </div>
          )}
        </Card>

        {/* Material Batch */}
        <Card title="Material Batch">
          <InfoRow label="Material" value={purchase.material_name || alloc.material_name} />
          <InfoRow label="Material Code" value={purchase.material_code || alloc.material_code} />
          <InfoRow label="Purchase Batch" value={purchase.purchase_code} />
          <InfoRow label="Supplier" value={purchase.supplier_name} />
          <InfoRow label="Original Qty" value={purchase.quantity_received ? `${purchase.quantity_received} ${alloc.unit_of_measure || ""}` : null} />
          <InfoRow label="Remaining in Batch" value={purchase.quantity_available !== undefined ? `${purchase.quantity_available} ${alloc.unit_of_measure || ""}` : null} />
        </Card>

        {/* Inventory Movement */}
        {movement.id ? (
          <Card title="Inventory Movement">
            <InfoRow label="Movement Type" value="Material Allocated" />
            <InfoRow label="Quantity" value={`−${Math.abs(movement.quantity)} ${alloc.unit_of_measure || ""}`} />
            <InfoRow label="Entity Type" value={movement.entity_type} />
            <InfoRow label="Reference" value={`${movement.reference_type} / ${movement.reference_id?.slice(0,8)}...`} />
            <InfoRow label="Recorded" value={movement.created_at ? new Date(movement.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
          </Card>
        ) : (
          <div style={{ background: "white", border: "1px solid rgba(218,203,160,0.3)", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 400, color: "#1B4D3E", marginBottom: "8px" }}>Inventory Movement</h3>
            <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.4)" }}>No inventory movement recorded yet.</p>
          </div>
        )}

        {/* Audit */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid rgba(218,203,160,0.2)" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(27,77,62,0.3)", marginBottom: "4px" }}>Created</p>
              <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.5)" }}>
                {alloc.created_at ? new Date(alloc.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                {alloc.created_by_name && ` by ${alloc.created_by_name}`}
              </p>
            </div>
          </div>
        </div>

      </div>
    
  );
};

export default AdminMaterialAllocationDetail;
