import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { DashboardFrame } from "../components/MockUI";
import { Cursor } from "../components/Cursor";
import { Annotation } from "../components/Annotation";

export const Scene2_WidgetSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashIn = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 100 } });
  const dashScale = interpolate(dashIn, [0, 1], [0.92, 1]);
  const dashOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Widget config elements animate in sequence
  const industryIn = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const subcatIn = spring({ frame: frame - 55, fps, config: { damping: 18 } });
  const toggleIn = spring({ frame: frame - 80, fps, config: { damping: 18 } });
  const saveIn = spring({ frame: frame - 110, fps, config: { damping: 15 } });

  // Industry dropdown opens
  const dropdownOpen = frame >= 40 && frame < 65;
  const dropdownProgress = dropdownOpen
    ? spring({ frame: frame - 40, fps, config: { damping: 20 } })
    : frame >= 65
      ? 0
      : 0;

  // E-Commerce selected highlight
  const selected = frame >= 55;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a1a0f 0%, #0f2314 50%, #0d1f10 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        transform: `scale(${dashScale})`,
        opacity: dashOpacity,
      }}>
        <DashboardFrame
          title="Widget Configuration"
          role="Vendor"
          sidebarItems={["Overview", "Transactions", "Widget Setup", "Sites", "Pricing", "Settings"]}
          activeItem="Widget Setup"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Industry selector */}
            <div style={{
              opacity: industryIn,
              transform: `translateY(${interpolate(industryIn, [0, 1], [15, 0])}px)`,
            }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontFamily: "sans-serif", fontWeight: 600 }}>
                Select Your Industry
              </div>
              <div style={{
                background: "#fff",
                border: selected ? "2px solid #C8A951" : "1px solid #d1d5db",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 15,
                color: selected ? "#1a2e1a" : "#9ca3af",
                fontFamily: "sans-serif",
                fontWeight: selected ? 600 : 400,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
              }}>
                {selected ? "🛒 E-Commerce / Retail" : "Choose industry..."}
                <span style={{ fontSize: 12, color: "#9ca3af" }}>▾</span>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    zIndex: 10,
                    overflow: "hidden",
                    transform: `scaleY(${dropdownProgress})`,
                    transformOrigin: "top",
                  }}>
                    {["🌾 Agriculture", "🛒 E-Commerce / Retail", "💎 Mining & Minerals", "🏗️ Manufacturing", "⚡ Energy / Oil & Gas"].map((item, i) => (
                      <div key={item} style={{
                        padding: "10px 16px",
                        fontSize: 14,
                        color: i === 1 ? "#C8A951" : "#374151",
                        background: i === 1 ? "rgba(200,169,81,0.08)" : "transparent",
                        fontFamily: "sans-serif",
                        fontWeight: i === 1 ? 600 : 400,
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcategory + config */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              opacity: subcatIn,
              transform: `translateY(${interpolate(subcatIn, [0, 1], [15, 0])}px)`,
            }}>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontFamily: "sans-serif", fontWeight: 600 }}>
                  Subcategory
                </div>
                <div style={{
                  background: "#fff", border: "1px solid #d1d5db", borderRadius: 10,
                  padding: "12px 16px", fontSize: 14, color: "#1a2e1a", fontFamily: "sans-serif",
                }}>
                  Consumer Electronics
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontFamily: "sans-serif", fontWeight: 600 }}>
                  Default Incoterms
                </div>
                <div style={{
                  background: "#fff", border: "1px solid #d1d5db", borderRadius: 10,
                  padding: "12px 16px", fontSize: 14, color: "#1a2e1a", fontFamily: "sans-serif",
                }}>
                  DDP — Delivered Duty Paid
                </div>
              </div>
            </div>

            {/* Dual mode toggle */}
            <div style={{
              opacity: toggleIn,
              transform: `translateY(${interpolate(toggleIn, [0, 1], [15, 0])}px)`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#f0fdf0",
              borderRadius: 12,
              padding: "14px 20px",
              border: "1px solid #bbf7d0",
            }}>
              <div style={{
                width: 48, height: 26, borderRadius: 13, background: "#22c55e",
                position: "relative",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2, left: 24,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2e1a", fontFamily: "sans-serif" }}>
                  Dual Mode Enabled
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "sans-serif" }}>
                  Africa & International payment rails active
                </div>
              </div>
            </div>

            {/* Save button */}
            <div style={{
              opacity: saveIn,
              transform: `scale(${interpolate(saveIn, [0, 1], [0.9, 1])})`,
            }}>
              <div style={{
                background: frame >= 130 ? "#b8941f" : "linear-gradient(135deg, #C8A951, #a88b3d)",
                color: "#0f2314",
                padding: "12px 32px",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "sans-serif",
                textAlign: "center",
                cursor: "pointer",
                display: "inline-block",
                boxShadow: "0 4px 15px rgba(200,169,81,0.3)",
              }}>
                {frame >= 135 ? "✓ Widget Saved" : "Save Widget Configuration"}
              </div>
            </div>
          </div>
        </DashboardFrame>
      </div>

      {/* Cursor */}
      <Cursor startX={960} startY={200} endX={700} endY={340} moveStart={30} moveDuration={12} clickAt={43} />
      {frame >= 55 && <Cursor startX={700} startY={380} endX={660} endY={650} moveStart={0} moveDuration={20} clickAt={20} />}

      {/* Annotations */}
      <Annotation text="Select E-Commerce industry" x={1200} y={330} delay={35} direction="left" />
      <Annotation text="Dual Mode: Africa + International" x={1300} y={560} delay={85} direction="left" />
      <Annotation text="Configuration saved ✓" x={700} y={720} delay={135} direction="top" />
    </AbsoluteFill>
  );
};
