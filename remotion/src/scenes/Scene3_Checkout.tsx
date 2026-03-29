import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame } from "../components/MockUI";
import { Cursor } from "../components/Cursor";
import { Annotation } from "../components/Annotation";

export const Scene3_Checkout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pageIn = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  // Widget overlay appears
  const widgetOverlay = frame >= 90;
  const widgetIn = spring({ frame: frame - 90, fps, config: { damping: 15, stiffness: 100 } });

  // Dual mode toggle animation
  const dualModeSwitch = frame >= 160;

  // Invoice lines stagger
  const invoiceDelay = 110;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a1a0f 0%, #0f2314 60%, #0d1f10 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        transform: `scale(${interpolate(pageIn, [0, 1], [0.9, 0.7])})`,
        opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <BrowserFrame url="https://www.jumia.com.ng/checkout">
          <div style={{ padding: 40, display: "flex", gap: 40 }}>
            {/* Product area */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 22, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif",
                marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ color: "#f68b1e", fontSize: 28 }}>J</span> Jumia Checkout
              </div>

              {/* Product card */}
              <div style={{
                background: "#fff", borderRadius: 12, padding: 20,
                border: "1px solid #e5e7eb", display: "flex", gap: 16,
              }}>
                <div style={{
                  width: 100, height: 100, background: "#f3f4f6", borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 40,
                }}>
                  📱
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a", fontFamily: "sans-serif" }}>
                    Samsung Galaxy S24 Ultra
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280", fontFamily: "sans-serif", marginTop: 4 }}>
                    256GB · Titanium Black
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#f68b1e", fontFamily: "sans-serif", marginTop: 8 }}>
                    $500.00
                  </div>
                </div>
              </div>

              {/* TrustLock button */}
              <div style={{
                marginTop: 24,
                background: "linear-gradient(135deg, #0f2314, #1a3d1a)",
                borderRadius: 12,
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                border: "2px solid #C8A951",
                boxShadow: "0 4px 20px rgba(200,169,81,0.2)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "linear-gradient(135deg, #C8A951, #a88b3d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  🛡️
                </div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "sans-serif" }}>
                  Pay with TrustLock Pay
                </div>
                <div style={{ color: "#C8A951", fontSize: 13, fontFamily: "sans-serif" }}>
                  Escrow Protected
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div style={{ width: 280 }}>
              <div style={{
                background: "#fff", borderRadius: 12, padding: 20,
                border: "1px solid #e5e7eb",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", fontFamily: "sans-serif", marginBottom: 16 }}>
                  Order Summary
                </div>
                {[
                  ["Subtotal", "$500.00"],
                  ["Shipping", "$0.00"],
                  ["Tax (VAT 7.5%)", "$37.50"],
                ].map(([label, val]) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between", padding: "8px 0",
                    borderBottom: "1px solid #f3f4f6", fontSize: 14, fontFamily: "sans-serif",
                  }}>
                    <span style={{ color: "#6b7280" }}>{label}</span>
                    <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
                <div style={{
                  display: "flex", justifyContent: "space-between", padding: "12px 0 0",
                  fontSize: 18, fontWeight: 700, fontFamily: "sans-serif",
                }}>
                  <span style={{ color: "#1a1a1a" }}>Total</span>
                  <span style={{ color: "#C8A951" }}>$537.50</span>
                </div>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </div>

      {/* TrustLock Widget Overlay */}
      {widgetOverlay && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: `rgba(0,0,0,${interpolate(widgetIn, [0, 1], [0, 0.6])})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: 520,
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            transform: `scale(${interpolate(widgetIn, [0, 1], [0.8, 1])})`,
            opacity: widgetIn,
            boxShadow: "0 30px 100px rgba(0,0,0,0.4)",
            border: "2px solid rgba(200,169,81,0.3)",
          }}>
            {/* Widget header */}
            <div style={{
              background: "linear-gradient(135deg, #0f2314, #1a3d1a)",
              padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ fontSize: 24 }}>🛡️</div>
              <div>
                <div style={{ color: "#C8A951", fontSize: 17, fontWeight: 700, fontFamily: "sans-serif" }}>
                  TrustLock Pay — Escrow Invoice
                </div>
                <div style={{ color: "#8aab8a", fontSize: 12, fontFamily: "sans-serif" }}>
                  Funds held until delivery confirmed
                </div>
              </div>
            </div>

            {/* Dual mode toggle */}
            <div style={{
              padding: "16px 24px 0",
              display: "flex", gap: 8,
            }}>
              <div style={{
                flex: 1, padding: "8px 0", textAlign: "center", borderRadius: 8,
                fontSize: 13, fontWeight: 600, fontFamily: "sans-serif",
                background: dualModeSwitch ? "transparent" : "#0f2314",
                color: dualModeSwitch ? "#6b7280" : "#C8A951",
                border: dualModeSwitch ? "1px solid #e5e7eb" : "1px solid #C8A951",
              }}>
                🌍 Africa
              </div>
              <div style={{
                flex: 1, padding: "8px 0", textAlign: "center", borderRadius: 8,
                fontSize: 13, fontWeight: 600, fontFamily: "sans-serif",
                background: dualModeSwitch ? "#0f2314" : "transparent",
                color: dualModeSwitch ? "#C8A951" : "#6b7280",
                border: dualModeSwitch ? "1px solid #C8A951" : "1px solid #e5e7eb",
              }}>
                🌐 International
              </div>
            </div>

            {/* Invoice lines */}
            <div style={{ padding: "16px 24px" }}>
              {[
                { label: "Samsung Galaxy S24 Ultra", value: "$500.00", delay: invoiceDelay },
                { label: "VAT (7.5%)", value: "$37.50", delay: invoiceDelay + 8 },
                { label: "TrustLock Fee (1.5%)", value: "$7.50", delay: invoiceDelay + 16 },
                { label: "Escrow Service (1%)", value: "$5.00", delay: invoiceDelay + 24 },
              ].map((line) => {
                const lp = spring({ frame: frame - line.delay, fps, config: { damping: 20 } });
                return (
                  <div key={line.label} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid #f3f4f6",
                    fontSize: 14, fontFamily: "sans-serif",
                    opacity: lp,
                    transform: `translateX(${interpolate(lp, [0, 1], [20, 0])}px)`,
                  }}>
                    <span style={{ color: "#374151" }}>{line.label}</span>
                    <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{line.value}</span>
                  </div>
                );
              })}

              {/* Total */}
              {frame >= invoiceDelay + 35 && (
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "14px 0 0", fontSize: 20, fontWeight: 700, fontFamily: "sans-serif",
                  opacity: spring({ frame: frame - invoiceDelay - 35, fps, config: { damping: 20 } }),
                }}>
                  <span style={{ color: "#0f2314" }}>Total Due</span>
                  <span style={{ color: "#C8A951" }}>$550.00</span>
                </div>
              )}
            </div>

            {/* Payment methods */}
            {frame >= invoiceDelay + 45 && (
              <div style={{
                padding: "0 24px 20px",
                opacity: spring({ frame: frame - invoiceDelay - 45, fps, config: { damping: 18 } }),
              }}>
                <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 8, fontFamily: "sans-serif" }}>
                  Payment Method
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(dualModeSwitch
                    ? ["💳 Card", "🏦 Bank Transfer", "₿ Crypto (USDC/USDT)"]
                    : ["📱 M-Pesa", "📱 MTN MoMo", "🏦 Bank Transfer", "₿ Crypto (USDC/USDT)"]
                  ).map((m, i) => (
                    <div key={m} style={{
                      flex: 1, padding: "10px 8px", textAlign: "center",
                      borderRadius: 8, border: i === 0 ? "2px solid #C8A951" : "1px solid #e5e7eb",
                      fontSize: 11, fontWeight: i === 0 ? 600 : 400, fontFamily: "sans-serif",
                      color: i === 0 ? "#C8A951" : "#374151",
                      background: i === 0 ? "rgba(200,169,81,0.05)" : "#fff",
                    }}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cursor */}
      <Cursor startX={500} startY={800} endX={680} endY={580} moveStart={60} moveDuration={20} clickAt={82} />
      {frame >= 155 && (
        <Cursor startX={700} startY={410} endX={830} endY={410} moveStart={0} moveDuration={10} clickAt={10} />
      )}

      {/* Annotations */}
      <Annotation text="Buyer clicks TrustLock Pay" x={400} y={560} delay={70} direction="right" />
      {widgetOverlay && (
        <>
          <Annotation text="Escrow-protected invoice" x={300} y={300} delay={15} direction="right" />
          <Annotation text="Toggle: Africa ↔ International" x={300} y={400} delay={70} direction="right" />
        </>
      )}
    </AbsoluteFill>
  );
};
