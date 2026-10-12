import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { boardApi } from "@/services/boardApi";
import { Board } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDevMode } from "@/contexts/DevModeContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LatestChangesPanel } from "./LatestChangesPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  SearchLg as Search,
  LayoutGrid01 as LayoutGrid,
  ChevronDown,
  Check,
  ClockRewind as History,
  Menu01 as Menu,
  Pin01 as Pin,
} from "@untitledui/icons";
import { useLayout } from "@/contexts/LayoutContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { getPinnedBoardIds, isBoardPinned } from "@/utils/pinnedBoardsUtils";

interface BoardHeaderProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  placeholder?: string;
  showSearch?: boolean;
}

export function BoardHeader({
  search = "",
  onSearchChange,
  placeholder = "Search tasks...",
  showSearch = true,
}: BoardHeaderProps) {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuth();

  const [boards, setBoards] = useState<Board[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedBoardIds(user?.id));
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const { devSettings } = useDevMode();
  const { setIsMobileOpen } = useLayout();

  useEffect(() => {
    setPinnedIds(getPinnedBoardIds(user?.id));
    const handlePinChange = () => setPinnedIds(getPinnedBoardIds(user?.id));
    window.addEventListener("pinned_boards_updated", handlePinChange);
    window.addEventListener("storage", handlePinChange);
    return () => {
      window.removeEventListener("pinned_boards_updated", handlePinChange);
      window.removeEventListener("storage", handlePinChange);
    };
  }, [user?.id]);

  useEffect(() => {
    const loadBoards = () => {
      boardApi.getBoards().then((data) => {
        setBoards(data || []);
      }).catch(() => {
        // Silently catch in header
      });
    };
    loadBoards();
    window.addEventListener("smg-dev-data-mode-changed", loadBoards);
    return () => window.removeEventListener("smg-dev-data-mode-changed", loadBoards);
  }, [boardId]);

  const currentBoard = boards.find((b) => b.id === boardId);
  const permissions = useBoardPermissions(currentBoard);

  const pinnedSwitcherBoards = boards.filter(
    (b) => pinnedIds.includes(b.id) || isBoardPinned(b.id, user?.id, b.isPinned)
  );
  const unpinnedSwitcherBoards = boards.filter(
    (b) => !pinnedIds.includes(b.id) && !isBoardPinned(b.id, user?.id, b.isPinned)
  );

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60 bg-card/95 backdrop-blur-md sticky top-0 z-40 h-16 shrink-0 shadow-sm gap-2">
        {/* Left: Quick Board Switcher + Search */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-11 w-11 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
            onClick={() => setIsMobileOpen(true)}
            title="Open Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Quick Board Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-border/60 bg-background/50 hover:bg-muted/80 max-w-[190px] md:max-w-[220px] rounded-lg px-2.5 shadow-none shrink-0 min-w-0"
              >
                {!devSettings.disableEmojiCustomization && currentBoard?.emoji && (
                  <span className="text-xs shrink-0">{currentBoard.emoji}</span>
                )}
                <span className="truncate text-xs font-bold text-foreground">
                  {currentBoard ? currentBoard.name : "Switch Board"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-70 shrink-0" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
              {pinnedSwitcherBoards.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Pin className="h-3 w-3 fill-current" />
                    Pinned Boards
                  </DropdownMenuLabel>
                  {pinnedSwitcherBoards.map((b) => {
                    const isCurrent = b.id === boardId;
                    return (
                      <DropdownMenuItem
                        key={`pinned-${b.id}`}
                        onClick={() => navigate(`/boards/${b.id}`)}
                        className={`cursor-pointer text-xs font-semibold py-2 px-2.5 flex items-center justify-between rounded-md transition-colors ${
                          isCurrent
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted/80"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {!devSettings.disableEmojiCustomization && b.emoji && (
                            <span className="text-sm shrink-0">{b.emoji}</span>
                          )}
                          <span className="truncate">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <Pin className="h-3 w-3 text-primary fill-current opacity-80" />
                          {isCurrent && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Your Boards
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {boards.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  No boards found
                </div>
              ) : (
                (pinnedSwitcherBoards.length > 0 ? unpinnedSwitcherBoards : boards).map((b) => {
                  const isCurrent = b.id === boardId;
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => navigate(`/boards/${b.id}`)}
                      className={`cursor-pointer text-xs font-semibold py-2 px-2.5 flex items-center justify-between rounded-md transition-colors ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {!devSettings.disableEmojiCustomization && b.emoji && (
                          <span className="text-sm shrink-0">{b.emoji}</span>
                        )}
                        <span className="truncate">{b.name}</span>
                      </div>
                      {isCurrent && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                    </DropdownMenuItem>
                  );
                })
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer text-xs font-bold text-primary flex items-center gap-2 py-2"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>All Boards Dashboard</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Box */}
          {showSearch && (
            <div className="relative group max-w-[240px] w-full hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
              <Input
                placeholder={placeholder}
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-full"
              />
            </div>
          )}
        </div>

        {/* Center: Branding */}
        <div className="hidden md:flex items-center justify-center shrink-0 select-none">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="w-6 h-6 md:w-6 md:h-6 bg-primary rounded-lg flex items-center justify-center shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-2.5 h-2.5 border-2 border-primary-foreground rounded-sm" />
            </div>
            <h1 className="hidden sm:block text-sm md:text-base font-black text-foreground tracking-tight leading-none uppercase italic text-center">
              Sticky Mind <span className="text-primary not-italic">Grid</span>
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-1 md:gap-2.5 flex-1 min-w-0">
          {/* On-demand Board Activity Trigger */}
          {boardId && permissions.canViewBoardActivity && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsActivityOpen(true)}
              className="h-11 w-11 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0"
              title="Activity History"
            >
              <History className="h-4 w-4" />
            </Button>
          )}

          {/* Notification Center */}
          <NotificationBell />
        </div>
      </header>

      {/* On-Demand Activity History Sheet */}
      <Sheet open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <SheetContent side="right" className="p-0 w-[85%] sm:w-[400px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Recent Activity</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-hidden">
            <LatestChangesPanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

