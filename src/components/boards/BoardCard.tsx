import { Link } from "react-router-dom";
import { Board } from "@/types/board";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DotsHorizontal as MoreHorizontal,
  Edit01 as Pencil,
  Trash01 as Trash2,
  LayoutGrid01 as LayoutGrid,
  LogOut01 as LogOut,
  Pin01 as Pin,
  Pin02 as PinOff,
  Shield01 as Shield,
  Eye,
  MessageChatSquare as MessageSquare,
  Users01 as Users,
  AlertTriangle,
  Clock,
} from "@untitledui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { BoardHeroImage } from "./BoardHeroImage";
import { useDevMode } from "@/contexts/DevModeContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";

interface BoardCardProps {
  board: Board;
  taskCount?: number;
  isPinned?: boolean;
  compact?: boolean;
  onTogglePin?: (board: Board) => void;
  onEdit: (board: Board) => void;
  onDelete: (board: Board) => void;
  onLeave?: (board: Board) => void;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function BoardCard({
  board,
  taskCount = 0,
  isPinned = false,
  compact = false,
  onTogglePin,
  onEdit,
  onDelete,
  onLeave,
}: BoardCardProps) {
  const { devSettings } = useDevMode();
  const permissions = useBoardPermissions(board);
  const boardColor = board.color && board.color.startsWith("hsl") ? board.color : "hsl(220, 80%, 56%)";
  const showEmoji = !devSettings.disableEmojiCustomization && !!board.emoji;

  const isOwner = permissions.isOwner;
  const isAdmin = permissions.isAdmin && !permissions.isOwner;
  const canLeave = permissions.canLeaveBoard;
  const pinned = isPinned || !!board.isPinned;
  const openCount = board.openTaskCount ?? taskCount ?? 0;
  const isShared = Boolean(
    board.isShared ||
      (board.memberCount && board.memberCount > 1) ||
      (board.membersPreview && board.membersPreview.length > 1) ||
      !isOwner
  );
  const overdueCount = board.overdueCount ?? 0;
  const dueSoonCount = board.dueSoonCount ?? 0;
  const membersPreview = board.membersPreview ?? [];

  const renderRoleBadge = () => {
    switch (permissions.role) {
      case "owner":
        return (
          <Badge
            variant="outline"
            data-testid="board-role-badge"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
          >
            <Shield className="h-3 w-3 mr-1" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge
            variant="outline"
            data-testid="board-role-badge"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
          >
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case "commenter":
        return (
          <Badge
            variant="outline"
            data-testid="board-role-badge"
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Commenter
          </Badge>
        );
      case "viewer":
        return (
          <Badge
            variant="outline"
            data-testid="board-role-badge"
            className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
          >
            <Eye className="h-3 w-3 mr-1" />
            Viewer
          </Badge>
        );
      case "editor":
      default:
        return (
          <Badge
            variant="outline"
            data-testid="board-role-badge"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editor
          </Badge>
        );
    }
  };

  return (
    <Card className="group cursor-pointer relative hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      {!compact && (
        <BoardHeroImage
          src={board.heroImageUrl}
          alt={board.name}
          color={boardColor}
          aspectRatio="video"
        />
      )}

      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: boardColor }} />

      <CardContent className="p-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {!devSettings.disableEmojiCustomization && (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/50 shadow-sm
                  ${showEmoji ? "bg-primary/5" : "bg-muted/50"}`}
                style={{ borderColor: showEmoji ? "transparent" : boardColor + "44" }}
              >
                {showEmoji ? (
                  <span className="text-xl leading-none">{board.emoji}</span>
                ) : (
                  <LayoutGrid className="h-5 w-5" style={{ color: boardColor }} />
                )}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="min-w-0">
                  <Link
                    to={`/boards/${board.id}`}
                    aria-label={`Open board ${board.name}`}
                    className="font-bold text-sm text-foreground truncate hover:underline focus:outline-none focus-visible:underline after:absolute after:inset-0 after:z-0 block"
                  >
                    {board.name}
                  </Link>
                </h3>
                {renderRoleBadge()}
                {isShared && (
                  <Badge
                    variant="outline"
                    data-testid="board-shared-indicator"
                    className="bg-muted/60 text-muted-foreground border-border/60 text-[10px] font-semibold px-1.5 py-0 h-5 shrink-0"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              {board.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1 shrink-0">
            {onTogglePin && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={pinned ? "Unpin board" : "Pin board"}
                title={pinned ? "Unpin board" : "Pin board"}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(board);
                }}
                className={`min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-8 md:w-8 transition-opacity shrink-0 ${
                  pinned
                    ? "opacity-100 text-primary hover:text-primary/80"
                    : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Board options"
                  className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-8 md:w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {onTogglePin && (
                  <DropdownMenuItem onClick={() => onTogglePin(board)}>
                    {pinned ? (
                      <>
                        <PinOff className="h-3.5 w-3.5 mr-2" />
                        Unpin Board
                      </>
                    ) : (
                      <>
                        <Pin className="h-3.5 w-3.5 mr-2" />
                        Pin Board
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {/* Owner Menu: Edit, Leave (only if another Owner exists, else disabled with tooltip), Delete */}
                {isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(board)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>

                    {canLeave ? (
                      onLeave && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => onLeave(board)}
                        >
                          <LogOut className="h-3.5 w-3.5 mr-2" />
                          Leave Board
                        </DropdownMenuItem>
                      )
                    ) : (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <DropdownMenuItem
                                disabled
                                className="opacity-50 cursor-not-allowed text-muted-foreground focus:bg-transparent"
                                title="Transfer ownership first"
                              >
                                <LogOut className="h-3.5 w-3.5 mr-2" />
                                Leave Board
                              </DropdownMenuItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Transfer ownership first
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => onDelete(board)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}

                {/* Admin Menu: Edit, Leave */}
                {!isOwner && isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(board)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>

                    {onLeave && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => onLeave(board)}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-2" />
                        Leave Board
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                {/* Editor, Commenter, Viewer: Leave only */}
                {!isOwner && !isAdmin && (
                  onLeave && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => onLeave(board)}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" />
                      Leave Board
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground min-w-0">
            <span>
              {openCount} open {openCount === 1 ? "task" : "tasks"}
            </span>
            {overdueCount > 0 ? (
              <Badge
                variant="outline"
                data-testid="board-overdue-badge"
                className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueCount} overdue
              </Badge>
            ) : dueSoonCount > 0 ? (
              <Badge
                variant="outline"
                data-testid="board-duesoon-badge"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0 h-5 shrink-0"
              >
                <Clock className="h-3 w-3 mr-1" />
                {dueSoonCount} due soon
              </Badge>
            ) : null}
            <span>·</span>
            <span className="truncate">
              Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
            </span>
          </div>

          {membersPreview.length > 0 && (
            <div
              data-testid="board-members-preview"
              className="relative z-10 flex items-center -space-x-2 shrink-0 pointer-events-none"
            >
              {membersPreview.slice(0, 3).map((member) => (
                <Avatar
                  key={member.id}
                  title={member.fullName}
                  data-testid={`board-member-avatar-${member.id}`}
                  className="h-6 w-6 border-2 border-card text-[10px] font-semibold pointer-events-auto"
                >
                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.fullName} />}
                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                    {getInitials(member.fullName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {membersPreview.length > 3 && (
                <span
                  data-testid="board-members-overflow"
                  className="inline-flex items-center justify-center h-6 w-6 rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground pointer-events-auto"
                >
                  +{membersPreview.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

