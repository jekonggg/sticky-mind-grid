import { Task } from "@/types/task";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, setHours, getHours } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, Columns, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

type ViewMode = "month" | "week" | "day";

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const navigate = (direction: 'next' | 'prev') => {
    const amount = direction === 'next' ? 1 : -1;
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, amount));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, amount));
    else setCurrentDate(addDays(currentDate, amount));
  };

  const getTitle = () => {
    if (viewMode === 'month') return format(currentDate, "MMMM yyyy");
    if (viewMode === 'week') {
      return `Week of ${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM d, yyyy");
  };

  // Hours for Day View
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      {/* Header with Navigation and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-foreground leading-tight">
              {getTitle()}
            </h2>
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              {viewMode} View
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
            {[
              { id: 'month', icon: LayoutGrid, label: 'Month' },
              { id: 'week', icon: Columns, label: 'Week' },
              { id: 'day', icon: Square, label: 'Day' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all
                  ${viewMode === mode.id 
                    ? "bg-background text-primary shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <mode.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-border/50 mx-1" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="font-bold px-4" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch h-full">
        {/* Calendar Grid Side */}
        <div className="flex-1 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm flex flex-col">
          {viewMode !== 'day' ? (
            <>
              <div className="grid grid-cols-7 bg-muted/30 border-b border-border/50">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2 text-[10px] font-black uppercase tracking-widest text-center text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className={`grid grid-cols-7 
                ${viewMode === 'month' ? 'auto-rows-[100px] md:auto-rows-[115px]' : 'auto-rows-[400px]'}
              `}>
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, viewMonthStart);

                  return (
                    <div 
                      key={day.toISOString()} 
                      className={`p-1.5 border-r border-b border-border/30 last:border-r-0 flex flex-col gap-0.5 transition-colors
                        ${(viewMode === 'month' && !isCurrentMonth) ? "opacity-30 bg-muted/5" : "bg-card/20"}
                        ${isToday ? "bg-primary/5" : ""}
                      `}
                    >
                      <span className={`text-[10px] font-black flex items-center justify-center w-5 h-5 rounded-full transition-colors mb-0.5
                        ${isToday ? "bg-primary text-white" : "text-muted-foreground"}
                      `}>
                        {format(day, "d")}
                      </span>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className={`px-1.5 py-1 rounded border border-border/50 shadow-sm cursor-pointer transition-all hover:scale-[1.01] 
                              ${viewMode === 'week' ? 'text-sm py-3' : 'text-[9px]'}
                            `}
                            style={{ 
                              backgroundColor: "hsl(var(--card))",
                              borderLeft: `3px solid ${
                                task.priority === 'high' ? 'rgb(239, 68, 68)' : 
                                task.priority === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(59, 130, 246)'
                              }`
                            }}
                          >
                            <div className="font-bold truncate">{task.title}</div>
                            {viewMode === 'week' && (
                              <div className="text-[10px] opacity-60 mt-1 flex items-center gap-2">
                                <span>{task.priority.toUpperCase()}</span>
                                <span>•</span>
                                <span>{task.progress}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Day View: Hourly Plotting */
            <div className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="relative">
                {/* Visual grid lines for better plotting feel */}
                <div className="absolute inset-0 pointer-events-none">
                  {hours.map(h => (
                    <div key={h} className="h-[100px] border-b border-border/10" />
                  ))}
                </div>

                {hours.map((hour) => {
                  const hourTasks = getTasksForHour(currentDate, hour);
                  const isCurrentHour = isSameDay(currentDate, new Date()) && getHours(new Date()) === hour;

                  return (
                    <div key={hour} className={`flex min-h-[100px] border-b border-border/30 relative transition-colors ${isCurrentHour ? "bg-primary/[0.02]" : ""}`}>
                      <div className="w-20 flex-shrink-0 flex justify-center pt-3 border-r border-border/30 bg-muted/5">
                        <span className={`text-[10px] font-black tracking-tight ${isCurrentHour ? "text-primary" : "text-muted-foreground/60"}`}>
                          {format(setHours(new Date(), hour), "h aa")}
                        </span>
                      </div>
                      <div className="flex-1 p-3 flex flex-wrap gap-3 items-start relative">
                        {hourTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task)}
                            className="group bg-card border border-border/50 p-3 rounded-xl shadow-sm cursor-pointer hover:border-primary/50 transition-all hover:shadow-md max-w-[350px] flex-1 min-w-[240px] relative overflow-hidden"
                            style={{ 
                                borderLeft: `4px solid ${
                                  task.priority === 'high' ? 'rgb(239, 68, 68)' : 
                                  task.priority === 'medium' ? 'rgb(245, 158, 11)' : 'rgb(59, 130, 246)'
                                }`
                              }}
                          >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        task.priority === 'high' ? 'bg-destructive animate-pulse' : 
                                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary'
                                    }`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                        {task.priority}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black text-primary/70">
                                    {format(new Date(task.dueDate!), "HH:mm")}
                                </span>
                            </div>
                            <h4 className="text-sm font-black leading-tight mb-3 uppercase group-hover:text-primary transition-colors line-clamp-2">{task.title}</h4>
                            <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                                </div>
                                <span className="text-[10px] font-black opacity-80">{task.progress}%</span>
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
        </div>

        {/* Sidebar Side */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* Section: Pending/Ongoing */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col flex-[1.5] min-h-[350px]">
            <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h3 className="font-black text-sm uppercase tracking-wider">
                {viewMode === 'month' ? format(currentDate, "MMMM") : viewMode === 'week' ? "Weekly" : "Daily"} Tasks
              </h3>
              <span className="ml-auto bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingTasks.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="group relative p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden text-xs font-bold"
                  >
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                      task.priority === 'high' ? 'bg-destructive' : 
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary/50'
                    }`} />
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] opacity-60">
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, h:mm aa") : "No date"}
                      </span>
                      <span className="text-[10px] uppercase opacity-40">{task.priority}</span>
                    </div>
                    <div className="line-clamp-1">{task.title}</div>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-50">
                  <p className="text-[10px] font-black uppercase tracking-widest">No pending tasks</p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Completed */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
              <div className="h-8 w-1 bg-green-500 rounded-full" />
              <h3 className="font-black text-sm uppercase tracking-wider text-green-500/80">
                Completed
              </h3>
              <span className="ml-auto bg-green-500/10 text-green-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                {completedTasks.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="p-2.5 rounded-lg border border-border/30 bg-green-500/5 hover:bg-green-500/10 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                      <span className="text-[8px]">✓</span>
                    </div>
                    <h4 className="text-[11px] font-bold text-foreground/70 line-through truncate">{task.title}</h4>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6 opacity-30">
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
