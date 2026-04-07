import { Task } from "@/types/task";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-foreground">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="font-bold px-4" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-muted/30 border-b border-border/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-3 text-[10px] font-black uppercase tracking-widest text-center text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
          {calendarDays.map((day, idx) => {
            const dayTasks = getTasksForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={day.toISOString()} 
                className={`p-2 border-r border-b border-border/30 last:border-r-0 flex flex-col gap-1 transition-colors
                  ${!isCurrentMonth ? "bg-muted/5 opacity-40" : "bg-card/20"}
                  ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}
                `}
              >
                <span className={`text-xs font-black mb-1 flex items-center justify-center w-6 h-6 rounded-full transition-colors
                  ${isToday ? "bg-primary text-white" : "text-muted-foreground group-hover:text-foreground"}
                `}>
                  {format(day, "d")}
                </span>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="px-2 py-1 rounded text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 border border-border/50 shadow-sm"
                      style={{ 
                        backgroundColor: "hsl(var(--card))",
                        borderColor: task.priority === 'high' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(var(--primary), 0.1)'
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
