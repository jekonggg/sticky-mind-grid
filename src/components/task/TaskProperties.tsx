import React, { useState } from "react";
import { Priority, Column, Tag } from "@/types/task";
import { BoardMember } from "@/types/board";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  User,
  AlertCircle,
  Clock,
  Tag as TagIcon,
  Sliders,
  Plus,
  X,
  Check,
  ListTodo,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

interface TaskPropertiesProps {
  status: string;
  columns: Column[];
  priority: Priority;
  assignedTo: string;
  members: BoardMember[];
  dueDate: string;
  progress: number;
  tags: Tag[];
  createdAt?: Date;
  updatedAt?: Date;
  readOnly?: boolean;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: Priority) => void;
  onAssigneeChange: (userId: string) => void;
  onDueDateChange: (date: string) => void;
  onProgressChange: (progress: number) => void;
  onTagsChange: (tags: Tag[]) => void;
}

const TAG_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ec4899", // Pink
];

export function TaskProperties({
  status,
  columns,
  priority,
  assignedTo,
  members,
  dueDate,
  progress = 0,
  tags,
  createdAt,
  updatedAt,
  readOnly,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onProgressChange,
  onTagsChange,
}: TaskPropertiesProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0]);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: selectedTagColor,
    };
    onTagsChange([...tags, newTag]);
    setNewTagName("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(tags.filter((t) => t.id !== tagId));
  };

  const getDueStatus = (dateStr: string) => {
    if (!dateStr) return "none";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "none";
    if (isPast(d) && !isToday(d)) return "overdue";
    if (isToday(d)) return "today";
    return "upcoming";
  };

  const assignedMember = members.find((m) => m.userId === assignedTo);
  const currentColumn = columns.find((c) => c.id === status);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 py-5 border-b border-border/40 space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
        {/* Status Property */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Status</span>
          </div>
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <Badge variant="outline" className="font-bold text-xs capitalize gap-1.5 py-1 px-2.5 bg-card/60 border-border/60 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn?.color || "var(--primary)" }} />
                <span className="truncate">{currentColumn?.title || status}</span>
              </Badge>
            ) : (
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color || "var(--primary)" }} />
                        <span>{col.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Priority Property */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Priority</span>
          </div>
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <Badge
                variant="outline"
                className={`capitalize text-xs font-bold gap-1.5 py-1 px-2.5 ${
                  priority === "urgent"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    : priority === "high"
                    ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                    : priority === "medium"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-slate-500/10 text-slate-600 border-slate-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  priority === "urgent"
                    ? "bg-rose-500"
                    : priority === "high"
                    ? "bg-orange-500"
                    : priority === "medium"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`} />
                <span>{priority}</span>
              </Badge>
            ) : (
              <Select value={priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      <span>Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <span>High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-semibold text-rose-500">Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Assignee Property */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Assignee</span>
          </div>
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5 border border-border/50 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {(assignedMember?.user?.fullName || assignedMember?.user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground font-medium truncate">
                  {assignedMember ? (assignedMember.user?.fullName || assignedMember.user?.email) : "Unassigned"}
                </span>
              </div>
            ) : (
              <Select value={assignedTo || "unassigned"} onValueChange={onAssigneeChange}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs">
                  <SelectValue placeholder="Assign member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                    Unassigned
                  </SelectItem>
                  {members.map((m) => {
                    const name = m.user?.fullName || m.user?.email || "User";
                    const initial = name.charAt(0).toUpperCase();
                    return (
                      <SelectItem key={m.userId} value={m.userId} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4 shrink-0">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Due Date Property */}
        {(() => {
          const dueStatus = getDueStatus(dueDate);
          const isOverdue = dueStatus === "overdue";
          const isTodayDue = dueStatus === "today";

          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
                <Calendar
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isOverdue
                      ? "text-rose-500"
                      : isTodayDue
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                />
                <span className={isOverdue ? "text-rose-500 font-bold" : isTodayDue ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                  Due Date
                </span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {readOnly ? (
                  <span
                    className={`text-xs truncate font-medium ${
                      isOverdue
                        ? "text-rose-600 dark:text-rose-400 font-bold"
                        : isTodayDue
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "text-foreground"
                    }`}
                    title={isOverdue ? "Overdue" : isTodayDue ? "Due Today" : undefined}
                  >
                    {dueDate ? format(new Date(dueDate), "MMM d, yyyy h:mm a") : "No due date"}
                  </span>
                ) : (
                  <Input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => onDueDateChange(e.target.value)}
                    title={isOverdue ? "Overdue" : isTodayDue ? "Due Today" : undefined}
                    className={`h-8 text-xs w-full min-w-0 shadow-2xs px-2 transition-colors ${
                      isOverdue
                        ? "border-rose-500/60 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold focus-visible:ring-rose-500"
                        : isTodayDue
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold focus-visible:ring-amber-500"
                        : "border-border/60 bg-card/60 text-foreground"
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* Progress Property */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <Sliders className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Progress</span>
          </div>
          <div className="flex-1 min-w-0">
            {readOnly ? (
              <div className="flex items-center gap-2.5 w-full">
                <div className="flex-1 h-2 bg-muted/80 rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground min-w-[32px] shrink-0">
                  {progress}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 w-full">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => onProgressChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary min-w-0"
                />
                <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md min-w-[38px] text-center shrink-0">
                  {progress}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Updated</span>
          </div>
          <div className="flex-1 min-w-0 text-xs text-muted-foreground font-medium truncate">
            {updatedAt ? (
              <span title={format(new Date(updatedAt), "PPpp")}>
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </span>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      {/* Tags / Labels Row */}
      <div className="pt-3 border-t border-border/30 flex items-start gap-2.5">
        <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 pt-1 select-none">
          <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Tags</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                backgroundColor: `${tag.color}20`,
                borderColor: `${tag.color}50`,
                color: tag.color,
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs"
            >
              <span>{tag.name}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:opacity-75 transition-opacity cursor-pointer ml-0.5"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}

          {!readOnly && (
            isAddingTag ? (
              <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1 shadow-sm">
                <input
                  type="text"
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") setIsAddingTag(false);
                  }}
                  autoFocus
                  className="h-6 w-24 text-xs bg-transparent border-none outline-none px-1"
                />
                <div className="flex items-center gap-1">
                  {TAG_COLORS.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedTagColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
                        selectedTagColor === color ? "scale-125 ring-1 ring-offset-1 ring-primary" : "opacity-70"
                      }`}
                    />
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={handleAddTag} className="h-6 w-6 p-0 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingTag(false)} className="h-6 w-6 p-0 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingTag(true)}
                className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 border-dashed border-border/80 shadow-2xs"
              >
                <Plus className="h-3 w-3" />
                <span>Add Tag</span>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
