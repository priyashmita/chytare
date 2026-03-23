import { useState, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Download, Upload, CheckCircle } from "lucide-react";

const SANS = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', serif";

const MODULES = [
  {
    key: "suppliers",
    label: "Suppliers",
    exportUrl: "/admin/export/suppliers",
    columns: ["supplier_name","supplier_type","contact_person","phone","alternate_phone","email","address_line_1","city","state","country","gst_number","payment_terms","lead_time_days","notes"],
    required: ["supplier_name","supplier_type"],
    description: "Fabric suppliers, embroiderers, weavers, artisans",
  },
  {
    key: "materials",
    label: "Materials",
    exportUrl: "/admin/export/materials",
    columns: ["material_name","material_type","unit_of_measure","color","fabric_type","fabric_count","weave_type","gsm","origin_region","composition","current_stock_qty","storage_location","description"],
    required: ["material_name","material_type","unit_of_measure"],
    description: "Raw materials — fabric, thread, trim, dye etc.",
  },
  {
    key: "products",
    label: "Products",
    exportUrl: "/admin/export/products",
    columns: ["product_name","category","pricing_mode","price","edition_size","collection_name","drop_name","description"],
    required: ["product_name","category","pricing_mode"],
    description: "Product Master records",
  },
  {
    key: "production-jobs",
    label: "Production Jobs",
    exportUrl: "/admin/export/production-jobs",
    columns: ["product_code","supplier_code","work_type","quantity_planned","start_date","proposed_end_date","due_date","cost_to_pay","notes"],
    required: ["product_code","supplier_code","quantity_planned"],
    description: "Production jobs — weaving, embroidery, block printing etc.",
  },
  {
    key: "enquiries",
    label: "Enquiries",
    exportUrl: "/admin/export/enquiries",
    columns: [],
    required: [],
    description: "Export only — enquiry data",
    exportOnly: true,
  },
  {
    key: "orders",
    label: "Orders",
    exportUrl: "/admin/export/orders",
    columns: [],
    required: [],
    description: "Export only — order data",
    exportOnly: true,
  },
];

const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line, idx) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    row.__rowNum = idx + 2;
    return row;
  });
  return { headers, rows };
};

const downloadTemplate = (module) => {
  const csv =
    module.columns.join(",") + "\n" + module.columns.map(() => "").join(",");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_${module.key}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadExport = async (module) => {
  try {
    const res = await axios.get(`${API}${module.exportUrl}`);
    const data = res.data;
    if (!data || data.length === 0) return toast.error("No data to export");
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h] ?? "";
            return typeof val === "string" &&
              (val.includes(",") || val.includes("\n"))
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
    a.download = `${module.key}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${module.label} exported`);
  } catch {
    toast.error("Export failed");
  }
};

const validateRows = (rows, required) => {
  return rows.map((row) => {
    const errors = [];
    required.forEach((field) => {
      if (!row[field] || !row[field].toString().trim()) {
        errors.push(`${field} is required`);
      }
    });
    return { ...row, __errors: errors, __valid: errors.length === 0 };
  });
};

const IMPORT_ENDPOINTS = {
  suppliers: "/admin/import/suppliers",
  materials: "/admin/import/materials",
  products: "/admin/import/products",
  "production-jobs": "/admin/import/production-jobs",
};

