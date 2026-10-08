import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutGrid,
  Clock,
  CheckCircle2,
  Plus,
  FolderLock,
} from "lucide-react";
import { BoardModal } from "@/components/boards/BoardModal";
import { TaskModal } from "@/components/kanban/TaskModal";
import { PersonalScratchpadModal } from "@/components/documents/PersonalScratchpadModal";
import { Task, CreateTaskData } from "@/types/task";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/skeletons";

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activities } = useActivity();
  const { settings } = useSettings();

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-6">
        {/* 1. CLEAN HEADER & QUICK ACTIONS (No Gradients) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-muted/50 text-foreground border-border/60 font-semibold px-2.5 py-0.5 text-xs">
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
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
              Here is your daily workspace pulse. You have{" "}
              <span className="font-bold text-foreground">{myTasks.length}</span> assigned
              tasks, <span className="font-bold text-destructive">{overdueTasks.length}</span> overdue,
              and an overall completion rate of{" "}
              <span className="font-bold text-foreground">{overallCompletionRate}%</span>.
            </p>
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

        {/* 2. STATS KPI: 1 BIG (ACTIVE TASKS) + 3 SMALL (TOTAL BOARDS, COMPLETED, OVERDUE) - NO ICONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Big Card: Active Tasks (Most Important Figure) */}
          <div
            onClick={() => navigate("/tasks")}
            className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Tasks
              </span>
              <div className="text-3xl md:text-4xl font-black text-foreground mt-2">
                {inProgressTasks.length + todoTasks.length}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Completion Rate</span>
                <span className="font-bold text-foreground">{overallCompletionRate}% Completed</span>
              </div>
              <Progress value={overallCompletionRate} className="h-2" />
            </div>
          </div>

          {/* 3 Small Cards on the right */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Small Card 1: Total Boards */}
            <div
              onClick={() => navigate("/")}
              className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Boards
              </span>
              <div className="text-2xl font-black text-foreground my-2">
                {boards.length}
              </div>
              <p className="text-xs text-primary font-medium hover:underline">
                View all boards →
              </p>
            </div>

            {/* Small Card 2: Completed */}
            <div
              onClick={() => navigate("/tasks")}
              className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Completed
              </span>
              <div className="text-2xl font-black text-foreground my-2">
                {completedTasks.length}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Tasks closed
              </p>
            </div>

            {/* Small Card 3: Overdue */}
            <div
              onClick={() => navigate("/calendar")}
              className="p-5 rounded-2xl bg-card border border-border/60 hover:border-destructive/40 shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overdue
              </span>
              <div className="text-2xl font-black text-destructive my-2">
                {overdueTasks.length}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {highPriorityTasks.length} high priority
              </p>
            </div>
          </div>
        </div>

        {/* 3. PARALLEL 3-COLUMN WORKSPACE: PRIORITY TASKS | DEADLINES | AUDIT STREAM (SIDE-BY-SIDE) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Column 1: My Priority Tasks */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <h2 className="text-sm font-bold text-foreground">
                My Priority Tasks ({myTasks.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tasks")}
                className="h-7 text-xs font-semibold text-primary px-1.5"
              >
                View all
              </Button>
            </div>

            {myTasks.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="font-bold text-foreground text-xs">All caught up!</p>
                <p className="text-[11px] text-muted-foreground">No pending tasks assigned.</p>
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
              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {myTasks.slice(0, 8).map((task) => {
                  const isDone = task.status === "done" || task.progress === 100;
                  const isOverdue =
                    task.dueDate && !isDone && new Date(task.dueDate) < new Date();

                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/boards/${task.boardId}/tasks/${task.id}`)}
                      className="p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
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

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            {task.emoji && <span className="text-xs">{task.emoji}</span>}
                            <span
                              className={`text-xs font-semibold truncate ${
                                isDone
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground group-hover:text-primary transition-colors"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {task.boardName && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 font-medium bg-muted/50 text-muted-foreground border-border/50"
                              >
                                {task.boardName}
                              </Badge>
                            )}

                            {task.dueDate && (
                              <span
                                className={`text-[10px] font-medium flex items-center gap-0.5 ${
                                  isOverdue ? "text-destructive font-bold" : "text-muted-foreground"
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

                      <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                        {task.progress}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Upcoming Deadlines */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <h3 className="text-sm font-bold text-foreground">Upcoming Deadlines</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/calendar")}
                className="h-7 text-xs font-semibold text-primary px-1.5"
              >
                Calendar
              </Button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-10 text-center">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/boards/${task.boardId}/tasks/${task.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{task.emoji || "📌"}</span>
                      <span className="font-medium text-foreground truncate max-w-[130px]">
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

          {/* Column 3: Workspace Audit Stream (Side-by-Side) */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
              <h3 className="text-sm font-bold text-foreground">Workspace Audit Stream</h3>
              <span className="text-[10px] text-muted-foreground font-mono">Live</span>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-10 text-center">No recent activities recorded.</p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {activities.slice(0, 10).map((act) => (
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
