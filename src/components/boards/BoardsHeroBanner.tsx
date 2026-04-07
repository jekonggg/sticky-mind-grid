import React from "react";

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
    <div className="relative w-full h-[240px] md:h-[320px] overflow-hidden">
      {/* Dynamic Background Effect */}
      <div 
        className="absolute inset-0 opacity-90 transition-opacity duration-700"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        }}
      />
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-white/20 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-black/10 blur-[80px]" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px"
        }}
      />

      {/* Content Overlay */}
      <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center text-white">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 drop-shadow-sm">
            {title}
          </h1>
          <p className="text-lg md:text-xl font-medium text-white/80 max-w-lg leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
      
      {/* Bottom Curve/Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};
