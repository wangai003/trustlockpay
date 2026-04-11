import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";

export const SceneEndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgGlow = interpolate(frame, [0, 100], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, ${COLORS.primary}15 0%, ${COLORS.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* Decorative ring */}
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        border: `1px solid ${COLORS.primary}10`,
        transform: `rotate(${bgGlow}deg)`,
      }} />

      {/* Shield */}
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${interpolate(spring({ frame, fps, config: { damping: 12 } }), [0, 1], [0.3, 1])})`,
        boxShadow: `0 0 40px ${COLORS.primary}33`,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <AnimatedText text="Try It Now — Free" fontSize={48} delay={10} />
      <AnimatedText text="trustlockpay.com/test-widget" fontSize={22} color={COLORS.primaryGlow} fontWeight={500} delay={20} />
      <AnimatedText text="No signups · No cost · Works on any platform" fontSize={16} color={COLORS.muted} fontWeight={400} delay={30} />
    </AbsoluteFill>
  );
};
