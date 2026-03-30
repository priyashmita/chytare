import { useRef, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Download, Upload, CheckCircle, X } from "lucide-react";

const SANS = "'Manrope', sans-serif";

const IMPORT_CONFIG = {
  suppliers: {
    endpoint: "/admin/import/suppliers",
    required: ["supplier_name", "supplier_type"],
  },
  materials: {
    endpoint: "/admin/import/materials",
    required: ["material_name", "material_type", "unit_of_measure"],
  },
  products: {
    endpoint: "/admin/import/products",
    required: ["product_name", "category", "pricing_mode"],
  },
  "production-jobs": {
    endpoint: "/admin/import/production-jobs",
    required: ["product_code", "supplier_code", "quantity_planned"],
  },
};

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("chytare_token")}`,
});

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line, idx) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    row.__rowNum = idx + 2;
    return row;
  });
  return { headers, rows };
};

const validateRows = (rows, required) =>
  rows.map((row) => {
    const errors = [];
    required.forEach((field) => {
      if (!row[field] || !row[field].toString().trim()) errors.push(`${field} required`);
    });
    return { ...row, __errors: errors, __valid: errors.length === 0 };
  });

const ExportImportBar = ({ module, filters = {}, onImportDone }) => {
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const importConfig = IMPORT_CONFIG[module];
  const canImport = !!importConfig;

  const handleExport = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "all" && v !== "") params[k] = v;
      });
      const res = await axios.get(`${API}/admin/export/${module}`, {
        params,
        headers: authHeader(),
      });
      const data = res.data;
      if (!data || data.length === 0) return toast.error("No data to export");
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((h) => {
              const val = row[h] ?? "";
              return typeof val === "string" && (val.includes(",") || val.includes("\n"))
                ? `"${val}"`
                : val;
            })
            .join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${module}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} rows exported`);
    } catch {
      toast.error("Export failed");
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setPreview({ headers, rows: validateRows(rows, importConfig.required) });
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.__valid);
    if (validRows.length === 0) return toast.error("No valid rows to import");
    setImporting(true);
    try {
      const payload = validRows.map((row) => {
        const clean = { ...row };
        delete clean.__rowNum;
        delete clean.__errors;
        delete clean.__valid;
        return clean;
      });
      const res = await axios.post(
        `${API}${importConfig.endpoint}`,
        { rows: payload },
        { headers: authHeader() }
      );
      const { created = 0, updated = 0, skipped = 0 } = res.data;
      const parts = [];
      if (created) parts.push(`${created} created`);
      if (updated) parts.push(`${updated} updated`);
      if (skipped) parts.push(`${skipped} skipped`);
      toast.success(`Import done — ${parts.join(", ") || "no changes"}`);
      setShowModal(false);
      setPreview(null);
      setFile(null);
      if (onImportDone) onImportDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setPreview(null);
    setFile(null);
  };

  const validCount = preview ? preview.rows.filter((r) => r.__valid).length : 0;
  const errorCount = preview ? preview.rows.filter((r) => !r.__valid).length : 0;

  return (
    <>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={handleExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: SANS,
            fontSize: "12px",
            padding: "8px 12px",
            border: "1px solid rgba(27,77,62,0.2)",
            background: "rgba(27,77,62,0.04)",
            color: "#1B4D3E",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Download style={{ width: 13, height: 13 }} /> Export
        </button>

        {canImport && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontFamily: SANS,
              fontSize: "12px",
              padding: "8px 12px",
              border: "1px solid rgba(218,203,160,0.5)",
              background: "white",
              color: "#1B4D3E",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Upload style={{ width: 13, height: 13 }} /> Import
          </button>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: "white",
              width: "100%",
              maxWidth: "640px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "28px",
              position: "relative",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(27,77,62,0.4)",
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "20px",
                fontWeight: 400,
                color: "#1B4D3E",
                marginBottom: "4px",
              }}
            >
              Import {module}
            </h3>
            <p
              style={{
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(27,77,62,0.5)",
                marginBottom: "20px",
              }}
            >
              Required columns:{" "}
              {importConfig.required.map((r) => (
                <span
                  key={r}
                  style={{
                    background: "rgba(27,77,62,0.06)",
                    padding: "1px 6px",
                    marginRight: "4px",
                  }}
                >
                  {r}
                </span>
              ))}
            </p>

            {!preview && (
              <div
                style={{
                  border: "2px dashed rgba(218,203,160,0.5)",
                  padding: "24px",
                  textAlign: "center",
                  background: "rgba(255,255,240,0.5)",
                  cursor: "pointer",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  style={{
                    width: 22,
                    height: 22,
                    color: "rgba(27,77,62,0.3)",
                    margin: "0 auto 8px",
                  }}
                />
                <p style={{ fontFamily: SANS, fontSize: "13px", color: "rgba(27,77,62,0.5)" }}>
                  {file ? file.name : "Click to upload CSV file"}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "11px", color: "rgba(27,77,62,0.3)", marginTop: "4px" }}>
                  CSV format only
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {preview && (
              <div>
                <div style={{ display: "flex", gap: "16px", marginBottom: "12px", alignItems: "center" }}>
                  <span style={{ fontFamily: SANS, fontSize: "12px", color: "#2d6e2d" }}>
                    ✓ {validCount} valid rows
                  </span>
                  {errorCount > 0 && (
                    <span style={{ fontFamily: SANS, fontSize: "12px", color: "#C08081" }}>
                      ✗ {errorCount} rows with errors
                    </span>
                  )}
                  <button
                    onClick={() => { setPreview(null); setFile(null); fileInputRef.current?.click(); }}
                    style={{
                      fontFamily: SANS,
                      fontSize: "11px",
                      background: "none",
                      border: "none",
                      color: "rgba(27,77,62,0.5)",
                      cursor: "pointer",
                      marginLeft: "auto",
                      textDecoration: "underline",
                    }}
                  >
                    Change file
                  </button>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    maxHeight: "200px",
                    border: "1px solid rgba(218,203,160,0.2)",
                    marginBottom: "16px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "rgba(27,77,62,0.04)", position: "sticky", top: 0 }}>
                      <tr>
                        <th style={{ padding: "6px 10px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)", textAlign: "left" }}>
                          Row
                        </th>
                        {preview.headers.slice(0, 5).map((h) => (
                          <th key={h} style={{ padding: "6px 10px", fontFamily: SANS, fontSize: "10px", letterSpacing: "0.08em", color: "rgba(27,77,62,0.4)", textAlign: "left" }}>
                            {h}
                          </th>
                        ))}
                        <th style={{ padding: "6px 10px", fontFamily: SANS, fontSize: "10px", color: "rgba(27,77,62,0.4)" }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 20).map((row, i) => (
                        <tr
                          key={i}
                          style={{
                            borderTop: "1px solid rgba(218,203,160,0.1)",
                            background: row.__valid ? "white" : "rgba(192,128,129,0.04)",
                          }}
                        >
                          <td style={{ padding: "6px 10px", fontFamily: SANS, fontSize: "12px", color: "rgba(27,77,62,0.4)" }}>
                            {row.__rowNum}
                          </td>
                          {preview.headers.slice(0, 5).map((h) => (
                            <td key={h} style={{ padding: "6px 10px", fontFamily: SANS, fontSize: "12px", color: "#1B4D3E", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row[h] || "—"}
                            </td>
                          ))}
                          <td style={{ padding: "6px 10px" }}>
                            {row.__valid ? (
                              <CheckCircle style={{ width: 14, height: 14, color: "#2d6e2d" }} />
                            ) : (
                              <span style={{ fontFamily: SANS, fontSize: "10px", color: "#C08081" }}>
                                {row.__errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleImport}
                    disabled={importing || validCount === 0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: SANS,
                      fontSize: "12px",
                      padding: "10px 20px",
                      background: "#1B4D3E",
                      color: "#FFFFF0",
                      border: "none",
                      cursor: importing || validCount === 0 ? "not-allowed" : "pointer",
                      opacity: importing || validCount === 0 ? 0.5 : 1,
                    }}
                  >
                    <Upload style={{ width: 13, height: 13 }} />
                    {importing ? "Importing..." : `Import ${validCount} rows`}
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      fontFamily: SANS,
                      fontSize: "12px",
                      padding: "10px 16px",
                      background: "white",
                      border: "1px solid rgba(218,203,160,0.5)",
                      color: "#1B4D3E",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ExportImportBar;
