import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { boardApi } from "@/services/boardApi";
import { Board } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SettingsTab } from "@/types/settings";
import { useSettings } from "@/contexts/SettingsContext";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LatestChangesPanel } from "./LatestChangesPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Home,
  Search,
  LayoutGrid,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  User,
  Kanban,
  Sparkles,
  Settings,
  Moon,
  Sun,
  Palette,
  History,
} from "lucide-react";
import { toast } from "sonner";

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
  const { user, logout } = useAuth();

  const [boards, setBoards] = useState<Board[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const { settings, updateLocalSetting } = useSettings();

  useEffect(() => {
    // Load available boards for quick switcher
    boardApi.getBoards().then((data) => {
      setBoards(data || []);
    }).catch(() => {
      // Silently catch in header
    });
  }, [boardId]);

  const currentBoard = boards.find((b) => b.id === boardId);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const openSettings = (tab: SettingsTab = "profile") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const userInitial = user?.fullName?.charAt(0) || user?.email?.charAt(0) || "U";

  return (
    <>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/60 bg-card/95 backdrop-blur-md sticky top-0 z-40 h-16 shrink-0 shadow-sm">
        {/* Left: Home + Quick Board Switcher + Search */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground rounded-lg"
            onClick={() => navigate("/")}
            title="Dashboard / Home"
          >
            <Home className="h-4.5 w-4.5" />
          </Button>

          {/* Quick Board Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-border/60 bg-background/50 hover:bg-muted/80 max-w-[190px] md:max-w-[220px] rounded-lg px-2.5 shadow-none shrink-0"
              >
                <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0 font-bold">
                  {currentBoard?.emoji || <Kanban className="h-3.5 w-3.5" />}
                </div>
                <span className="truncate text-xs font-bold text-foreground">
                  {currentBoard ? currentBoard.name : "Switch Board"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-70" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Your Boards
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {boards.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  No boards found
                </div>
              ) : (
                boards.map((b) => {
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
                        <span className="text-sm shrink-0">{b.emoji || "📋"}</span>
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
        <div className="flex flex-col items-center justify-center w-1/3 select-none">
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center shadow-sm shadow-primary/20 group-hover:scale-105 transition-transform">
              <div className="w-2.5 h-2.5 border-2 border-primary-foreground rounded-sm" />
            </div>
            <h1 className="text-sm md:text-base font-black text-foreground tracking-tight leading-none uppercase italic text-center">
              Sticky Mind <span className="text-primary not-italic">Grid</span>
            </h1>
          </div>
        </div>

        {/* Right: Actions & User Avatar Menu */}
        <div className="flex items-center justify-end gap-2.5 w-1/3">
          {/* On-demand Board Activity Trigger */}
          {boardId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsActivityOpen(true)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Activity History"
            >
              <History className="h-4 w-4" />
            </Button>
          )}

          {/* Notification Center */}
          <NotificationBell />

          {/* User Account Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="User menu"
                title="User menu"
                className="relative h-9.5 w-9.5 rounded-full p-0 ring-2 ring-primary/20 hover:ring-primary/50 transition-all focus-visible:ring-primary"
              >
                <Avatar className="h-9 w-9">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user?.fullName || "User"} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xs uppercase">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-1.5" align="end" forceMount>
              {/* User Profile Header */}
              <div 
                onClick={() => openSettings("profile")}
                className="flex items-center gap-3 p-2 bg-muted/30 hover:bg-muted/60 rounded-lg mb-1 cursor-pointer transition-colors"
              >
                <Avatar className="h-10 w-10 border border-primary/20">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user?.fullName || "User"} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-sm uppercase">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-black text-foreground truncate leading-tight">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate font-medium">
                    {user?.email}
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Quick Theme Toggle */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Theme
                </p>
                <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateLocalSetting("theme", "light")}
                    className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold transition-all ${
                      settings.theme === "light"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sun className="h-3 w-3" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLocalSetting("theme", "dark")}
                    className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold transition-all ${
                      settings.theme === "dark"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Moon className="h-3 w-3" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLocalSetting("theme", "system")}
                    className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-semibold transition-all ${
                      settings.theme === "system"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Account Settings */}
              <DropdownMenuItem
                onClick={() => openSettings("profile")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Account Profile</span>
              </DropdownMenuItem>

              {/* Preferences & Appearance */}
              <DropdownMenuItem
                onClick={() => openSettings("appearance")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>Appearance & Theme</span>
              </DropdownMenuItem>

              {/* All Settings */}
              <DropdownMenuItem
                onClick={() => openSettings("workflow")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>All Settings</span>
              </DropdownMenuItem>

              {/* My Boards */}
              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span>My Boards</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-xs font-bold py-2 text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 rounded-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Unified System & User Settings Dialog */}
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />

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
