import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Input } from "@/components/ui/input";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  emoji?: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onRename?: (id: string, newTitle: string, emoji?: string) => void;
}

export function KanbanColumn({ id, title, emoji, tasks, onTaskClick, onRename }: KanbanColumnProps) {
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
    <div className="flex flex-col min-w-[280px] w-full max-w-sm group/column">
      <div className="flex items-center gap-2.5 px-1 mb-3 h-10">
        {emoji && (
           <div className="h-8 w-8 bg-primary/5 border border-border/40 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-base leading-none">{emoji}</span>
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
            onClick={() => setIsEditing(true)}
            className="text-sm font-bold text-foreground tracking-tight cursor-text hover:text-primary transition-colors truncate flex-1"
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
        className={`flex-1 rounded-xl p-2 space-y-2 transition-all duration-200 min-h-[120px] border border-transparent
          ${isOver ? "bg-primary/5 border-primary/20 ring-2 ring-primary/10" : "bg-muted/30"}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-[11px] font-medium text-muted-foreground/50 border border-dashed border-border/40 rounded-lg">
              No tasks
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
