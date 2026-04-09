import { motion } from "framer-motion";

interface GlowOrbProps {
  color?: string;
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
}

const GlowOrb = ({ color = "primary", size = 400, top, left, right, bottom, delay = 0 }: GlowOrbProps) => {
  const colorMap: Record<string, string> = {
    primary: "hsl(152, 52%, 24%)",
    accent: "hsl(43, 80%, 48%)",
    emerald: "hsl(152, 52%, 40%)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.15, scale: 1 }}
      transition={{ duration: 2, delay, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      className="absolute rounded-full pointer-events-none blur-[100px]"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${colorMap[color] || colorMap.primary}, transparent 70%)`,
        top,
        left,
        right,
        bottom,
      }}
    />
  );
};

export default GlowOrb;
