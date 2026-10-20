import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash01 as Trash2,
  Copy01 as Copy,
  Check,
  Stars01 as Sparkles,
  Image01 as ImageIcon,
  FaceSmile as Smile,
  Share01 as Share2,
  DotsHorizontal as MoreHorizontal,
  Loading01 as Loader2,
  XClose as X,
  ArrowRight,
  Archive,
  Bell01 as Bell,
  BellOff01 as BellOff,
  LayoutGrid01 as LayoutGrid,
} from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmojiSelector } from "../common/EmojiSelector";
import { useDevMode } from "@/contexts/DevModeContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskHeaderProps {
  boardId: string;
  boardName: string;
  title: string;
  emoji: string;
  coverImage?: string;
  saveStatus?: "idle" | "saving" | "saved";
  readOnly?: boolean;
  columns?: { id: string; title: string; color?: string; emoji?: string }[];
  currentColumnId?: string;
  availableBoards?: { id: string; name: string; emoji?: string }[];
  isArchived?: boolean;
  isFollowing?: boolean;
  onClose?: () => void;
  onTitleChange: (title: string) => void;
  onTitleBlur?: () => void;
  onEmojiChange: (emoji: string) => void;
  onCoverChange?: (cover: string) => void;
  onDelete?: () => void;
  onMoveToColumn?: (colId: string) => void;
  onMoveToBoard?: (targetBoardId: string) => void;
  onArchiveToggle?: () => void;
  onFollowToggle?: () => void;
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

