import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutGrid01 as LayoutGrid,
  Clock,
  CheckCircle as CheckCircle2,
  Plus,
  FolderLock,
  File06 as FileText,
} from "@untitledui/icons";
import { BoardModal } from "@/components/boards/BoardModal";
import { TaskModal } from "@/components/kanban/TaskModal";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { Task, CreateTaskData } from "@/types/task";
import { BoardMember } from "@/types/board";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/skeletons";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { devSettings } = useDevMode();
  const { activities } = useActivity();
  const { settings } = useSettings();

  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "high" | "done">("all");

  // Fetch Boards
  const { data: boards = [], isLoading: isBoardsLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  // Fetch Global Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ["globalTasks"],
    queryFn: () => taskApi.getTasks(),
  });

  const activeTaskBoard = useMemo(() => {
    if (!selectedTask) return null;
    return (
      boards.find((b: any) => b.id === selectedTask.boardId) || {
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

  const { data: activeTaskBoardMembers = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", activeTaskBoard?.id],
    queryFn: () =>
      activeTaskBoard?.id ? boardApi.getMembers(activeTaskBoard.id) : Promise.resolve([]),
    enabled: !!activeTaskBoard?.id,
  });

  // Task update mutation
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

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData & { boardId: string }) =>
      taskApi.createTask(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success(`Task "${newTask.title}" created!`);
      setIsTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });

  // Metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done" || t.progress === 100);
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress" || (t.progress > 0 && t.progress < 100));
  const todoTasks = tasks.filter((t) => t.status === "todo" && t.progress === 0);

  const myTasks = useMemo(() => {
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return tasks
      .filter((t) => t.assignedTo === user?.id || t.createdBy === user?.id)
      .sort((a, b) => {
        const aDone = a.status === "done" || a.progress === 100 ? 1 : 0;
        const bDone = b.status === "done" || b.progress === 100 ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const pDiff =
          (priorityWeight[b.priority || "low"] || 1) -
          (priorityWeight[a.priority || "low"] || 1);
        if (pDiff !== 0) return pDiff;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
  }, [tasks, user?.id]);

  const filteredMyTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const isDone = t.status === "done" || t.progress === 100;
      if (taskFilter === "active") return !isDone;
      if (taskFilter === "high") return !isDone && (t.priority === "high" || t.priority === "urgent");
      if (taskFilter === "done") return isDone;
      return true;
    });
  }, [myTasks, taskFilter]);

  const highPriorityTasks = tasks.filter((t) => t.priority === "high" || t.priority === "urgent");

  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.progress === 100) return false;
    return new Date(t.dueDate) < now;
  });

  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate && t.status !== "done" && t.progress !== 100)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const overallCompletionRate =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const activeTasksCount = inProgressTasks.length + todoTasks.length;

  const getPriorityBadgeStyle = (priority?: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return {
          label: priority === "urgent" ? "URGENT" : "HIGH",
          className: "bg-rose-500/10 text-rose-500 border-rose-500/25",
        };
      case "medium":
        return {
          label: "MED",
          className: "bg-amber-500/10 text-amber-500 border-amber-500/25",
        };
      default:
        return {
          label: "LOW",
          className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
        };
    }
  };

  const handleToggleTaskComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowComplete = task.status !== "done" && task.progress !== 100;
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        status: isNowComplete ? "done" : "todo",
        progress: isNowComplete ? 100 : 0,
      },
    });
  };

  if (isBoardsLoading || isTasksLoading || settings.simulateSkeletonLoading) {
    return (
      <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
        <BoardHeader showSearch={false} />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
      <BoardHeader showSearch={false} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-5">
        {/* 1. COMPACT COMMAND BAR HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-4 border-b border-border/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-muted/50 text-foreground border-border/60 font-semibold px-2.5 py-0.5 text-[11px]"
              >
                Workspace Dashboard
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Welcome back, {user?.fullName || user?.email?.split("@")[0] || "Explorer"}! 👋
            </h1>

            {/* Scannable Inline Pulse Summary + Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
              <span>Here is your daily workspace pulse:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-foreground font-medium">
                <strong className="font-bold tabular-nums">{myTasks.length}</strong> assigned
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                  overdueTasks.length > 0
                    ? "bg-destructive/10 border-destructive/25 text-destructive"
                    : "bg-muted/50 border-border/60 text-muted-foreground"
                }`}
              >
                <strong className="font-bold tabular-nums">{overdueTasks.length}</strong> overdue
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary font-medium">
                <strong className="font-bold tabular-nums">{overallCompletionRate}%</strong> completion rate
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => {
                if (boards.length > 0) {
                  setIsTaskModalOpen(true);
                } else {
                  setIsBoardModalOpen(true);
                }
              }}
              className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsBoardModalOpen(true)}
              className="gap-1.5 font-semibold text-xs h-9 bg-card border-border/60 hover:bg-muted/60"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <span>New Board</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsScratchpadOpen(true)}
              className="gap-1.5 font-semibold text-xs h-9"
            >
              <FolderLock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Scratchpad</span>
            </Button>
          </div>
        </div>

        {/* 2. ALIGNED KPI TELEMETRY STRIP (7 / 5 Split matching the Workspace Grid below) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: Active Tasks (Primary Metric) + Completed Tasks */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Active Tasks Card (7 of 12 inner cols) */}
            <div
              onClick={() => navigate("/tasks")}
              className="relative overflow-hidden sm:col-span-7 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 group"
            >
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Active Tasks
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none mt-1.5">
                    {activeTasksCount}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/50 px-2 py-1 rounded-lg">
                  <span className="text-foreground font-bold tabular-nums">{inProgressTasks.length}</span> in progress
                  <span className="opacity-40">·</span>
                  <span className="text-foreground font-bold tabular-nums">{todoTasks.length}</span> to do
                </div>
              </div>

              <div className="relative z-10 pt-2.5 border-t border-border/40">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Completion Rate</span>
                  <span className="font-bold text-foreground tabular-nums">{overallCompletionRate}% Completed</span>
                </div>
                <Progress value={overallCompletionRate} className="h-1.5" />
              </div>
            </div>

            {/* Completed Card (5 of 12 inner cols) */}
            <div
              onClick={() => navigate("/tasks")}
              className="relative overflow-hidden sm:col-span-5 p-4 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
            >
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-500/[0.07] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Completed
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none mt-1.5">
                  {completedTasks.length}
                </div>
              </div>
              <div className="relative z-10 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Tasks closed</span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  {totalTasks > 0 ? `${completedTasks.length}/${totalTasks}` : "0/0"}
                </span>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Total Boards + Overdue (Aligns with 5-Col Right Context Rail) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Boards Card */}
            <div
              onClick={() => navigate("/")}
              className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
            >
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-blue-500/[0.07] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Boards
                </span>
                <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none mt-1.5">
                  {boards.length}
                </div>
              </div>
              <div className="relative z-10 pt-2.5 border-t border-border/40 flex items-center justify-between">
                <p className="text-xs text-primary font-semibold hover:underline">
                  View all boards →
                </p>
              </div>
            </div>

            {/* Overdue Card */}
            <div
              onClick={() => navigate("/calendar")}
              className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-destructive/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
            >
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-destructive/[0.08] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Overdue
                  </span>
                  {overdueTasks.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </div>
                <div className="text-3xl sm:text-4xl font-black text-destructive tabular-nums leading-none mt-1.5">
                  {overdueTasks.length}
                </div>
              </div>
              <div className="relative z-10 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {highPriorityTasks.length} high priority
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ASYMMETRIC 7 / 5 WORKSPACE BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* LEFT PRIMARY PANEL (7 Cols): My Priority Tasks */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/50 mb-3.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-foreground">
                  My Priority Tasks ({myTasks.length})
                </h2>

                {/* Quick Filter Pills */}
                <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "active", label: "Active" },
                      { id: "high", label: "High" },
                      { id: "done", label: "Done" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTaskFilter(tab.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        taskFilter === tab.id
                          ? "bg-card text-foreground shadow-2xs border border-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tasks")}
                className="h-7 text-xs font-semibold text-primary px-2"
              >
                View all →
              </Button>
            </div>

            {filteredMyTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-2">
                <p className="font-bold text-foreground text-xs">All caught up!</p>
                <p className="text-[11px] text-muted-foreground">
                  No tasks match the current view.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="h-7 text-xs font-semibold mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Create Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {filteredMyTasks.slice(0, 8).map((task) => {
                  const isDone = task.status === "done" || task.progress === 100;
                  const isOverdue =
                    task.dueDate && !isDone && new Date(task.dueDate) < new Date();
                  const pBadge = getPriorityBadgeStyle(task.priority);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="px-3.5 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 hover:border-border/80 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* 1-click Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTaskComplete(task, e)}
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary bg-background"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="h-3 w-3" />}
                        </button>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {!devSettings.disableEmojiCustomization && task.emoji && (
                              <span className="text-xs shrink-0">{task.emoji}</span>
                            )}
                            <span
                              className={`text-xs sm:text-[13px] font-semibold truncate ${
                                isDone
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground group-hover:text-primary transition-colors"
                              }`}
                            >
                              {task.title}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${pBadge.className}`}
                            >
                              {pBadge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {task.boardName && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-medium bg-muted/50 text-muted-foreground border-border/50"
                              >
                                {task.boardName}
                              </Badge>
                            )}

                            {task.dueDate && (
                              <span
                                className={`text-[10px] font-medium flex items-center gap-1 ${
                                  isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                                }`}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Inline mini progress bar + percentage */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isDone ? "bg-emerald-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-muted-foreground w-8 text-right tabular-nums">
                          {task.progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT CONTEXT RAIL (5 Cols): Stacked Upcoming Deadlines + Workspace Audit Stream */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Top Panel: Upcoming Deadlines */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Upcoming Deadlines</h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ({upcomingDeadlines.length})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/calendar")}
                  className="h-7 text-xs font-semibold text-primary px-2"
                >
                  Calendar →
                </Button>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">
                  No upcoming deadlines.
                </p>
              ) : (
                <div className="space-y-2 max-h-[210px] overflow-y-auto custom-scrollbar pr-1">
                  {upcomingDeadlines.map((task) => {
                    const isOverdue =
                      task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors cursor-pointer text-xs group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {!devSettings.disableEmojiCustomization ? (
                            <span className="shrink-0">{task.emoji || "📌"}</span>
                          ) : (
                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1">
                            {task.title}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            isOverdue
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          }`}
                        >
                          {new Date(task.dueDate!).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Panel: Workspace Audit Stream */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3.5">
                <h3 className="text-sm font-bold text-foreground">Workspace Audit Stream</h3>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">
                  No recent activities recorded.
                </p>
              ) : (
                <div className="relative space-y-3.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                  {activities.slice(0, 10).map((act) => (
                    <div key={act.id} className="relative flex items-start gap-3 text-xs">
                      <Avatar className="relative z-10 h-6 w-6 mt-0.5 shrink-0 border border-border bg-card">
                        <AvatarImage src={act.user?.avatarUrl} />
                        <AvatarFallback className="text-[9px] font-bold">
                          {act.user?.fullName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground leading-snug">
                          <span className="font-semibold text-foreground">
                            {act.user?.fullName || act.user?.email?.split("@")[0] || "Someone"}
                          </span>{" "}
                          {act.message}
                        </p>
                        <span className="text-[10px] text-muted-foreground/80 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Global Modals */}
      <BoardModal
        open={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        onSubmit={(data) => {
          boardApi.createBoard(data).then((newBoard) => {
            queryClient.invalidateQueries({ queryKey: ["boards"] });
            toast.success(`Board "${newBoard.name}" created!`);
            setIsBoardModalOpen(false);
            navigate(`/boards/${newBoard.id}`);
          });
        }}
      />

      {boards.length > 0 && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={null}
          boardId={boards[0]?.id || ""}
          columns={boards[0]?.columns || [{ id: "todo", title: "To Do" }]}
          onSave={async (data) => {
            await createTaskMutation.mutateAsync({
              ...data,
              boardId: boards[0]?.id || "",
            });
          }}
        />
      )}

      <PersonalScratchpadModal
        open={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />

      {/* Screen-Wide Backdrop Dimming Overlay when Task Drawer is Open */}
      {selectedTask && activeTaskBoard && (
        <div
          data-testid="task-drawer-backdrop"
          aria-label="Close task details"
          onClick={() => setSelectedTask(null)}
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
            onClose={() => setSelectedTask(null)}
            onUpdateTask={async (updates) => {
              await updateTaskMutation.mutateAsync({
                id: selectedTask.id,
                data: updates,
              });
              // Keep selectedTask up-to-date with local modifications
              setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null));
            }}
            onDeleteTask={async (id) => {
              try {
                await taskApi.deleteTask(id);
                queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
                setSelectedTask(null);
                toast.success("Task deleted");
              } catch (err: any) {
                toast.error(err.message || "Failed to delete task");
              }
            }}
          />
        </aside>
      )}
    </div>
  );
}
