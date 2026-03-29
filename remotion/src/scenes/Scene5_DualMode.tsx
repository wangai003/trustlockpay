import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Cursor } from "../components/Cursor";
import { Annotation } from "../components/Annotation";

export const Scene5_DualMode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame: frame - 5, fps, config: { damping: 18 } });

  // Mode switch at frame 60
  const isInternational = frame >= 70;
  const switchProgress = spring({ frame: frame - 60, fps, config: { damping: 15 } });

  const africaMethods = [
    { icon: "📱", name: "M-Pesa", sub: "Kenya, Tanzania" },
    { icon: "📱", name: "MTN MoMo", sub: "Ghana, Uganda, Cameroon" },
    { icon: "📱", name: "Orange Money", sub: "Senegal, Ivory Coast" },
    { icon: "🏦", name: "Bank Transfer", sub: "NUBAN / BVN required" },
    { icon: "₿", name: "Crypto (USDC/USDT)", sub: "Polygon Network" },
  ];

  const intlMethods = [
    { icon: "💳", name: "Visa / Mastercard", sub: "Stripe Gateway" },
    { icon: "🏦", name: "Bank Transfer (SEPA)", sub: "EU / IBAN" },
    { icon: "🏦", name: "Wire Transfer", sub: "SWIFT / ABA" },
    { icon: "₿", name: "Crypto (USDC/USDT)", sub: "Polygon Network" },
  ];

  const methods = isInternational ? intlMethods : africaMethods;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a1a0f 0%, #0f2314 50%, #0d1f10 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Section label */}
      <div style={{
        position: "absolute",
        top: 60,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 14,
        fontWeight: 600,
        color: "#C8A951",
        fontFamily: "sans-serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        Dual Mode Payment UI — Close-Up
      </div>

      {/* Main card */}
      <div style={{
        width: 700,
        background: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 30px 100px rgba(0,0,0,0.4)",
        border: "2px solid rgba(200,169,81,0.3)",
        transform: `scale(${interpolate(cardIn, [0, 1], [0.85, 1])})`,
        opacity: cardIn,
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #0f2314, #1a3d1a)",
          padding: "24px 32px",
        }}>
          <div style={{ color: "#C8A951", fontSize: 20, fontWeight: 700, fontFamily: "sans-serif" }}>
            TrustLock Pay
          </div>
          <div style={{ color: "#8aab8a", fontSize: 13, fontFamily: "sans-serif", marginTop: 4 }}>
            Select your payment rail
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: "20px 32px 0", display: "flex", gap: 0 }}>
          <div style={{
            flex: 1, padding: "14px 0", textAlign: "center",
            borderRadius: "12px 0 0 12px",
            fontSize: 16, fontWeight: 700, fontFamily: "sans-serif",
            background: !isInternational ? "#0f2314" : "#f3f4f6",
            color: !isInternational ? "#C8A951" : "#9ca3af",
            border: !isInternational ? "2px solid #C8A951" : "1px solid #e5e7eb",
            transition: "none",
          }}>
            🌍 Africa
          </div>
          <div style={{
            flex: 1, padding: "14px 0", textAlign: "center",
            borderRadius: "0 12px 12px 0",
            fontSize: 16, fontWeight: 700, fontFamily: "sans-serif",
            background: isInternational ? "#0f2314" : "#f3f4f6",
            color: isInternational ? "#C8A951" : "#9ca3af",
            border: isInternational ? "2px solid #C8A951" : "1px solid #e5e7eb",
            transition: "none",
          }}>
            🌐 International
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ padding: "20px 32px 28px" }}>
          {methods.map((m, i) => {
            const mIn = spring({
              frame: frame - (isInternational ? 75 + i * 8 : 15 + i * 8),
              fps,
              config: { damping: 18 },
            });
            return (
              <div key={m.name + (isInternational ? "i" : "a")} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 16px",
                borderRadius: 12,
                border: i === 0 ? "2px solid #C8A951" : "1px solid #e5e7eb",
                background: i === 0 ? "rgba(200,169,81,0.04)" : "#fff",
                marginBottom: 10,
                opacity: mIn,
                transform: `translateX(${interpolate(mIn, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", fontFamily: "sans-serif" }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "sans-serif" }}>
                    {m.sub}
                  </div>
                </div>
                {i === 0 && (
                  <div style={{
                    marginLeft: "auto",
                    width: 20, height: 20, borderRadius: "50%",
                    background: "#C8A951",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#fff",
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cursor for mode switch */}
      <Cursor startX={800} startY={450} endX={1100} endY={450} moveStart={50} moveDuration={12} clickAt={63} />

      {/* Annotations */}
      <Annotation text="Africa: M-Pesa, MTN MoMo, Orange Money" x={400} y={500} delay={25} direction="right" />
      <Annotation text="Switch to International rails" x={1400} y={450} delay={65} direction="left" />
      <Annotation text="Card, SEPA, SWIFT available globally" x={400} y={600} delay={80} direction="right" />
    </AbsoluteFill>
  );
};
