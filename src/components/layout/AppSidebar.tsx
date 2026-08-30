import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { noteApi } from "@/services/noteApi";
import { Board, CreateBoardData } from "@/types/board";
import { Note, CreateNoteData } from "@/types/note";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  CalendarDays,
  Users,
  Settings,
  FolderKanban,
  FolderLock,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  StickyNote,
} from "lucide-react";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { BoardModal } from "@/components/boards/BoardModal";
import { NoteModal } from "@/components/documents/NoteModal";
import { SettingsTab } from "@/types/settings";
import { toast } from "sonner";

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch?: () => void;
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenSearch,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId: string }>();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Local expandable state with localStorage persistence
  const [isBoardsExpanded, setIsBoardsExpanded] = useState(() => {
    return localStorage.getItem("sidebar_boards_expanded") !== "false";
  });
  const [isBoardFilesExpanded, setIsBoardFilesExpanded] = useState(() => {
    return localStorage.getItem("sidebar_board_files_expanded") === "true";
  });
  const [isPersonalFilesExpanded, setIsPersonalFilesExpanded] = useState(() => {
    return localStorage.getItem("sidebar_personal_files_expanded") === "true";
  });

  // Modal dialog states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("profile");
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Sync section expansion with localStorage
  useEffect(() => {
    localStorage.setItem("sidebar_boards_expanded", String(isBoardsExpanded));
  }, [isBoardsExpanded]);

  useEffect(() => {
    localStorage.setItem("sidebar_board_files_expanded", String(isBoardFilesExpanded));
  }, [isBoardFilesExpanded]);

  useEffect(() => {
    localStorage.setItem("sidebar_personal_files_expanded", String(isPersonalFilesExpanded));
  }, [isPersonalFilesExpanded]);

  // Fetch Boards
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  // Fetch Pending Invitations for Team Badge
  const { data: invitations = [] } = useQuery({
    queryKey: ["pendingInvitations"],
    queryFn: () => boardApi.getPendingInvitations(),
    refetchInterval: 10000,
  });

  // Fetch notes for active board if available
  const activeBoardId = boardId || (boards[0]?.id ?? "");
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["notes", activeBoardId],
    queryFn: () => (activeBoardId ? noteApi.getNotes(activeBoardId) : Promise.resolve([])),
    enabled: !!activeBoardId,
  });

  // Board creation mutation
  const createBoardMutation = useMutation({
    mutationFn: (data: CreateBoardData) => boardApi.createBoard(data),
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success(`Board "${newBoard.name}" created!`);
      setIsBoardModalOpen(false);
      navigate(`/boards/${newBoard.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create board");
    },
  });

  // Note creation mutation
  const createNoteMutation = useMutation({
    mutationFn: (data: CreateNoteData) => {
      if (!activeBoardId) throw new Error("No active board to attach note");
      return noteApi.createNote(activeBoardId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", activeBoardId] });
      toast.success("Document created successfully");
      setIsNoteModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create document");
    },
  });

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const openSettingsTab = (tab: SettingsTab = "profile") => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const userInitial = user?.fullName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = user?.fullName || user?.email?.split("@")[0] || "User";

  const isHomeActive = location.pathname === "/";
  const isDashboardActive = location.pathname === "/" && location.hash === "#dashboard";

  return (
    <>
      <aside
        className={`h-screen bg-card/95 border-r border-border/60 flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* 1. TOP: Workspace & User Profile Section */}
        <div className="p-3 border-b border-border/50 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-muted/60 transition-colors group text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isCollapsed ? "justify-center" : "justify-between"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-border/60 shadow-2xs">
                      <AvatarImage src={user?.avatarUrl} alt={userName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {userInitial.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate max-w-[110px]">
                          {userName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 text-primary border-primary/20 font-semibold"
                        >
                          Workspace
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                        {user?.email}
                      </span>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56 mt-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                Signed in as <span className="font-bold text-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openSettingsTab("profile")} className="text-xs cursor-pointer gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Account Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettingsTab("appearance")} className="text-xs cursor-pointer gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Theme & Appearance</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettingsTab("workflow")} className="text-xs cursor-pointer gap-2">
                <Kanban className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Workflow Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-xs text-destructive focus:text-destructive cursor-pointer gap-2">
                <LogOut className="h-3.5 w-3.5" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Search trigger (Expanded only) */}
          {!isCollapsed && (
            <button
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else navigate("/");
              }}
              className="mt-2.5 w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span>Quick search...</span>
              </div>
              <kbd className="text-[10px] font-mono bg-background border border-border/70 rounded px-1.5 py-0.5 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* 2. SCROLLABLE MIDDLE NAVIGATION */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 custom-scrollbar">
          {/* Section: PAGES */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
                <span>PAGES</span>
              </div>
            )}

            {/* Home */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isHomeActive && !boardId
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Home className={`h-4 w-4 shrink-0 ${isHomeActive && !boardId ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!isCollapsed && <span>Home</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Home</TooltipContent>}
            </Tooltip>

            {/* Dashboard */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isDashboardActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {!isCollapsed && <span>Dashboard</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Dashboard</TooltipContent>}
            </Tooltip>

            {/* Expandable Boards Tree */}
            <div>
              <div
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group cursor-pointer ${
                  boardId ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
                onClick={() => !isCollapsed && setIsBoardsExpanded(!isBoardsExpanded)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Kanban className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {!isCollapsed && <span className="truncate">Boards</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBoardModalOpen(true);
                      }}
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                      title="Create new board"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    {isBoardsExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Nested Board Items */}
              {!isCollapsed && isBoardsExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 my-1">
                  {boards.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1 italic">
                      No boards yet
                    </p>
                  ) : (
                    boards.map((b) => {
                      const isCurrent = boardId === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => navigate(`/boards/${b.id}`)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group cursor-pointer truncate ${
                            isCurrent
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {b.emoji ? (
                            <span className="text-xs shrink-0">{b.emoji}</span>
                          ) : (
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: b.color || "var(--primary)" }}
                            />
                          )}
                          <span className="truncate flex-1 text-left">{b.name}</span>
                          {isCurrent && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Tasks */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    {!isCollapsed && <span>Tasks</span>}
                  </div>
                  {!isCollapsed && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold">
                      All
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Tasks</TooltipContent>}
            </Tooltip>

            {/* Calendar */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {!isCollapsed && <span>Calendar</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Calendar</TooltipContent>}
            </Tooltip>

            {/* Teams */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    {!isCollapsed && <span>Teams</span>}
                  </div>
                  {!isCollapsed && invitations.length > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 font-bold">
                      {invitations.length}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Teams ({invitations.length})</TooltipContent>}
            </Tooltip>

            {/* Settings */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openSettingsTab("appearance")}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <Settings className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {!isCollapsed && <span>Settings</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
            </Tooltip>
          </div>

          {/* Section: FILES & DOCUMENTS */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            {!isCollapsed && (
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
                <span>FILES</span>
              </div>
            )}

            {/* Board / Project Files */}
            <div>
              <div
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                  isCollapsed ? "justify-center px-0" : ""
                }`}
                onClick={() => !isCollapsed && setIsBoardFilesExpanded(!isBoardFilesExpanded)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderKanban className="h-4 w-4 shrink-0 text-primary/80" />
                  {!isCollapsed && <span className="truncate">Board Files</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNote(null);
                        setIsNoteModalOpen(true);
                      }}
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors"
                      title="New Note / Document"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    {isBoardFilesExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Nested Board Files */}
              {!isCollapsed && isBoardFilesExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 my-1">
                  {notes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1 italic">
                      No documents yet
                    </p>
                  ) : (
                    notes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNote(n);
                          setIsNoteModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group cursor-pointer truncate text-left"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span className="truncate flex-1">{n.title || "Untitled Note"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Personal Files */}
            <div>
              <div
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                  isCollapsed ? "justify-center px-0" : ""
                }`}
                onClick={() => !isCollapsed && setIsPersonalFilesExpanded(!isPersonalFilesExpanded)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderLock className="h-4 w-4 shrink-0 text-amber-500/80" />
                  {!isCollapsed && <span className="truncate">Personal Files</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    {isPersonalFilesExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {!isCollapsed && isPersonalFilesExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 my-1">
                  <button
                    onClick={() => {
                      setSelectedNote(null);
                      setIsNoteModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group cursor-pointer text-left"
                  >
                    <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">Personal Scratchpad</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM: Global Controls & Footer */}
        <div className="p-2 border-t border-border/50 shrink-0 space-y-1">
          {/* Light / Dark Theme Toggle */}
          <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ${
                  isCollapsed ? "justify-center px-0" : "justify-between"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {theme === "dark" ? (
                    <Moon className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <Sun className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  {!isCollapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] text-muted-foreground font-mono uppercase bg-muted/60 px-1.5 py-0.5 rounded">
                    {theme || "system"}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">Toggle Theme ({theme === "dark" ? "Dark" : "Light"})</TooltipContent>
            )}
          </Tooltip>

          {/* Collapse / Rail Mode Toggle */}
          <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ${
                  isCollapsed ? "justify-center px-0" : ""
                }`}
              >
                {isCollapsed ? (
                  <PanelLeft className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {!isCollapsed && <span>Collapse Sidebar</span>}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Expand Sidebar</TooltipContent>}
          </Tooltip>
        </div>
      </aside>

      {/* Global Modals integrated into sidebar actions */}
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />

      <BoardModal
        open={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        onSubmit={(data) => createBoardMutation.mutate(data)}
      />

      <NoteModal
        open={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        onSubmit={(data) => createNoteMutation.mutate(data as CreateNoteData)}
      />
    </>
  );
}
