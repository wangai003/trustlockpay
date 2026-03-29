import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

export const Scene7_EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });

  const stats = [
    { label: "Industries Supported", value: "25+", delay: 30 },
    { label: "Payment Methods", value: "15+", delay: 38 },
    { label: "Countries", value: "19+", delay: 46 },
  ];

  const tagIn = spring({ frame: frame - 60, fps, config: { damping: 20 } });
  const urlIn = spring({ frame: frame - 80, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 50% 40%, #1a3d1a 0%, #0f2314 50%, #080e08 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
    }}>
      {/* Corner accents */}
      {[{ t: 30, l: 30 }, { t: 30, r: 30 }, { b: 30, l: 30 }, { b: 30, r: 30 }].map((pos, i) => (
        <div key={i} style={{
          position: "absolute", ...pos as any,
          width: 50, height: 50,
          borderTop: i < 2 ? "2px solid rgba(200,169,81,0.3)" : "none",
          borderBottom: i >= 2 ? "2px solid rgba(200,169,81,0.3)" : "none",
          borderLeft: i % 2 === 0 ? "2px solid rgba(200,169,81,0.3)" : "none",
          borderRight: i % 2 === 1 ? "2px solid rgba(200,169,81,0.3)" : "none",
        }} />
      ))}

      {/* Logo */}
      <div style={{
        transform: `scale(${logoIn})`,
        opacity: logoIn,
        filter: `drop-shadow(0 0 30px rgba(200,169,81,0.3))`,
      }}>
        <Img src={staticFile("images/trustlock-logo.png")} style={{ width: 400, height: "auto" }} />
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: 60, marginTop: 40,
      }}>
        {stats.map((s) => {
          const sIn = spring({ frame: frame - s.delay, fps, config: { damping: 18 } });
          return (
            <div key={s.label} style={{
              textAlign: "center",
              opacity: sIn,
              transform: `translateY(${interpolate(sIn, [0, 1], [20, 0])}px)`,
            }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#C8A951", fontFamily: "sans-serif" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 14, color: "#8aab8a", fontFamily: "sans-serif", marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tagline */}
      <div style={{
        marginTop: 40, fontSize: 22, fontWeight: 300,
        color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif",
        letterSpacing: "0.1em",
        opacity: tagIn,
        transform: `translateY(${interpolate(tagIn, [0, 1], [15, 0])}px)`,
      }}>
        Escrow-Powered Commerce for Africa & Beyond
      </div>

      {/* URL */}
      <div style={{
        marginTop: 16, fontSize: 16,
        color: "#C8A951", fontFamily: "monospace",
        opacity: urlIn,
      }}>
        trustlockpay.lovable.app
      </div>

      {/* Bottom line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, transparent 10%, #C8A951 50%, transparent 90%)",
        opacity: interpolate(frame, [60, 90], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};
