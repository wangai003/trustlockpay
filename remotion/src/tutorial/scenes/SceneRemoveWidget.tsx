import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";
import { StepBadge } from "../components/StepBadge";

export const SceneRemoveWidget: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Strikethrough animation on the code line
  const strikeWidth = interpolate(frame, [55, 75], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.danger}08 0%, ${COLORS.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "0 120px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <StepBadge step={5} delay={5} />
        <AnimatedText text="How to Remove the Widget" fontSize={40} delay={10} />
      </div>

      <AnimatedText text="Just delete the script tag from your site. It disappears instantly." fontSize={18} color={COLORS.muted} fontWeight={400} delay={18} />

      {/* Code with strikethrough */}
      <div style={{
        width: "100%", maxWidth: 800, position: "relative",
        opacity: interpolate(frame, [25, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <div style={{
          background: "#0D1117", borderRadius: 12, padding: "20px 24px",
          fontFamily: "monospace", fontSize: 15, color: COLORS.danger,
          border: `1px solid ${COLORS.danger}44`,
          lineHeight: 1.6, wordBreak: "break-all" as const,
          opacity: interpolate(frame, [70, 90], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          {'<script src="...widget-embed" data-site-id="my-shop" data-mode="sandbox"></script>'}
        </div>
        {/* Strikethrough line */}
        <div style={{
          position: "absolute", top: "50%", left: 24,
          height: 3, background: COLORS.danger,
          width: `${strikeWidth}%`,
          borderRadius: 2,
          boxShadow: `0 0 10px ${COLORS.danger}66`,
        }} />
      </div>

      {/* Checkmark */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        opacity: interpolate(frame, [80, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 80, fps, config: { damping: 12 } }), [0, 1], [20, 0])}px)`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `${COLORS.accent}22`, border: `2px solid ${COLORS.accent}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: COLORS.accent, fontSize: 18, fontWeight: 700,
        }}>
          ✓
        </div>
        <span style={{ color: COLORS.accent, fontSize: 18, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
          Widget removed. Your site is unchanged.
        </span>
      </div>
    </AbsoluteFill>
  );
};
