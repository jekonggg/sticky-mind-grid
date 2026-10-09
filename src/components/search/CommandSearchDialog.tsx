import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { userApi } from "@/services/userApi";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  SearchLg as Search,
  LayoutGrid01 as LayoutGrid,
  CheckSquare,
  Calendar,
  Users01 as Users,
  MessageChatSquare as MessageSquare,
  Settings01 as Settings,
  Stars01 as Sparkles,
  Plus,
  ArrowRight,
  Sun,
  Moon01 as Moon,
  Monitor01 as Laptop,
} from "@untitledui/icons";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/config/queryKeys";

interface CommandSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewBoard?: () => void;
  onOpenNewTask?: () => void;
}

export function CommandSearchDialog({
  open,
  onOpenChange,
  onOpenNewBoard,
  onOpenNewTask,
}: CommandSearchDialogProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch Boards
  const { data: boards = [] } = useQuery({
    queryKey: queryKeys.boards.all,
    queryFn: () => boardApi.getBoards(),
    enabled: open,
  });

  // Fetch Global Tasks
  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.tasks.global(),
    queryFn: () => taskApi.getTasks(),
    enabled: open,
  });

  // Fetch Teammates
  const { data: teammates = [] } = useQuery({
    queryKey: queryKeys.boards.teammates,
    queryFn: () => userApi.getTeammates(),
    enabled: open,
  });

  // Quick navigation items
  const navItems = useMemo(
    () => [
      { id: "nav-home", type: "page", title: "Home / Boards Overview", path: "/", icon: LayoutGrid, category: "Navigation" },
      { id: "nav-dash", type: "page", title: "Dashboard & Analytics", path: "/dashboard", icon: Sparkles, category: "Navigation" },
      { id: "nav-tasks", type: "page", title: "All Workspace Tasks", path: "/tasks", icon: CheckSquare, category: "Navigation" },
      { id: "nav-cal", type: "page", title: "Global Calendar", path: "/calendar", icon: Calendar, category: "Navigation" },
      { id: "nav-teams", type: "page", title: "Teams & Members", path: "/teams", icon: Users, category: "Navigation" },
      { id: "nav-msg", type: "page", title: "Messages & Direct Chats", path: "/messages", icon: MessageSquare, category: "Navigation" },
    ],
    []
  );

  // Quick action items
  const actionItems = useMemo(
    () => [
      {
        id: "act-new-board",
        type: "action",
        title: "Create New Board",
        icon: Plus,
        category: "Actions",
        run: () => {
          onOpenChange(false);
          if (onOpenNewBoard) onOpenNewBoard();
          else navigate("/");
        },
      },
      {
        id: "act-new-task",
        type: "action",
        title: "Create New Task",
        icon: Plus,
        category: "Actions",
        run: () => {
          onOpenChange(false);
          if (onOpenNewTask) onOpenNewTask();
          else navigate("/tasks");
        },
      },
      {
        id: "act-theme",
        type: "action",
        title: `Toggle Theme (Current: ${theme || "system"})`,
        icon: theme === "dark" ? Sun : Moon,
        category: "Actions",
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          onOpenChange(false);
        },
      },
    ],
    [theme, setTheme, onOpenChange, onOpenNewBoard, onOpenNewTask, navigate]
  );

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Pages & Actions
    const matchingNav = navItems.filter((item) =>
      item.title.toLowerCase().includes(q)
    );
    const matchingActions = actionItems.filter((item) =>
      item.title.toLowerCase().includes(q)
    );

    // 2. Boards
    const matchingBoards = boards
      .filter((b) => b.name.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((b) => ({
        id: `board-${b.id}`,
        type: "board",
        title: b.name,
        subtitle: b.description || "Board",
        emoji: b.emoji || "📋",
        category: "Boards",
        run: () => {
          navigate(`/boards/${b.id}`);
          onOpenChange(false);
        },
      }));

    // 3. Tasks
    const matchingTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 6)
      .map((t) => ({
        id: `task-${t.id}`,
        type: "task",
        title: t.title,
        subtitle: t.boardName ? `Board: ${t.boardName}` : `Status: ${t.status}`,
        emoji: t.emoji || "📌",
        category: "Tasks",
        run: () => {
          navigate(`/boards/${t.boardId}/tasks/${t.id}`);
          onOpenChange(false);
        },
      }));

    // 4. Teammates
    const matchingTeammates = teammates
      .filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((u) => ({
        id: `user-${u.id}`,
        type: "user",
        title: u.fullName || u.email,
        subtitle: u.email,
        emoji: "👤",
        category: "Teammates",
        run: () => {
          navigate(`/messages`);
          onOpenChange(false);
        },
      }));

    return [
      ...matchingBoards,
      ...matchingTasks,
      ...matchingTeammates,
      ...matchingNav.map((n) => ({
        ...n,
        run: () => {
          navigate(n.path);
          onOpenChange(false);
        },
      })),
      ...matchingActions,
    ];
  }, [query, navItems, actionItems, boards, tasks, teammates, navigate, onOpenChange]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredResults.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % (filteredResults.length || 1));
      } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
        e.preventDefault();
        filteredResults[selectedIndex].run();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredResults, selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-none sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-2xl p-0 overflow-hidden border-border/70 shadow-2xl bg-card">
        <DialogTitle className="sr-only">Command Search</DialogTitle>
        <DialogDescription className="sr-only">Search across the workspace</DialogDescription>
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-muted/20">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search boards, tasks, teammates, or commands... (Type to filter)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-background border border-border/80 rounded px-1.5 py-0.5 text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No matching boards, tasks, or commands found.</p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = (item as any).icon;
              return (
                <div
                  key={item.id}
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/15 text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0 shadow-2xs">
                      {Icon ? (
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <span className="text-sm">{(item as any).emoji || "📄"}</span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-foreground font-medium truncate">
                        {item.title}
                      </span>
                      {(item as any).subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {(item as any).subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                      {item.category}
                    </Badge>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-semibold text-primary">Sticky Mind Grid</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
