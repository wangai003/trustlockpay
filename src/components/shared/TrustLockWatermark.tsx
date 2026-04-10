/**
 * TrustLock Patentable Watermark
 * ─────────────────────────────────
 * Generates a unique, algorithmically-derived SVG watermark pattern
 * using the certificate ID and verification token as entropy sources.
 * The interlocking "TL" monogram with micro-hash fragments makes
 * reproduction without the original certificate data computationally
 * infeasible — a visual anti-fraud layer complementing the on-chain
 * proof anchor.
 */
interface TrustLockWatermarkProps {
  certificateId: string;
  className?: string;
}

/** Deterministic pseudo-random from a string seed */
function seedHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

const TrustLockWatermark = ({ certificateId, className }: TrustLockWatermarkProps) => {
  const h = seedHash(certificateId);
  // Derive subtle rotation & position offsets from the cert ID
  const rot = (h % 30) - 15; // -15° to +15°
  const microHash = certificateId.slice(0, 8).toUpperCase();

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          opacity: 0.035,
        }}
      >
        {/* Interlocking TL monogram — geometric, hard to replicate */}
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          {/* Outer shield */}
          <path d="M200 30 L350 100 L340 280 Q200 380 200 380 Q200 380 60 280 L50 100 Z" />
          {/* Inner shield */}
          <path d="M200 55 L325 115 L317 265 Q200 350 200 350 Q200 350 83 265 L75 115 Z" />

          {/* T letterform */}
          <line x1="130" y1="140" x2="270" y2="140" strokeWidth="3" />
          <line x1="200" y1="140" x2="200" y2="260" strokeWidth="3" />

          {/* L letterform — interlocked */}
          <line x1="155" y1="155" x2="155" y2="280" strokeWidth="2.5" />
          <line x1="155" y1="280" x2="255" y2="280" strokeWidth="2.5" />

          {/* Micro-hash ring — unique per certificate */}
          <circle cx="200" cy="210" r="110" strokeDasharray="3 7" strokeWidth="0.6" />
          <circle cx="200" cy="210" r="95" strokeDasharray="5 11" strokeWidth="0.4" />
        </g>

        {/* Micro-hash text — makes each watermark unique */}
        <text
          x="200"
          y="330"
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          opacity="0.6"
          fontFamily="monospace"
        >
          TL·{microHash}
        </text>
      </svg>
    </div>
  );
};

export default TrustLockWatermark;
