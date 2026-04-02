import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../styles";
import { AnimatedText } from "../components/AnimatedText";
import { StepBadge } from "../components/StepBadge";
import { MockBrowser } from "../components/MockBrowser";

export const SceneGetCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: "0 80px",
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 450 }}>
        <StepBadge step={1} delay={5} />
        <AnimatedText text="Get Your Widget Code" fontSize={40} delay={10} />
        <AnimatedText text="Visit the TrustLock test page and enter your site name to generate a personalized embed snippet." fontSize={18} color={COLORS.muted} fontWeight={400} delay={18} />
      </div>

      {/* Right side - mock of test-widget page */}
      <MockBrowser url="trustlockpay.lovable.app/test-widget" delay={12} width={800} height={420}>
        <div style={{ padding: 32, background: COLORS.bg }}>
          <div style={{
            background: COLORS.card, borderRadius: 12, padding: 24,
            border: `1px solid ${COLORS.border}`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.white, fontFamily: "Inter, sans-serif", marginBottom: 16 }}>
              Generate Your Widget Code
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>Site Name</div>
                <div style={{
                  background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                  padding: "8px 12px", color: COLORS.white, fontSize: 14, fontFamily: "Inter, sans-serif",
                }}>
                  my-shop
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>Business Name</div>
                <div style={{
                  background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                  padding: "8px 12px", color: COLORS.white, fontSize: 14, fontFamily: "Inter, sans-serif",
                }}>
                  john-doe
                </div>
              </div>
            </div>

            {/* Code output */}
            <div style={{
              background: "#0D1117", borderRadius: 8, padding: "12px 16px",
              fontSize: 12, fontFamily: "monospace", color: COLORS.accent,
              border: `1px solid ${COLORS.border}`,
              opacity: interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              wordBreak: "break-all" as const,
            }}>
              {'<script src="...widget-embed" data-site-id="my-shop" data-vendor-id="john-doe" data-mode="sandbox"></script>'}
            </div>

            {/* Copy button */}
            <div style={{
              marginTop: 12,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
              borderRadius: 8, padding: "10px 20px",
              color: COLORS.white, fontSize: 14, fontWeight: 600,
              fontFamily: "Inter, sans-serif", textAlign: "center" as const,
              opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `scale(${interpolate(spring({ frame: frame - 70, fps, config: { damping: 10 } }), [0, 1], [1, 1.05])})`,
            }}>
              📋 Copy Code
            </div>
          </div>
        </div>
      </MockBrowser>
    </AbsoluteFill>
  );
};
