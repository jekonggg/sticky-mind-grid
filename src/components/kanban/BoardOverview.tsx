import { Task } from "@/types/task";
import { Board } from "@/types/board";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface BoardOverviewProps {
  board: Board;
  tasks: Task[];
}

export function BoardOverview({ board, tasks }: BoardOverviewProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: Circle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "To Do",
      value: todoTasks,
      icon: Clock,
      color: "text-slate-400",
      bg: "bg-slate-400/10",
    },
    {
      label: "In Progress",
      value: inProgressTasks,
      icon: AlertCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Completed",
      value: completedTasks,
      icon: CheckCircle2,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-black text-foreground">
                    {stat.value}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-foreground">Overall Progress</h3>
                <p className="text-sm text-muted-foreground mt-1">Completion rate based on task status</p>
              </div>
              <span className="text-4xl font-black text-primary">{completionPercentage}%</span>
            </div>
            
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out rounded-full shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Started</span>
                  <span className="text-sm font-bold">{new Date(board.createdAt).toLocaleDateString()}</span>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-bold">{new Date(board.updatedAt).toLocaleDateString()}</span>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
