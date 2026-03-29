import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

export const Scene1_Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Shield glow pulse
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Logo scale in
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const logoOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagProgress = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  const tagOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle
  const subProgress = spring({ frame: frame - 65, fps, config: { damping: 20 } });
  const subOpacity = interpolate(frame, [65, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Gradient lines
  const lineWidth = interpolate(frame, [0, 60], [0, 600], { extrapolateRight: "clamp" });

  // Background gradient shift
  const bgShift = interpolate(frame, [0, 150], [0, 20]);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% ${40 + bgShift}%, #1a3d1a 0%, #0f2314 50%, #080e08 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}>
      {/* Decorative lines */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: lineWidth,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(200,169,81,0.3), transparent)",
      }} />
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 1,
        height: lineWidth * 0.6,
        background: "linear-gradient(180deg, transparent, rgba(200,169,81,0.15), transparent)",
      }} />

      {/* Gold corner accents */}
      {[{ t: 40, l: 40 }, { t: 40, r: 40 }, { b: 40, l: 40 }, { b: 40, r: 40 }].map((pos, i) => {
        const delay = 20 + i * 8;
        const ap = spring({ frame: frame - delay, fps, config: { damping: 25 } });
        return (
          <div key={i} style={{
            position: "absolute",
            ...pos as any,
            width: 60 * ap,
            height: 60 * ap,
            borderTop: i < 2 ? "2px solid rgba(200,169,81,0.4)" : "none",
            borderBottom: i >= 2 ? "2px solid rgba(200,169,81,0.4)" : "none",
            borderLeft: i % 2 === 0 ? "2px solid rgba(200,169,81,0.4)" : "none",
            borderRight: i % 2 === 1 ? "2px solid rgba(200,169,81,0.4)" : "none",
          }} />
        );
      })}

      {/* Logo */}
      <div style={{
        transform: `scale(${logoScale})`,
        opacity: logoOpacity,
        filter: `drop-shadow(0 0 ${30 * glowPulse}px rgba(200,169,81,0.3))`,
      }}>
        <Img src={staticFile("images/trustlock-logo.png")} style={{ width: 500, height: "auto" }} />
      </div>

      {/* Tagline */}
      <div style={{
        marginTop: 30,
        fontSize: 28,
        fontWeight: 300,
        color: "#C8A951",
        fontFamily: "sans-serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        opacity: tagOpacity,
        transform: `translateY(${interpolate(tagProgress, [0, 1], [20, 0])}px)`,
      }}>
        Escrow-Powered Commerce for Africa
      </div>

      {/* Subtitle */}
      <div style={{
        marginTop: 14,
        fontSize: 18,
        color: "rgba(255,255,255,0.5)",
        fontFamily: "sans-serif",
        letterSpacing: "0.05em",
        opacity: subOpacity,
        transform: `translateY(${interpolate(subProgress, [0, 1], [15, 0])}px)`,
      }}>
        Product Demo — Vendor & Buyer Experience
      </div>

      {/* Bottom edge detail */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: "linear-gradient(90deg, transparent 10%, #C8A951 50%, transparent 90%)",
        opacity: interpolate(frame, [80, 120], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};
