import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Input } from "@/components/ui/input";
import { Plus, DotsGrid as GripVertical } from "@untitledui/icons";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getContainerGeometry } from "@/utils/geometryUtils";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  emoji?: string;
  tasks: Task[];
  canRename?: boolean;
  canCreateTask?: boolean;
  isDragDisabled?: boolean;
  selectedTaskId?: string | null;
  onTaskClick: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onRename?: (id: string, newTitle: string, emoji?: string) => void;
}

// Map column status to indicator color
function getStatusIndicatorColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("backlog") || normalized.includes("todo") || normalized.includes("not assigned") || normalized === "todo") {
    return "bg-rose-500";
  }
  if (normalized.includes("progress") || normalized.includes("doing") || normalized.includes("assigned") || normalized === "in_progress") {
    return "bg-teal-500";
  }
  if (normalized.includes("review") || normalized.includes("awaiting") || normalized.includes("test") || normalized === "in_review") {
    return "bg-amber-500";
  }
  if (normalized.includes("done") || normalized.includes("complete") || normalized.includes("closed") || normalized === "completed") {
    return "bg-emerald-500";
  }
  return "bg-primary";
}

export function KanbanColumn({
  id,
  title,
  emoji,
  tasks,
  canRename = true,
  canCreateTask = false,
  isDragDisabled = false,
  selectedTaskId,
  onTaskClick,
  onAddTask,
  onRename,
}: KanbanColumnProps) {
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isCompact = settings.uiDensity === "compact";
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(id, trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  const statusColor = getStatusIndicatorColor(id || title);
  const geom = getContainerGeometry(
    isCompact,
    devSettings.customPadding,
    devSettings.customInnerRadius,
    devSettings.customOuterRadius
  );

  return (
    <div
      style={geom.isCustom ? { borderRadius: `${geom.outerRadius}px` } : undefined}
      className={`flex flex-col w-full max-w-sm group/column density-kanban-column ${
        isCompact ? "rounded-[18px]" : "rounded-[24px]"
      } border transition-all duration-200 overflow-hidden h-full max-h-full ${
        isCompact ? "min-w-[250px] sm:min-w-[260px]" : "min-w-[290px] sm:min-w-[315px]"
      } ${
        isOver
          ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-md"
          : "bg-slate-100/75 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 shadow-xs"
      }`}
    >
      {/* Pod Column Header */}
      <div
        className={`flex items-center justify-between gap-2 border-b border-border/40 shrink-0 ${
          isCompact ? "px-2.5 py-1.5 h-8" : "px-3 py-2 h-10"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Status Circle Indicator */}
          <span
            className={`h-3 w-3 rounded-full shrink-0 ${statusColor} shadow-2xs`}
            aria-hidden="true"
          />

          {!devSettings.disableEmojiCustomization && emoji && (
            <span className={`${isCompact ? "text-xs" : "text-sm"} leading-none shrink-0`}>
              {emoji}
            </span>
          )}

          {isEditing ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-6 py-0 px-1.5 text-xs font-bold focus-visible:ring-1 focus-visible:ring-primary ring-offset-0"
            />
          ) : (
            <h3
              onClick={() => canRename && setIsEditing(true)}
              className={`text-sm font-bold text-foreground tracking-tight truncate ${
                canRename ? "cursor-text hover:text-primary transition-colors" : "cursor-default"
              }`}
              title={canRename ? "Click to rename stage" : title}
            >
              {title}
            </h3>
          )}

          {/* Item Count Pill Badge */}
          <span className="text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5 min-w-[20px] text-center shrink-0">
            {tasks.length}
          </span>
        </div>

        {/* Right Actions Cluster: Add Task + Options Handle */}
        <div className="flex items-center gap-0.5 shrink-0">
          {canCreateTask && onAddTask && (
            <button
              onClick={() => onAddTask(id)}
              className="h-6 w-6 rounded-md hover:bg-background/80 hover:text-primary transition-colors flex items-center justify-center text-muted-foreground cursor-pointer"
              title={`Add task to ${title}`}
              aria-label={`Add task to ${title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          <div
            className="h-6 w-6 rounded-md hover:bg-background/80 transition-colors flex items-center justify-center text-muted-foreground/50 hover:text-foreground cursor-default"
            title="Stage column"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Pod Tasks Drop Area with Internal Scrolling */}
      <div
        ref={setNodeRef}
        style={
          geom.isCustom
            ? {
                padding: `${geom.padding}px`,
                gap: `${geom.padding}px`,
              }
            : undefined
        }
        className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col ${
          isCompact ? "p-2 gap-2" : "p-3 gap-3"
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div
              style={geom.isCustom ? { borderRadius: `${geom.innerRadius}px` } : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[140px] text-xs font-medium text-muted-foreground/60 ${
                isCompact ? "rounded-[10px]" : "rounded-xl"
              } border border-dashed border-border/50 bg-dot-pattern`}
            >
              <span>No tasks in this stage</span>
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onClick={onTaskClick}
                  isDragDisabled={isDragDisabled}
                />
              ))}
              {/* Subtle ambient bottom dot pattern extending to the bottom of the pod */}
              <div
                style={geom.isCustom ? { borderRadius: `${geom.innerRadius}px` } : undefined}
                className={`flex-1 min-h-[32px] bg-dot-pattern ${
                  isCompact ? "rounded-[10px]" : "rounded-xl"
                } opacity-30 mt-auto`}
              />
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

