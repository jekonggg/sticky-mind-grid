import React, { useState, useContext } from "react";
import { Priority, Column, Tag, ChecklistItem } from "@/types/task";
import { BoardMember } from "@/types/board";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  User01 as User,
  AlertCircle,
  Clock,
  Tag01 as TagIcon,
  Sliders01 as Sliders,
  Plus,
  XClose as X,
  Check,
  CheckSquare as ListTodo,
} from "@untitledui/icons";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";
import { parseSafeDate, formatSafe } from "@/utils/dateUtils";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { toast } from "sonner";
import { AuthContext } from "@/contexts/AuthContext";
import { useBoardLabels } from "@/hooks/useBoardLabels";
import { normalizeTagName, deduplicateTags } from "@/utils/boardLabels";
import { getTaskProgressInfo } from "@/utils/taskUtils";
import { cn } from "@/lib/utils";

interface TaskPropertiesProps {
  boardId?: string;
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
  creator?: { id?: string; fullName?: string; email?: string; avatarUrl?: string } | null;
  createdBy?: string;
  readOnly?: boolean;
  isStatusHighlighted?: boolean;
  checklist?: ChecklistItem[];
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
  boardId,
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
  creator,
  createdBy,
  readOnly,
  isStatusHighlighted = false,
  checklist,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDueDateChange,
  onProgressChange,
  onTagsChange,
}: TaskPropertiesProps) {
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;
  const hasChecklist = Boolean(checklist && checklist.length > 0);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0]);
  const { boardLabels, addLabel } = useBoardLabels(boardId);

  const handleAddTag = (tagToAdd?: Tag) => {
    if (readOnly) return;
    if (tagToAdd) {
      const normToAdd = normalizeTagName(tagToAdd.name);
      if (tags.some((t) => normalizeTagName(t.name) === normToAdd)) {
        onTagsChange(tags.filter((t) => normalizeTagName(t.name) !== normToAdd));
        return;
      }
      const updated = deduplicateTags([...tags, tagToAdd]);
      onTagsChange(updated);
      if (boardId) addLabel(tagToAdd);
      return;
    }

    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const norm = normalizeTagName(trimmed);

    if (tags.some((t) => normalizeTagName(t.name) === norm)) {
      toast.info(`"${trimmed}" is already added to this card`);
      setNewTagName("");
      setIsAddingTag(false);
      return;
    }

    const existingBoardLabel = boardLabels.find((t) => normalizeTagName(t.name) === norm);
    const newTag: Tag = existingBoardLabel || {
      id: `tag-${Date.now()}`,
      name: trimmed,
      color: selectedTagColor,
    };

    const updated = deduplicateTags([...tags, newTag]);
    onTagsChange(updated);
    if (boardId) addLabel(newTag);
    setNewTagName("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagIdOrName: string) => {
    if (readOnly) return;
    const norm = normalizeTagName(tagIdOrName);
    onTagsChange(tags.filter((t) => t.id !== tagIdOrName && normalizeTagName(t.name) !== norm));
  };

  const getDueStatus = (dateStr: string) => {
    const d = parseSafeDate(dateStr);
    if (!d) return "none";
    if (isPast(d) && !isToday(d)) return "overdue";
    if (isToday(d)) return "today";
    return "upcoming";
  };

  const assignedMember = members.find((m) => m.userId === assignedTo);
  const currentColumn = columns.find((c) => c.id === status);
  const assignableMembers = members.filter(
    (m) =>
      (!m.status || m.status === "accepted") &&
      ["owner", "admin", "editor", "member"].includes(m.role)
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 py-5 border-b border-border/40 space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
        {/* Status Property */}
        <div
          data-testid={isStatusHighlighted ? "task-status-live-highlight" : undefined}
          className={`flex items-center gap-2.5 min-w-0 ${
            isStatusHighlighted
              ? "ring-2 ring-primary/50 bg-primary/10 rounded-lg px-2 py-1 -mx-2 transition-all duration-500 animate-pulse"
              : ""
          }`}
        >
          <div data-coach-target="status-done" className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Status</span>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {readOnly ? (
              <Badge variant="outline" className="font-bold text-xs capitalize gap-1.5 py-1 px-2.5 bg-card/60 border-border/60 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentColumn?.color || "var(--primary)" }} />
                <span className="truncate">{currentColumn?.title || status}</span>
              </Badge>
            ) : (
              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger
                  aria-label="Status"
                  className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs"
                >
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        {col.color && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                        )}
                        <span>{col.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isStatusHighlighted && (
              <span className="text-[10px] font-bold text-primary animate-in fade-in shrink-0">
                Moved live
              </span>
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
                  priority === "urgent" || priority === "high"
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                    : priority === "medium"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  priority === "urgent" || priority === "high"
                    ? "bg-red-500"
                    : priority === "medium"
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`} />
                <span>{priority === "urgent" ? "high" : priority}</span>
              </Badge>
            ) : (
              <Select
                value={priority === "urgent" ? "high" : priority}
                onValueChange={(v) => onPriorityChange(v as Priority)}
              >
                <SelectTrigger
                  aria-label="Priority"
                  className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
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
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span>High</span>
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
            {readOnly ? (() => {
              const isAssignedCurrentUser = assignedMember?.userId === currentUser?.id;
              const assignedAvatarUrl = isAssignedCurrentUser
                ? (currentUser?.avatarUrl ?? assignedMember?.user?.avatarUrl)
                : assignedMember?.user?.avatarUrl;

              return (
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 border border-border/50 shrink-0">
                    <AvatarImage src={assignedAvatarUrl} alt={assignedMember?.user?.fullName || "User"} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {(assignedMember?.user?.fullName || assignedMember?.user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground font-medium truncate">
                    {assignedMember ? (assignedMember.user?.fullName || assignedMember.user?.email) : "Unassigned"}
                  </span>
                </div>
              );
            })() : (
              <Select value={assignedTo || "unassigned"} onValueChange={onAssigneeChange}>
                <SelectTrigger className="h-8 text-xs font-medium border-border/60 bg-card/60 hover:bg-muted/50 transition-colors w-full shadow-2xs">
                  <SelectValue placeholder="Assign member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs text-muted-foreground">
                    Unassigned
                  </SelectItem>
                  {assignableMembers.map((m) => {
                    const name = m.user?.fullName || m.user?.email || "User";
                    const initial = name.charAt(0).toUpperCase();
                    const isMemberCurrentUser = m.userId === currentUser?.id;
                    const memberAvatarUrl = isMemberCurrentUser
                      ? (currentUser?.avatarUrl ?? m.user?.avatarUrl)
                      : m.user?.avatarUrl;

                    return (
                      <SelectItem key={m.userId} value={m.userId} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4 shrink-0">
                            <AvatarImage src={memberAvatarUrl} alt={name} />
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
                <DateTimePicker
                  id="task-property-due-date"
                  value={dueDate}
                  disabled={readOnly}
                  readOnly={readOnly}
                  onChange={onDueDateChange}
                  size="sm"
                  ariaLabel="Due Date"
                />
              </div>
            </div>
          );
        })()}

        {/* Progress Property (Auto-Computed from Checklist or Column Stage) */}
        {(() => {
          const progressInfo = getTaskProgressInfo({ checklist, status, progress }, status, columns);
          const displayProgress = progressInfo.progress;

          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
                <Sliders className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Progress</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 w-full">
                  <div className="flex-1 h-2 bg-muted/80 rounded-full overflow-hidden border border-border/40">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        displayProgress === 100
                          ? "bg-emerald-500"
                          : displayProgress > 0
                          ? "bg-primary"
                          : "bg-muted"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground min-w-[34px] shrink-0">
                    {displayProgress}%
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-semibold border shrink-0 hidden sm:inline-block truncate max-w-[140px]",
                      progressInfo.mode === "complete"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : progressInfo.mode === "checklist"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border/50"
                    )}
                    title={progressInfo.label}
                  >
                    {progressInfo.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Created Property */}
        {(creator || createdAt) && (() => {
          const isCreatorCurrentUser =
            creator?.id === currentUser?.id ||
            (currentUser?.email && creator?.email === currentUser.email) ||
            createdBy === currentUser?.id;
          const creatorAvatarUrl = isCreatorCurrentUser
            ? (currentUser?.avatarUrl ?? creator?.avatarUrl)
            : creator?.avatarUrl;
          const creatorName = isCreatorCurrentUser
            ? (currentUser?.fullName || currentUser?.email || "You")
            : (creator?.fullName || creator?.email || "Former member");
          const creatorInitial = (creatorName || "U").charAt(0).toUpperCase();
          const safeCreated = parseSafeDate(createdAt);

          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Created</span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 text-xs text-muted-foreground font-medium truncate">
                <Avatar className="h-5 w-5 border border-border/50 shrink-0">
                  <AvatarImage src={creatorAvatarUrl} alt={creatorName} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {creatorInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-medium truncate">
                  {creatorName}
                </span>
                {safeCreated && (
                  <span className="text-muted-foreground truncate" title={formatSafe(safeCreated, "PPpp")}>
                    • {formatSafe(safeCreated, "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Timestamps */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Updated</span>
          </div>
          <div className="flex-1 min-w-0 text-xs text-muted-foreground font-medium truncate">
            {(() => {
              const safeUpdated = parseSafeDate(updatedAt);
              if (!safeUpdated) return "—";
              return (
                <span title={formatSafe(safeUpdated, "PPpp")}>
                  {formatDistanceToNow(safeUpdated, { addSuffix: true })}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Labels Row */}
      <div className="pt-3 border-t border-border/30 flex items-start gap-2.5">
        <div className="w-[84px] sm:w-[90px] flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 pt-1 select-none">
          <TagIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Labels</span>
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
                  title="Remove label"
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
                  placeholder="Label name"
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
                <span>Add Label</span>
              </Button>
            )
          )}

          {/* Available Board Labels Quick-Pick */}
          {boardLabels.length > 0 && !readOnly && (
            <div className="w-full pt-1.5 mt-1 border-t border-border/20">
              <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                Available board labels (click to toggle):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {boardLabels.map((bl) => {
                  const isSelected = tags.some(
                    (t) => normalizeTagName(t.name) === normalizeTagName(bl.name)
                  );
                  return (
                    <button
                      key={bl.id || bl.name}
                      type="button"
                      onClick={() => handleAddTag(bl)}
                      style={{
                        backgroundColor: isSelected ? `${bl.color}25` : "transparent",
                        borderColor: isSelected ? bl.color : `${bl.color}45`,
                        color: isSelected ? bl.color : "inherit",
                      }}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer hover:scale-105 border ${
                        isSelected
                          ? "font-bold ring-1 shadow-xs"
                          : "opacity-75 hover:opacity-100 bg-background/50"
                      }`}
                      title={isSelected ? `Remove "${bl.name}"` : `Add "${bl.name}" to task`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: bl.color }}
                      />
                      <span>{bl.name}</span>
                      {isSelected ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3 opacity-60" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
