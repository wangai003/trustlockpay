import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export const StepBadge: React.FC<{ step: number; delay?: number }> = ({ step, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLORS.white,
        fontSize: 28,
        fontWeight: 800,
        fontFamily: "Inter, sans-serif",
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 0 30px ${COLORS.primary}44`,
      }}
    >
      {step}
    </div>
  );
};
