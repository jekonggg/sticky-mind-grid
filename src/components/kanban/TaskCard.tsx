import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import {
  DotsGrid as GripVertical,
  Attachment01 as Paperclip,
  File06 as FileText,
  MessageSquare01 as MessageSquare,
  Clock,
  Check,
  AlignLeft01 as AlignLeft,
} from "@untitledui/icons";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getContainerGeometry } from "@/utils/geometryUtils";

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
  const geom = getContainerGeometry(
    isCompact,
    devSettings.customPadding,
    devSettings.customInnerRadius,
    devSettings.customOuterRadius
  );
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

  // Primary tag or fallback category
  const primaryTag = task.tags?.[0];
  const secondaryTags = task.tags?.slice(1) || [];

  // Calculate completion percentage for stepped progress bar
  const totalChecklist = task.checklist?.length || 0;
  const completedChecklist = task.checklist?.filter((i) => i.completed).length || 0;
  const hasChecklist = totalChecklist > 0;
  const progressPct = hasChecklist
    ? Math.round((completedChecklist / totalChecklist) * 100)
    : task.progress !== undefined && task.progress > 0
    ? task.progress
    : 0;

  const showProgressBar = hasChecklist || progressPct > 0;
  const totalTicks = isCompact ? 18 : 24;
  const activeTicks = Math.round((progressPct / 100) * totalTicks);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...(geom.isCustom ? { borderRadius: `${geom.innerRadius}px` } : {}) }}
      className={`group density-task-card bg-card text-card-foreground ${
        isCompact ? "rounded-[10px]" : "rounded-xl"
      } border shadow-xs ${
        isDragDisabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 relative select-none
        ${isCompact ? "p-2.5" : "p-3.5"}
        ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md" : "border-border/70 dark:border-slate-800/80"}
        ${isDragging ? "opacity-50 shadow-xl scale-[1.02] border-primary" : ""}`}
      {...(!isDragDisabled ? attributes : {})}
      {...(!isDragDisabled ? listeners : {})}
      onClick={(e) => {
        if (isDragging) {
          e.stopPropagation();
          return;
        }
        onClick(task);
      }}
    >
      {/* 1. Top Row: Entity / Tag / Emoji (Left) + Priority & Metric (Right) */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {!devSettings.disableEmojiCustomization && task.emoji && (
            <span className={`${isCompact ? "text-sm" : "text-base"} shrink-0 leading-none`}>
              {task.emoji}
            </span>
          )}
          {primaryTag ? (
            <span
              style={{
                backgroundColor: `${primaryTag.color}15`,
                color: primaryTag.color,
                borderColor: `${primaryTag.color}35`,
              }}
              className={`font-bold rounded-md border truncate shadow-2xs ${
                isCompact ? "text-[9px] px-1.5 py-0.2" : "text-[10px] px-2 py-0.5"
              }`}
            >
              {primaryTag.name}
            </span>
          ) : (
            <span className={`font-bold text-foreground truncate ${isCompact ? "text-[11px]" : "text-xs"}`}>
              Task
            </span>
          )}
        </div>

        {/* Priority Badge with Signal Bars */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-tight transition-colors ${
              isCompact ? "text-[9px] px-1.5 py-0.2" : "text-[10px] px-2 py-0.5"
            } ${
              task.priority === "high"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : task.priority === "medium"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            {/* 3-Bar Signal Icon */}
            <span className="flex items-end gap-[1.5px] h-2.5 shrink-0" aria-hidden="true">
              <span
                className={`w-[2.5px] rounded-xs ${
                  task.priority === "high"
                    ? "h-1.5 bg-rose-500"
                    : task.priority === "medium"
                    ? "h-1.5 bg-amber-500"
                    : "h-1.5 bg-emerald-500"
                }`}
              />
              <span
                className={`w-[2.5px] rounded-xs ${
                  task.priority === "high"
                    ? "h-2 bg-rose-500"
                    : task.priority === "medium"
                    ? "h-2 bg-amber-500"
                    : "h-2 bg-muted-foreground/30"
                }`}
              />
              <span
                className={`w-[2.5px] rounded-xs ${
                  task.priority === "high"
                    ? "h-2.5 bg-rose-500"
                    : "h-2.5 bg-muted-foreground/30"
                }`}
              />
            </span>
            <span className="capitalize">{task.priority}</span>
          </span>
        </div>
      </div>

      {/* 2. Image Attachment Cover (Proportional size with rounded corners) */}
      {firstAttachment && isFirstImage && (
        <div
          style={geom.isCustom ? { borderRadius: `${geom.imageRadius}px` } : undefined}
          className={`overflow-hidden ${
            isCompact ? "rounded-[4px] mb-2 max-h-24 aspect-[21/9]" : "rounded-md mb-2.5 aspect-[16/9] max-h-28"
          } border border-border/50 bg-muted/40`}
        >
          <img
            src={firstAttachment.url}
            alt={firstAttachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 3. Task Title Row */}
      <div className="flex items-start gap-1.5 mb-1.5">
        {!isDragDisabled && (
          <div
            className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          >
            <GripVertical className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!devSettings.disableEmojiCustomization && (
              <FileText className={`text-muted-foreground shrink-0 ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
            )}
            <h4
              className={`font-bold text-foreground leading-snug truncate ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              {task.title}
            </h4>
          </div>

          {/* Description Preview */}
          {task.description && (
            <div className={`flex items-start ${!devSettings.disableEmojiCustomization ? "gap-1" : ""} text-muted-foreground leading-relaxed ${isCompact ? "mt-0.5" : "mt-1"}`}>
              {!devSettings.disableEmojiCustomization && (
                <AlignLeft className="h-3 w-3 shrink-0 opacity-70 mt-0.5" />
              )}
              <p className={`line-clamp-1 flex-1 font-normal ${isCompact ? "text-[11px]" : "text-xs"}`}>
                {task.description}
              </p>
            </div>
          )}

          {/* Additional Tags (if any) */}
          {secondaryTags.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isCompact ? "mt-1" : "mt-1.5"}`}>
              {secondaryTags.map((t) => (
                <span
                  key={t.id}
                  style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}35` }}
                  className={`font-bold rounded-md border shadow-2xs ${isCompact ? "text-[8px] px-1 py-0.2" : "text-[9px] px-1.5 py-0.5"}`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Assignee Row */}
          {task.assignee && (
            <div className={`flex items-center gap-1.5 ${isCompact ? "mt-1.5" : "mt-2"}`}>
              <Avatar className={`${isCompact ? "h-4 w-4" : "h-5 w-5"} border border-border shrink-0`}>
                <AvatarImage src={task.assignee.avatarUrl} alt={assigneeName} />
                <AvatarFallback className={`font-bold bg-primary/10 text-primary ${isCompact ? "text-[7px]" : "text-[8px]"}`}>
                  {assigneeInitial}
                </AvatarFallback>
              </Avatar>
              <span className={`font-semibold text-muted-foreground truncate ${isCompact ? "text-[10px]" : "text-xs"}`}>
                {task.assignee.fullName || task.assignee.email}
              </span>
            </div>
          )}

          {/* 4. Stepped / Equalizer Progress Bar Visualizer */}
          {showProgressBar && (
            <div className={`flex items-center gap-2 ${isCompact ? "mt-1.5" : "mt-2.5"}`}>
              <div className="flex-1 flex items-center gap-[2px] h-2">
                {Array.from({ length: totalTicks }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex-1 h-full rounded-xs transition-all duration-300 ${
                      i < activeTicks
                        ? progressPct === 100
                          ? "bg-emerald-500"
                          : "bg-teal-500 dark:bg-teal-400"
                        : "bg-slate-200/80 dark:bg-slate-800"
                    }`}
                  />
                ))}
              </div>
              <span className={`font-bold tabular-nums text-muted-foreground shrink-0 ${isCompact ? "text-[9px]" : "text-[10px]"}`}>
                {progressPct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Card Footer: Checklist / Comment / Attachment Counters + Due Date */}
      <div className={`border-t border-border/50 flex items-center justify-between gap-1.5 ${isCompact ? "mt-2 pt-1.5" : "mt-2.5 pt-2"}`}>
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
          {hasChecklist && (
            <div
              className={`flex items-center gap-1 font-semibold ${isCompact ? "text-[9px]" : "text-[10px]"}`}
              title="Checklist completion"
            >
              <Check className={isCompact ? "h-2.5 w-2.5 text-primary" : "h-3 w-3 text-primary"} />
              <span>
                {completedChecklist}/{totalChecklist}
              </span>
            </div>
          )}

          {task.attachments && task.attachments.length > 0 && (
            <div
              className={`flex items-center gap-1 font-semibold ${isCompact ? "text-[9px]" : "text-[10px]"}`}
              title="Attachments"
            >
              <Paperclip className={isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              <span>{task.attachments.length}</span>
            </div>
          )}

          {/* Comment icon if task has comments count or default indicator */}
          {(task as any).commentCount !== undefined && (task as any).commentCount > 0 && (
            <div
              className={`flex items-center gap-1 font-semibold ${isCompact ? "text-[9px]" : "text-[10px]"}`}
              title="Comments"
            >
              <MessageSquare className={isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              <span>{(task as any).commentCount}</span>
            </div>
          )}
        </div>

        {/* Due Date Indicator */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 font-semibold text-muted-foreground ml-auto ${
              isCompact ? "text-[9px]" : "text-[10px]"
            }`}
            title={`Due date: ${format(new Date(task.dueDate), "PPP")}`}
          >
            <Clock className={isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            <span>{format(new Date(task.dueDate), "MMM d")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

