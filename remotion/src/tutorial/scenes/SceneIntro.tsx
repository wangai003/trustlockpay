import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({ frame: frame - 5, fps, config: { damping: 10 } });
  const bgGlow = interpolate(frame, [0, 100], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary}22 0%, ${COLORS.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Floating accent circles */}
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        border: `1px solid ${COLORS.primary}15`,
        top: "20%", left: "10%",
        transform: `rotate(${bgGlow}deg)`,
      }} />
      <div style={{
        position: "absolute", width: 200, height: 200, borderRadius: "50%",
        border: `1px solid ${COLORS.accent}15`,
        bottom: "15%", right: "15%",
        transform: `rotate(${-bgGlow * 0.7}deg)`,
      }} />

      {/* Shield icon */}
      <div
        style={{
          width: 100, height: 100, borderRadius: 24,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${interpolate(shieldScale, [0, 1], [0.3, 1])})`,
          boxShadow: `0 0 50px ${COLORS.primary}44`,
        }}
      >
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <AnimatedText text="How to Install the TrustLock Widget" fontSize={52} delay={15} />
      <AnimatedText text="on WordPress — in 30 seconds" fontSize={32} color={COLORS.muted} fontWeight={400} delay={25} />
      
      <div style={{
        display: "flex", gap: 12, marginTop: 16,
        opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        {["Free", "No Account", "Sandbox Mode"].map((t, i) => (
          <div key={t} style={{
            background: `${COLORS.primary}22`, border: `1px solid ${COLORS.primary}44`,
            borderRadius: 20, padding: "6px 16px",
            color: COLORS.primaryGlow, fontSize: 14, fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            transform: `translateY(${interpolate(spring({ frame: frame - 45 - i * 5, fps, config: { damping: 15 } }), [0, 1], [20, 0])}px)`,
          }}>
            {t}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
