import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface EmojiSelectorProps {
  currentEmoji?: string;
  selectedEmoji?: string;
  value?: string;
  onSelect?: (emoji: string) => void;
  onChange?: (emoji: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg" | string;
}

const COMMON_EMOJIS = [
  "🚀", "🏗️", "📈", "✅", "⏳", "📂", "📝", "📋", "🎨", "🧪", 
  "📐", "👨‍💻", "⚖️", "🔥", "🔍", "📦", "✨", "🎯", "💡", "🛠️",
  "📱", "💻", "🌐", "🔒", "🔑", "📅", "🏷️", "📎", "📌", "💬"
];

export function EmojiSelector({ currentEmoji, selectedEmoji, value, onSelect, onChange, className, size = "md" }: EmojiSelectorProps) {
  const selected = value ?? selectedEmoji ?? currentEmoji;
  const handleSelect = (emoji: string) => {
    onSelect?.(emoji);
    onChange?.(emoji);
  };

  const sizeClass = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className={`${sizeClass} rounded-xl shrink-0 border border-border/50 shadow-sm transition-all
            ${selected ? "bg-primary/5 text-primary" : "bg-muted/30 text-muted-foreground"} 
            hover:bg-primary/10 hover:text-primary hover:border-primary/30 ${className}`}
          title="Personalize with Emoji"
        >
          {selected ? (
            <span className={`${iconSizeClass} leading-none`}>{selected}</span>
          ) : (
            <Smile className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl" align="end" sideOffset={10}>
        <div className="grid grid-cols-6 gap-1.5">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className={`h-9 w-9 flex items-center justify-center text-xl rounded-xl transition-all
                ${selected === emoji ? "bg-primary/20 scale-110 shadow-inner" : "hover:bg-muted"}
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
