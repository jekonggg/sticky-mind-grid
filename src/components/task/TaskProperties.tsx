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
  Sparkles,
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
  progress,
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

  const formatDueBadge = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    if (isPast(d) && !isToday(d)) {
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>;
    }
    if (isToday(d)) {
      return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0">Due Today</Badge>;
    }
    if (isTomorrow(d)) {
      return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">Tomorrow</Badge>;
    }
    return null;
  };

  const assignedMember = members.find((m) => m.userId === assignedTo);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        {/* Status Property */}
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-primary/70" />
            <span>Status</span>
          </div>
          <div className="flex-1">
            {readOnly ? (
              <Badge variant="outline" className="font-semibold text-xs capitalize">
                {columns.find((c) => c.id === status)?.title || status}
              </Badge>
            ) : (
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-background/50 hover:bg-muted/40 transition-colors w-full sm:w-[220px]">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color || "var(--primary)" }} />
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
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Priority</span>
          </div>
          <div className="flex-1">
            {readOnly ? (
              <Badge
                variant="outline"
                className={`capitalize text-xs font-bold ${
                  priority === "urgent"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    : priority === "high"
                    ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                    : priority === "medium"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-slate-500/10 text-slate-600 border-slate-500/30"
                }`}
              >
                {priority}
              </Badge>
            ) : (
              <Select value={priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-background/50 hover:bg-muted/40 transition-colors w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-semibold text-rose-500">Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Assignee Property */}
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Assignee</span>
          </div>
          <div className="flex-1">
            {readOnly ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {(assignedMember?.user?.fullName || assignedMember?.user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground font-medium">
                  {assignedMember ? (assignedMember.user?.fullName || assignedMember.user?.email) : "Unassigned"}
                </span>
              </div>
            ) : (
              <Select value={assignedTo} onValueChange={onAssigneeChange}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-background/50 hover:bg-muted/40 transition-colors w-full sm:w-[220px]">
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
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <span>{name}</span>
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
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Due Date</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            {readOnly ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground font-medium">
                  {dueDate ? format(new Date(dueDate), "MMM d, yyyy h:mm a") : "No due date"}
                </span>
                {formatDueBadge(dueDate)}
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => onDueDateChange(e.target.value)}
                  className="h-8 text-xs border-border/60 bg-background/50 w-full sm:w-[220px]"
                />
                {dueDate && (
                  <button
                    onClick={() => onDueDateChange("")}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Clear due date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {formatDueBadge(dueDate)}
              </div>
            )}
          </div>
        </div>

        {/* Progress Slider Property */}
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Progress</span>
          </div>
          <div className="flex-1 flex items-center gap-3 w-full sm:max-w-xs">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              disabled={readOnly}
              value={progress}
              onChange={(e) => onProgressChange(Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-xs font-bold text-foreground w-10 shrink-0 text-right">
              {progress}%
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex items-center gap-4">
          <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Updated</span>
          </div>
          <div className="flex-1 text-xs text-muted-foreground">
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
      <div className="mt-4 pt-4 border-t border-border/30 flex items-start gap-4">
        <div className="w-28 flex items-center gap-2 text-muted-foreground text-xs font-semibold shrink-0 pt-1">
          <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Tags</span>
        </div>
        <div className="flex-1 flex flex-wrap items-center gap-1.5">
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
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:opacity-75 transition-opacity"
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
                      className={`w-3.5 h-3.5 rounded-full transition-transform ${
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
                className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground gap-1 border-dashed border-border/80"
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
