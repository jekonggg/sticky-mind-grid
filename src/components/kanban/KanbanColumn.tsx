import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Input } from "@/components/ui/input";
import { Plus } from "@untitledui/icons";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";

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

  return (
    <div className={`flex flex-col w-full max-w-sm group/column density-kanban-column ${isCompact ? "min-w-[245px] sm:min-w-[250px]" : "min-w-[280px]"}`}>
      <div className={`flex items-center gap-2 px-1 ${isCompact ? "mb-2 h-8" : "mb-3 h-10"}`}>
        {!devSettings.disableEmojiCustomization && emoji && (
           <div className={`${isCompact ? "h-6 w-6 rounded-lg" : "h-8 w-8 rounded-xl"} bg-primary/5 border border-border/40 flex items-center justify-center shadow-sm shrink-0`}>
              <span className={`${isCompact ? "text-sm" : "text-base"} leading-none`}>{emoji}</span>
           </div>
        )}
        
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 py-0 px-2 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-primary ring-offset-0"
          />
        ) : (
          <h3 
            onClick={() => canRename && setIsEditing(true)}
            className={`text-sm font-bold text-foreground tracking-tight truncate flex-1 ${
              canRename ? "cursor-text hover:text-primary transition-colors" : "cursor-default"
            }`}
          >
            {title}
          </h3>
        )}

        <span className="text-[10px] font-black bg-secondary text-muted-foreground rounded-full px-2 py-0.5 min-w-[20px] text-center">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl transition-all duration-200 min-h-[100px] border border-transparent ${
          isCompact ? "p-1.5 space-y-1.5" : "p-2 space-y-2"
        } ${isOver ? "bg-primary/5 border-primary/20 ring-2 ring-primary/10" : "bg-muted/30"}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-[11px] font-medium text-muted-foreground/50 border border-dashed border-border/40 rounded-lg">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onClick={onTaskClick}
                isDragDisabled={isDragDisabled}
              />
            ))
          )}
        </SortableContext>

        {canCreateTask && onAddTask && (
          <button
            onClick={() => onAddTask(id)}
            className={`w-full flex items-center justify-center gap-1.5 ${
              isCompact ? "py-1.5 px-2 mt-0.5 text-xs" : "py-2 px-2 mt-1 text-xs"
            } font-semibold text-muted-foreground/80 hover:text-primary hover:bg-background/80 rounded-lg border border-dashed border-border/60 hover:border-primary/40 transition-all group cursor-pointer`}
            title={`Add task to ${title}`}
          >
            <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90 text-primary" />
            <span>Add Task</span>
          </button>
        )}
      </div>
    </div>
  );
}
