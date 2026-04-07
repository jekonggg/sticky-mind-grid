import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import { GripVertical } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card text-card-foreground rounded-lg border border-border p-3 shadow-sm cursor-pointer
        hover:shadow-md hover:border-ring/30 transition-all duration-150
        ${isDragging ? "opacity-50 shadow-lg scale-[1.02]" : ""}`}
      onClick={() => onClick(task)}
    >
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-md border border-border/50 aspect-video bg-muted">
          <img
            src={task.attachments[0]}
            alt="Attachment"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm text-card-foreground leading-snug">{task.title}</h4>
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0
                ${
                  task.priority === "high"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : task.priority === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
            >
              {task.priority}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
              {task.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mt-3 space-y-1.5 flex flex-col items-end">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border/10">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--primary),0.2)]"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-[9px] font-black tracking-tighter text-muted-foreground/60 leading-none">
              {task.progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
