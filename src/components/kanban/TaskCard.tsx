import React, { useContext } from "react";
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
import { parseSafeDate, formatSafe } from "@/utils/dateUtils";
import { Avatar, AvatarFallback, AvatarImage, getMediaUrl } from "@/components/ui/avatar";
import { AuthContext } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const authContext = useContext(AuthContext);
  const currentUser = authContext?.user;

  // Single card avatar determination: at most 1 avatar on the card (Assignee if assigned, otherwise Creator)
  const singleAvatar = React.useMemo(() => {
    // 1. Primary Assignee
    const primaryAssignee =
      task.assignee ||
      (Array.isArray((task as any).assignees) && (task as any).assignees[0] ? (task as any).assignees[0] : null);

    const isAssigneeCurrentUser =
      primaryAssignee &&
      (primaryAssignee.id === currentUser?.id ||
        (currentUser?.email && primaryAssignee.email === currentUser.email));

    if (primaryAssignee) {
      const name = primaryAssignee.fullName || primaryAssignee.email || "Assignee";
      const initial = (name || "U").charAt(0).toUpperCase();
      const isAlsoCreator =
        task.creator &&
        (task.creator.id === primaryAssignee.id ||
          task.creator.email === primaryAssignee.email);

      let tooltip = `Assigned to ${name}`;
      if (isAlsoCreator) {
        tooltip = `${name} (Assignee & Creator)`;
      } else if (task.creator) {
        const cName = task.creator.fullName || task.creator.email;
        tooltip = `Assigned to ${name} • Created by ${cName}`;
      }

      const avatarUrl = isAssigneeCurrentUser
        ? (currentUser?.avatarUrl ?? primaryAssignee.avatarUrl)
        : primaryAssignee.avatarUrl;

      return {
        id: primaryAssignee.id || primaryAssignee.email || "assignee",
        name,
        initial,
        avatarUrl,
        tooltip,
        role: "assignee" as const,
      };
    }

    // 2. Unassigned task: fall back to Creator
    if (task.creator) {
      const isCreatorCurrentUser =
        task.creator.id === currentUser?.id ||
        (currentUser?.email && task.creator.email === currentUser.email) ||
        task.createdBy === currentUser?.id;
      const name = task.creator.fullName || task.creator.email || "Creator";
      const initial = (name || "U").charAt(0).toUpperCase();
      const safeCreatedAt = parseSafeDate(task.createdAt);
      const createdDateStr = safeCreatedAt ? formatSafe(safeCreatedAt, "MMM d, yyyy") : "";
      const tooltip = `Created by ${name}${createdDateStr ? ` on ${createdDateStr}` : ""} (Unassigned)`;

      const avatarUrl = isCreatorCurrentUser
        ? (currentUser?.avatarUrl ?? task.creator.avatarUrl)
        : task.creator.avatarUrl;

      return {
        id: task.creator.id || task.creator.email || "creator",
        name,
        initial,
        avatarUrl,
        tooltip,
        role: "creator" as const,
      };
    }

    return null;
  }, [task, currentUser?.id, currentUser?.avatarUrl, currentUser?.email]);

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

          <div className="flex items-center gap-1 shrink-0 -mr-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-5 w-5 rounded-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center cursor-pointer shrink-0"
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

        {/* Due Date */}
        {(() => {
          const safeDueDate = parseSafeDate(task.dueDate);
          if (!safeDueDate) return null;
          return (
            <div
              className={`flex items-center gap-1 font-medium text-muted-foreground ${
                isCompact ? "mt-1.5 text-[9px]" : "mt-2 text-xs"
              }`}
              title={`Due date: ${formatSafe(safeDueDate, "PPP")}`}
            >
              <Calendar className={isCompact ? "h-3 w-3 opacity-70" : "h-3.5 w-3.5 opacity-70"} />
              <span>{formatSafe(safeDueDate, "MMM d, yyyy")}</span>
            </div>
          );
        })()}

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
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      data-testid="task-checklist-badge"
                      className={`flex items-center gap-1 font-medium cursor-default transition-colors hover:text-foreground ${
                        isCompact ? "text-[9px]" : "text-[11px]"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Check className={isCompact ? "h-2.5 w-2.5 text-primary" : "h-3 w-3 text-primary"} />
                      <span>
                        {completedChecklist}/{totalChecklist}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    className="p-2.5 max-w-[280px] space-y-1.5 text-xs shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="font-semibold text-foreground flex items-center justify-between gap-2 border-b border-border/40 pb-1">
                      <span>Checklist</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {completedChecklist}/{totalChecklist} completed ({progressPct}%)
                      </span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {task.checklist?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {item.completed ? (
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-0.5 mr-1" />
                            )}
                            <span
                              className={`truncate ${
                                item.completed ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {item.title || item.text}
                            </span>
                          </div>
                          {item.completed && item.completedBy && (() => {
                            const isCompletedByMe =
                              item.completedBy.id === currentUser?.id ||
                              (currentUser?.email && item.completedBy.email === currentUser.email);
                            const completedAvatarUrl = isCompletedByMe
                              ? (currentUser?.avatarUrl ?? item.completedBy.avatarUrl)
                              : item.completedBy.avatarUrl;

                            return (
                              <div
                                className="flex items-center gap-1 shrink-0 pl-1"
                                aria-label={`Completed by ${item.completedBy.fullName || item.completedBy.email}`}
                              >
                                <Avatar className="h-3.5 w-3.5 text-[7px] border border-card ring-1 ring-border/20">
                                  <AvatarImage
                                    src={completedAvatarUrl}
                                    alt={item.completedBy.fullName || item.completedBy.email}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {(item.completedBy.fullName || item.completedBy.email || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

          {/* Right: Single Card Avatar (Bottom Rightmost: Assignee if assigned, otherwise Creator) */}
          {singleAvatar && (
            <div
              className="flex items-center shrink-0 ml-auto"
              aria-label="Involved members"
            >
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar
                      data-testid="task-single-avatar"
                      data-avatar-url={singleAvatar.avatarUrl || undefined}
                      aria-label={singleAvatar.tooltip}
                      className={`${
                        isCompact ? "h-4 w-4 text-[7px]" : "h-5 w-5 text-[8px]"
                      } border-[1.5px] border-card shrink-0 transition-transform hover:scale-110 hover:z-10 ${
                        singleAvatar.role === "creator"
                          ? "ring-1.5 ring-dashed ring-muted-foreground/50 opacity-90"
                          : "ring-1 ring-border/30"
                      }`}
                    >
                      <AvatarImage src={singleAvatar.avatarUrl} alt={singleAvatar.name} />
                      <AvatarFallback className="font-bold bg-primary/10 text-primary">
                        {singleAvatar.initial}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{singleAvatar.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
