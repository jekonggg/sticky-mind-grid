import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import { GripVertical, Paperclip, FileText, Smile } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

import { getProgressColor } from "@/utils/taskUtils";

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const firstAttachment = task.attachments?.[0];
  const isFirstImage = firstAttachment?.type.startsWith('image/');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card text-card-foreground rounded-lg border border-border p-3 shadow-sm cursor-pointer
        hover:shadow-md hover:border-ring/30 transition-all duration-150
        ${isDragging ? "opacity-50 shadow-lg scale-[1.02]" : ""}`}
      onClick={() => onClick(task)}
    >
      {firstAttachment && isFirstImage && (
        <div className="mb-3 overflow-hidden rounded-md border border-border/50 aspect-video bg-muted">
          <img
            src={firstAttachment.url}
            alt={firstAttachment.name}
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
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h4 className="font-bold text-sm text-card-foreground leading-tight truncate">
                {task.title}
              </h4>
              <Smile className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
               <span
                 className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
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
                className={`h-full transition-all duration-500 ease-out ${getProgressColor(task.progress)}`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-[9px] font-black tracking-tighter text-muted-foreground/60 leading-none">
              {task.progress}%
            </span>
          </div>
        </div>
      </div>
      {(task.dueDate || (task.attachments && task.attachments.length > 0)) && (
        <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-3">
          {task.dueDate && (
             <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                <FileText className="h-2.5 w-2.5" />
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
             </div>
          )}
          {task.attachments && task.attachments.length > 0 && (
             <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                <Paperclip className="h-2.5 w-2.5" />
                {task.attachments.length}
             </div>
          )}
          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
