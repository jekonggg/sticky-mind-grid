import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import { GripVertical, Paperclip, FileText, Smile, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { getProgressColor } from "@/utils/taskUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onClick: (task: Task) => void;
  isDragDisabled?: boolean;
}

export function TaskCard({ task, isSelected = false, onClick, isDragDisabled = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const firstAttachment = task.attachments?.[0];
  const isFirstImage = firstAttachment?.type.startsWith("image/");

  const assigneeName = task.assignee?.fullName || task.assignee?.email;
  const assigneeInitial = (task.assignee?.fullName || task.assignee?.email || "U").charAt(0).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card text-card-foreground rounded-xl border p-3 shadow-sm cursor-pointer
        hover:shadow-md hover:border-primary/30 transition-all duration-150 relative
        ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md" : "border-border/60"}
        ${isDragging ? "opacity-50 shadow-xl scale-[1.02] border-primary" : ""}`}
      onClick={() => onClick(task)}
    >
      {firstAttachment && isFirstImage && (
        <div className="mb-3 overflow-hidden rounded-lg border border-border/50 aspect-video bg-muted">
          <img
            src={firstAttachment.url}
            alt={firstAttachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start gap-2">
        {!isDragDisabled && (
          <button
            className="mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {task.emoji && <span className="text-sm shrink-0">{task.emoji}</span>}
              <h4 className="font-bold text-sm text-card-foreground leading-tight truncate">
                {task.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-wider
                  ${
                    task.priority === "high"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                      : task.priority === "medium"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
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

          {/* Tags Pills */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.map((t) => (
                <span
                  key={t.id}
                  style={{ backgroundColor: `${t.color}20`, color: t.color, borderColor: `${t.color}40` }}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Subtask Progress Bar: Rendered only when task has checklist items */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-2.5 space-y-1 flex flex-col">
              {(() => {
                const completed = task.checklist.filter((i) => i.completed).length;
                const total = task.checklist.length;
                const subtaskPct = Math.round((completed / total) * 100);
                return (
                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden border border-border/10">
                    <div
                      className={`h-full transition-all duration-500 ease-out ${getProgressColor(subtaskPct)}`}
                      style={{ width: `${subtaskPct}%` }}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Metadata + Assignee Avatar */}
      {(task.dueDate || (task.attachments && task.attachments.length > 0) || (task.checklist && task.checklist.length > 0) || task.assignee) && (
        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                <FileText className="h-2.5 w-2.5" />
                {format(new Date(task.dueDate), "MMM d")}
              </div>
            )}
            {task.checklist && task.checklist.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                <CheckSquare className="h-2.5 w-2.5 text-primary" />
                <span>
                  {task.checklist.filter((i) => i.completed).length}/{task.checklist.length}
                </span>
              </div>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                <Paperclip className="h-2.5 w-2.5" />
                {task.attachments.length}
              </div>
            )}
          </div>

          {task.assignee && (
            <div
              className="flex items-center gap-1.5 shrink-0 ml-auto"
              title={`Assigned to: ${assigneeName}`}
            >
              <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[70px] hidden sm:inline">
                {task.assignee.fullName?.split(" ")[0] || task.assignee.email.split("@")[0]}
              </span>
              <Avatar className="h-5.5 w-5.5 border border-primary/20 ring-1 ring-background">
                <AvatarFallback className="text-[9px] font-black bg-primary/10 text-primary">
                  {assigneeInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
