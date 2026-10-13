import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, Priority } from "@/types/task";
import {
  MoreHorizontal,
  Flag,
  Star,
  Calendar,
  Paperclip,
  Tag as TagIcon,
  MessageSquare,
  Check,
  Archive,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage, getMediaUrl } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getContainerGeometry } from "@/utils/geometryUtils";

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  isDragDisabled?: boolean;
  hideProgressBar?: boolean;
}

const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    flagColor: string;
    textColor: string;
    starColor: string;
    tabBg: string;
    gradientColor: string;
    gradientOpacity: number;
  }
> = {
  low: {
    label: "LOW PRIORITY",
    flagColor: "text-emerald-500 fill-emerald-500",
    textColor: "text-emerald-600 dark:text-emerald-400",
    starColor: "text-amber-500 fill-amber-400",
    tabBg: "bg-gradient-to-b from-emerald-500/15 to-transparent",
    gradientColor: "#10b981",
    gradientOpacity: 0.15,
  },
  medium: {
    label: "MED PRIORITY",
    flagColor: "text-amber-500 fill-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
    starColor: "text-amber-500 fill-amber-400",
    tabBg: "bg-gradient-to-b from-amber-500/15 to-transparent",
    gradientColor: "#f59e0b",
    gradientOpacity: 0.15,
  },
  high: {
    label: "HIGH PRIORITY",
    flagColor: "text-rose-500 fill-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
    starColor: "text-amber-500 fill-amber-400",
    tabBg: "bg-gradient-to-b from-rose-500/15 to-transparent",
    gradientColor: "#f43f5e",
    gradientOpacity: 0.15,
  },
  urgent: {
    label: "URGENT",
    flagColor: "text-rose-600 fill-rose-600",
    textColor: "text-rose-600 dark:text-rose-400",
    starColor: "text-amber-500 fill-amber-400",
    tabBg: "bg-gradient-to-b from-rose-600/20 to-transparent",
    gradientColor: "#e11d48",
    gradientOpacity: 0.2,
  },
};

