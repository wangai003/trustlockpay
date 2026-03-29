import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface CursorProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  moveStart: number;
  moveDuration?: number;
  clickAt?: number;
}

export const Cursor: React.FC<CursorProps> = ({
  startX, startY, endX, endY, moveStart, moveDuration = 20, clickAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const moveProgress = interpolate(frame, [moveStart, moveStart + moveDuration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const eased = moveProgress * moveProgress * (3 - 2 * moveProgress);

  const cx = startX + (endX - startX) * eased;
  const cy = startY + (endY - startY) * eased;

  const clickScale = clickAt
    ? interpolate(
        spring({ frame: frame - clickAt, fps, config: { damping: 12, stiffness: 300 } }),
        [0, 1],
        [1, 0.85]
      )
    : 1;

  const clickRing = clickAt && frame >= clickAt && frame < clickAt + 15;

  if (frame < moveStart) return null;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 999 }}>
      {clickRing && (
        <div style={{
          position: "absolute",
          left: cx - 20,
          top: cy - 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid rgba(200, 169, 81, 0.6)",
          transform: `scale(${interpolate(frame - clickAt!, [0, 15], [0.5, 2], { extrapolateRight: "clamp" })})`,
          opacity: interpolate(frame - clickAt!, [0, 15], [0.8, 0], { extrapolateRight: "clamp" }),
        }} />
      )}
      <svg
        style={{ position: "absolute", left: cx - 2, top: cy - 2, overflow: "visible" }}
        width="24" height="30" viewBox="0 0 24 30"
      >
        <g transform={`scale(${clickScale})`}>
          <path
            d="M2 2L2 22L7 17L12 27L16 25L11 15L18 15Z"
            fill="#fff"
            stroke="#1a1a1a"
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  );
};
