import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface AnnotationProps {
  text: string;
  x: number;
  y: number;
  delay?: number;
  direction?: "left" | "right" | "top" | "bottom";
  color?: string;
}

export const Annotation: React.FC<AnnotationProps> = ({
  text,
  x,
  y,
  delay = 0,
  direction = "left",
  color = "#C8A951",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;

  const progress = spring({ frame: f, fps, config: { damping: 20, stiffness: 180 } });
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  if (f < 0) return null;

  const arrowLength = 40;
  const dx = direction === "left" ? -arrowLength : direction === "right" ? arrowLength : 0;
  const dy = direction === "top" ? -arrowLength : direction === "bottom" ? arrowLength : 0;

  const labelX = x + dx * 1.8;
  const labelY = y + dy * 1.8;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {/* Line */}
      <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <line
          x1={x}
          y1={y}
          x2={x + dx * progress}
          y2={y + dy * progress}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 3"
          opacity={opacity}
        />
        <circle cx={x} cy={y} r={4 * progress} fill={color} opacity={opacity} />
      </svg>
      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: labelX,
          top: labelY,
          transform: `translate(-50%, -50%) scale(${progress})`,
          opacity,
          background: "rgba(15, 35, 20, 0.92)",
          border: `1px solid ${color}`,
          borderRadius: 8,
          padding: "6px 16px",
          whiteSpace: "nowrap",
          fontSize: 16,
          fontWeight: 600,
          color: "#fff",
          fontFamily: "sans-serif",
          letterSpacing: "0.02em",
        }}
      >
        {text}
      </div>
    </div>
  );
};
