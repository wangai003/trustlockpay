import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";
import { StepBadge } from "../components/StepBadge";

export const SceneWidgetAppears: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldEnter = spring({ frame: frame - 40, fps, config: { damping: 8, stiffness: 150 } });
  const demoBadge = spring({ frame: frame - 55, fps, config: { damping: 10 } });
  const pulse = 1 + Math.sin(frame * 0.1) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        gap: 60,
      }}
    >
      {/* Mock website */}
      <div style={{
        width: 750, height: 500, borderRadius: 16, overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
        position: "relative",
        opacity: interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        {/* Browser chrome */}
        <div style={{
          height: 36, background: COLORS.bgLight,
          display: "flex", alignItems: "center", padding: "0 12px", gap: 6,
          borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
          <div style={{
            flex: 1, background: COLORS.bg, borderRadius: 4,
            padding: "3px 10px", fontSize: 11, color: COLORS.muted,
            fontFamily: "monospace", marginLeft: 8,
          }}>
            my-shop.com
          </div>
        </div>
        {/* Website content placeholder */}
        <div style={{ height: 464, background: "#FAFAFA", padding: 32, position: "relative" }}>
          <div style={{ width: 200, height: 16, background: "#E2E8F0", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ width: 350, height: 12, background: "#E2E8F0", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ width: 300, height: 12, background: "#E2E8F0", borderRadius: 4, marginBottom: 24 }} />
          <div style={{ display: "flex", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 160, height: 120, background: "#E2E8F0", borderRadius: 8,
              }} />
            ))}
          </div>

          {/* THE SHIELD BUTTON */}
          <div style={{
            position: "absolute", bottom: 24, right: 24,
            width: 60, height: 60, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.primary}, #0EA5E9)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${interpolate(shieldEnter, [0, 1], [0, 1]) * pulse})`,
            boxShadow: `0 4px 20px ${COLORS.primary}66`,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {/* DEMO badge */}
            <div style={{
              position: "absolute", top: -4, right: -6,
              background: COLORS.accent, color: COLORS.white,
              fontSize: 8, fontWeight: 800, padding: "2px 6px",
              borderRadius: 10, fontFamily: "Inter, sans-serif",
              transform: `scale(${interpolate(demoBadge, [0, 1], [0, 1])})`,
            }}>
              DEMO
            </div>
          </div>
        </div>
      </div>

      {/* Right text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 380 }}>
        <StepBadge step={4} delay={20} />
        <AnimatedText text="The Shield Appears!" fontSize={36} delay={25} />
        <AnimatedText
          text="Refresh your site — the TrustLock shield button floats in the bottom-right corner. Click it to test the escrow checkout."
          fontSize={16} color={COLORS.muted} fontWeight={400} delay={35}
        />
      </div>
    </AbsoluteFill>
  );
};