const ModuleCard = ({ module }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      const validated = validateRows(rows, module.required);
      setPreview({ headers, rows: validated });
    };
    reader.readAsText(f);
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

      const res = await axios.post(`${API}${IMPORT_ENDPOINTS[module.key]}`, {
        rows: payload,
      });

      setResult(res.data);
      setPreview(null);
      setFile(null);
      toast.success(`Imported ${res.data.created || validRows.length} ${module.label}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const validCount = preview ? preview.rows.filter((r) => r.__valid).length : 0;
  const errorCount = preview ? preview.rows.filter((r) => !r.__valid).length : 0;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(218,203,160,0.3)",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: SERIF,
              fontSize: "18px",
              fontWeight: 400,
              color: "#1B4D3E",
            }}
          >
            {module.label}
          </h3>
          <p
            style={{
              fontFamily: SANS,
              fontSize: "12px",
              color: "rgba(27,77,62,0.5)",
              marginTop: "4px",
            }}
          >
            {module.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {!module.exportOnly && (
            <button
              onClick={() => downloadTemplate(module)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: SANS,
                fontSize: "12px",
                padding: "8px 14px",
                border: "1px solid rgba(218,203,160,0.5)",
                background: "white",
                color: "#1B4D3E",
                cursor: "pointer",
              }}
            >
              <Download style={{ width: 13, height: 13 }} /> Download Template
            </button>
          )}

          <button
            onClick={() => downloadExport(module)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: SANS,
              fontSize: "12px",
              padding: "8px 14px",
              border: "1px solid rgba(27,77,62,0.2)",
              background: "rgba(27,77,62,0.04)",
              color: "#1B4D3E",
              cursor: "pointer",
            }}
          >
            <Download style={{ width: 13, height: 13 }} /> Export Data
          </button>
        </div>
      </div>

      {!module.exportOnly && module.required.length > 0 && (
        <p
          style={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "rgba(27,77,62,0.4)",
            marginBottom: "16px",
          }}
        >
          Required columns:{" "}
          {module.required.map((r) => (
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
      )}

      {!module.exportOnly && (
        <>
          <div
            style={{
              border: "2px dashed rgba(218,203,160,0.5)",
              padding: "20px",
              textAlign: "center",
              background: "rgba(255,255,240,0.5)",
              cursor: "pointer",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload
              style={{
                width: 20,
                height: 20,
                color: "rgba(27,77,62,0.3)",
                margin: "0 auto 8px",
              }}
            />
            <p
              style={{
                fontFamily: SANS,
                fontSize: "13px",
                color: "rgba(27,77,62,0.5)",
              }}
            >
              {file ? file.name : "Click to upload CSV file"}
            </p>
            <p
              style={{
                fontFamily: SANS,
                fontSize: "11px",
                color: "rgba(27,77,62,0.3)",
                marginTop: "4px",
              }}
            >
              CSV format only
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {preview && (
            <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  marginBottom: "12px",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: "12px",
                    color: "#2d6e2d",
                  }}
                >
                  ✓ {validCount} valid rows
                </span>
                {errorCount > 0 && (
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: "12px",
                      color: "#C08081",
                    }}
                  >
                    ✗ {errorCount} rows with errors
                  </span>
                )}
              </div>

              <div
                style={{
                  overflowX: "auto",
                  maxHeight: "200px",
                  border: "1px solid rgba(218,203,160,0.2)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead
                    style={{
                      background: "rgba(27,77,62,0.04)",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: "6px 10px",
                          fontFamily: SANS,
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          color: "rgba(27,77,62,0.4)",
                          textAlign: "left",
                        }}
                      >
                        Row
                      </th>
                      {preview.headers.slice(0, 6).map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "6px 10px",
                            fontFamily: SANS,
                            fontSize: "10px",
                            letterSpacing: "0.08em",
                            color: "rgba(27,77,62,0.4)",
                            textAlign: "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                      <th
                        style={{
                          padding: "6px 10px",
                          fontFamily: SANS,
                          fontSize: "10px",
                          color: "rgba(27,77,62,0.4)",
                        }}
                      >
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
                          background: row.__valid
                            ? "white"
                            : "rgba(192,128,129,0.04)",
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 10px",
                            fontFamily: SANS,
                            fontSize: "12px",
                            color: "rgba(27,77,62,0.4)",
                          }}
                        >
                          {row.__rowNum}
                        </td>
                        {preview.headers.slice(0, 6).map((h) => (
                          <td
                            key={h}
                            style={{
                              padding: "6px 10px",
                              fontFamily: SANS,
                              fontSize: "12px",
                              color: "#1B4D3E",
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row[h] || "—"}
                          </td>
                        ))}
                        <td style={{ padding: "6px 10px" }}>
                          {row.__valid ? (
                            <CheckCircle
                              style={{
                                width: 14,
                                height: 14,
                                color: "#2d6e2d",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontFamily: SANS,
                                fontSize: "10px",
                                color: "#C08081",
                              }}
                            >
                              {row.__errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
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
                    cursor: importing ? "not-allowed" : "pointer",
                    opacity: importing ? 0.5 : 1,
                  }}
                >
                  <Upload style={{ width: 13, height: 13 }} />
                  {importing ? "Importing..." : `Import ${validCount} rows`}
                </button>

                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
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

          {result && (
            <div
              style={{
                marginTop: "12px",
                background: "rgba(100,160,100,0.06)",
                border: "1px solid rgba(100,160,100,0.3)",
                padding: "12px 16px",
              }}
            >
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  color: "#2d6e2d",
                  fontWeight: 500,
                }}
              >
                ✓ Import complete — {result.created} created,{" "}
                {result.skipped || 0} skipped, {result.errors || 0} errors
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AdminExcelImport = () => (
  <div data-testid="admin-excel-import">
    <div style={{ marginBottom: "32px" }}>
      <h1
        style={{
          fontFamily: SERIF,
          fontSize: "28px",
          fontWeight: 400,
          color: "#1B4D3E",
        }}
      >
        Excel Import / Export
      </h1>
      <p
        style={{
          fontFamily: SANS,
          fontSize: "13px",
          color: "rgba(27,77,62,0.5)",
          marginTop: "4px",
        }}
      >
        Download templates, upload bulk data, or export all records to CSV
      </p>
    </div>

    <div
      style={{
        background: "rgba(27,77,62,0.04)",
        border: "1px solid rgba(218,203,160,0.3)",
        padding: "16px 20px",
        marginBottom: "24px",
      }}
    >
      <p
        style={{
          fontFamily: SANS,
          fontSize: "13px",
          color: "#1B4D3E",
          fontWeight: 500,
          marginBottom: "4px",
        }}
      >
        How to import:
      </p>
      <p
        style={{
          fontFamily: SANS,
          fontSize: "12px",
          color: "rgba(27,77,62,0.6)",
          lineHeight: 1.7,
        }}
      >
        1. Download the template CSV for that module
        <br />
        2. Fill in your data (keep column names exactly as shown)
        <br />
        3. Upload the filled CSV — you'll see a preview with validation
        <br />
        4. Fix any errors, then click Import
      </p>
    </div>

    {MODULES.map((m) => (
      <ModuleCard key={m.key} module={m} />
    ))}
  </div>
);

export default AdminExcelImport;
