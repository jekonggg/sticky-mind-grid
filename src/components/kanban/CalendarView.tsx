import { Task, Column } from "@/types/task";
import { Board } from "@/types/board";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, setHours, getHours } from "date-fns";
import { formatSafe } from "@/utils/dateUtils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid01 as LayoutGrid,
  Columns03 as Columns,
  Square,
  CheckSquare,
  Attachment01 as Paperclip,
  File06 as FileText,
  Plus,
  AlertCircle,
} from "@untitledui/icons";
import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AuthContext } from "@/contexts/AuthContext";
import { getProgressColor } from "@/utils/taskUtils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface CalendarViewProps {
  tasks: Task[];
  columns?: Column[];
  boards?: Board[];
  selectedTaskId?: string | null;
  onTaskClick: (task: Task) => void;
  onAddTask?: (date?: Date) => void;
  scope?: "global" | "board";
  title?: string;
  subtitle?: string;
}

type ViewMode = "month" | "week" | "day";

export function CalendarView({
  tasks,
  columns = [],
  boards = [],
  selectedTaskId,
  onTaskClick,
  onAddTask,
  scope = "board",
  title,
  subtitle,
}: CalendarViewProps) {
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;
  const isCompact = settings.uiDensity === "compact";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  
  // Date calculations based on viewMode
  let startDate: Date, endDate: Date;
  const viewMonthStart = startOfMonth(currentDate);

  if (viewMode === "month") {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    startDate = startOfWeek(monthStart);
    endDate = endOfWeek(monthEnd);
  } else if (viewMode === "week") {
    startDate = startOfWeek(currentDate);
    endDate = endOfWeek(currentDate);
  } else {
    startDate = startOfDay(currentDate);
    endDate = endOfDay(currentDate);
  }
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
  };

  const getTasksForHour = (day: Date, hour: number) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const date = new Date(task.dueDate);
      return isSameDay(date, day) && getHours(date) === hour;
    });
  };

  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.progress === 100) return false;
    return new Date(t.dueDate) < startOfDay(now);
  });

  const selectedDayTasks = tasks
    .filter((task) => {
      if (!task.dueDate) return false;
      return isSameDay(new Date(task.dueDate), selectedDay);
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Filter tasks for the sidebar based on current view range
  const contextTasks = tasks
    .filter((task) => {
      if (!task.dueDate) return false;
      const date = new Date(task.dueDate);
      if (viewMode === 'month') return isSameMonth(date, currentDate);
      if (viewMode === 'week') return date >= startDate && date <= endDate;
      return isSameDay(date, currentDate);
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const pendingTasks = contextTasks
    .filter((task) => task.progress < 100);
    
  const completedTasks = contextTasks
    .filter((task) => task.progress === 100);

  const [slideDirection, setSlideDirection] = useState<number>(1);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const navigate = useCallback((direction: 'next' | 'prev') => {
    const amount = direction === 'next' ? 1 : -1;
    setSlideDirection(amount);
    if (viewMode === 'month') setCurrentDate((prev) => addMonths(prev, amount));
    else if (viewMode === 'week') setCurrentDate((prev) => addWeeks(prev, amount));
    else setCurrentDate((prev) => addDays(prev, amount));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setSelectedDay(today);
    if (isSameMonth(today, currentDate) && viewMode === 'month') return;
    if (isSameDay(today, currentDate) && (viewMode === 'day' || viewMode === 'week')) return;
    setSlideDirection(today.getTime() >= currentDate.getTime() ? 1 : -1);
    setCurrentDate(today);
  }, [currentDate, viewMode]);

  useEffect(() => {
    const el = calendarGridRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (viewMode === "month") {
        const target = e.target as HTMLElement | null;
        const scrollable = target?.closest(".overflow-y-auto") as HTMLElement | null;
        if (scrollable && scrollable !== el) {
          const hasOverflow = scrollable.scrollHeight > scrollable.clientHeight + 2;
          if (hasOverflow && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            // Allow inner task list to scroll if hovering over an overflowing task cell
            return;
          }
        }

        if (Math.abs(e.deltaY) < 20 && Math.abs(e.deltaX) < 20) {
          return;
        }

        const now = Date.now();
        if (now - lastScrollTimeRef.current < 400) {
          if (e.cancelable) e.preventDefault();
          return;
        }

        const isNext = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX > 0 : e.deltaY > 0;
        if (e.cancelable) e.preventDefault();
        lastScrollTimeRef.current = now;
        navigate(isNext ? "next" : "prev");
      } else {
        // Week or Day view: horizontal wheel navigation
        if (Math.abs(e.deltaX) > 25 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          const now = Date.now();
          if (now - lastScrollTimeRef.current < 400) {
            if (e.cancelable) e.preventDefault();
            return;
          }
          if (e.cancelable) e.preventDefault();
          lastScrollTimeRef.current = now;
          navigate(e.deltaX > 0 ? "next" : "prev");
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [viewMode, navigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 400) return;
      lastScrollTimeRef.current = now;
      navigate(deltaX < 0 ? "next" : "prev");
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: devSettings.forceReducedMotion ? 0 : dir > 0 ? 60 : -60,
      opacity: devSettings.forceReducedMotion ? 1 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: devSettings.forceReducedMotion ? 0 : dir > 0 ? -60 : 60,
      opacity: devSettings.forceReducedMotion ? 1 : 0,
    }),
  };

  const getTitle = () => {
    if (viewMode === 'month') return format(currentDate, "MMMM yyyy");
    if (viewMode === 'week') {
      return `Week of ${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM d, yyyy");
  };

  const getCompactTitle = () => {
    if (viewMode === 'month') return format(currentDate, "MMM yyyy");
    if (viewMode === 'week') {
      return isSameMonth(startDate, endDate)
        ? `${format(startDate, "MMM d")} - ${format(endDate, "d")}`
        : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    }
    return format(currentDate, "MMM d");
  };

  // Hours for Day View
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      data-testid="calendar-view"
      className={`p-3 md:p-4 lg:p-8 space-y-4 md:space-y-6 max-w-[1600px] mx-auto min-w-0 ${
        scope === "board" ? "animate-in fade-in slide-in-from-bottom-4 duration-500" : ""
      }`}
    >
      {title && isMobile && (
        <header data-testid="calendar-mobile-page-header" className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </header>
      )}

      {/* Header with Navigation and View Switcher */}
      <div
        data-testid="calendar-toolbar"
        className="flex flex-nowrap md:flex-wrap items-center justify-between gap-2 md:gap-3 xl:gap-4 min-w-0"
      >
        <div className="flex min-w-0 flex-none items-center gap-2 md:min-w-[12rem] md:flex-1 md:gap-3 xl:gap-4">
          {!title && (
            <div
              data-testid="calendar-toolbar-icon"
              className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center bg-primary/10 rounded-lg text-primary shrink-0"
            >
              <CalendarIcon className="h-4 w-4 md:h-5 md:w-5" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            {title && !isMobile && (
              <div className="mb-0.5 min-w-0">
                <h1
                  className="text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-tight truncate"
                  title={title}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="hidden md:block text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <div className="overflow-hidden min-w-0">
                <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
                  <motion.h2
                    key={getTitle()}
                    custom={slideDirection}
                    initial={{
                      y: devSettings.forceReducedMotion ? 0 : slideDirection > 0 ? 8 : -8,
                      opacity: devSettings.forceReducedMotion ? 1 : 0,
                    }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{
                      y: devSettings.forceReducedMotion ? 0 : slideDirection > 0 ? -8 : 8,
                      opacity: devSettings.forceReducedMotion ? 1 : 0,
                    }}
                    transition={{
                      duration: devSettings.forceReducedMotion ? 0 : 0.16,
                      ease: "easeOut",
                    }}
                    aria-label={getTitle()}
                    className={`font-black text-foreground leading-tight whitespace-nowrap ${title ? "text-base md:text-sm text-primary font-bold" : "text-base md:text-xl"}`}
                  >
                    <span aria-hidden="true" className="md:hidden">{getCompactTitle()}</span>
                    <span aria-hidden="true" className="hidden md:inline">{getTitle()}</span>
                  </motion.h2>
                </AnimatePresence>
              </div>
              <span className="hidden md:inline text-[10px] uppercase font-black tracking-widest text-muted-foreground whitespace-nowrap">
                {title ? `• ${viewMode} View` : `${viewMode} View`}
              </span>
            </div>
          </div>
        </div>

        <div className="contents md:flex md:min-w-0 md:shrink-0 md:items-center md:gap-2 md:ml-auto xl:gap-3">
          <div
            data-testid="calendar-view-switcher"
            className="order-4 hidden w-full min-w-0 items-center gap-3 md:order-none md:flex md:w-auto md:shrink-0"
          >
            <div className="flex w-full md:w-auto bg-muted/30 p-0.5 md:p-1 rounded-lg border border-border/50">
              {[
                { id: 'month', icon: LayoutGrid, label: 'Month' },
                { id: 'week', icon: Columns, label: 'Week' },
                { id: 'day', icon: Square, label: 'Day' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  aria-label={mode.label}
                  className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all
                    ${viewMode === mode.id
                      ? "bg-background text-primary shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <mode.icon className="h-3 w-3" />
                  <span className="hidden xl:inline">{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-border/50 mx-1 hidden md:block" />
          </div>

          <div className="order-2 flex flex-1 shrink-0 items-center justify-center gap-1 md:order-none md:flex-none md:shrink-0 md:justify-start md:gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous"
              className="h-9 w-9 rounded-full"
              onClick={() => navigate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-bold whitespace-nowrap md:px-4 md:text-sm"
              onClick={handleToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next"
              className="h-9 w-9 rounded-full"
              onClick={() => navigate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {onAddTask && (
            <Button
              onClick={() => onAddTask(selectedDay)}
              aria-label="Schedule Task"
              className="order-3 h-9 w-9 shrink-0 gap-1.5 p-0 text-xs font-semibold shadow-xs md:order-none md:h-9 md:w-auto md:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xl:inline">Schedule Task</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:items-stretch h-full min-w-0">
        {/* Calendar Grid Side */}
        <div
          ref={calendarGridRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          data-testid="calendar-grid-container"
          className="w-full min-w-0 shrink-0 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm flex flex-col relative touch-pan-y h-[clamp(300px,40dvh,370px)] md:h-auto md:flex-1 md:shrink"
        >
          <div
            data-testid="calendar-mobile-header"
            className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2 md:hidden"
          >
            <h2
              aria-label={getTitle()}
              className="min-w-0 truncate text-[13px] font-black leading-tight text-foreground"
            >
              {getTitle()}
            </h2>
            <div
              data-testid="calendar-view-switcher-mobile"
              className="flex shrink-0 items-center rounded-lg border border-border/50 bg-muted/30 p-0.5"
            >
              {[
                { id: 'month', icon: LayoutGrid, label: 'Month' },
                { id: 'week', icon: Columns, label: 'Week' },
                { id: 'day', icon: Square, label: 'Day' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id as ViewMode)}
                  aria-label={mode.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                    viewMode === mode.id
                      ? "bg-background text-primary shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <mode.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
            <motion.div
              key={`${viewMode}-${format(currentDate, viewMode === 'month' ? 'yyyy-MM' : viewMode === 'week' ? 'yyyy-MM-dd' : 'yyyy-MM-dd-HH')}`}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: devSettings.forceReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 30, mass: 0.8 },
                opacity: devSettings.forceReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.16 },
              }}
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              {viewMode === 'week' ? (
            <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
              <div className="w-full min-w-0 flex flex-col h-full">
                {/* Week Day Header */}
              <div className="grid grid-cols-7 bg-muted/20 border-b border-border/50 divide-x divide-border/30 shrink-0">
                {calendarDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const dayTasks = getTasksForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`py-2 px-1 md:py-3 md:px-2 flex flex-col items-center justify-center gap-1 transition-colors ${
                        isToday ? "bg-primary/10" : ""
                      }`}
                    >
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wide md:tracking-widest text-muted-foreground">
                        {format(day, "EEE")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] md:text-sm font-black flex items-center justify-center w-5 h-5 md:w-7 md:h-7 rounded-full transition-transform ${
                            isToday
                              ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 font-bold"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {isToday && (
                          <span className="hidden xl:inline text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] md:text-[10px] font-semibold text-muted-foreground/70">
                        {dayTasks.length === 0
                          ? "No tasks"
                          : `${dayTasks.length} ${dayTasks.length === 1 ? "task" : "tasks"}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Week Columns Lane Grid */}
              <div className="grid grid-cols-7 divide-x divide-border/30 min-h-0 md:min-h-[580px] flex-1 bg-muted/5">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-w-0 p-1 md:p-2 flex flex-col gap-1 md:gap-2.5 transition-colors ${
                        isToday ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col gap-1 md:gap-2.5">
                        {dayTasks.length === 0 ? (
                          <div className="h-16 md:h-28 rounded-md md:rounded-xl border border-dashed border-border/40 flex flex-col items-center justify-center text-center p-1 md:p-2 text-muted-foreground/40 text-[9px] md:text-[11px] gap-0.5 md:gap-1 select-none">
                            <span>No tasks</span>
                          </div>
                        ) : (
                          dayTasks.map((task) => {
                            const column = columns.find((c) => c.id === task.status);
                            const statusTitle = column?.title || task.status.replace(/_/g, " ");
                            const statusEmoji = column?.emoji;
                            const statusColor = column?.color;
                            const assigneeName = task.assignee?.fullName || task.assignee?.email;
                            const assigneeInitial = (assigneeName || "U").charAt(0).toUpperCase();

                            const priorityBorderColor =
                              task.priority === "urgent"
                                ? "border-l-rose-500"
                                : task.priority === "high"
                                ? "border-l-orange-500"
                                : task.priority === "medium"
                                ? "border-l-amber-500"
                                : "border-l-blue-500";

                            return (
                              <div
                                key={task.id}
                                onClick={() => onTaskClick(task)}
                                title={task.title}
                                className={`min-w-0 shrink-0 md:shrink p-1.5 md:p-3 rounded-md md:rounded-xl bg-card border border-border/70 border-l-2 md:border-l-[4px] ${priorityBorderColor} hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group/card flex flex-col gap-1 md:gap-2 overflow-hidden`}
                              >
                                {/* Status & Priority Row */}
                                <div className="hidden md:flex items-center justify-between gap-1.5">
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50 flex items-center gap-1 truncate max-w-[125px]"
                                    title={statusTitle}
                                  >
                                    {!devSettings.disableEmojiCustomization && statusEmoji ? (
                                      <span className="text-xs shrink-0">{statusEmoji}</span>
                                    ) : (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: statusColor || "var(--primary)" }}
                                      />
                                    )}
                                    <span className="truncate">{statusTitle}</span>
                                  </span>

                                  <span
                                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full border shrink-0 ${
                                      task.priority === "urgent"
                                        ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                        : task.priority === "high"
                                        ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                                        : task.priority === "medium"
                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                        : "bg-slate-500/10 text-slate-600 border-slate-500/30"
                                    }`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>

                                {/* Task Emoji & Title */}
                                <div className="flex items-start gap-1 md:gap-2 min-w-0">
                                  {!devSettings.disableEmojiCustomization && task.emoji ? (
                                    <span className="hidden md:inline text-sm shrink-0 mt-0.5">{task.emoji}</span>
                                  ) : (
                                    <FileText className="hidden md:block h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5 group-hover/card:text-primary transition-colors" />
                                  )}
                                  <span className="font-bold text-[9px] md:text-xs text-foreground group-hover/card:text-primary transition-colors line-clamp-2 leading-[1.1] md:leading-snug break-words">
                                    {task.title}
                                  </span>
                                </div>

                                {/* Task Description snippet */}
                                {task.description && (
                                  <p className="hidden md:block text-[10px] text-muted-foreground line-clamp-1 italic">
                                    {task.description}
                                  </p>
                                )}

                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="hidden md:flex flex-wrap gap-1">
                                    {task.tags.slice(0, 2).map((t) => (
                                      <span
                                        key={t.id}
                                        style={{
                                          backgroundColor: `${t.color}20`,
                                          color: t.color,
                                          borderColor: `${t.color}40`,
                                        }}
                                        className="text-[8px] font-bold px-1.5 py-0.2 rounded-full border truncate max-w-[70px]"
                                      >
                                        {t.name}
                                      </span>
                                    ))}
                                    {task.tags.length > 2 && (
                                      <span className="text-[8px] font-bold text-muted-foreground px-1 py-0.2">
                                        +{task.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Progress bar */}
                                <div className="hidden md:block space-y-1 pt-0.5">
                                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 ${getProgressColor(
                                        task.progress
                                      )}`}
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                                    <span>Progress</span>
                                    <span>{task.progress}%</span>
                                  </div>
                                </div>

                                {/* Card Footer: Metadata & Assignee */}
                                <div className="hidden md:flex pt-1.5 border-t border-border/40 items-center justify-between gap-1 text-[10px] text-muted-foreground">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.checklist && task.checklist.length > 0 && (
                                      <span className="flex items-center gap-1 font-semibold" title="Checklist progress">
                                        <CheckSquare className="h-3 w-3 text-primary" />
                                        <span>
                                          {task.checklist.filter((i) => i.completed).length}/{task.checklist.length}
                                        </span>
                                      </span>
                                    )}
                                    {task.attachments && task.attachments.length > 0 && (
                                      <span className="flex items-center gap-1 font-semibold" title="Attachments">
                                        <Paperclip className="h-3 w-3" />
                                        <span>{task.attachments.length}</span>
                                      </span>
                                    )}
                                  </div>

                                  {task.assignee && (() => {
                                    const isCurrentUser =
                                      task.assignee.id === currentUser?.id ||
                                      (currentUser?.email && task.assignee.email === currentUser.email);
                                    const assigneeAvatarUrl = isCurrentUser
                                      ? (currentUser?.avatarUrl ?? task.assignee.avatarUrl)
                                      : task.assignee.avatarUrl;

                                    return (
                                      <div className="flex items-center gap-1 shrink-0 ml-auto" title={`Assigned to: ${assigneeName}`}>
                                        <span className="text-[9px] font-semibold truncate max-w-[60px] hidden xl:inline">
                                          {assigneeName?.split(" ")[0]}
                                        </span>
                                        <Avatar className="h-5 w-5 border border-primary/20 shrink-0">
                                          <AvatarImage src={assigneeAvatarUrl} alt={assigneeName} />
                                          <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">
                                            {assigneeInitial}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'month' ? (
          <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
              <div className="flex h-full w-full min-w-0 flex-col">
                <div data-testid="calendar-weekdays" className="grid shrink-0 grid-cols-7 bg-muted/30 border-b border-border/50">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2 text-[9px] md:text-[10px] font-black uppercase tracking-wide md:tracking-widest text-center text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div data-testid="calendar-month-grid" className={`grid min-h-0 flex-1 grid-cols-7 auto-rows-fr ${isCompact ? "md:auto-rows-[95px]" : "md:auto-rows-[120px]"}`}>
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDay);
                  const isCurrentMonth = isSameMonth(day, viewMonthStart);

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => setSelectedDay(day)}
                      className={`min-w-0 overflow-hidden md:overflow-visible p-1 md:p-1.5 border-r border-b border-border/30 last:border-r-0 flex flex-col gap-0.5 md:gap-1 transition-colors cursor-pointer
                        ${(!isCurrentMonth) ? "opacity-30 bg-muted/5" : "bg-card/20 hover:bg-muted/30"}
                        ${isToday ? "bg-primary/5" : ""}
                        ${isSelected ? "ring-2 ring-primary ring-inset bg-primary/[0.04]" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between mb-0.5 min-w-0">
                        <span className={`text-[9px] md:text-[10px] font-black flex items-center justify-center w-[18px] h-[18px] md:w-5 md:h-5 rounded-full transition-colors
                          ${isToday ? "bg-primary text-white" : isSelected ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"}
                        `}>
                          {format(day, "d")}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[9px] font-mono text-muted-foreground/70 font-bold hidden md:inline">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 md:gap-1">
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            title={task.title}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick(task);
                            }}
                            className="min-w-0 shrink-0 md:shrink overflow-hidden px-1 py-0 md:px-1.5 md:py-1 rounded md:rounded-md border border-border/50 bg-card hover:bg-card/90 md:hover:scale-[1.02] shadow-2xs cursor-pointer transition-all flex items-start md:items-center justify-between gap-0.5 md:gap-1 text-[9px] leading-[1.1] md:text-[10px] md:leading-normal group/m-task"
                            style={{ 
                              borderLeft: `3px solid ${
                              task.priority === 'urgent' ? 'rgb(244, 63, 94)' :
                              task.priority === 'high' ? 'rgb(249, 115, 22)' : 
                              task.priority === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(59, 130, 246)'
                            }`
                          }}
                          >
                            <div className="flex items-start md:items-center gap-0.5 md:gap-1 min-w-0 flex-1">
                              {!devSettings.disableEmojiCustomization && task.emoji && <span className="hidden md:inline text-xs shrink-0">{task.emoji}</span>}
                              <span className="font-bold line-clamp-1 break-words group-hover/m-task:text-primary">{task.title}</span>
                              {scope === "global" && task.boardName && (
                                <span className="text-[8px] font-semibold text-muted-foreground bg-muted/60 px-1 py-0.2 rounded truncate max-w-[65px] ml-auto shrink-0 hidden md:inline">
                                  {task.boardName}
                                </span>
                              )}
                            </div>
                            {task.progress === 100 && (
                              <span className="hidden md:inline text-[9px] text-emerald-500 font-bold shrink-0">✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
             </div>
            </div>
          ) : (
            /* Day View: Hourly Plotting with Dynamic Compact Heights */
            <div className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="relative divide-y divide-border/25">
                {hours.map((hour) => {
                  const hourTasks = getTasksForHour(currentDate, hour);
                  const hasTasks = hourTasks.length > 0;
                  const isCurrentHour = isSameDay(currentDate, new Date()) && getHours(new Date()) === hour;

                  if (!hasTasks) {
                    // Shrunk / Compact Row for Empty Hours
                    return (
                      <div
                        key={hour}
                        className={`flex ${isCompact ? "min-h-[28px]" : "min-h-[34px]"} transition-colors group/hour hover:bg-muted/20 ${
                          isCurrentHour ? "bg-primary/[0.03] ring-1 ring-inset ring-primary/20" : ""
                        }`}
                      >
                        <div className="w-16 md:w-20 flex-shrink-0 flex items-center justify-center gap-1 border-r border-border/25 bg-muted/5 py-1 select-none">
                          <span
                            className={`text-[10px] font-medium tracking-tight ${
                              isCurrentHour ? "text-primary font-bold" : "text-muted-foreground/40 group-hover/hour:text-muted-foreground/70"
                            }`}
                          >
                            {format(setHours(new Date(), hour), "h aa")}
                          </span>
                          {isCurrentHour && (
                            <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-primary text-primary-foreground leading-none">
                              NOW
                            </span>
                          )}
                        </div>
                        <div className="flex-1 px-3 py-1 flex items-center text-[10px] text-muted-foreground/20 italic group-hover/hour:text-muted-foreground/50 transition-colors">
                          <span>—</span>
                        </div>
                      </div>
                    );
                  }

                  // Expanded Row for Hours with Tasks
                  return (
                    <div
                      key={hour}
                      className={`flex min-h-[100px] relative transition-colors ${
                        isCurrentHour ? "bg-primary/[0.04]" : "bg-card/10"
                      }`}
                    >
                      <div className="w-16 md:w-20 flex-shrink-0 flex flex-col items-center justify-start pt-3 pb-2 border-r border-border/30 bg-muted/10 select-none">
                        <span
                          className={`text-xs font-black tracking-tight ${
                            isCurrentHour ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {format(setHours(new Date(), hour), "h aa")}
                        </span>
                        {isCurrentHour ? (
                          <span className="mt-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                            NOW
                          </span>
                        ) : (
                          <span className="mt-1 text-[9px] font-bold text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded-full">
                            {hourTasks.length} {hourTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 p-3 flex flex-wrap gap-3 items-start relative">
                        {hourTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className="group bg-card border border-border/50 p-3 rounded-xl shadow-sm cursor-pointer hover:border-primary/50 transition-all hover:shadow-md max-w-[350px] flex-1 min-w-0 md:min-w-[240px] relative overflow-hidden"
                            style={{
                              borderLeft: `4px solid ${
                                task.priority === "high"
                                  ? "rgb(239, 68, 68)"
                                  : task.priority === "medium"
                                  ? "rgb(245, 158, 11)"
                                  : "rgb(59, 130, 246)"
                              }`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    task.priority === "high"
                                      ? "bg-destructive animate-pulse"
                                      : task.priority === "medium"
                                      ? "bg-amber-500"
                                      : "bg-primary"
                                  }`}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                  {task.priority}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-primary/70">
                                {formatSafe(task.dueDate, "HH:mm")}
                              </span>
                            </div>
                            <h4 className="text-sm font-black leading-tight mb-3 uppercase group-hover:text-primary transition-colors line-clamp-2">
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-black opacity-80">
                                {task.progress}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar Side */}
        <div className="grid w-full shrink-0 grid-cols-2 gap-3 md:flex md:shrink md:flex-col md:gap-6 lg:w-80">
          {/* Section 1: Selected Day Agenda */}
          <div
            data-testid="calendar-selected-day-agenda"
            className="col-span-2 flex h-[clamp(200px,28dvh,260px)] flex-col rounded-xl border border-border/50 bg-card/50 p-3 backdrop-blur-sm md:col-span-1 md:h-auto md:min-h-[300px] md:flex-[1.4] md:p-4"
          >
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2.5">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                  {format(selectedDay, "EEE, MMM d")}
                </h3>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {selectedDayTasks.length} {selectedDayTasks.length === 1 ? "task" : "tasks"} scheduled
                </span>
              </div>
              {onAddTask && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddTask(selectedDay)}
                  className="h-7 text-xs px-2 gap-1 font-semibold"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
              {selectedDayTasks.length > 0 ? (
                selectedDayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="group relative p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden text-xs font-bold"
                  >
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                      task.priority === 'urgent' ? 'bg-rose-500' :
                      task.priority === 'high' ? 'bg-orange-500' : 
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary/50'
                    }`} />
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] opacity-60">
                        {formatSafe(task.dueDate, "h:mm aa", "All day")}
                      </span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 uppercase font-mono">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="line-clamp-1">{task.title}</div>
                    {task.boardName && (
                      <span className="text-[9px] text-muted-foreground block truncate mt-0.5">
                        {task.boardEmoji ? `${task.boardEmoji} ` : "📋 "}{task.boardName}
                      </span>
                    )}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 opacity-50">
                  <p className="text-[10px] font-black uppercase tracking-widest">No tasks scheduled for this day</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Overdue Tasks Alert */}
          <div
            data-testid="calendar-overdue-card"
            className={`${overdueTasks.length === 0 ? "flex md:hidden" : "flex"} bg-card/50 backdrop-blur-sm border border-rose-500/30 rounded-xl p-3 md:p-4 flex-col h-[clamp(190px,26dvh,240px)] min-h-0 md:h-auto md:min-h-[170px] md:max-h-[250px] min-w-0`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-3 border-b border-border/50 pb-2 min-w-0">
              <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-rose-500 shrink-0" />
              <h3
                aria-label={`Overdue Tasks (${overdueTasks.length})`}
                className="font-black text-[10px] md:text-xs uppercase tracking-wide md:tracking-wider text-rose-500 truncate"
              >
                <span className="md:hidden">Overdue ({overdueTasks.length})</span>
                <span className="hidden md:inline">Overdue Tasks ({overdueTasks.length})</span>
              </h3>
            </div>

            {overdueTasks.length > 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 md:pr-1 space-y-1.5 md:space-y-2">
                {overdueTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                    className="min-w-0 p-1.5 md:p-2 rounded-md md:rounded-lg bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className="min-w-0 font-bold text-rose-600 dark:text-rose-400 truncate text-[10px] md:text-xs">
                        {!devSettings.disableEmojiCustomization && task.emoji && <span className="mr-1">{task.emoji}</span>}
                        {task.title}
                      </span>
                      <span className="text-[8px] md:text-[9px] font-mono text-rose-500 font-bold shrink-0">
                        {formatSafe(task.dueDate, "MMM d")}
                      </span>
                    </div>
                    {task.boardName && (
                      <span className="hidden md:block text-[9px] text-muted-foreground truncate mt-0.5">
                        {task.boardEmoji ? `${task.boardEmoji} ` : ""}{task.boardName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center py-2 opacity-60">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-wide">No overdue tasks</p>
              </div>
            )}
          </div>

          {/* Section 3: Completed Tasks */}
          <div
            data-testid="calendar-completed-card"
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 md:p-4 flex flex-col h-[clamp(190px,26dvh,240px)] min-h-0 md:h-auto md:flex-1 md:min-h-[150px] md:max-h-[200px] min-w-0"
          >
            <div className="flex items-center gap-1.5 md:gap-2 mb-3 border-b border-border/50 pb-2 min-w-0">
              <div className="h-5 w-1 md:h-6 bg-green-500 rounded-full shrink-0" />
              <h3 className="font-black text-[10px] md:text-xs uppercase tracking-wide md:tracking-wider text-green-500/80 truncate">
                Completed ({completedTasks.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 md:pr-1 space-y-1.5">
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    title={task.title}
                    className="min-w-0 p-1.5 md:p-2 rounded-md md:rounded-lg border border-border/30 bg-green-500/5 hover:bg-green-500/10 transition-all cursor-pointer flex items-center gap-1.5 md:gap-2 group"
                  >
                    <div className="h-3.5 w-3.5 md:h-4 md:w-4 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                      <span className="text-[8px]">✓</span>
                    </div>
                    <h4 className="min-w-0 text-[9px] md:text-[10px] font-bold text-foreground/70 line-through truncate">{task.title}</h4>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-4 opacity-30">
                  <p className="text-[9px] font-black uppercase">None finished yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
