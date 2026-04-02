import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";

export const MockBrowser: React.FC<{
  url: string;
  delay?: number;
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ url, delay = 0, children, width = 1200, height = 650 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width,
        borderRadius: 16,
        overflow: "hidden",
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 44,
          background: COLORS.bgLight,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: COLORS.bg,
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 13,
            color: COLORS.muted,
            fontFamily: "monospace",
            marginLeft: 8,
          }}
        >
          {url}
        </div>
      </div>
      {/* Content */}
      <div style={{ height, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
