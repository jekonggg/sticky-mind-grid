import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import {
  DotsGrid as GripVertical,
  Attachment01 as Paperclip,
  File06 as FileText,
  FaceSmile as Smile,
  CheckSquare,
} from "@untitledui/icons";
import { format } from "date-fns";
import { getProgressColor } from "@/utils/taskUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onClick: (task: Task) => void;
  isDragDisabled?: boolean;
}

export function TaskCard({ task, isSelected = false, onClick, isDragDisabled = false }: TaskCardProps) {
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const isCompact = settings.uiDensity === "compact";
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
      className={`group density-task-card bg-card text-card-foreground rounded-xl border shadow-sm cursor-pointer
        hover:shadow-md hover:border-primary/30 transition-all duration-150 relative
        ${isCompact ? "p-2.5 sm:p-2.5" : "p-3"}
        ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md" : "border-border/60"}
        ${isDragging ? "opacity-50 shadow-xl scale-[1.02] border-primary" : ""}`}
      onClick={() => onClick(task)}
    >
      {firstAttachment && isFirstImage && (
        <div className={`overflow-hidden rounded-lg border border-border/50 bg-muted ${isCompact ? "mb-2 max-h-24 aspect-[21/9]" : "mb-3 aspect-video"}`}>
          <img
            src={firstAttachment.url}
            alt={firstAttachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className={`flex items-start ${isCompact ? "gap-1.5" : "gap-2"}`}>
        {!isDragDisabled && (
          <button
            className="mt-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {!devSettings.disableEmojiCustomization && task.emoji && (
                <span className={`${isCompact ? "text-xs" : "text-sm"} shrink-0`}>{task.emoji}</span>
              )}
              <h4 className={`font-bold text-card-foreground leading-tight truncate ${isCompact ? "text-xs" : "text-sm"}`}>
                {task.title}
              </h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`uppercase font-black rounded-full tracking-wider transition-colors
                  ${isCompact ? "text-[8px] px-1.5 py-0.2" : "text-[9px] px-2 py-0.5"}
                  ${
                    task.priority === "high"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : task.priority === "medium"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
              >
                {task.priority}
              </span>
            </div>
          </div>

          {task.description && (
            <p className={`text-muted-foreground leading-relaxed ${isCompact ? "text-[11px] line-clamp-1 mt-0.5" : "text-xs line-clamp-2 mt-1"}`}>
              {task.description}
            </p>
          )}

          {/* Tags Pills */}
          {task.tags && task.tags.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isCompact ? "mt-1.5" : "mt-2"}`}>
              {task.tags.map((t) => (
                <span
                  key={t.id}
                  style={{ backgroundColor: `${t.color}20`, color: t.color, borderColor: `${t.color}40` }}
                  className={`font-bold rounded-full border shadow-2xs ${isCompact ? "text-[8px] px-1 py-0.2" : "text-[9px] px-1.5 py-0.5"}`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Subtask Progress Bar: Rendered only when task has checklist items */}
          {task.checklist && task.checklist.length > 0 && (
            <div className={`${isCompact ? "mt-1.5" : "mt-2.5"} space-y-1 flex flex-col`}>
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
        <div className={`border-t border-border/40 flex items-center justify-between gap-1.5 ${isCompact ? "mt-2 pt-1.5" : "mt-3 pt-2.5"}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.dueDate && (
              <div className={`flex items-center gap-1 font-bold text-muted-foreground bg-muted/60 rounded-md ${isCompact ? "text-[9px] px-1.5 py-0.2" : "text-[10px] px-1.5 py-0.5"}`}>
                <FileText className={isCompact ? "h-2 w-2" : "h-2.5 w-2.5"} />
                {format(new Date(task.dueDate), "MMM d")}
              </div>
            )}
            {task.checklist && task.checklist.length > 0 && (
              <div className={`flex items-center gap-1 font-bold text-muted-foreground bg-muted/60 rounded-md ${isCompact ? "text-[9px] px-1.5 py-0.2" : "text-[10px] px-1.5 py-0.5"}`}>
                <CheckSquare className={`text-primary ${isCompact ? "h-2 w-2" : "h-2.5 w-2.5"}`} />
                <span>
                  {task.checklist.filter((i) => i.completed).length}/{task.checklist.length}
                </span>
              </div>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <div className={`flex items-center gap-1 font-bold text-muted-foreground bg-muted/60 rounded-md ${isCompact ? "text-[9px] px-1.5 py-0.2" : "text-[10px] px-1.5 py-0.5"}`}>
                <Paperclip className={isCompact ? "h-2 w-2" : "h-2.5 w-2.5"} />
                {task.attachments.length}
              </div>
            )}
          </div>

          {task.assignee && (
            <div
              className="flex items-center gap-1.5 shrink-0 ml-auto"
              title={`Assigned to: ${assigneeName}`}
            >
              <span className={`font-bold text-muted-foreground truncate max-w-[70px] hidden sm:inline ${isCompact ? "text-[9px]" : "text-[10px]"}`}>
                {task.assignee.fullName?.split(" ")[0] || task.assignee.email.split("@")[0]}
              </span>
              <Avatar className={`${isCompact ? "h-5 w-5" : "h-6 w-6"} border border-primary/20 ring-1 ring-background shrink-0`}>
                <AvatarImage src={task.assignee.avatarUrl} alt={assigneeName} />
                <AvatarFallback className={`font-black bg-primary/10 text-primary ${isCompact ? "text-[8px]" : "text-[9px]"}`}>
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
