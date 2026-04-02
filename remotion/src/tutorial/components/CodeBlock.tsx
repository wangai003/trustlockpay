import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../styles";

export const CodeBlock: React.FC<{ code: string; delay?: number; highlight?: boolean }> = ({
  code,
  delay = 0,
  highlight = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const x = interpolate(s, [0, 1], [40, 0]);

  // Typewriter effect
  const charsToShow = Math.floor(interpolate(frame - delay, [5, 60], [0, code.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const displayCode = code.slice(0, charsToShow);

  return (
    <div
      style={{
        background: "#0D1117",
        borderRadius: 12,
        padding: "20px 24px",
        fontFamily: FONT.mono,
        fontSize: 16,
        color: COLORS.accent,
        lineHeight: 1.6,
        opacity,
        transform: `translateX(${x}px)`,
        border: highlight ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        boxShadow: highlight ? `0 0 20px ${COLORS.primary}33` : "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {displayCode}
      <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, color: COLORS.white }}>|</span>
    </div>
  );
};
