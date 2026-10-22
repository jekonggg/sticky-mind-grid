import { Task, TaskStatus, CreateTaskData } from "@/types/task";
import { Board } from "@/types/board";
import { useDevMode } from "@/contexts/DevModeContext";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle as CheckCircle2, Circle, Clock, AlertCircle } from "@untitledui/icons";

interface BoardOverviewProps {
  board: Board;
  tasks: Task[];
}

export function BoardOverview({ board, tasks }: BoardOverviewProps) {
  const { devSettings } = useDevMode();
  const totalTasks = tasks.length;
  
  // Calculate average progress across all tasks
  const averageProgress = totalTasks > 0 
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks) 
    : 0;

  // Generate dynamic stats based on board columns
  const columnStats = board.columns.map(col => {
    const value = tasks.filter(t => t.status === col.id).length;
    
    // Assign icons/colors based on standard IDs, or defaults for custom ones
    let Icon = Circle;
    let color = "text-blue-500";
    let bg = "bg-blue-500/10";
    
    if (col.id === 'todo') {
      Icon = Clock;
      color = "text-slate-400";
      bg = "bg-slate-400/10";
    } else if (col.id === 'in_progress') {
      Icon = AlertCircle;
    } else if (col.id === 'done') {
      Icon = CheckCircle2;
      color = "text-green-500";
      bg = "bg-green-500/10";
    } else if (col.id === 'archive') {
      Icon = Circle;
      color = "text-orange-500";
      bg = "bg-orange-500/10";
    }
    
    return {
      label: col.title,
      value,
      icon: Icon,
      emoji: col.emoji,
      color,
      bg
    };
  });

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: Circle,
      emoji: undefined,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    ...columnStats
  ];

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-6 md:gap-8 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        data-testid="board-overview-stats"
        className="order-2 grid grid-cols-2 gap-3 sm:gap-4 md:order-1 md:gap-6 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <Card
            key={stat.label}
            data-testid="board-overview-stat-card"
            className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all"
          >
            <CardContent className="p-3 sm:p-6">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 sm:gap-x-3">
                <p
                  className="col-span-2 sm:col-span-1 text-[9px] min-[360px]:text-[10px] sm:text-xs font-black uppercase tracking-wide sm:tracking-widest text-muted-foreground leading-tight line-clamp-2 sm:line-clamp-1"
                  title={stat.label}
                >
                  {stat.label}
                </p>
                <h3 className="col-start-1 text-2xl sm:text-3xl font-black text-foreground">
                  {stat.value}
                </h3>
                {!devSettings.disableEmojiCustomization && stat.emoji ? (
                  <div className={`col-start-2 row-start-2 sm:row-span-2 sm:row-start-1 h-6 w-6 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl ${stat.bg} border border-border/40 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs shrink-0`}>
                    <span className="text-sm sm:text-2xl leading-none">{stat.emoji}</span>
                  </div>
                ) : (
                  <div className={`col-start-2 row-start-2 sm:row-span-2 sm:row-start-1 p-1.5 sm:p-3 rounded-lg sm:rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shrink-0`}>
                    <stat.icon className="h-3 w-3 sm:h-6 sm:w-6" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card
        data-testid="board-overview-progress"
        className="order-1 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden md:order-2"
      >
        <CardContent className="p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-foreground">Overall Progress</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Weighted completion across all tasks</p>
              </div>
              <span className="text-3xl sm:text-4xl font-black text-primary">{averageProgress}%</span>
            </div>
            
            <div className="h-3 sm:h-4 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out rounded-full shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                style={{ width: `${averageProgress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] min-[360px]:text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Started</span>
                  <span className="text-sm font-bold">{new Date(board.createdAt).toLocaleDateString()}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] min-[360px]:text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-bold">{new Date(board.updatedAt).toLocaleDateString()}</span>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
