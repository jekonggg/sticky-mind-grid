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
import { formatSafe } from "@/utils/dateUtils";
import {
  DotsHorizontal as MoreHorizontal,
  AlertCircle,
  Clock,
  CheckCircle as CheckCircle2,
  User01 as User,
  File06 as FileText,
} from "@untitledui/icons";
import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AuthContext } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskListViewProps {
  tasks: Task[];
  columns?: Column[];
  selectedTaskId?: string | null;
  onTaskClick: (task: Task) => void;
}

export function TaskListView({ tasks, columns = [], selectedTaskId, onTaskClick }: TaskListViewProps) {
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isCompact = settings.uiDensity === "compact";
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <div
        data-testid="task-list-mobile-view"
        className={`${isCompact ? "p-3 space-y-3" : "p-4 space-y-4"} animate-in fade-in slide-in-from-bottom-4 duration-500`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="task-list-mobile-grid">
          {tasks.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-card/50 border border-border/50 p-6 text-muted-foreground italic col-span-full">
              No tasks found matching your criteria
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const column = columns.find((c) => c.id === task.status);
              const statusTitle = column?.title || task.status.replace(/_/g, " ");
              const statusEmoji = column?.emoji;
              const statusColor = column?.color;
              const isDone = task.status === "done" || task.progress === 100;
              const now = new Date();
              const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < now;

              const assigneeName = task.assignee?.fullName || task.assignee?.email;
              const assigneeInitial = (assigneeName || "U").charAt(0).toUpperCase();

              const isCurrentUser =
                task.assignee?.id === currentUser?.id ||
                (currentUser?.email && task.assignee?.email === currentUser.email);
              const assigneeAvatarUrl = isCurrentUser
                ? (currentUser?.avatarUrl ?? task.assignee?.avatarUrl)
                : task.assignee?.avatarUrl;

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`${isCompact ? "p-3.5 rounded-xl gap-2.5" : "p-4 rounded-xl gap-3"} bg-card border shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? "border-primary/60 ring-2 ring-primary/20"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Status & Priority Badge Header */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 bg-muted/50 border-border/60 inline-flex items-center gap-1.5 font-bold"
                      >
                        {!devSettings.disableEmojiCustomization && statusEmoji ? (
                          <span className="text-xs leading-none shrink-0">{statusEmoji}</span>
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: statusColor || "var(--primary)" }}
                          />
                        )}
                        <span className="truncate">{statusTitle}</span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`font-black uppercase text-[9px] tracking-tighter px-1.5 py-0 ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority || "none"}
                      </Badge>
                    </div>

                    {/* Task Title & Emoji */}
                    <div className="flex items-start gap-2.5">
                      {!devSettings.disableEmojiCustomization && (
                        <div className={`${isCompact ? "h-6 w-6 rounded-md" : "h-7 w-7 rounded-lg"} flex items-center justify-center shrink-0 border transition-all duration-200 select-none bg-muted/20 border-border/40 group-hover:border-primary/30 group-hover:bg-primary/5 mt-0.5`}>
                          {task.emoji ? (
                            <span className={`${isCompact ? "text-sm" : "text-base"} leading-none`}>{task.emoji}</span>
                          ) : (
                            <FileText className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} text-muted-foreground/60 group-hover:text-primary transition-colors`} />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-sm font-bold truncate ${
                            isDone
                              ? "line-through text-muted-foreground"
                              : "text-foreground group-hover:text-primary transition-colors"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground whitespace-normal break-words line-clamp-3 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((t) => (
                          <span
                            key={t.id}
                            style={{ backgroundColor: `${t.color}20`, color: t.color, borderColor: `${t.color}40` }}
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-full border truncate max-w-[100px]"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar */}
                    {task.progress !== undefined && task.progress > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${getProgressColor(task.progress)}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: Assignee & Due Date */}
                  <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5 border border-primary/20">
                          <AvatarImage src={assigneeAvatarUrl} alt={assigneeName} />
                          <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                            {assigneeInitial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-medium text-foreground truncate max-w-[120px]">
                          {assigneeName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
                        <User className="h-3 w-3" /> Unassigned
                      </span>
                    )}

                    {task.dueDate ? (
                      <span
                        className={`text-[11px] font-semibold flex items-center gap-1 ${
                          isOverdue ? "text-rose-500 font-bold" : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {formatSafe(task.dueDate, "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40 italic">
                        No due date
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

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
                      <div className={`flex items-start ${!devSettings.disableEmojiCustomization ? (isCompact ? "gap-2" : "gap-3") : ""}`}>
                        {/* Uniform leading icon container: hidden completely when Clean UI is active */}
                        {!devSettings.disableEmojiCustomization && (
                          <div className={`${isCompact ? "h-6 w-6 rounded-md mt-0.5" : "h-7 w-7 rounded-lg mt-0.5"} flex items-center justify-center shrink-0 border transition-all duration-200 select-none bg-muted/20 border-border/40 group-hover:border-primary/30 group-hover:bg-primary/5`}>
                            {task.emoji ? (
                              <span className={`${isCompact ? "text-sm" : "text-base"} leading-none`}>{task.emoji}</span>
                            ) : (
                              <FileText className={`${isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} text-muted-foreground/60 group-hover:text-primary transition-colors`} />
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className={`font-bold text-foreground ${isCompact ? "text-xs" : "text-sm"} group-hover:text-primary transition-colors truncate`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span
                              className="text-[11px] text-muted-foreground whitespace-normal break-words line-clamp-3 italic leading-relaxed"
                              title={task.description}
                            >
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
                            {!devSettings.disableEmojiCustomization && statusEmoji ? (
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
                      {task.assignee ? (() => {
                        const isCurrentUser =
                          task.assignee.id === currentUser?.id ||
                          (currentUser?.email && task.assignee.email === currentUser.email);
                        const assigneeAvatarUrl = isCurrentUser
                          ? (currentUser?.avatarUrl ?? task.assignee.avatarUrl)
                          : task.assignee.avatarUrl;

                        return (
                          <div className="flex items-center gap-1.5">
                            <Avatar className={`${isCompact ? "h-5 w-5" : "h-6 w-6"} border border-primary/20`}>
                              <AvatarImage src={assigneeAvatarUrl} alt={assigneeName} />
                              <AvatarFallback className={`font-bold bg-primary/10 text-primary ${isCompact ? "text-[8px]" : "text-[10px]"}`}>
                                {assigneeInitial}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`${isCompact ? "text-[11px]" : "text-xs"} font-semibold text-foreground truncate max-w-[120px]`}>
                              {assigneeName}
                            </span>
                          </div>
                        );
                      })() : (
                        <span className={`${isCompact ? "text-[11px]" : "text-xs"} text-muted-foreground italic flex items-center gap-1.5 opacity-60`}>
                          <User className="h-3 w-3" /> Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`${isCompact ? "py-2 px-3" : "py-4 px-4"}`}>
                      {(() => {
                        const workflowCols = columns.filter((c) => c.id !== "archive");
                        const isFirstCol = task.status === workflowCols[0]?.id;
                        const isLastCol = task.status === workflowCols[workflowCols.length - 1]?.id || task.status === "done";
                        if (isFirstCol || isLastCol) {
                          return (
                            <span className="text-[11px] text-muted-foreground/60 italic font-medium">
                              {task.progress === 100 ? "Complete" : "Not started"}
                            </span>
                          );
                        }
                        return (
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
                        );
                      })()}
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
                      {formatSafe(task.dueDate, "MMM d, yyyy", "No due date")}
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
