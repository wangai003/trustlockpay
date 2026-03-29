import React from "react";

export const BrowserFrame: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <div style={{
    width: 1400,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
    border: "1px solid rgba(200,169,81,0.2)",
  }}>
    <div style={{
      background: "#1a1a1a",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
      </div>
      <div style={{
        flex: 1,
        background: "#2a2a2a",
        borderRadius: 8,
        padding: "6px 16px",
        fontSize: 13,
        color: "#888",
        fontFamily: "monospace",
      }}>
        {url}
      </div>
    </div>
    <div style={{ background: "#f8f9fa", minHeight: 600 }}>
      {children}
    </div>
  </div>
);

export const DashboardFrame: React.FC<{
  title: string;
  role: string;
  children: React.ReactNode;
  sidebarItems?: string[];
  activeItem?: string;
}> = ({ title, role, children, sidebarItems = [], activeItem }) => (
  <div style={{
    width: 1500,
    height: 780,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
    border: "1px solid rgba(200,169,81,0.2)",
    display: "flex",
  }}>
    {/* Sidebar */}
    <div style={{
      width: 240,
      background: "#0f2314",
      padding: "24px 0",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "0 20px 20px",
        borderBottom: "1px solid rgba(200,169,81,0.15)",
        marginBottom: 16,
      }}>
        <div style={{ color: "#C8A951", fontSize: 18, fontWeight: 700, fontFamily: "sans-serif" }}>
          TrustLock Pay
        </div>
        <div style={{ color: "#6b8f6b", fontSize: 12, marginTop: 4, fontFamily: "sans-serif" }}>
          {role} Dashboard
        </div>
      </div>
      {sidebarItems.map((item) => (
        <div
          key={item}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontFamily: "sans-serif",
            color: item === activeItem ? "#C8A951" : "#8aab8a",
            background: item === activeItem ? "rgba(200,169,81,0.1)" : "transparent",
            borderLeft: item === activeItem ? "3px solid #C8A951" : "3px solid transparent",
            fontWeight: item === activeItem ? 600 : 400,
          }}
        >
          {item}
        </div>
      ))}
    </div>
    {/* Main */}
    <div style={{ flex: 1, background: "#fafbfc", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "16px 32px",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a2e1a", fontFamily: "sans-serif" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            background: "#eef7ee",
            color: "#2d6a2d",
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            fontWeight: 600,
            fontFamily: "sans-serif",
          }}>
            Testnet
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "#C8A951",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0f2314", fontWeight: 700, fontSize: 14, fontFamily: "sans-serif",
          }}>
            V
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 32, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  </div>
);
