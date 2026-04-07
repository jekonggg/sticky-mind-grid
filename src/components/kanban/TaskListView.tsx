import { Task } from "@/types/task";
import { getProgressColor } from "@/utils/taskUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MoreHorizontal, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-destructive border-destructive/20 bg-destructive/5";
      case "medium": return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      case "low": return "text-slate-400 border-slate-400/20 bg-slate-400/5";
      default: return "";
    }
  };

  const statusIcons: Record<string, React.ReactNode> = {
    todo: <Clock className="h-3 w-3 mr-1.5" />,
    in_progress: <AlertCircle className="h-3 w-3 mr-1.5 text-blue-500" />,
    done: <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-500" />,
  };

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className="w-[30%] font-black uppercase text-[10px] tracking-widest py-4">Task Name</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Progress</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Priority</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Due Date</TableHead>
              <TableHead className="text-right py-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                  No tasks found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="group cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
                  onClick={() => onTaskClick(task)}
                >
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="text-[11px] text-muted-foreground line-clamp-1 italic">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center text-xs font-bold capitalize">
                       {statusIcons[task.status] || <Clock className="h-3 w-3 mr-1.5" />}
                       {task.status.replace("_", " ")}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                     <div className="flex flex-col gap-1.5 w-24">
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                           <div 
                              className={`h-full transition-all duration-500 ${getProgressColor(task.progress)}`}
                              style={{ width: `${task.progress}%` }}
                           />
                        </div>
                        <span className="text-[9px] font-black tracking-tighter text-muted-foreground/80 leading-none">
                           {task.progress}%
                        </span>
                     </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className={`font-black uppercase text-[9px] tracking-tighter ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 font-medium text-xs text-muted-foreground">
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
