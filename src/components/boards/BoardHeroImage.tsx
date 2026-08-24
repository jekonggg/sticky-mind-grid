import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BoardHeroImageProps {
  src?: string;
  alt: string;
  color: string;
  className?: string;
  aspectRatio?: "video" | "square" | "auto";
}

export const BoardHeroImage: React.FC<BoardHeroImageProps> = ({
  src,
  alt,
  color,
  className,
  aspectRatio = "video",
}) => {
  const [error, setError] = useState(false);

  // Reset error whenever src changes so new images load immediately
  useEffect(() => {
    setError(false);
  }, [src]);

  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    auto: "",
  };

  if (!src || error) {
    return (
      <div
        className={cn(
          "w-full flex items-center justify-center overflow-hidden relative transition-all",
          aspectClasses[aspectRatio],
          className
        )}
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <span className="text-white text-3xl font-black tracking-tighter opacity-40 select-none">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden shrink-0 bg-muted relative", aspectClasses[aspectRatio], className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={() => setError(true)}
      />
    </div>
  );
};
