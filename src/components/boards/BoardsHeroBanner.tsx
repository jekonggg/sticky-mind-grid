import React from "react";
import { motion } from "framer-motion";

interface BoardsHeroBannerProps {
  title?: string;
  subtitle?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export const BoardsHeroBanner: React.FC<BoardsHeroBannerProps> = ({
  title = "Sticky Mind Grid",
  subtitle = "Your boards, in one place.",
  gradientFrom = "hsl(var(--primary))",
  gradientTo = "hsl(var(--accent))",
}) => {
  return (
    <div className="relative w-full h-[240px] md:h-[320px] overflow-hidden bg-background">
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
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle at 20% 30%, white 0%, transparent 70%)"
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        initial={{ scale: 1, x: "-10%", y: "-10%" }}
        animate={{ 
          scale: [1, 1.1, 1],
          x: ["-10%", "5%", "-10%"],
          y: ["-10%", "10%", "-10%"]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, transparent 0deg, ${gradientTo}22 180deg, transparent 360deg)`
        }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }}
      />

      {/* Floating Orbs animation */}
      <motion.div 
        className="absolute w-[400px] h-[400px] bg-white/20 rounded-full blur-[100px] pointer-events-none"
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 80, 0],
          opacity: [0.4, 0.6, 0.4]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ top: '-10%', left: '-10%' }}
      />

      <motion.div 
        className="absolute w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none"
        animate={{
          x: [0, -120, 40, 0],
          y: [0, 80, -40, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ bottom: '-10%', right: '10%' }}
      />

      {/* Content Overlay */}
      <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center text-white">
        <motion.div 
          className="z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-4 drop-shadow-2xl uppercase italic">
            Sticky Mind <span className="text-white not-italic opacity-90">Grid</span>
          </h1>
          <div className="h-1.5 w-24 bg-white/40 rounded-full mb-6" />
          <p className="text-lg md:text-xl font-medium text-white/80 max-w-lg leading-relaxed">
            {subtitle}
          </p>
        </motion.div>
      </div>
      
      {/* Glossy top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

      {/* Ambient bottom transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
