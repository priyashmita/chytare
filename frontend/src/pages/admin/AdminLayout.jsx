// ADMIN-DIAGNOSTIC-LAYOUT-1774273001
import React from "react";

const AdminLayout = ({ children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#000000",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        ADMIN LAYOUT IS RENDERING
      </h1>

      <div
        style={{
          padding: "20px",
          border: "2px solid black",
          background: "#f5f5f5",
        }}
      >
        <p style={{ fontSize: "18px", marginBottom: "12px" }}>
          If you can see this, the layout works.
        </p>

        <div style={{ borderTop: "1px solid #999", paddingTop: "20px" }}>
          {children || (
            <div style={{ color: "red", fontWeight: "bold" }}>
              NO CHILDREN ARE COMING INTO ADMIN LAYOUT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