export function TaskCard({
  task,
  isSelected = false,
  isHighlighted = false,
  onClick,
  onArchive,
  onDelete,
  isDragDisabled = false,
  hideProgressBar = false,
}: TaskCardProps) {
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

  const priorityKey = (task.priority?.toLowerCase() as Priority) || "low";
  const priority = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low;
  const tabGradientId = `tab-fade-${task.id}`;

  const firstAttachment = task.attachments?.[0];
  const isFirstImage = firstAttachment?.type.startsWith("image/");

  const assigneeName = task.assignee?.fullName || task.assignee?.email;
  const assigneeInitial = (task.assignee?.fullName || task.assignee?.email || "U").charAt(0).toUpperCase();

  // Collect all involved users (assignee(s), creator, involved) deduplicated
  const involvedUsers = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      avatarUrl?: string;
      initial: string;
    }> = [];
    const seen = new Set<string>();

    const addUser = (u?: {
      id?: string;
      email?: string;
      fullName?: string;
      avatarUrl?: string;
    } | null) => {
      if (!u) return;
      const name = u.fullName || u.email;
      if (!name || (name === "Former member" && !u.id && !u.avatarUrl)) return;
      const key = u.id || u.email || name;
      if (seen.has(key)) return;
      seen.add(key);

      const initial = (name || "U").charAt(0).toUpperCase();
      list.push({
        id: key,
        name,
        avatarUrl: u.avatarUrl,
        initial,
      });
    };

    // Primary assignee(s)
    if (Array.isArray((task as any).assignees)) {
      (task as any).assignees.forEach(addUser);
    }
    if (task.assignee) {
      addUser(task.assignee);
    }
    // Creator
    if (task.creator) {
      addUser(task.creator);
    }
    // Any extra involved
    if (Array.isArray((task as any).involved)) {
      (task as any).involved.forEach(addUser);
    }

    return list;
  }, [task]);

  const maxVisibleAvatars = isCompact ? 2 : 3;
  const visibleInvolved = involvedUsers.slice(0, maxVisibleAvatars);
  const remainingInvolvedCount = Math.max(0, involvedUsers.length - maxVisibleAvatars);
  const remainingInvolvedUsers = involvedUsers.slice(maxVisibleAvatars);

  // Progress calculations for the 24-tick equalizer visualizer
  const totalChecklist = task.checklist?.length || 0;
  const completedChecklist = task.checklist?.filter((i) => i.completed).length || 0;
  const hasChecklist = totalChecklist > 0;
  const progressPct = hasChecklist
    ? Math.round((completedChecklist / totalChecklist) * 100)
    : task.progress !== undefined && task.progress > 0
    ? task.progress
    : 0;

  const showProgressBar = !hideProgressBar && (hasChecklist || progressPct > 0);
  const totalTicks = isCompact ? 18 : 24;
  const activeTicks = Math.round((progressPct / 100) * totalTicks);

  const commentCount = (task as any).commentCount ?? 0;

  // Unified dynamic border classes for hover and selection synchronization
  const borderClass = isSelected
    ? "border-primary"
    : "border-border/70 dark:border-slate-800/80 group-hover:border-primary/40";
  const strokeClass = isSelected
    ? "stroke-primary"
    : "stroke-border/70 dark:stroke-slate-800/80 group-hover:stroke-primary/40";

  return (
    <div
      ref={setNodeRef}
      data-highlighted={isHighlighted ? "true" : undefined}
      style={{
        ...style,
        ...(geom.isCustom ? { borderRadius: `${geom.innerRadius}px` } : {}),
      }}
      className={`group density-task-card text-card-foreground ${
        isDragDisabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative select-none ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border"
      } ${isHighlighted ? "ring-2 ring-primary shadow-lg shadow-primary/20 animate-pulse" : ""} ${
        isDragging ? "opacity-50 shadow-xl scale-[1.02]" : ""
      }`}
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
      {/* 1. Folder Tab Header (Raised Tab on Left + Full-Height S-curve Fillet) */}
      <div className="flex items-end relative z-10">
        {/* Top-Left Folder Tab with Priority Badge */}
        <div
          className={`relative inline-flex items-center gap-1.5 ${
            isCompact
              ? "h-[18px] pl-2 pr-1.5 pt-1 rounded-tl-[8px]"
              : "h-[22px] pl-2.5 pr-2 pt-1.5 rounded-tl-[8px]"
          } bg-card border-t border-l ${borderClass} shrink-0 transition-colors overflow-hidden`}
        >
          <div className={`absolute inset-0 ${priority.tabBg} pointer-events-none`} />
          {!devSettings.disableEmojiCustomization && (
            <>
              <Star className={`relative z-10 ${isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} ${priority.starColor} shrink-0`} />
              <Flag className={`relative z-10 ${isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} ${priority.flagColor} shrink-0`} />
            </>
          )}
          <span
            className={`relative z-10 ${
              isCompact ? "text-[9px]" : "text-[10px]"
            } font-extrabold tracking-wider uppercase ${priority.textColor} leading-none`}
          >
            {priority.label}
          </span>
        </div>

        {/* S-Curve Fillet Connector sloping from top of Folder Tab down to top border of Main Card Body */}
        <div
          className={`relative ${
            isCompact ? "w-4 h-[18px]" : "w-5 h-[22px]"
          } shrink-0 -ml-[1px] text-card transition-colors`}
          aria-hidden="true"
        >
          {isCompact ? (
            <svg
              viewBox="0 0 16 18"
              className="w-full h-full block"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={tabGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priority.gradientColor} stopOpacity={priority.gradientOpacity} />
                  <stop offset="100%" stopColor={priority.gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                d="M 0 0 C 6 0 10 18 16 18 L 0 18 Z"
                className="fill-card"
              />
              <path
                d="M 0 0 C 6 0 10 18 16 18 L 0 18 Z"
                fill={`url(#${tabGradientId})`}
              />
              <path
                d="M 0 0.5 C 6 0.5 10 17.5 16 17.5"
                fill="none"
                className={`${strokeClass} transition-colors`}
                strokeWidth="1"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 22"
              className="w-full h-full block"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={tabGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={priority.gradientColor} stopOpacity={priority.gradientOpacity} />
                  <stop offset="100%" stopColor={priority.gradientColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                d="M 0 0 C 8 0 12 22 20 22 L 0 22 Z"
                className="fill-card"
              />
              <path
                d="M 0 0 C 8 0 12 22 20 22 L 0 22 Z"
                fill={`url(#${tabGradientId})`}
              />
              <path
                d="M 0 0.5 C 8 0.5 12 21.5 20 21.5"
                fill="none"
                className={`${strokeClass} transition-colors`}
                strokeWidth="1"
              />
            </svg>
          )}
        </div>
      </div>

      {/* 2. Main Card Body (Seamlessly connects to the folder tab above with rounded top-right corner) */}
      <div
        className={`bg-card border ${borderClass} rounded-b-[8px] rounded-tr-[8px] rounded-tl-none p-3 -mt-[1px] transition-colors shadow-xs`}
      >
        {/* Cover Image Attachment (Option A: Beneath folder tab header across full width) */}
        {firstAttachment && isFirstImage && (
          <div
            style={geom.isCustom ? { borderRadius: `${geom.imageRadius}px` } : undefined}
            className={`overflow-hidden ${
              isCompact
                ? "rounded-md mb-2 max-h-24 aspect-[21/9]"
                : "rounded-lg mb-2.5 aspect-[16/9] max-h-28"
            } border border-border/50 bg-muted/40`}
          >
            <img
              src={getMediaUrl(firstAttachment.url)}
              alt={firstAttachment.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Task Title & Quick Actions Trigger */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {!devSettings.disableEmojiCustomization && task.emoji && (
              <span className={`${isCompact ? "text-sm" : "text-base"} shrink-0 leading-none`}>
                {task.emoji}
              </span>
            )}
            <h4
              className={`font-bold text-foreground leading-snug truncate flex-1 ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              {task.title}
            </h4>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-5 w-5 rounded-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center cursor-pointer shrink-0 -mr-1"
                aria-label="Task options"
                title="Task options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(task);
                }}
              >
                Open details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(task.title);
                }}
              >
                Copy title
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(task.id);
                }}
              >
                Copy task ID
              </DropdownMenuItem>
              {onArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(task);
                    }}
                  >
                    <Archive className="h-3.5 w-3.5 mr-2" />
                    {task.status === "archive" ? "Unarchive card" : "Archive card"}
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task);
                    }}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div
            className={`flex items-center gap-1.5 flex-wrap ${
              isCompact ? "mt-1.5" : "mt-2"
            }`}
          >
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 font-semibold rounded-md ${
                  isCompact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
                } border shadow-2xs`}
                style={{
                  backgroundColor: tag.color ? `${tag.color}15` : "var(--muted)",
                  color: tag.color || "inherit",
                  borderColor: tag.color ? `${tag.color}35` : "var(--border)",
                }}
                title={tag.name}
              >
                <TagIcon className={isCompact ? "h-2 w-2 opacity-70" : "h-2.5 w-2.5 opacity-70"} />
                <span>{tag.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Inline Metadata Row: Assignee (Left) + Due Date (Right) */}
        {(task.assignee || task.dueDate) && (
          <div
            className={`flex items-center justify-between gap-2 ${
              isCompact ? "mt-1.5" : "mt-2"
            }`}
          >
            {/* Assignee */}
            {task.assignee ? (
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Avatar className={`${isCompact ? "h-4 w-4" : "h-5 w-5"} border border-border shrink-0`}>
                  <AvatarImage src={task.assignee.avatarUrl} alt={assigneeName} />
                  <AvatarFallback
                    className={`font-bold bg-primary/10 text-primary ${
                      isCompact ? "text-[7px]" : "text-[8px]"
                    }`}
                  >
                    {assigneeInitial}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`font-medium text-muted-foreground truncate ${
                    isCompact ? "text-[10px]" : "text-xs"
                  }`}
                >
                  {assigneeName}
                </span>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 font-medium text-muted-foreground shrink-0 ${
                  isCompact ? "text-[9px]" : "text-xs"
                }`}
                title={`Due date: ${format(new Date(task.dueDate), "PPP")}`}
              >
                <Calendar className={isCompact ? "h-3 w-3 opacity-70" : "h-3.5 w-3.5 opacity-70"} />
                <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        )}

        {/* Description Snippet */}
        {task.description && (
          <p
            className={`line-clamp-2 text-muted-foreground leading-relaxed font-normal ${
              isCompact ? "text-[11px] mt-1" : "text-xs mt-1.5"
            }`}
          >
            {task.description}
          </p>
        )}

        {/* 24-Tick Stepped Equalizer Progress Bar */}
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
            <span
              className={`font-bold tabular-nums text-muted-foreground shrink-0 ${
                isCompact ? "text-[9px]" : "text-[10px]"
              }`}
            >
              {progressPct}%
            </span>
          </div>
        )}

        {/* Hairline Divider */}
        <div className={`border-t border-border/50 ${isCompact ? "mt-2 pt-1.5" : "mt-2.5 pt-2"}`} />

        {/* Footer: Attachments, Checklist & Comments (Left) + Tags (Right) */}
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          {/* Left metrics: Files, Checklist, Comments */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {task.attachments && task.attachments.length > 0 && (
              <div
                className={`flex items-center gap-1 font-medium ${
                  isCompact ? "text-[9px]" : "text-[11px]"
                }`}
                title={`${task.attachments.length} attachments`}
              >
                <Paperclip className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                <span>
                  {task.attachments.length} {task.attachments.length === 1 ? "file" : "files"}
                </span>
              </div>
            )}

            {hasChecklist && (
              <div
                className={`flex items-center gap-1 font-medium ${
                  isCompact ? "text-[9px]" : "text-[11px]"
                }`}
                title="Checklist completion"
              >
                <Check className={isCompact ? "h-2.5 w-2.5 text-primary" : "h-3 w-3 text-primary"} />
                <span>
                  {completedChecklist}/{totalChecklist}
                </span>
              </div>
            )}

            {commentCount > 0 && (
              <div
                className={`flex items-center gap-1 font-medium ${
                  isCompact ? "text-[9px]" : "text-[11px]"
                }`}
                title="Comments"
              >
                <MessageSquare className={isCompact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                <span>{commentCount}</span>
              </div>
            )}
          </div>

          {/* Right: Involved Avatars (Bottom Rightmost) */}
          {involvedUsers.length > 0 && (
            <div
              className="flex items-center -space-x-1.5 shrink-0 ml-auto"
              aria-label="Involved members"
            >
              {visibleInvolved.map((user) => (
                <Avatar
                  key={user.id}
                  title={user.name}
                  aria-label={user.name}
                  className={`${
                    isCompact ? "h-4 w-4 text-[7px]" : "h-5 w-5 text-[8px]"
                  } border-[1.5px] border-card ring-1 ring-border/20 shrink-0 transition-transform hover:scale-110 hover:z-10`}
                >
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="font-bold bg-primary/10 text-primary">
                    {user.initial}
                  </AvatarFallback>
                </Avatar>
              ))}

              {remainingInvolvedCount > 0 && (
                <div
                  title={remainingInvolvedUsers.map((u) => u.name).join(", ")}
                  aria-label={`${remainingInvolvedCount} more involved members`}
                  className={`${
                    isCompact ? "h-4 w-4 text-[7px]" : "h-5 w-5 text-[8px]"
                  } rounded-full border-[1.5px] border-card ring-1 ring-border/20 bg-muted text-muted-foreground font-bold flex items-center justify-center shrink-0 transition-transform hover:scale-110 hover:z-10 cursor-default select-none`}
                >
                  +{remainingInvolvedCount}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
