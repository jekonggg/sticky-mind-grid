import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { boardApi } from "@/services/boardApi";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Task, CreateTaskData } from "@/types/task";
import { Board } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Plus,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { TaskModal } from "@/components/kanban/TaskModal";
import { toast } from "sonner";

const formatLocalDate = (d: Date | string | null | undefined): string => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Fetch Boards
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  // Fetch all tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["globalTasks"],
    queryFn: () => taskApi.getTasks(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData & { boardId: string }) =>
      taskApi.createTask(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      toast.success(`Task "${newTask.title}" scheduled!`);
      setIsNewTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule task");
    },
  });

  const now = new Date();

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Days array for grid
  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  // Tasks grouped by date YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const dateKey = formatLocalDate(task.dueDate);
      const existing = map.get(dateKey) || [];
      existing.push(task);
      map.set(dateKey, existing);
    });
    return map;
  }, [tasks]);

  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.progress === 100) return false;
    return new Date(t.dueDate) < now;
  });

  const selectedDateKey = formatLocalDate(selectedDay);
  const selectedDayTasks = selectedDateKey ? tasksByDate.get(selectedDateKey) || [] : [];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const activeTargetBoard = boards[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <BoardHeader showSearch={false} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Global Calendar
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Track deadlines and milestone schedules across all active boards
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-card border border-border/60 rounded-xl p-1 shadow-2xs">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-7 px-3 text-xs font-bold"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-base font-bold text-foreground min-w-[150px] text-center">
              {currentDate.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>

            <Button
              onClick={() => {
                if (boards.length === 0) {
                  toast.error("Please create a board first.");
                  return;
                }
                setIsNewTaskModalOpen(true);
              }}
              className="gap-1.5 font-semibold text-xs h-9 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Schedule Task
            </Button>
          </div>
        </div>

        {/* Calendar & Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main 7-Day Month Grid (3 cols) */}
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden flex flex-col">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Matrix */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/40 flex-1">
              {calendarDays.map((dayObj, index) => {
                const dateStr = formatLocalDate(dayObj.date);
                const dayTasks = tasksByDate.get(dateStr) || [];
                const isToday =
                  dayObj.date.toDateString() === new Date().toDateString();
                const isSelected =
                  selectedDay?.toDateString() === dayObj.date.toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDay(dayObj.date)}
                    className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                      !dayObj.isCurrentMonth
                        ? "bg-muted/10 opacity-40"
                        : "hover:bg-muted/30"
                    } ${isSelected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : "text-foreground"
                        }`}
                      >
                        {dayObj.date.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground font-bold">
                          {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                        </span>
                      )}
                    </div>

                    {/* Task Chips */}
                    <div className="space-y-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/boards/${task.boardId}/tasks/${task.id}`);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                          title={`${task.title} (${task.boardName || "Board"})`}
                        >
                          <span>{task.emoji || "📌"}</span>
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[9px] text-muted-foreground font-medium pl-1">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar: Selected Day & Overdue (1 col) */}
          <div className="space-y-6">
            {/* Selected Day Agenda */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedDay?.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDayTasks.length} tasks scheduled
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="h-7 text-xs px-2 gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>

              {selectedDayTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-4 text-center">
                  No tasks scheduled for this day.
                </p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedDayTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/boards/${t.boardId}/tasks/${t.id}`)}
                      className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">
                          {t.emoji && <span className="mr-1">{t.emoji}</span>}
                          {t.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-mono">
                          {t.priority}
                        </Badge>
                      </div>
                      {t.boardName && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {t.boardEmoji || "📋"} {t.boardName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Tasks List */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-bold text-foreground">
                  Overdue Tasks ({overdueTasks.length})
                </h3>
              </div>

              {overdueTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">
                  🎉 No overdue tasks! All on schedule.
                </p>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                  {overdueTasks.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/boards/${task.boardId}/tasks/${task.id}`)}
                      className="p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-rose-600 dark:text-rose-400 truncate">
                          {task.emoji && <span className="mr-1">{task.emoji}</span>}
                          {task.title}
                        </span>
                        <span className="text-[10px] font-mono text-rose-500 font-bold shrink-0">
                          {new Date(task.dueDate!).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      {task.boardName && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {task.boardEmoji || "📋"} {task.boardName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Task Creation Modal */}
      {activeTargetBoard && (
        <TaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          task={null}
          boardId={activeTargetBoard.id}
          columns={activeTargetBoard.columns || [{ id: "todo", title: "To Do" }]}
          onSave={async (data) => {
            await createTaskMutation.mutateAsync({
              ...data,
              dueDate: selectedDay || new Date(),
              boardId: activeTargetBoard.id,
            });
          }}
        />
      )}
    </div>
  );
}
