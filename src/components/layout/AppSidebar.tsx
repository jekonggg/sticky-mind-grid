import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { noteApi } from "@/services/noteApi";
import { taskApi } from "@/services/api";
import { Board, CreateBoardData } from "@/types/board";
import { Note, CreateNoteData } from "@/types/note";
import { Task } from "@/types/task";
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
  Home01 as Home,
  LayoutGrid01 as LayoutDashboard,
  Columns03 as Kanban,
  CheckSquare,
  CalendarDate as CalendarDays,
  Users01 as Users,
  Settings01 as Settings,
  Folder as FolderKanban,
  FolderLock,
  File06 as FileText,
  Plus,
  ChevronDown,
  Sun,
  Moon01 as Moon,
  Monitor01 as Laptop,
  LogOut01 as LogOut,
  LayoutLeft as PanelLeft,
  LayoutLeft as PanelLeftClose,
  Stars01 as Sparkles,
  SearchLg as Search,
  CheckCircle as CheckCircle2,
  File02 as FileSpreadsheet,
  File06 as StickyNote,
  Image01 as ImageIcon,
  LinkExternal01 as ExternalLink,
  MessageChatSquare as MessageSquare,
  User01 as User,
  Palette,
  Sliders01 as Sliders,
} from "@untitledui/icons";
import { fileApi } from "@/services/fileApi";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { BoardModal } from "@/components/boards/BoardModal";
import { NoteModal } from "@/components/documents/NoteModal";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { getPersonalNotesCount } from "@/utils/scratchpadUtils";
import { NewChatModal } from "@/components/messages/NewChatModal";
import { SettingsTab, SettingsView } from "@/types/settings";
import { useUnreadMessageCount } from "@/hooks/useMessages";
import { toast } from "sonner";

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch?: () => void;
  /** Called to dismiss the mobile navigation drawer, e.g. after settings closes. */
  onNavigate?: () => void;
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenSearch,
  onNavigate,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId: string }>();
  const { user, logout } = useAuth();
  const { devSettings, setIsDevModalOpen } = useDevMode();
  const { settings, updateLocalSetting } = useSettings();
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
  const [settingsView, setSettingsView] = useState<SettingsView>("list");
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Personal Notes count state & event listener
  const [personalNotesCount, setPersonalNotesCount] = useState<number>(() =>
    getPersonalNotesCount(user?.id)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setPersonalNotesCount(getPersonalNotesCount(user?.id));
    };
    handleUpdate();
    window.addEventListener("personal_notes_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("personal_notes_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user?.id]);

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
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // Fetch notes for active board if available
  const activeBoardId = boardId || (boards[0]?.id ?? "");
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["boardNotes", activeBoardId],
    queryFn: () => (activeBoardId ? noteApi.getNotes(activeBoardId) : Promise.resolve([])),
    enabled: Boolean(activeBoardId) && (Boolean(boardId) || isBoardFilesExpanded),
  });

  // Fetch all tasks for task badge
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["globalTasks"],
    queryFn: () => taskApi.getTasks(),
  });

  // Aggregate attachments from tasks belonging to the active board
  const boardTasks = React.useMemo(() => {
    if (!activeBoardId) return [];
    return allTasks.filter((t) => t.boardId === activeBoardId);
  }, [allTasks, activeBoardId]);

  const boardTaskAttachments = React.useMemo(() => {
    return boardTasks.flatMap((t) =>
      (t.attachments || []).map((att) => ({
        ...att,
        name: att.name || "Untitled File",
        type: att.type || "application/octet-stream",
        taskId: t.id,
        taskTitle: t.title,
      }))
    );
  }, [boardTasks]);

  const totalBoardFilesCount = notes.length + boardTaskAttachments.length;

  // Fetch unread messages count for sidebar badge
  const { data: unreadMessagesCount = 0 } = useUnreadMessageCount();

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
      queryClient.invalidateQueries({ queryKey: ["boardNotes", activeBoardId] });
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

  const openSettingsTab = (
    tab: SettingsTab = "profile",
    view: SettingsView = "list"
  ) => {
    setSettingsTab(tab);
    setSettingsView(view);
    setIsSettingsOpen(true);
  };

  const userInitial = user?.fullName?.charAt(0) || user?.email?.charAt(0) || "U";
  const userName = user?.fullName || user?.email?.split("@")[0] || "User";

  const isHomeActive = location.pathname === "/" && !boardId;
  const isDashboardActive = location.pathname === "/dashboard";
  const isTasksActive = location.pathname === "/tasks";
  const isCalendarActive = location.pathname === "/calendar";
  const isTeamsActive = location.pathname === "/teams";
  const isMessagesActive = location.pathname.startsWith("/messages");

  return (
    <>
      <aside
        className={`h-screen bg-card/95 border-r border-border/60 flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none z-30 ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {/* 1. TOP: Workspace & User Profile Section */}
        <div className={`${isCollapsed ? "px-2 py-3" : "p-3"} border-b border-border/50 shrink-0`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="User menu"
                title="User menu"
                className={`w-full h-12 flex items-center rounded-xl hover:bg-muted/60 transition-colors group text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isCollapsed ? "justify-center px-0" : "justify-between gap-2.5 px-1.5"
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 border border-border/60 shadow-2xs">
                      <AvatarImage src={user?.avatarUrl} alt={userName} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                        {userInitial}
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

            <DropdownMenuContent align="start" className="w-64 p-1.5 mt-1">
              <DropdownMenuItem
                onClick={() => openSettingsTab("profile", "detail")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Account Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openSettingsTab("appearance", "detail")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>Appearance & Theme</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openSettingsTab("workflow")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>All Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/")}
                className="cursor-pointer text-xs font-semibold py-2 flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                <span>My Boards</span>
              </DropdownMenuItem>

              {import.meta.env.DEV && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDevModalOpen(true)}
                    className="cursor-pointer text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 focus:bg-amber-500/10 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-amber-500" />
                      <span>Developer Suite</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono font-bold bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    >
                      DEV
                    </Badge>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-xs font-bold py-2 text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 rounded-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Search trigger (Always visible; expands sidebar when clicked while collapsed) */}
          <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (isCollapsed) {
                    onToggleCollapse();
                    return;
                  }
                  if (onOpenSearch) onOpenSearch();
                  else navigate("/");
                }}
                aria-label="Quick search"
                className={`mt-2.5 w-full h-8 flex items-center text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg transition-all cursor-pointer group ${
                  isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  {!isCollapsed && <span>Quick search...</span>}
                </div>
                {!isCollapsed && (
                  <kbd className="text-[10px] font-mono bg-background border border-border/70 rounded px-1.5 py-0.5 shadow-2xs">
                    ⌘K
                  </kbd>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Quick Search</TooltipContent>}
          </Tooltip>
        </div>

        {/* 2. SCROLLABLE MIDDLE NAVIGATION */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 custom-scrollbar">
          {/* Section: PAGES */}
          <div className="space-y-1">
            <div
              className={`h-6 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between transition-opacity duration-200 ${
                isCollapsed ? "opacity-0 pointer-events-none select-none" : "opacity-100"
              }`}
              aria-hidden={isCollapsed}
            >
              <span>PAGES</span>
            </div>

            {/* Home */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isHomeActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}`}
                >
                  <Home className={`h-4 w-4 shrink-0 ${isHomeActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!isCollapsed && <span>Home</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Home</TooltipContent>}
            </Tooltip>

            {/* Dashboard */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/dashboard")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isDashboardActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}`}
                >
                  <LayoutDashboard className={`h-4 w-4 shrink-0 ${isDashboardActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!isCollapsed && <span>Dashboard</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Dashboard</TooltipContent>}
            </Tooltip>

            {/* Expandable Boards Tree */}
            <div>
              <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-colors group cursor-pointer ${
                      boardId ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    } ${isCollapsed ? "justify-center px-0" : "justify-between px-2.5"}`}
                    onClick={() => !isCollapsed && setIsBoardsExpanded(!isBoardsExpanded)}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                      <Kanban className={`h-4 w-4 shrink-0 ${boardId ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {!isCollapsed && <span className="truncate">Boards</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {/* Smooth hover reveal Add Board button */}
                        <div className="flex items-center overflow-hidden transition-all duration-200 max-w-0 opacity-0 group-hover:max-w-[28px] group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsBoardModalOpen(true);
                            }}
                            className="h-5 w-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-2xs shrink-0"
                            title="Create new board"
                            aria-label="Create new board"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Number Notification Badge - Rightmost position */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 font-bold select-none shrink-0"
                        >
                          {boards.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Boards ({boards.length})</TooltipContent>}
              </Tooltip>

              {/* Nested Board Items */}
              {!isCollapsed && isBoardsExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 my-1">
                  {boards.filter((b) => !b.isDeleted).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1 italic">
                      No boards yet
                    </p>
                  ) : (
                    boards.filter((b) => !b.isDeleted).map((b) => {
                      const isCurrent = boardId === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            if (boardId !== b.id) {
                              navigate(`/boards/${b.id}`);
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group cursor-pointer truncate ${
                            isCurrent
                              ? "bg-primary/10 text-primary font-bold border border-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          {!devSettings.disableEmojiCustomization && (
                            b.emoji ? (
                              <span className="text-xs shrink-0">{b.emoji}</span>
                            ) : (
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: b.color || "var(--primary)" }}
                              />
                            )
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
                  onClick={() => navigate("/tasks")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isTasksActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "justify-between px-2.5"}`}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                    <CheckSquare className={`h-4 w-4 shrink-0 ${isTasksActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    {!isCollapsed && <span>Tasks</span>}
                  </div>
                  {!isCollapsed && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold shrink-0">
                      {allTasks.length}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Tasks ({allTasks.length})</TooltipContent>}
            </Tooltip>

            {/* Calendar */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/calendar")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isCalendarActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"}`}
                >
                  <CalendarDays className={`h-4 w-4 shrink-0 ${isCalendarActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!isCollapsed && <span>Calendar</span>}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Calendar</TooltipContent>}
            </Tooltip>

            {/* Teams */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/teams")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isTeamsActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "justify-between px-2.5"}`}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                    <Users className={`h-4 w-4 shrink-0 ${isTeamsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    {!isCollapsed && <span>Teams</span>}
                  </div>
                  {!isCollapsed && invitations.length > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 font-bold shrink-0">
                      {invitations.length}
                    </Badge>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">Teams ({invitations.length})</TooltipContent>}
            </Tooltip>

            {/* Messages */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => navigate("/messages")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                    isMessagesActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${isCollapsed ? "justify-center px-0" : "justify-between px-2.5"}`}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                    <div className="relative flex items-center justify-center shrink-0">
                      <MessageSquare
                        className={`h-4 w-4 shrink-0 ${
                          isMessagesActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                      {isCollapsed && unreadMessagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card animate-pulse" />
                      )}
                    </div>
                    {!isCollapsed && <span>Messages</span>}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {/* Smooth hover reveal New Chat button */}
                      <div className="flex items-center overflow-hidden transition-all duration-200 max-w-0 opacity-0 group-hover:max-w-[28px] group-hover:opacity-100 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNewChatModalOpen(true);
                          }}
                          className="h-5 w-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="New Message / Chat"
                          aria-label="New Message / Chat"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Number Notification Badge - Rightmost position */}
                      {unreadMessagesCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-4 font-bold shadow-2xs animate-pulse select-none shrink-0">
                          {unreadMessagesCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  Messages{unreadMessagesCount > 0 ? ` (${unreadMessagesCount} unread)` : ""}
                </TooltipContent>
              )}
            </Tooltip>

            {/* Settings */}
            <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => openSettingsTab("profile")}
                  className={`w-full h-9 flex items-center rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                    isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
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
            <div
              className={`h-6 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between transition-opacity duration-200 ${
                isCollapsed ? "opacity-0 pointer-events-none select-none" : "opacity-100"
              }`}
              aria-hidden={isCollapsed}
            >
              <span>FILES</span>
            </div>

            {/* Board / Project Files */}
            <div>
              <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-full h-9 flex items-center rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                      isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                    }`}
                    onClick={() => !isCollapsed && setIsBoardFilesExpanded(!isBoardFilesExpanded)}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                      <FolderKanban className="h-4 w-4 shrink-0 text-primary/80" />
                      {!isCollapsed && <span className="truncate">Board Files</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {/* Smooth hover reveal Add Document button */}
                        <div className="flex items-center overflow-hidden transition-all duration-200 max-w-0 opacity-0 group-hover:max-w-[28px] group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNote(null);
                              setIsNoteModalOpen(true);
                            }}
                            className="h-5 w-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-2xs shrink-0"
                            title="New Note / Document"
                            aria-label="New Note / Document"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Number Notification Badge - Rightmost position */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 font-bold select-none shrink-0"
                        >
                          {totalBoardFilesCount}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Board Files ({totalBoardFilesCount})</TooltipContent>}
              </Tooltip>

              {/* Nested Board Files */}
              {!isCollapsed && isBoardFilesExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l border-border/40 ml-4 my-1">
                  {activeBoardId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/boards/${activeBoardId}?view=documents`)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors mb-1 text-left cursor-pointer"
                      title="Open board Docs & Files view"
                    >
                      <span>Open Docs & Files</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}

                  {totalBoardFilesCount === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2 py-1 italic">
                      No files or documents yet
                    </p>
                  ) : (
                    <>
                      {/* Section: Notes */}
                      {notes.length > 0 && (
                        <div className="space-y-0.5">
                          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 pt-1 pb-0.5">
                            Notes ({notes.length})
                          </div>
                          {notes.map((n) => (
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
                          ))}
                        </div>
                      )}

                      {/* Section: Task Attachments / Files */}
                      {boardTaskAttachments.length > 0 && (
                        <div className="space-y-0.5 pt-1">
                          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 pt-1 pb-0.5">
                            Task Files ({boardTaskAttachments.length})
                          </div>
                          {boardTaskAttachments.map((att, idx) => {
                            const isImage = att.type?.startsWith("image/");
                            return (
                              <button
                                key={att.id || att.url || `sidebar-att-${idx}`}
                                onClick={() => {
                                  if (att.url) {
                                    fileApi.downloadFile(att.url, att.name);
                                  }
                                }}
                                title={`${att.name} (from task: "${att.taskTitle}") - Click to download`}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors group cursor-pointer truncate text-left"
                              >
                                {isImage ? (
                                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-500/80" />
                                ) : (
                                  <FileText className="h-3.5 w-3.5 shrink-0 text-orange-500/80" />
                                )}
                                <span className="truncate flex-1">{att.name}</span>
                                {att.size && (
                                  <span className="text-[9px] text-muted-foreground/60 shrink-0">
                                    {typeof att.size === "number" ? `${Math.round(att.size / 1024)} KB` : att.size}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Scratchpad */}
            <div>
              <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <div
                    className={`w-full h-9 flex items-center rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer group ${
                      isCollapsed ? "justify-center px-0" : "justify-between px-2.5"
                    }`}
                    onClick={() => !isCollapsed && setIsPersonalFilesExpanded(!isPersonalFilesExpanded)}
                  >
                    <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5 min-w-0"}`}>
                      <FolderLock className="h-4 w-4 shrink-0 text-amber-500/80" />
                      {!isCollapsed && <span className="truncate">Scratchpad</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {/* Smooth hover reveal Add Scratchpad Note button */}
                        <div className="flex items-center overflow-hidden transition-all duration-200 max-w-0 opacity-0 group-hover:max-w-[28px] group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsScratchpadOpen(true);
                            }}
                            className="h-5 w-5 flex items-center justify-center rounded bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-white transition-colors cursor-pointer shadow-2xs shrink-0"
                            title="New Scratchpad Note"
                            aria-label="New Scratchpad Note"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Number Notification Badge - Rightmost position */}
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 font-bold select-none shrink-0"
                        >
                          {personalNotesCount}
                        </Badge>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Scratchpad ({personalNotesCount})</TooltipContent>}
              </Tooltip>

              {!isCollapsed && isPersonalFilesExpanded && (
                <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-border/40 ml-4 my-1">
                  <button
                    onClick={() => setIsScratchpadOpen(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/10 transition-colors group cursor-pointer text-left"
                  >
                    <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="truncate flex-1">Open Scratchpad</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {personalNotesCount}
                    </Badge>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM: Global Controls & Footer */}
        <div className="p-2 border-t border-border/50 shrink-0 space-y-1.5">
          {/* 3-Way Theme Selector (Light, Dark, Auto) */}
          {!isCollapsed ? (
            <div className="space-y-1 px-1 py-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Theme
                </span>
                <span className="text-[10px] text-muted-foreground font-mono uppercase bg-muted/60 px-1.5 py-0.5 rounded">
                  {settings.theme === "system" ? "Auto" : settings.theme === "dark" ? "Dark" : "Light"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg border border-border/40">
                <button
                  type="button"
                  data-testid="sidebar-theme-light-btn"
                  onClick={() => {
                    updateLocalSetting("theme", "light");
                    setTheme("light");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    settings.theme === "light"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                  title="Light Theme"
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  data-testid="sidebar-theme-dark-btn"
                  onClick={() => {
                    updateLocalSetting("theme", "dark");
                    setTheme("dark");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    settings.theme === "dark"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                  title="Dark Theme"
                >
                  <Moon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  data-testid="sidebar-theme-system-btn"
                  onClick={() => {
                    updateLocalSetting("theme", "system");
                    setTheme("system");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    settings.theme === "system"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                  title="System Theme"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Auto</span>
                </button>
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid="sidebar-theme-collapsed-btn"
                      className="w-full h-9 flex items-center justify-center rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      {settings.theme === "dark" ? (
                        <Moon className="h-4 w-4 text-amber-400" />
                      ) : settings.theme === "light" ? (
                        <Sun className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Laptop className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Theme: {settings.theme === "system" ? "Auto" : settings.theme === "dark" ? "Dark" : "Light"}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="end" className="w-36 p-1">
                <DropdownMenuItem
                  onClick={() => {
                    updateLocalSetting("theme", "light");
                    setTheme("light");
                  }}
                  className={`cursor-pointer text-xs font-semibold py-1.5 flex items-center justify-between ${
                    settings.theme === "light" ? "bg-muted font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Light</span>
                  </div>
                  {settings.theme === "light" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    updateLocalSetting("theme", "dark");
                    setTheme("dark");
                  }}
                  className={`cursor-pointer text-xs font-semibold py-1.5 flex items-center justify-between ${
                    settings.theme === "dark" ? "bg-muted font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-3.5 w-3.5 text-amber-400" />
                    <span>Dark</span>
                  </div>
                  {settings.theme === "dark" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    updateLocalSetting("theme", "system");
                    setTheme("system");
                  }}
                  className={`cursor-pointer text-xs font-semibold py-1.5 flex items-center justify-between ${
                    settings.theme === "system" ? "bg-muted font-bold" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="h-3.5 w-3.5" />
                    <span>Auto</span>
                  </div>
                  {settings.theme === "system" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Collapse / Rail Mode Toggle */}
          <Tooltip delayDuration={isCollapsed ? 100 : 1000}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className={`w-full h-9 flex items-center rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ${
                  isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
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
        onClose={() => {
          setIsSettingsOpen(false);
          onNavigate?.();
        }}
        initialTab={settingsTab}
        initialView={settingsView}
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

      <PersonalScratchpadModal
        open={isScratchpadOpen}
        onClose={() => {
          setIsScratchpadOpen(false);
          setPersonalNotesCount(getPersonalNotesCount(user?.id));
        }}
      />

      <NewChatModal
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        onSelectConversation={(id) => {
          setIsNewChatModalOpen(false);
          navigate(`/messages/${id}`);
        }}
      />
    </>
  );
}
