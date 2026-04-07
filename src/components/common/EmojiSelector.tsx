import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface EmojiSelectorProps {
  currentEmoji?: string;
  onSelect: (emoji: string) => void;
  className?: string;
}

const COMMON_EMOJIS = [
  "🚀", "🏗️", "📈", "✅", "⏳", "📂", "📝", "📋", "🎨", "🧪", 
  "📐", "👨‍💻", "⚖️", "🔥", "🔍", "📦", "✨", "🎯", "💡", "🛠️",
  "📱", "💻", "🌐", "🔒", "🔑", "📅", "🏷️", "📎", "📌", "💬"
];

export function EmojiSelector({ currentEmoji, onSelect, className }: EmojiSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className={`h-9 w-9 rounded-xl shrink-0 border border-border/50 shadow-sm transition-all
            ${currentEmoji ? "bg-primary/5 text-primary" : "bg-muted/30 text-muted-foreground"} 
            hover:bg-primary/10 hover:text-primary hover:border-primary/30 ${className}`}
          title="Personalize with Emoji"
        >
          {currentEmoji ? (
            <span className="text-lg leading-none">{currentEmoji}</span>
          ) : (
            <Smile className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl" align="end" sideOffset={10}>
        <div className="grid grid-cols-6 gap-1.5">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className={`h-9 w-9 flex items-center justify-center text-xl rounded-xl transition-all
                ${currentEmoji === emoji ? "bg-primary/20 scale-110 shadow-inner" : "hover:bg-muted"}
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
