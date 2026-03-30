import { Link } from "react-router-dom";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const LINKS = [
  { label: "Suppliers", path: "/admin/suppliers", note: "Export + Import" },
  { label: "Materials", path: "/admin/materials", note: "Export + Import" },
  { label: "Product Master", path: "/admin/product-master", note: "Export + Import" },
  { label: "Production Jobs", path: "/admin/production-jobs", note: "Export + Import" },
  { label: "Enquiries", path: "/admin/enquiries", note: "Export only" },
  { label: "Orders", path: "/admin/orders", note: "Export only" },
];

const AdminExcelImport = () => (
  <div>
    <div style={{ marginBottom: "32px" }}>
      <h1 style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "#1B4D3E" }}>Export / Import</h1>
      <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)", marginTop: "4px" }}>
        Export and import buttons are now built into each list page directly.
      </p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
      {LINKS.map(({ label, path, note }) => (
        <Link key={path} to={path} style={{ display: "block", background: "white", border: "1px solid rgba(218,203,160,0.4)", padding: "20px 24px", textDecoration: "none" }}>
          <p style={{ fontFamily: SERIF, fontSize: "16px", color: "#1B4D3E", margin: "0 0 6px", fontWeight: 400 }}>{label}</p>
          <p style={{ fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.45)", margin: 0 }}>{note}</p>
        </Link>
      ))}
    </div>
  </div>
);

export default AdminExcelImport;
