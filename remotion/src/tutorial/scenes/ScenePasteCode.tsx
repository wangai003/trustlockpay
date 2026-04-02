import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";
import { StepBadge } from "../components/StepBadge";
import { CodeBlock } from "../components/CodeBlock";

export const ScenePasteCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const codeText = '<script src="...widget-embed"\n  data-site-id="my-shop"\n  data-vendor-id="john-doe"\n  data-mode="sandbox">\n</script>';

  // Arrow animation pointing to "Save"
  const arrowOpacity = interpolate(frame, [75, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowBounce = Math.sin((frame - 80) * 0.15) * 5;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: "0 120px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <StepBadge step={3} delay={5} />
        <AnimatedText text="Paste the Code in the Footer Section" fontSize={38} delay={10} />
      </div>

      <div style={{ width: "100%", maxWidth: 900 }}>
        <CodeBlock code={codeText} delay={15} highlight />
      </div>

      {/* Save button mockup */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        opacity: arrowOpacity,
      }}>
        <div style={{
          fontSize: 24, color: COLORS.accent,
          transform: `translateX(${arrowBounce}px)`,
        }}>
          →
        </div>
        <div style={{
          background: COLORS.wp,
          borderRadius: 4, padding: "10px 24px",
          color: COLORS.white, fontSize: 15, fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          transform: `scale(${interpolate(spring({ frame: frame - 85, fps, config: { damping: 10 } }), [0, 1], [0.9, 1])})`,
        }}>
          Save Changes
        </div>
      </div>

      <AnimatedText text="Click 'Save Changes' — that's it!" fontSize={20} color={COLORS.muted} fontWeight={400} delay={90} />
    </AbsoluteFill>
  );
};
