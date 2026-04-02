import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";
import { StepBadge } from "../components/StepBadge";

export const SceneInstallPlugin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    "Install & activate the WPCode plugin",
    "Go to Code Snippets → Header & Footer",
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: "0 100px",
      }}
    >
      {/* Left - WordPress mock */}
      <div style={{
        width: 700, borderRadius: 16, overflow: "hidden",
        border: `1px solid ${COLORS.border}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
        opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(spring({ frame: frame - 5, fps, config: { damping: 20 } }), [0, 1], [0.92, 1])})`,
      }}>
        {/* WP Admin bar */}
        <div style={{
          height: 36, background: "#1D2327",
          display: "flex", alignItems: "center", padding: "0 12px", gap: 8,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0073AA">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span style={{ color: "#C3C4C7", fontSize: 12, fontFamily: "Inter, sans-serif" }}>WordPress Admin</span>
        </div>
        {/* Content area */}
        <div style={{ display: "flex", height: 450 }}>
          {/* Sidebar */}
          <div style={{ width: 180, background: "#23282D", padding: "12px 0" }}>
            {["Dashboard", "Posts", "Pages", "Plugins", "Code Snippets"].map((item, i) => (
              <div key={item} style={{
                padding: "8px 16px", fontSize: 13, fontFamily: "Inter, sans-serif",
                color: item === "Code Snippets" ? COLORS.white : "#C3C4C7",
                background: item === "Code Snippets" ? COLORS.primary : "transparent",
                borderLeft: item === "Code Snippets" ? `3px solid ${COLORS.accent}` : "3px solid transparent",
              }}>
                {item}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div style={{ flex: 1, background: "#F0F0F1", padding: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#1D2327", fontFamily: "Inter, sans-serif", marginBottom: 16 }}>
              Header & Footer
            </div>
            <div style={{
              background: "white", borderRadius: 4, padding: 16,
              border: "1px solid #C3C4C7",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1D2327", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>
                Footer
              </div>
              <div style={{
                background: "#F6F7F7", borderRadius: 4, padding: 12,
                border: "1px solid #DCDCDE", minHeight: 80,
                fontSize: 12, fontFamily: "monospace", color: COLORS.muted,
              }}>
                {/* Blinking cursor */}
                <span style={{ opacity: Math.sin(frame * 0.25) > 0 ? 1 : 0, color: "#1D2327" }}>|</span>
                <span style={{ color: "#999", fontSize: 11 }}> Paste your widget code here...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 400 }}>
        <StepBadge step={2} delay={10} />
        <AnimatedText text="Open WordPress Admin" fontSize={36} delay={15} />
        {steps.map((step, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            opacity: interpolate(frame, [30 + i * 20, 40 + i * 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateX(${interpolate(frame, [30 + i * 20, 45 + i * 20], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: COLORS.accent, fontSize: 13, fontWeight: 700, fontFamily: "Inter, sans-serif",
              flexShrink: 0,
            }}>
              ✓
            </div>
            <span style={{ color: COLORS.muted, fontSize: 16, fontFamily: "Inter, sans-serif" }}>{step}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