export function TaskHeader({
  boardId,
  boardName,
  title,
  emoji,
  coverImage,
  saveStatus = "idle",
  readOnly,
  columns,
  currentColumnId,
  availableBoards,
  isArchived,
  isFollowing,
  onClose,
  onTitleChange,
  onTitleBlur,
  onEmojiChange,
  onCoverChange,
  onDelete,
  onMoveToColumn,
  onMoveToBoard,
  onArchiveToggle,
  onFollowToggle,
}: TaskHeaderProps) {
  const { devSettings } = useDevMode();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [selectedCover, setSelectedCover] = useState(coverImage || "");

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(`/boards/${boardId}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Task link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRandomCover = () => {
    const randomGradient = COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)];
    setSelectedCover(randomGradient);
    onCoverChange?.(randomGradient);
  };

  const handleRemoveCover = () => {
    setSelectedCover("");
    onCoverChange?.("");
  };

  return (
    <div className="w-full">
      {/* Top Breadcrumb Navigation & Action Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 gap-2 sm:gap-3 min-w-0">
        {/* Left: Streamlined Hierarchical Breadcrumb Directory */}
        <nav aria-label="Task breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-1 sm:max-w-[65%]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 px-2 h-8 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors min-w-0 max-w-[130px] sm:max-w-[220px]"
            title="Back to board"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{boardName || "Board"}</span>
          </Button>
          <span className="text-muted-foreground/30 font-light select-none shrink-0" aria-hidden="true">/</span>
          <span
            className="text-foreground/80 font-medium truncate text-xs min-w-0"
            title={title || "Untitled Task"}
          >
            {!devSettings.disableEmojiCustomization && emoji ? `${emoji} ` : ""}
            {title || "Untitled Task"}
          </span>
        </nav>

        {/* Right: Modern Unified Action Strip */}
        <div className="flex items-center gap-1 shrink-0" data-testid="task-header-actions">
          {onFollowToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFollowToggle}
                  className={`h-8 gap-1.5 text-xs font-medium px-2.5 rounded-lg transition-colors ${
                    isFollowing
                      ? "text-primary border-primary/40 bg-primary/10 hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/50"
                  }`}
                  title={isFollowing ? "Unfollow card notifications" : "Follow card notifications"}
                  aria-label={isFollowing ? "Unfollow card notifications" : "Follow card notifications"}
                  data-testid="task-follow-button"
                >
                  {isFollowing ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isFollowing ? "Following" : "Follow"}</span>
                  <span className="sr-only sm:hidden">{isFollowing ? "Following" : "Follow"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isFollowing ? "Following notifications" : "Follow notifications"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Desktop secondary actions */}
          <div className="hidden sm:flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Copy task URL link"
                aria-label="Copy task URL link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="sr-only">{copied ? "Copied" : "Copy Link"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {copied ? "Link Copied!" : "Copy Link"}
            </TooltipContent>
          </Tooltip>

          {!readOnly && (onMoveToColumn || onMoveToBoard) && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      title="Move task"
                      aria-label="Move task"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span className="sr-only">Move</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Move task
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                {onMoveToColumn && columns && columns.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Move to Column
                    </div>
                    {columns
                      .filter((c) => c.id !== "archive" && c.id !== currentColumnId)
                      .map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => onMoveToColumn(col.id)}
                          className="text-xs cursor-pointer gap-2"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: col.color || "var(--primary)" }}
                          />
                          <span className="truncate">{col.title}</span>
                        </DropdownMenuItem>
                      ))}
                    {availableBoards && availableBoards.length > 1 && onMoveToBoard && (
                      <DropdownMenuSeparator />
                    )}
                  </>
                )}

                {onMoveToBoard && availableBoards && availableBoards.length > 1 && (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Move to Board
                    </div>
                    {availableBoards
                      .filter((b) => b.id !== boardId)
                      .map((b) => (
                        <DropdownMenuItem
                          key={b.id}
                          onClick={() => onMoveToBoard(b.id)}
                          className="text-xs cursor-pointer gap-2"
                        >
                          {b.emoji ? (
                            <span>{b.emoji}</span>
                          ) : (
                            <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{b.name}</span>
                        </DropdownMenuItem>
                      ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!readOnly && onArchiveToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onArchiveToggle}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title={isArchived ? "Unarchive task" : "Archive task"}
                  aria-label={isArchived ? "Unarchive task" : "Archive task"}
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span className="sr-only">{isArchived ? "Unarchive" : "Archive"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isArchived ? "Unarchive task" : "Archive task"}
              </TooltipContent>
            </Tooltip>
          )}

          {!readOnly && onDelete && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      title="More task actions"
                      aria-label="More task actions"
                      data-testid="task-header-more-actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  More actions
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={onDelete}
                  title="Delete Task"
                  className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Move to Trash</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>

          {/* Mobile secondary actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors sm:hidden"
                title="Task actions"
                aria-label="Task actions"
                data-testid="task-header-mobile-actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCopyLink} className="text-xs cursor-pointer gap-2">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Link copied" : "Copy task link"}</span>
              </DropdownMenuItem>

              {!readOnly && (onMoveToColumn || onMoveToBoard || onArchiveToggle || onDelete) && (
                <DropdownMenuSeparator />
              )}

              {!readOnly && onMoveToColumn && columns && columns.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Move to Column
                  </div>
                  {columns
                    .filter((c) => c.id !== "archive" && c.id !== currentColumnId)
                    .map((col) => (
                      <DropdownMenuItem
                        key={`mobile-col-${col.id}`}
                        onClick={() => onMoveToColumn(col.id)}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.color || "var(--primary)" }}
                        />
                        <span className="truncate">{col.title}</span>
                      </DropdownMenuItem>
                    ))}
                  {availableBoards && availableBoards.length > 1 && onMoveToBoard && (
                    <DropdownMenuSeparator />
                  )}
                </>
              )}

              {!readOnly && onMoveToBoard && availableBoards && availableBoards.length > 1 && (
                <>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Move to Board
                  </div>
                  {availableBoards
                    .filter((b) => b.id !== boardId)
                    .map((b) => (
                      <DropdownMenuItem
                        key={`mobile-board-${b.id}`}
                        onClick={() => onMoveToBoard(b.id)}
                        className="text-xs cursor-pointer gap-2"
                      >
                        {b.emoji ? (
                          <span>{b.emoji}</span>
                        ) : (
                          <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{b.name}</span>
                      </DropdownMenuItem>
                    ))}
                </>
              )}

              {!readOnly && onArchiveToggle && (
                <DropdownMenuItem onClick={onArchiveToggle} className="text-xs cursor-pointer gap-2">
                  <Archive className="h-3.5 w-3.5" />
                  <span>{isArchived ? "Unarchive task" : "Archive task"}</span>
                </DropdownMenuItem>
              )}

              {!readOnly && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Move to Trash</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {onClose && (
            <>
              <div className="h-4 w-px bg-border/60 mx-1 shrink-0" aria-hidden="true" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    title="Close task (Esc)"
                    aria-label="Close task"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Close (Esc)
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Optional Cover Banner */}
      {selectedCover && (
        <div
          className="w-full h-36 sm:h-48 relative group transition-all duration-300 overflow-hidden"
          style={{ background: selectedCover }}
        >
          {!readOnly && (
            <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-background/70 backdrop-blur-md px-2 py-1 rounded-md border border-border/40 text-xs">
              <button
                onClick={handleRandomCover}
                className="text-xs text-foreground/80 hover:text-foreground font-medium px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors"
              >
                Change Cover
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                onClick={handleRemoveCover}
                className="text-xs text-destructive hover:underline font-medium px-1.5 py-0.5"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notion-style Page Action Helpers (Add Icon, Add Cover) */}
      <div className={`max-w-4xl mx-auto px-6 sm:px-12 ${selectedCover ? "-mt-10" : devSettings.disableEmojiCustomization ? "pt-4" : "pt-8"}`}>
        {(!devSettings.disableEmojiCustomization || !readOnly) && (
          <div className="flex items-center gap-2 mb-2">
            {/* Emoji Icon Button */}
            {!devSettings.disableEmojiCustomization && (
              !readOnly ? (
                <EmojiSelector
                  selectedEmoji={emoji}
                  onSelect={onEmojiChange}
                  size="lg"
                  className={`transition-transform hover:scale-105 shadow-sm ${
                    selectedCover ? "bg-background border-2 border-background ring-2 ring-border/30 rounded-2xl" : ""
                  }`}
                />
              ) : emoji ? (
                <div className="text-4xl">{emoji}</div>
              ) : null
            )}

          {/* Quick Notion-style hover controls if no icon / cover */}
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
              {!devSettings.disableEmojiCustomization && !emoji && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEmojiChange("📌")}
                  className="text-xs text-muted-foreground gap-1.5 h-7 px-2"
                >
                  <Smile className="h-3.5 w-3.5" />
                  <span>Add icon</span>
                </Button>
              )}
              {!selectedCover && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomCover}
                  className="text-xs text-muted-foreground gap-1.5 h-7 px-2"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Add cover</span>
                </Button>
              )}
            </div>
          )}
        </div>
        )}

        {/* Notion-Style Huge Page Title Input */}
        <div className="w-full">
          {readOnly ? (
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground py-1">
              {title || "Untitled Task"}
            </h1>
          ) : (
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              placeholder="Untitled Task"
              className="w-full text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/30 py-1 transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
}
