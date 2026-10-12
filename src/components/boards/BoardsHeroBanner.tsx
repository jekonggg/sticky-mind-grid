import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BoardsHeroBannerProps {
  title?: string;
  subtitle?: string;
  gradientFrom?: string;
  gradientTo?: string;
  compact?: boolean;
}

export const BoardsHeroBanner: React.FC<BoardsHeroBannerProps> = ({
  title = "Sticky Mind Grid",
  subtitle = "Your boards, in one place.",
  gradientFrom = "hsl(var(--primary))",
  gradientTo = "hsl(var(--accent))",
  compact = false,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-background transition-all duration-300",
        compact
          ? "h-[104px] sm:h-[120px] md:h-[136px]"
          : "h-[160px] sm:h-[190px] md:h-[220px]"
      )}
    >
      {/* Base Gradient Layer */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        }}
      />

      {/* Animated Wave Layers */}
      <motion.div
        className="absolute inset-0 opacity-40 mix-blend-soft-light pointer-events-none"
        initial={{ opacity: 0.3 }}
        animate={shouldReduceMotion ? undefined : { opacity: [0.3, 0.6, 0.3] }}
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 8, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          background: "radial-gradient(circle at 20% 30%, white 0%, transparent 70%)",
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        initial={{ scale: 1, x: "-10%", y: "-10%" }}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.1, 1],
                x: ["-10%", "5%", "-10%"],
                y: ["-10%", "10%", "-10%"],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 15, repeat: Infinity, ease: "linear" }
        }
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, transparent 0deg, ${gradientTo}22 180deg, transparent 360deg)`,
        }}
      />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.1] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Floating Orbs animation */}
      <motion.div
        className="absolute w-[400px] h-[400px] bg-white/20 rounded-full blur-[100px] pointer-events-none"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 100, -50, 0],
                y: [0, -50, 80, 0],
                opacity: [0.4, 0.6, 0.4],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 20, repeat: Infinity, ease: "linear" }
        }
        style={{ top: "-10%", left: "-10%" }}
      />

      <motion.div
        className="absolute w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, -120, 40, 0],
                y: [0, 80, -40, 0],
                opacity: [0.3, 0.5, 0.3],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : { duration: 25, repeat: Infinity, ease: "linear" }
        }
        style={{ bottom: "-10%", right: "10%" }}
      />

      {/* Contrast Scrim Layer for strong legibility in both light and dark themes */}
      <div className="absolute inset-0 bg-slate-950/30 dark:bg-slate-950/45 pointer-events-none" />

      {/* Content Overlay */}
      <div
        className={cn(
          "relative h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-start text-white transition-all duration-300",
          compact ? "pt-3 sm:pt-4 pb-8" : "pt-5 sm:pt-7 md:pt-8 pb-12"
        )}
      >
        <motion.div
          className="z-10"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
        >
          <h1
            className={cn(
              "font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] uppercase italic leading-tight transition-all duration-300",
              compact
                ? "text-xl sm:text-2xl md:text-3xl mb-1"
                : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2"
            )}
          >
            {title === "Sticky Mind Grid" ? (
              <>
                Sticky Mind <span className="text-white not-italic opacity-95">Grid</span>
              </>
            ) : (
              title
            )}
          </h1>
          <div
            className={cn(
              "h-1 w-16 bg-white/50 rounded-full transition-all duration-300",
              compact ? "mb-1" : "mb-2"
            )}
          />
          <p
            className={cn(
              "font-medium text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] max-w-lg leading-snug transition-all duration-300",
              compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            )}
          >
            {subtitle}
          </p>
        </motion.div>
      </div>

      {/* Glossy top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/15" />

      {/* Ambient bottom transition */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
};
