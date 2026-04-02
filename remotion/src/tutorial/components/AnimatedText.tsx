import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONT } from "../styles";

export const AnimatedText: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  y?: number;
}> = ({ text, delay = 0, fontSize = 48, color = COLORS.white, fontWeight = 700, y = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const translateY = interpolate(s, [0, 1], [30 + y, y]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        fontFamily: FONT.display,
        opacity,
        transform: `translateY(${translateY}px)`,
        lineHeight: 1.3,
      }}
    >
      {text}
    </div>
  );
};
