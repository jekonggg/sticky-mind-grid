import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/contexts/AuthContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutGrid,
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Plus,
  MessageSquare,
  FolderLock,
  TrendingUp,
  Activity as ActivityIcon,
  ChevronRight,
  Flame,
  ListTodo,
} from "lucide-react";
import { BoardModal } from "@/components/boards/BoardModal";
import { TaskModal } from "@/components/kanban/TaskModal";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { Task, CreateTaskData } from "@/types/task";
import { toast } from "sonner";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activities } = useActivity();

  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  const myTasks = tasks.filter((t) => t.assignedTo === user?.id || t.createdBy === user?.id);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BoardHeader showSearch={false} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. HERO GREETING & QUICK ACTIONS */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-card border border-primary/20 p-6 md:p-8 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 font-semibold px-2.5 py-0.5">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
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
              <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                  {user?.fullName || user?.email?.split("@")[0] || "Explorer"}
                </span>
                ! 👋
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Here is your daily workspace pulse. You have{" "}
                <span className="font-bold text-foreground">{myTasks.length}</span> assigned
                tasks, <span className="font-bold text-amber-500">{overdueTasks.length}</span> overdue,
                and an overall completion rate of{" "}
                <span className="font-bold text-emerald-500">{overallCompletionRate}%</span>.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Button
                onClick={() => {
                  if (boards.length > 0) {
                    setIsTaskModalOpen(true);
                  } else {
                    setIsBoardModalOpen(true);
                  }
                }}
                className="gap-2 font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Task
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsBoardModalOpen(true)}
                className="gap-2 font-semibold bg-background/60 backdrop-blur-sm"
              >
                <LayoutGrid className="h-4 w-4 text-primary" />
                New Board
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsScratchpadOpen(true)}
                className="gap-2 font-semibold"
              >
                <FolderLock className="h-4 w-4 text-amber-500" />
                Scratchpad
              </Button>
            </div>
          </div>
        </div>

        {/* 2. STATS KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Boards */}
          <div
            onClick={() => navigate("/")}
            className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Boards
              </span>
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutGrid className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground mb-1">{boards.length}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>View all boards</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
            </p>
          </div>

          {/* Card 2: Active / In Progress */}
          <div
            onClick={() => navigate("/tasks")}
            className="p-5 rounded-2xl bg-card border border-border/60 hover:border-blue-500/40 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Tasks
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ListTodo className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground mb-1">
              {inProgressTasks.length + todoTasks.length}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Progress value={overallCompletionRate} className="h-1.5 flex-1" />
              <span className="font-semibold text-foreground">{overallCompletionRate}%</span>
            </div>
          </div>

          {/* Card 3: Completed */}
          <div
            onClick={() => navigate("/tasks")}
            className="p-5 rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Completed
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-foreground mb-1">
              {completedTasks.length}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{completedTasks.length} tasks closed</span>
            </p>
          </div>

          {/* Card 4: Overdue & Deadlines */}
          <div
            onClick={() => navigate("/calendar")}
            className="p-5 rounded-2xl bg-card border border-border/60 hover:border-rose-500/40 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overdue / Urgent
              </span>
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mb-1">
              {overdueTasks.length}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>{highPriorityTasks.length} high priority tasks</span>
            </p>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE GRID: PRIORITY TASKS & RECENT ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: My Priority & Urgent Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-foreground">
                  My Priority Tasks ({myTasks.length})
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tasks")}
                className="text-xs font-semibold text-primary gap-1"
              >
                <span>View all tasks</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-card border border-border/60 text-center space-y-3">
                <CheckSquare className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="font-bold text-foreground text-sm">All caught up!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You don't have any pending tasks assigned. Enjoy your day or create a new task.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 6).map((task) => {
                  const isDone = task.status === "done" || task.progress === 100;
                  const isOverdue =
                    task.dueDate && !isDone && new Date(task.dueDate) < new Date();

                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/boards/${task.boardId}/tasks/${task.id}`)}
                      className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* 1-click Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTaskComplete(task, e)}
                          className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border/80 hover:border-primary bg-background"
                          }`}
                        >
                          {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            {task.emoji && <span className="text-sm">{task.emoji}</span>}
                            <span
                              className={`text-sm font-semibold truncate ${
                                isDone
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground group-hover:text-primary transition-colors"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            {task.boardName && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-medium bg-primary/5 text-primary border-primary/20"
                              >
                                {task.boardEmoji || "📋"} {task.boardName}
                              </Badge>
                            )}

                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 uppercase font-mono ${
                                task.priority === "high" || task.priority === "urgent"
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  : task.priority === "medium"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                              }`}
                            >
                              {task.priority}
                            </Badge>

                            {task.dueDate && (
                              <span
                                className={`text-[11px] font-medium flex items-center gap-1 ${
                                  isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"
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
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-muted-foreground">
                          {task.progress}%
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Col: Deadlines & Live Activity Stream */}
          <div className="space-y-6">
            {/* Upcoming Deadlines Widget */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Upcoming Deadlines</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/calendar")}
                  className="h-7 text-[11px] text-primary px-1.5"
                >
                  Calendar
                </Button>
              </div>

              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3">No upcoming deadlines.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/boards/${task.boardId}/tasks/${task.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{task.emoji || "📌"}</span>
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-primary shrink-0">
                        {new Date(task.dueDate!).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Audit Stream */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Workspace Audit Stream</h3>
              </div>

              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3">No recent activities recorded.</p>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {activities.slice(0, 8).map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs">
                      <Avatar className="h-6 w-6 mt-0.5 shrink-0 border border-border/50">
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
                        <span className="text-[10px] text-muted-foreground font-mono">
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
    </div>
  );
}
