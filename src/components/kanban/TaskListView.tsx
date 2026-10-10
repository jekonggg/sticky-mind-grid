import { Task, Column } from "@/types/task";
import { getProgressColor } from "@/utils/taskUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  DotsHorizontal as MoreHorizontal,
  AlertCircle,
  Clock,
  CheckCircle as CheckCircle2,
  User01 as User,
  File06 as FileText,
} from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";

interface TaskListViewProps {
  tasks: Task[];
  columns?: Column[];
  selectedTaskId?: string | null;
  onTaskClick: (task: Task) => void;
}

export function TaskListView({ tasks, columns = [], selectedTaskId, onTaskClick }: TaskListViewProps) {
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isCompact = settings.uiDensity === "compact";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive border-destructive/20 bg-destructive/5";
      case "medium":
        return "text-blue-500 border-blue-500/20 bg-blue-500/5";
      case "low":
        return "text-slate-400 border-slate-400/20 bg-slate-400/5";
      default:
        return "";
    }
  };

  return (
    <div className={`${isCompact ? "p-3 md:p-4 space-y-3" : "p-6 md:p-8 space-y-6"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50">
              <TableHead className={`w-[28%] font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Task Name
              </TableHead>
              <TableHead className={`font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Status
              </TableHead>
              <TableHead className={`font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Assignee
              </TableHead>
              <TableHead className={`font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Progress
              </TableHead>
              <TableHead className={`font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Priority
              </TableHead>
              <TableHead className={`font-black uppercase ${isCompact ? "py-2 px-3 text-[9px]" : "py-4 px-4 text-[10px]"} tracking-widest`}>
                Due Date
              </TableHead>
              <TableHead className={`text-right ${isCompact ? "py-2 px-3" : "py-4 px-4"}`}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className={`${isCompact ? "h-20" : "h-32"} text-center text-muted-foreground italic`}>
                  No tasks found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const assigneeName = task.assignee?.fullName || task.assignee?.email;
                const assigneeInitial = (
                  task.assignee?.fullName ||
                  task.assignee?.email ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase();

                const isSelected = selectedTaskId === task.id;

                return (
                  <TableRow
                    key={task.id}
                    className={`group cursor-pointer transition-colors border-border/50 ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15 font-semibold"
                        : "hover:bg-muted/40"
                    }`}
                    onClick={() => onTaskClick(task)}
                  >
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      <div className={`flex items-center ${!devSettings.disableEmojiCustomization ? (isCompact ? "gap-2" : "gap-3") : ""}`}>
                        {/* Uniform leading icon container: hidden completely when Clean UI is active */}
                        {!devSettings.disableEmojiCustomization && (
                          <div className={`${isCompact ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-lg"} flex items-center justify-center shrink-0 border transition-all duration-200 select-none bg-muted/20 border-border/40 group-hover:border-primary/30 group-hover:bg-primary/5`}>
                            {task.emoji ? (
                              <span className={`${isCompact ? "text-sm" : "text-base"} leading-none`}>{task.emoji}</span>
                            ) : (
                              <FileText className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} text-muted-foreground/60 group-hover:text-primary transition-colors`} />
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={`font-bold text-foreground ${isCompact ? "text-xs" : "text-sm"} group-hover:text-primary transition-colors truncate`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 italic">
                              {task.description}
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {task.tags.map((t) => (
                                <span
                                  key={t.id}
                                  style={{ backgroundColor: `${t.color}20`, color: t.color, borderColor: `${t.color}40` }}
                                  className={`font-bold rounded-full border shadow-2xs ${isCompact ? "text-[8px] px-1 py-0.1" : "text-[9px] px-1.5 py-0.2"}`}
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      {(() => {
                        const column = columns.find((c) => c.id === task.status);
                        const statusTitle = column?.title || task.status.replace(/_/g, " ");
                        const statusEmoji = column?.emoji;
                        const statusColor = column?.color;

                        return (
                          <div className={`flex items-center gap-1.5 ${isCompact ? "text-[11px]" : "text-xs"} font-bold text-foreground`}>
                            {statusEmoji ? (
                              <span className={`${isCompact ? "text-xs" : "text-sm"} shrink-0 leading-none`}>{statusEmoji}</span>
                            ) : (
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                style={{ backgroundColor: statusColor || "var(--primary)" }}
                              />
                            )}
                            <span className="truncate">{statusTitle}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className={`${isCompact ? "h-5 w-5" : "h-6 w-6"} border border-primary/20`}>
                            <AvatarImage src={task.assignee.avatarUrl} alt={assigneeName} />
                            <AvatarFallback className={`font-bold bg-primary/10 text-primary ${isCompact ? "text-[8px]" : "text-[10px]"}`}>
                              {assigneeInitial}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`${isCompact ? "text-[11px]" : "text-xs"} font-semibold text-foreground truncate max-w-[120px]`}>
                            {assigneeName}
                          </span>
                        </div>
                      ) : (
                        <span className={`${isCompact ? "text-[11px]" : "text-xs"} text-muted-foreground italic flex items-center gap-1.5 opacity-60`}>
                          <User className="h-3 w-3" /> Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      <div className={`flex flex-col gap-1 ${isCompact ? "w-20" : "w-24"}`}>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getProgressColor(
                              task.progress
                            )}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground/80 font-bold">
                          <span>{task.progress}%</span>
                          {task.checklist && task.checklist.length > 0 && (
                            <span>
                              {task.checklist.filter((i) => i.completed).length}/{task.checklist.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      <Badge
                        variant="outline"
                        className={`font-black uppercase text-[9px] tracking-tighter ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"} font-medium ${isCompact ? "text-[11px]" : "text-xs"} text-muted-foreground`}>
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                    </TableCell>
                    <TableCell className={`text-right ${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${isCompact ? "h-7 w-7" : "h-8 w-8"} opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
