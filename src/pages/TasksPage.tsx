import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { boardApi } from "@/services/boardApi";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Task, Priority, CreateTaskData } from "@/types/task";
import { Board } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  SearchLg as Search,
  FilterLines as Filter,
  Plus,
  Clock,
  CheckCircle as CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowLeft,
  LayoutGrid01 as LayoutGrid,
  Columns03 as Kanban,
  List as ListIcon,
  LayersTwo01 as Layers,
  ChevronSelectorVertical as ArrowUpDown,
  Tag01 as TagIcon,
  Stars01 as Sparkles,
  User01 as User,
  Download01 as Download,
} from "@untitledui/icons";
import { exportTasksToCSV, exportTasksToExcel } from "@/utils/exportToExcel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskModal } from "@/components/kanban/TaskModal";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { PillNavBar } from "@/components/common/PillNavBar";
import { BoardViewRail } from "@/components/kanban/BoardViewRail";
import { BOARD_VIEWS, type BoardViewId } from "@/config/boardViews";
import { toast } from "sonner";
import { TableRowSkeleton, TaskCardSkeleton } from "@/components/skeletons";
import { BoardMember } from "@/types/board";

type FilterTab = "all" | "assigned" | "created" | "completed" | "overdue";
type SortOption = "dueDate" | "priority" | "title" | "created";

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isCompact = settings.uiDensity === "compact";

  const boardIdParam = searchParams.get("boardId");

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boardIdParam || "all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("dueDate");
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Force grid view on mobile and disable list view
  useEffect(() => {
    if (isMobile && viewMode !== "grid") {
      setViewMode("grid");
    }
  }, [isMobile, viewMode]);

  const effectiveViewMode = isMobile ? "grid" : viewMode;

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [targetBoardForNewTask, setTargetBoardForNewTask] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  // Sync state if boardId in URL changes
  useEffect(() => {
    if (boardIdParam) {
      setSelectedBoardId(boardIdParam);
    }
  }, [boardIdParam]);

  const handleBoardChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newBoardId === "all") {
        next.delete("boardId");
      } else {
        next.set("boardId", newBoardId);
      }
      return next;
    }, { replace: true });
  };

  // Fetch all user boards
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  const currentScopedBoard = useMemo(() => {
    if (selectedBoardId === "all") return null;
    return boards.find((b) => b.id === selectedBoardId) || null;
  }, [boards, selectedBoardId]);

  const handleBoardViewChange = (viewId: BoardViewId) => {
    if (!currentScopedBoard) return;
    if (viewId === "board") {
      navigate(`/boards/${currentScopedBoard.id}`);
      return;
    }
    navigate(`/boards/${currentScopedBoard.id}?view=${viewId}`);
  };

  // Fetch all user tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["globalTasks"],
    queryFn: () => taskApi.getTasks(),
    // The board-scoped list must reflect tasks created/edited in the board shell.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const activeTaskBoard = useMemo(() => {
    if (!selectedTask) return null;
    return (
      boards.find((b) => b.id === selectedTask.boardId) || {
        id: selectedTask.boardId,
        name: selectedTask.boardName || "Workspace Board",
        emoji: devSettings.disableEmojiCustomization ? "" : (selectedTask.boardEmoji || "📋"),
        color: "#3b82f6",
        ownerId: selectedTask.createdBy || "",
        columns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }, [boards, selectedTask, devSettings.disableEmojiCustomization]);

  // Fetch Board Members for active task board
  const { data: activeTaskBoardMembers = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", activeTaskBoard?.id],
    queryFn: () =>
      activeTaskBoard?.id ? boardApi.getMembers(activeTaskBoard.id) : Promise.resolve([]),
    enabled: !!activeTaskBoard?.id,
  });

  // Task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      toast.success("Task updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData & { boardId: string }) =>
      taskApi.createTask(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      toast.success(`Task "${newTask.title}" created!`);
      setIsNewTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  // Filter & Sort Tasks
  const filteredTasks = useMemo(() => {
    const currentTime = new Date();
    return tasks
      .filter((task) => {
        // Tab Filter
        if (activeTab === "assigned" && task.assignedTo !== user?.id) return false;
        if (activeTab === "created" && task.createdBy !== user?.id) return false;
        if (activeTab === "completed" && task.status !== "done" && task.progress !== 100) return false;
        if (activeTab === "overdue") {
          if (!task.dueDate || task.status === "done" || task.progress === 100) return false;
          if (new Date(task.dueDate) >= currentTime) return false;
        }

        // Board Filter
        if (selectedBoardId !== "all" && task.boardId !== selectedBoardId) return false;

        // Priority Filter
        if (selectedPriority !== "all" && task.priority !== selectedPriority) return false;

        // Search Query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesDesc = task.description?.toLowerCase().includes(q);
          const matchesBoard = task.boardName?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesBoard) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "dueDate") {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "priority") {
          const pOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "created") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [tasks, activeTab, selectedBoardId, selectedPriority, search, sortBy, user]);

  const handleToggleComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowDone = task.status !== "done" && task.progress !== 100;
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        status: isNowDone ? "done" : "todo",
        progress: isNowDone ? 100 : 0,
      },
    });
  };

  const handleOpenNewTask = () => {
    if (boards.length === 0) {
      toast.error("Please create a board first before adding tasks.");
      return;
    }
    setTargetBoardForNewTask(selectedBoardId !== "all" ? selectedBoardId : boards[0].id);
    setIsNewTaskModalOpen(true);
  };

  const handleExportTasks = () => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const isXlsx = settings.exportFormat === "xlsx";
      if (isXlsx) {
        exportTasksToExcel(filteredTasks, {
          filename: `workspace_tasks_${dateStr}.xlsx`,
          includeBoardName: true,
        });
        toast.success(`Exported ${filteredTasks.length} tasks to Excel (.xlsx)`);
      } else {
        exportTasksToCSV(filteredTasks, {
          filename: `workspace_tasks_${dateStr}.csv`,
          includeBoardName: true,
        });
        toast.success(`Exported ${filteredTasks.length} tasks to CSV (.csv)`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to export tasks");
    }
  };

  const activeTargetBoard = boards.find((b) => b.id === targetBoardForNewTask) || boards[0];
  const pageTitle = currentScopedBoard
    ? `${currentScopedBoard.name} Tasks`
    : "All Workspace Tasks";
  const pageDescription = currentScopedBoard
    ? `Manage and track all tasks for ${currentScopedBoard.name}`
    : "Manage and track all tasks across your collaborative boards";

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
      <BoardHeader showSearch={false} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            {currentScopedBoard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/boards/${currentScopedBoard.id}`)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2 -ml-2 mb-1 cursor-pointer inline-flex items-center max-w-full min-w-0"
                title={`Back to ${currentScopedBoard.name} Board`}
                data-testid="back-to-board-btn"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Back to {currentScopedBoard.name} Board</span>
              </Button>
            )}
            <h1
              className="text-2xl lg:text-3xl font-black text-foreground tracking-tight truncate"
              title={pageTitle}
            >
              {pageTitle}
            </h1>
            <p className="text-xs text-muted-foreground line-clamp-1" title={pageDescription}>
              {pageDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTasks}
              className="gap-1.5 font-semibold text-xs h-9 cursor-pointer border-border/80 hover:bg-muted whitespace-nowrap"
              title={settings.exportFormat === "xlsx" ? "Export tasks to Excel (.xlsx)" : "Export tasks to CSV (.csv)"}
              data-testid="tasks-page-export-btn"
            >
              <Download className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden lg:inline">
                {settings.exportFormat === "xlsx" ? "Export to Excel" : "Export to CSV"}
              </span>
            </Button>

            <PillNavBar
              items={[
                {
                  id: "list",
                  label: "List",
                  icon: ListIcon,
                  disabled: isMobile,
                  title: isMobile ? "List view is disabled on mobile" : "List view",
                },
                {
                  id: "grid",
                  label: "Grid",
                  icon: LayoutGrid,
                  title: "Grid view",
                },
              ]}
              activeId={effectiveViewMode}
              onChange={(id) => {
                if (isMobile && id === "list") return;
                setViewMode(id as "list" | "grid");
              }}
              accentColor="primary"
              size="sm"
              layoutId="tasksViewActivePill"
            />

            <Button
              onClick={handleOpenNewTask}
              className="gap-1.5 font-semibold text-xs h-9 whitespace-nowrap sm:w-9 sm:px-0 lg:w-auto lg:px-4"
              title="Create Task"
              aria-label="Create Task"
              data-testid="tasks-page-create-btn"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="sm:hidden lg:inline">Create Task</span>
            </Button>
          </div>
        </div>

        {currentScopedBoard && (
          <div className="md:hidden">
            <BoardViewRail
              items={BOARD_VIEWS}
              activeId="list"
              onChange={handleBoardViewChange}
            />
          </div>
        )}

        {/* Tab Filters */}
        <div
          data-testid="tasks-filter-tabs"
          className="-mx-4 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto border-b border-border/60 px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {[
            { id: "all", label: "All Tasks", count: tasks.length },
            {
              id: "assigned",
              label: "Assigned to Me",
              count: tasks.filter((t) => t.assignedTo === user?.id).length,
            },
            {
              id: "created",
              label: "Created by Me",
              count: tasks.filter((t) => t.createdBy === user?.id).length,
            },
            {
              id: "overdue",
              label: "Overdue",
              count: tasks.filter(
                (t) => t.dueDate && t.status !== "done" && t.progress !== 100 && new Date(t.dueDate) < now
              ).length,
            },
            {
              id: "completed",
              label: "Completed",
              count: tasks.filter((t) => t.status === "done" || t.progress === 100).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-4 border-0 font-mono ${
                  activeTab === tab.id
                    ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>

        {/* Search & Select Filters */}
        <div
          data-testid="tasks-filter-bar"
          className="grid grid-cols-1 items-stretch gap-2.5 bg-card p-2.5 rounded-2xl border border-border/60 shadow-xs min-[360px]:p-3 lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:p-3.5"
        >
          <div className="relative w-full min-w-0 lg:flex-1 lg:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="tasks-search-input"
              placeholder="Filter tasks by name, description, board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/60 border-border/60"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 min-w-0 lg:contents">
            <Select value={selectedBoardId} onValueChange={handleBoardChange}>
              <SelectTrigger
                data-testid="tasks-filter-board"
                className="h-9 w-full min-w-0 px-1.5 text-[10px] min-[360px]:text-[11px] bg-background/60 border-border/60 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:text-xs lg:w-[160px] lg:px-3 lg:text-xs lg:[&>svg]:h-4 lg:[&>svg]:w-4"
              >
                <SelectValue placeholder="All Boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {!devSettings.disableEmojiCustomization && (b.emoji ? `${b.emoji} ` : "📋 ")}{b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger
                data-testid="tasks-filter-priority"
                className="h-9 w-full min-w-0 px-1.5 text-[10px] min-[360px]:text-[11px] bg-background/60 border-border/60 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:text-xs lg:w-[130px] lg:px-3 lg:text-xs lg:[&>svg]:h-4 lg:[&>svg]:w-4"
              >
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger
                data-testid="tasks-filter-sort"
                className="h-9 w-full min-w-0 px-1.5 text-[10px] min-[360px]:text-[11px] bg-background/60 border-border/60 [&>svg]:h-3.5 [&>svg]:w-3.5 sm:text-xs lg:w-[140px] lg:px-3 lg:text-xs lg:[&>svg]:h-4 lg:[&>svg]:w-4"
              >
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List / Grid Display */}
        {isLoading || settings.simulateSkeletonLoading ? (
          effectiveViewMode === "list" ? (
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
              <Table className="w-full xl:min-w-[760px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[36%] xl:w-[24%] py-3.5 pl-4 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Task
                    </TableHead>
                    <TableHead className="hidden xl:table-cell xl:w-[26%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Description
                    </TableHead>
                    <TableHead className="w-[18%] xl:w-[14%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Board
                    </TableHead>
                    <TableHead className="w-[14%] xl:w-[10%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Priority
                    </TableHead>
                    <TableHead className="w-[18%] xl:w-[14%] py-3.5 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Assigned
                    </TableHead>
                    <TableHead className="w-[14%] xl:w-[12%] py-3.5 pr-4 font-bold text-[11px] tracking-wider uppercase text-muted-foreground">
                      Due Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          )
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-card border border-border/60 p-8 space-y-3">
            <CheckSquare className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-base font-bold text-foreground">No tasks found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No tasks match your current filter settings. Try adjusting search or create a new task.
            </p>
            <Button size="sm" onClick={handleOpenNewTask} className="gap-1.5 font-semibold">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : effectiveViewMode === "list" ? (
          /* Structured Table View */
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto hidden sm:block">
              <Table className="w-full xl:min-w-[760px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className={`w-[36%] xl:w-[24%] ${isCompact ? "py-2 pl-3 text-[10px]" : "py-3.5 pl-4 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Task
                    </TableHead>
                    <TableHead className={`hidden xl:table-cell xl:w-[26%] ${isCompact ? "py-2 text-[10px]" : "py-3.5 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Description
                    </TableHead>
                    <TableHead className={`w-[18%] xl:w-[14%] ${isCompact ? "py-2 text-[10px]" : "py-3.5 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Board
                    </TableHead>
                    <TableHead className={`w-[14%] xl:w-[10%] ${isCompact ? "py-2 text-[10px]" : "py-3.5 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Priority
                    </TableHead>
                    <TableHead className={`w-[18%] xl:w-[14%] ${isCompact ? "py-2 text-[10px]" : "py-3.5 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Assigned
                    </TableHead>
                    <TableHead className={`w-[14%] xl:w-[12%] ${isCompact ? "py-2 pr-3 text-[10px]" : "py-3.5 pr-4 text-[11px]"} font-bold tracking-wider uppercase text-muted-foreground`}>
                      Due Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const isDone = task.status === "done" || task.progress === 100;
                    const isOverdue =
                      task.dueDate && !isDone && new Date(task.dueDate) < now;

                    return (
                      <TableRow
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`group/row cursor-pointer border-border/50 transition-colors ${
                          selectedTaskId === task.id
                            ? "bg-primary/10 hover:bg-primary/15 font-semibold"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        {/* Task Column */}
                        <TableCell className={`${isCompact ? "py-2 pl-3" : "py-3.5 pl-4"}`}>
                          <div className={`flex items-start ${isCompact ? "gap-2" : "gap-3"} min-w-0`}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleComplete(task, e)}
                              className={`h-5 w-5 mt-0.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                isDone
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-border/80 hover:border-primary bg-background"
                              }`}
                              title={isDone ? "Mark as incomplete" : "Mark as complete"}
                            >
                              {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                            </button>

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                {!devSettings.disableEmojiCustomization && task.emoji && (
                                  <span className="text-sm shrink-0 leading-none">
                                    {task.emoji}
                                  </span>
                                )}
                                <span
                                  className={`text-sm font-semibold truncate ${
                                    isDone
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground group-hover/row:text-primary transition-colors"
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>

                              {/* Description as Subheader on iPad / tablet */}
                              {task.description && (
                                <p
                                  data-testid="task-description-subheader"
                                  className="text-xs text-muted-foreground line-clamp-1 truncate mt-0.5 font-normal xl:hidden"
                                  title={task.description}
                                >
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Description Column */}
                        <TableCell className={`hidden xl:table-cell ${isCompact ? "py-2 px-3" : "py-3.5"}`}>
                          {task.description ? (
                            <p
                              className="text-xs text-muted-foreground line-clamp-1 max-w-[260px] truncate"
                              title={task.description}
                            >
                              {task.description}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>

                        {/* Board Column */}
                        <TableCell className={`${isCompact ? "py-2 px-3" : "py-3.5"}`}>
                          {task.boardName ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/boards/${task.boardId}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-semibold max-w-[170px] truncate transition-all group-hover/row:border-primary/40 cursor-pointer"
                              title={`Open ${task.boardName}`}
                            >
                              {!devSettings.disableEmojiCustomization && (
                                <span className="shrink-0">{task.boardEmoji || "📋"}</span>
                              )}
                              <span className="truncate">{task.boardName}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">—</span>
                          )}
                        </TableCell>

                        {/* Priority Column */}
                        <TableCell className={`${isCompact ? "py-2 px-3" : "py-3.5"}`}>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold tracking-tight ${
                              task.priority === "urgent" || task.priority === "high"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                                : task.priority === "medium"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {task.priority || "none"}
                          </Badge>
                        </TableCell>

                        {/* Assigned Column */}
                        <TableCell className={`${isCompact ? "py-2 px-3" : "py-3.5"}`}>
                          {task.assignee ? (() => {
                            const isCurrentUser =
                              task.assignee.id === user?.id ||
                              (user?.email && task.assignee.email === user.email);
                            const avatarUrl = isCurrentUser
                              ? (user?.avatarUrl ?? task.assignee.avatarUrl)
                              : task.assignee.avatarUrl;

                            return (
                              <div className="flex items-center gap-2 max-w-[160px]">
                                <Avatar className={`${isCompact ? "h-5 w-5" : "h-6 w-6"} border border-border/80 shrink-0`}>
                                  <AvatarImage
                                    src={avatarUrl}
                                    alt={task.assignee.fullName || task.assignee.email}
                                  />
                                  <AvatarFallback className={`font-bold bg-primary/10 text-primary ${isCompact ? "text-[8px]" : "text-[9px]"}`}>
                                    {(task.assignee.fullName || task.assignee.email || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-foreground truncate">
                                  {task.assignee.fullName || task.assignee.email}
                                </span>
                              </div>
                            );
                          })() : (
                            <span className="text-xs text-muted-foreground/50 italic flex items-center gap-1">
                              <User className="h-3 w-3 opacity-50" />
                              Unassigned
                            </span>
                          )}
                        </TableCell>

                        {/* Due Date Column */}
                        <TableCell className={`${isCompact ? "py-2 pr-3" : "py-3.5 pr-4"}`}>
                          {task.dueDate ? (
                            <span
                              className={`text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                                isOverdue
                                  ? "text-rose-500 dark:text-rose-400 font-bold"
                                  : isDone
                                  ? "text-muted-foreground line-through"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              {new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year:
                                  new Date(task.dueDate).getFullYear() !== now.getFullYear()
                                    ? "numeric"
                                    : undefined,
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">
                              No date
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Mobile List View - adopts grid card layout */}
            <div className={`block sm:hidden grid grid-cols-1 ${isCompact ? "gap-2.5 p-2.5" : "gap-3 p-3"}`}>
              {filteredTasks.map((task) => {
                const isDone = task.status === "done" || task.progress === 100;
                const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < now;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`${isCompact ? "p-3.5 rounded-xl gap-2.5" : "p-4 rounded-xl gap-3"} bg-card border shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group ${
                      selectedTaskId === task.id
                        ? "border-primary/60 ring-2 ring-primary/20"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {task.boardName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20 inline-flex items-center gap-1"
                          >
                            {!devSettings.disableEmojiCustomization && (
                              <span>{task.boardEmoji || "📋"}</span>
                            )}
                            <span>{task.boardName}</span>
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                            task.priority === "high" || task.priority === "urgent"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                              : task.priority === "medium"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleComplete(task, e)}
                          className={`h-5 w-5 mt-0.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border/80 hover:border-primary bg-background"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-sm font-bold truncate ${
                              isDone
                                ? "line-through text-muted-foreground"
                                : "text-foreground group-hover:text-primary transition-colors"
                            }`}
                          >
                            {!devSettings.disableEmojiCustomization && task.emoji && <span className="mr-1.5">{task.emoji}</span>}
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      {task.assignee ? (() => {
                        const isCurrentUser =
                          task.assignee.id === user?.id ||
                          (user?.email && task.assignee.email === user.email);
                        const avatarUrl = isCurrentUser
                          ? (user?.avatarUrl ?? task.assignee.avatarUrl)
                          : task.assignee.avatarUrl;

                        return (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 border border-border/50">
                              <AvatarImage src={avatarUrl} />
                              <AvatarFallback className="text-[9px] font-bold">
                                {task.assignee.fullName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium truncate max-w-[100px]">
                              {task.assignee.fullName || task.assignee.email}
                            </span>
                          </div>
                        );
                      })() : (
                        <span className="italic text-[11px]">Unassigned</span>
                      )}

                      {task.dueDate && (
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            isOverdue ? "text-rose-500" : ""
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Grid Cards View */
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isCompact ? "gap-2.5" : "gap-4"}`}>
            {filteredTasks.map((task) => {
              const isDone = task.status === "done" || task.progress === 100;
              const isOverdue =
                task.dueDate && !isDone && new Date(task.dueDate) < now;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`${isCompact ? "p-3.5 rounded-xl gap-2.5" : "p-5 rounded-2xl gap-4"} bg-card border shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group ${
                    selectedTaskId === task.id
                      ? "border-primary/60 ring-2 ring-primary/20"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      {task.boardName && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20 inline-flex items-center gap-1"
                        >
                          {!devSettings.disableEmojiCustomization && (
                            <span>{task.boardEmoji || "📋"}</span>
                          )}
                          <span>{task.boardName}</span>
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0 ${
                          task.priority === "high" || task.priority === "urgent"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                            : task.priority === "medium"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(task, e)}
                        className={`h-5 w-5 mt-0.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-border/80 hover:border-primary bg-background"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-sm font-bold truncate ${
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground group-hover:text-primary transition-colors"
                          }`}
                        >
                          {!devSettings.disableEmojiCustomization && task.emoji && <span className="mr-1.5">{task.emoji}</span>}
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    {task.assignee ? (() => {
                      const isCurrentUser =
                        task.assignee.id === user?.id ||
                        (user?.email && task.assignee.email === user.email);
                      const avatarUrl = isCurrentUser
                        ? (user?.avatarUrl ?? task.assignee.avatarUrl)
                        : task.assignee.avatarUrl;

                      return (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5 border border-border/50">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {task.assignee.fullName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium truncate max-w-[100px]">
                            {task.assignee.fullName || task.assignee.email}
                          </span>
                        </div>
                      );
                    })() : (
                      <span className="italic text-[11px]">Unassigned</span>
                    )}

                    {task.dueDate && (
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          isOverdue ? "text-rose-500" : ""
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {currentScopedBoard && (
        <div
          data-testid="board-desktop-dock"
          className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[calc(100vw-2rem)]"
        >
          <PillNavBar
            items={BOARD_VIEWS}
            activeId="list"
            onChange={handleBoardViewChange}
            accentColor="primary"
            layoutId="scopedTasksBoardDock"
            ariaLabel="Board view switcher"
          />
        </div>
      )}

      {/* Screen-Wide Backdrop Dimming Overlay when Task Drawer is Open */}
      {selectedTask && activeTaskBoard && (
        <div
          data-testid="task-drawer-backdrop"
          aria-label="Close task details"
          onClick={() => setSelectedTaskId(null)}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[1.5px] z-40 transition-opacity animate-in fade-in duration-200 cursor-pointer"
        />
      )}

      {/* Notion-Style Right-Side Task Detail Workspace Drawer */}
      {selectedTask && activeTaskBoard && (
        <aside
          data-testid="task-detail-drawer"
          className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] lg:w-[720px] xl:w-[780px] border-l border-border bg-background shadow-2xl h-full overflow-hidden flex flex-col z-50 transition-all duration-200 animate-in slide-in-from-right duration-250 ease-out"
        >
          <TaskDetailWorkspace
            task={selectedTask}
            board={activeTaskBoard}
            members={activeTaskBoardMembers}
            readOnly={false}
            onClose={() => setSelectedTaskId(null)}
            onUpdateTask={async (updates) => {
              await updateTaskMutation.mutateAsync({
                id: selectedTask.id,
                data: updates,
              });
            }}
            onDeleteTask={async (id) => {
              try {
                await taskApi.deleteTask(id);
                queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
                setSelectedTaskId(null);
                toast.success("Task deleted");
              } catch (err: any) {
                toast.error(err.message || "Failed to delete task");
              }
            }}
          />
        </aside>
      )}

      {/* Task Creation Modal */}
      {activeTargetBoard && (
        <TaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          task={null}
          boardId={activeTargetBoard.id}
          boardTasks={tasks}
          columns={activeTargetBoard.columns || [{ id: "todo", title: "To Do" }]}
          availableBoards={boards}
          allowBoardChange={true}
          onSave={async (data) => {
            const targetBoardId = data.boardId || activeTargetBoard.id;
            await createTaskMutation.mutateAsync({
              ...data,
              boardId: targetBoardId,
            });
          }}
        />
      )}
    </div>
  );
}
