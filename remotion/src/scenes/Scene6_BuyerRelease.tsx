import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { DashboardFrame } from "../components/MockUI";
import { Cursor } from "../components/Cursor";
import { Annotation } from "../components/Annotation";

export const Scene6_BuyerRelease: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashIn = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  // Claim order number entry
  const orderTyped = Math.min(Math.floor((frame - 30) / 3), 12);
  const orderText = "TL-2026-0500".slice(0, Math.max(0, orderTyped));

  // Validated state
  const validated = frame >= 75;
  const validIn = spring({ frame: frame - 75, fps, config: { damping: 15 } });

  // Release button clicked
  const released = frame >= 140;
  const releaseIn = spring({ frame: frame - 140, fps, config: { damping: 12, stiffness: 100 } });

  // Fund flow animation
  const fundFlow = frame >= 155;

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
          title="My Orders"
          role="Buyer"
          sidebarItems={["Overview", "My Orders", "Disputes", "Documents", "Settings"]}
          activeItem="My Orders"
        >
          {!released ? (
            <div style={{ maxWidth: 700, margin: "0 auto" }}>
              {/* Claim order card */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24,
                border: "1px solid #e5e7eb", marginBottom: 24,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif", marginBottom: 16 }}>
                  Claim Your Order
                </div>
                <div style={{
                  display: "flex", gap: 12,
                }}>
                  <div style={{
                    flex: 1, background: "#f9fafb", border: "2px solid " + (validated ? "#22c55e" : "#d1d5db"),
                    borderRadius: 10, padding: "12px 16px", fontSize: 16,
                    fontFamily: "monospace", color: "#1a1a1a",
                    display: "flex", alignItems: "center",
                  }}>
                    {orderText}
                    {!validated && frame >= 30 && frame % 16 < 8 && (
                      <span style={{ width: 2, height: 20, background: "#C8A951", marginLeft: 2 }} />
                    )}
                  </div>
                  <div style={{
                    background: validated ? "#22c55e" : "#C8A951",
                    color: "#fff", padding: "12px 24px", borderRadius: 10,
                    fontSize: 14, fontWeight: 700, fontFamily: "sans-serif",
                  }}>
                    {validated ? "✓ Verified" : "Validate"}
                  </div>
                </div>
              </div>

              {/* Order card after validation */}
              {validated && (
                <div style={{
                  background: "#fff", borderRadius: 16, padding: 24,
                  border: "2px solid rgba(200,169,81,0.3)",
                  opacity: validIn,
                  transform: `translateY(${interpolate(validIn, [0, 1], [20, 0])}px)`,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif" }}>
                        Samsung Galaxy S24 Ultra
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "sans-serif", marginTop: 4 }}>
                        Order: TL-2026-0500 · Vendor: TechHub NG
                      </div>
                    </div>
                    <div style={{
                      background: "#dcfce7", color: "#166534", padding: "6px 14px",
                      borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: "sans-serif",
                    }}>
                      ✅ Delivered
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    display: "flex", gap: 4, marginBottom: 24,
                  }}>
                    {["Paid", "Shipped", "Delivered", "Released"].map((step, i) => (
                      <div key={step} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{
                          height: 4, borderRadius: 2,
                          background: i < 3 ? "#22c55e" : "#e5e7eb",
                          marginBottom: 6,
                        }} />
                        <div style={{
                          fontSize: 11, fontFamily: "sans-serif",
                          color: i < 3 ? "#22c55e" : "#9ca3af",
                          fontWeight: i < 3 ? 600 : 400,
                        }}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{
                      flex: 1,
                      background: frame >= 130 ? "#b8941f" : "linear-gradient(135deg, #C8A951, #a88b3d)",
                      color: "#0f2314", padding: "14px 0", borderRadius: 12,
                      fontSize: 16, fontWeight: 700, fontFamily: "sans-serif", textAlign: "center",
                      boxShadow: "0 4px 15px rgba(200,169,81,0.3)",
                    }}>
                      🔓 Confirm & Release Funds
                    </div>
                    <div style={{
                      padding: "14px 20px", borderRadius: 12,
                      border: "1px solid #ef4444", color: "#ef4444",
                      fontSize: 14, fontWeight: 600, fontFamily: "sans-serif",
                    }}>
                      Dispute
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fund release animation */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%",
            }}>
              <div style={{
                fontSize: 64,
                transform: `scale(${interpolate(releaseIn, [0, 1], [0, 1.2])})`,
                opacity: releaseIn,
              }}>
                🎉
              </div>
              <div style={{
                marginTop: 20, fontSize: 28, fontWeight: 700,
                color: "#22c55e", fontFamily: "sans-serif",
                opacity: releaseIn,
              }}>
                Funds Released Successfully!
              </div>
              <div style={{
                marginTop: 12, fontSize: 16, color: "#6b7280", fontFamily: "sans-serif",
                opacity: spring({ frame: frame - 155, fps, config: { damping: 20 } }),
              }}>
                $500.00 transferred to vendor · TechHub NG
              </div>

              {/* Fund flow visualization */}
              {fundFlow && (
                <div style={{
                  marginTop: 40, display: "flex", alignItems: "center", gap: 20,
                  opacity: spring({ frame: frame - 165, fps, config: { damping: 18 } }),
                }}>
                  <div style={{
                    background: "#0f2314", borderRadius: 12, padding: "16px 24px",
                    border: "1px solid #C8A951",
                  }}>
                    <div style={{ fontSize: 12, color: "#C8A951", fontFamily: "sans-serif", fontWeight: 600 }}>Escrow Wallet</div>
                    <div style={{ fontSize: 20, color: "#fff", fontFamily: "sans-serif", fontWeight: 700, marginTop: 4 }}>$0.00</div>
                  </div>

                  {/* Arrow animation */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {[0, 1, 2].map((i) => {
                      const dotProgress = interpolate(
                        (frame - 170 + i * 5) % 30,
                        [0, 30],
                        [0.3, 1],
                        { extrapolateRight: "clamp" }
                      );
                      return (
                        <div key={i} style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "#C8A951", opacity: dotProgress,
                          margin: "0 4px",
                        }} />
                      );
                    })}
                    <div style={{ fontSize: 20, color: "#C8A951" }}>→</div>
                  </div>

                  <div style={{
                    background: "#166534", borderRadius: 12, padding: "16px 24px",
                    border: "1px solid #22c55e",
                  }}>
                    <div style={{ fontSize: 12, color: "#86efac", fontFamily: "sans-serif", fontWeight: 600 }}>Vendor Account</div>
                    <div style={{ fontSize: 20, color: "#fff", fontFamily: "sans-serif", fontWeight: 700, marginTop: 4 }}>+$500.00</div>
                  </div>
                </div>
              )}

              {/* Blockchain proof badge */}
              {frame >= 185 && (
                <div style={{
                  marginTop: 24,
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(200,169,81,0.1)", borderRadius: 8,
                  padding: "8px 16px",
                  opacity: spring({ frame: frame - 185, fps, config: { damping: 18 } }),
                }}>
                  <div style={{ fontSize: 14 }}>⛓️</div>
                  <div style={{ fontSize: 12, color: "#C8A951", fontFamily: "monospace" }}>
                    Proof anchored: 0x7a3f...e8d2 · Polygon
                  </div>
                </div>
              )}
            </div>
          )}
        </DashboardFrame>
      </div>

      {/* Cursor */}
      {!validated && <Cursor startX={600} startY={400} endX={900} endY={370} moveStart={25} moveDuration={10} />}
      {validated && !released && <Cursor startX={700} startY={400} endX={800} endY={620} moveStart={20} moveDuration={15} clickAt={55} />}

      {/* Annotations */}
      <Annotation text="Buyer enters order number" x={450} y={300} delay={25} direction="right" />
      {validated && <Annotation text="Buyer confirms delivery & releases escrow" x={450} y={650} delay={30} direction="right" />}
      {released && <Annotation text="Blockchain proof anchored on Polygon" x={1400} y={700} delay={50} direction="left" />}
    </AbsoluteFill>
  );
};
