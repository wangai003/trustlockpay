import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { DashboardFrame } from "../components/MockUI";
import { Annotation } from "../components/Annotation";

export const Scene4_OrderLog: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashIn = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  // Work order stages
  const stages = [
    { icon: "✅", label: "Payment Confirmed", time: "Mar 29, 2026 · 2:14 PM", status: "completed", detail: "Escrow locked — $500.00 USDC" },
    { icon: "📦", label: "Order Processing", time: "Mar 29, 2026 · 2:15 PM", status: "completed", detail: "Vendor acknowledged order" },
    { icon: "🚚", label: "Shipped / In Transit", time: "Mar 30, 2026 · 9:30 AM", status: "active", detail: "DHL Tracking: DHL-2026-NG-0042" },
    { icon: "📋", label: "Customs Clearance", time: "Pending", status: "pending", detail: "Awaiting buyer proof of clearance" },
    { icon: "✋", label: "Delivery Confirmation", time: "Pending", status: "pending", detail: "Buyer confirms receipt" },
    { icon: "💰", label: "Fund Release", time: "Pending", status: "pending", detail: "Escrow → Vendor account" },
  ];

  // Scroll simulation
  const scrollY = interpolate(frame, [80, 160], [0, -120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a1a0f 0%, #0f2314 50%, #0d1f10 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        transform: `scale(${interpolate(dashIn, [0, 1], [0.92, 1])})`,
        opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <DashboardFrame
          title="Work Order — TL-2026-0500"
          role="Vendor"
          sidebarItems={["Overview", "Transactions", "Work Orders", "Documents", "Payouts", "Settings"]}
          activeItem="Work Orders"
        >
          <div style={{
            display: "flex",
            gap: 24,
          }}>
            {/* Timeline */}
            <div style={{
              flex: 1,
              position: "relative",
              transform: `translateY(${scrollY}px)`,
            }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: "#6b7280", fontFamily: "sans-serif",
                marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Milestone Timeline
              </div>

              {stages.map((stage, i) => {
                const stageIn = spring({ frame: frame - (15 + i * 12), fps, config: { damping: 18 } });
                const isCompleted = stage.status === "completed";
                const isActive = stage.status === "active";

                return (
                  <div key={stage.label} style={{
                    display: "flex",
                    gap: 16,
                    opacity: stageIn,
                    transform: `translateX(${interpolate(stageIn, [0, 1], [30, 0])}px)`,
                    marginBottom: 8,
                  }}>
                    {/* Vertical line + icon */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 36,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: isCompleted ? "#22c55e" : isActive ? "#C8A951" : "#e5e7eb",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                        boxShadow: isActive ? "0 0 12px rgba(200,169,81,0.4)" : "none",
                      }}>
                        {stage.icon}
                      </div>
                      {i < stages.length - 1 && (
                        <div style={{
                          width: 2,
                          height: 50,
                          background: isCompleted ? "#22c55e" : "#e5e7eb",
                        }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{
                      background: isActive ? "rgba(200,169,81,0.05)" : "#fff",
                      border: isActive ? "1px solid rgba(200,169,81,0.3)" : "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "12px 16px",
                      flex: 1,
                    }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: isActive ? "#C8A951" : isCompleted ? "#22c55e" : "#9ca3af",
                          fontFamily: "sans-serif",
                        }}>
                          {stage.label}
                        </div>
                        <div style={{
                          fontSize: 11, color: "#9ca3af", fontFamily: "sans-serif",
                        }}>
                          {stage.time}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 12, color: "#6b7280", fontFamily: "sans-serif", marginTop: 4,
                      }}>
                        {stage.detail}
                      </div>
                      {/* GPS badge for shipped */}
                      {isActive && (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          marginTop: 8, background: "#fef3c7", borderRadius: 6,
                          padding: "3px 8px", fontSize: 11, color: "#92400e",
                          fontFamily: "sans-serif", fontWeight: 600,
                        }}>
                          📍 GPS: 6.5244° N, 3.3792° E
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary sidebar */}
            <div style={{ width: 280 }}>
              <div style={{
                background: "#fff", borderRadius: 12, padding: 20,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif", marginBottom: 12 }}>
                  Order Details
                </div>
                {[
                  ["Order #", "TL-2026-0500"],
                  ["Product", "Samsung Galaxy S24"],
                  ["Amount", "$500.00"],
                  ["Escrow", "Locked 🔒"],
                  ["Buyer", "John A."],
                  ["Industry", "E-Commerce"],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "6px 0", fontSize: 13, fontFamily: "sans-serif",
                    borderBottom: "1px solid #f3f4f6",
                  }}>
                    <span style={{ color: "#6b7280" }}>{k}</span>
                    <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Vendor notes */}
              {frame >= 100 && (
                <div style={{
                  background: "#fff", borderRadius: 12, padding: 16, marginTop: 16,
                  border: "1px solid #e5e7eb",
                  opacity: spring({ frame: frame - 100, fps, config: { damping: 18 } }),
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif", marginBottom: 8 }}>
                    Vendor Notes
                  </div>
                  <div style={{
                    background: "#f9fafb", borderRadius: 8, padding: 10,
                    fontSize: 12, color: "#374151", fontFamily: "sans-serif",
                    lineHeight: 1.5,
                  }}>
                    Shipped via DHL Express. Expected delivery: 3-5 business days. Customs documentation included.
                  </div>
                </div>
              )}
            </div>
          </div>
        </DashboardFrame>
      </div>

      {/* Annotations */}
      <Annotation text="Work order milestone timeline" x={350} y={200} delay={30} direction="right" />
      <Annotation text="GPS-verified shipping" x={350} y={490} delay={65} direction="right" />
      <Annotation text="Vendor adds tracking notes" x={1500} y={630} delay={105} direction="left" />
    </AbsoluteFill>
  );
};
