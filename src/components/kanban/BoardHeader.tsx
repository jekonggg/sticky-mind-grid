import { Button } from "@/components/ui/button";
import { Plus, Search, Home, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  isActivityOpen?: boolean;
  onToggleActivity?: () => void;
  placeholder?: string;
  showSearch?: boolean;
}

export function BoardHeader({ 
  search = "",
  onSearchChange,
  placeholder = "Search tasks...",
  showSearch = true,
}: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40 h-16 shrink-0">
      {/* Left: Home + Search */}
      <div className="flex items-center gap-4 w-1/3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
          title="Home"
        >
          <Home className="h-5 w-5" />
        </Button>
        {showSearch && (
          <div className="relative group max-w-[240px] w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-full"
            />
          </div>
        )}
      </div>

      {/* Center: Branding */}
      <div className="flex flex-col items-center justify-center w-1/3 select-none">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
             <div className="w-2.5 h-2.5 border-2 border-white rounded-sm" />
          </div>
          <h1 className="text-base font-black text-foreground tracking-tight leading-none uppercase italic text-center">
            Sticky Mind <span className="text-primary not-italic">Grid</span>
          </h1>
        </div>
      </div>

      {/* Right: Actions (Empty for now to balance) */}
      <div className="flex items-center justify-end gap-3 w-1/3">
      </div>
    </header>
  );
}
