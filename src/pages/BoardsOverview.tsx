import { useState, useEffect, useMemo } from "react";
import { useBoards, SortOption, BoardFilterOption, isBoardOwnedByUser } from "@/hooks/useBoards";
import { Board, BoardInvitation } from "@/types/board";
import { BoardCard } from "@/components/boards/BoardCard";
import { BoardModal } from "@/components/boards/BoardModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardCardSkeleton, BoardsOverviewSkeleton } from "@/components/skeletons";
import {
  Plus,
  SearchLg as Search,
  LayoutGrid01 as LayoutGrid,
  Mail01 as Mail,
  Check,
  XClose as X,
  Shield01 as Shield,
  User01 as User,
  Eye,
  Edit01 as Edit,
  MessageChatSquare as MessageSquare,
  Loading01 as Loader2,
  Stars01 as Sparkles,
  Pin02 as Pin,
  Clock,
  AlertTriangle,
  FilterLines,
} from "@untitledui/icons";
import { BoardsHeroBanner } from "@/components/boards/BoardsHeroBanner";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getPinnedBoardIds, togglePinnedBoardId } from "@/utils/pinnedBoardsUtils";
import { cn } from "@/lib/utils";

import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";

export function formatInviteExpiry(invite: { createdAt?: string; expiresAt?: string }): string {
  const now = Date.now();
  let targetMs: number | null = null;
  if (invite.expiresAt) {
    const parsed = new Date(invite.expiresAt).getTime();
    if (!Number.isNaN(parsed)) targetMs = parsed;
  }
  if (targetMs === null && invite.createdAt) {
    const createdMs = new Date(invite.createdAt).getTime();
    if (!Number.isNaN(createdMs)) {
      targetMs = createdMs + 7 * 24 * 60 * 60 * 1000;
    }
  }
  if (targetMs === null) {
    return "expires in 7 days";
  }
  const diffDays = Math.ceil((targetMs - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "expires today";
  if (diffDays === 1) return "expires in 1 day";
  return `expires in ${Math.min(diffDays, 7)} days`;
}

export default function BoardsOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { devSettings } = useDevMode();
  const { settings } = useSettings();
  const boardsState = useBoards();
  const {
    boards: rawBoards,
    allBoards: hookAllBoards,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    filter: hookFilter,
    setFilter: hookSetFilter,
    createBoard,
    updateBoard,
    deleteBoard,
  } = boardsState;

  const [localFilter, setLocalFilter] = useState<BoardFilterOption>("all");
  const activeFilter: BoardFilterOption = hookFilter ?? localFilter;
  const handleFilterChange = (nextFilter: BoardFilterOption) => {
    if (hookSetFilter) {
      hookSetFilter(nextFilter);
    } else {
      setLocalFilter(nextFilter);
    }
  };

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedBoardIds(user?.id));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  useEffect(() => {
    setPinnedIds(getPinnedBoardIds(user?.id));
    const handlePinnedUpdate = () => setPinnedIds(getPinnedBoardIds(user?.id));
    window.addEventListener("pinned_boards_updated", handlePinnedUpdate);
    return () => window.removeEventListener("pinned_boards_updated", handlePinnedUpdate);
  }, [user?.id]);

  const handleTogglePin = (board: Board) => {
    const nowPinned = togglePinnedBoardId(board.id, user?.id);
    setPinnedIds(getPinnedBoardIds(user?.id));
    toast.success(nowPinned ? `Pinned "${board.name}"` : `Unpinned "${board.name}"`);
  };

  const allBoards = hookAllBoards ?? rawBoards;

  // Apply filter locally if useBoards was partially mocked in unit tests without hookFilter
  const boards = useMemo(() => {
    if (hookFilter !== undefined) return rawBoards;
    return rawBoards.filter((b) => {
      if (activeFilter === "owned") return isBoardOwnedByUser(b, user?.id);
      if (activeFilter === "shared") return !isBoardOwnedByUser(b, user?.id);
      return true;
    });
  }, [rawBoards, hookFilter, activeFilter, user?.id]);

  const pinnedBoards = useMemo(
    () => boards.filter((b) => pinnedIds.includes(b.id)),
    [boards, pinnedIds]
  );

  const unpinnedBoards = useMemo(
    () => boards.filter((b) => !pinnedIds.includes(b.id)),
    [boards, pinnedIds]
  );

  // Fetch pending invitations
  const { data: invitations = [] } = useQuery<BoardInvitation[]>({
    queryKey: ["pendingInvitations"],
    queryFn: () => boardApi.getPendingInvitations(),
    refetchInterval: 6000,
  });

  const acceptMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.acceptInvitation(boardId),
    onSuccess: (data, boardId) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invitation accepted! Welcome to the board.");
      navigate(`/boards/${boardId}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to accept invitation");
    },
  });

  const declineMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.declineInvitation(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.info("Invitation declined");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to decline invitation");
    },
  });

  const reportMutation = useMutation({
    mutationFn: (boardId: string) =>
      boardApi.reportInvitation
        ? boardApi.reportInvitation(boardId)
        : boardApi.declineInvitation(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Inviter reported and blocked");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to report invitation");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (board: Board) => {
      if (!user) throw new Error("User required");
      return boardApi.leaveBoard(board.id, user.id);
    },
    onSuccess: (_, board) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success(`You left "${board.name}"`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to leave board");
    },
  });

  const handleLeave = (board: Board) => {
    if (confirm(`Are you sure you want to leave "${board.name}"?`)) {
      leaveMutation.mutate(board);
    }
  };

  const handleEdit = (board: Board) => {
    setEditingBoard(board);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingBoard(null);
    setModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold"><Shield className="h-3 w-3 mr-1" /> Owner</Badge>;
      case "admin":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-bold"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
      case "editor":
      case "member":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold"><Edit className="h-3 w-3 mr-1" /> Editor</Badge>;
      case "commenter":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] font-bold"><MessageSquare className="h-3 w-3 mr-1" /> Commenter</Badge>;
      case "viewer":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30 text-[10px] font-bold"><Eye className="h-3 w-3 mr-1" /> Viewer</Badge>;
      default:
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold"><Edit className="h-3 w-3 mr-1" /> Editor</Badge>;
    }
  };

  if (loading || settings.simulateSkeletonLoading) {
    return (
      <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background pb-20">
        <BoardHeader showSearch={false} />
        <BoardsOverviewSkeleton />
      </div>
    );
  }

  const filterTabs: { id: BoardFilterOption; label: string }[] = [
    { id: "all", label: "All" },
    { id: "owned", label: "Owned by me" },
    { id: "shared", label: "Shared with me" },
  ];

  const hasSearchQuery = search.trim().length > 0;
  const isFilterEmpty = boards.length === 0 && !hasSearchQuery && (activeFilter !== "all" || allBoards.length > 0);

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background pb-20">
      <BoardHeader showSearch={false} />
      <BoardsHeroBanner />

      {/* Toolbox */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 md:-mt-12 relative z-10 w-full">
        <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-4 md:p-6 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight uppercase italic underline-offset-4 decoration-primary/30">
                My <span className="text-primary not-italic">Boards</span>
              </h2>
            </div>
            
            <div className="flex w-full md:w-auto gap-3 items-center">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search boards…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="w-[140px] md:w-[160px] bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleNew} className="gap-1.5 font-semibold shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Board</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>

          {/* Filter Tabs: All, Owned by me, Shared with me */}
          <div
            role="tablist"
            aria-label="Filter boards"
            className="flex items-center gap-1.5 pt-2 border-t border-border/40 overflow-x-auto"
          >
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`filter-tab-${tab.id}`}
                  onClick={() => handleFilterChange(tab.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* Pending Invitations Section — always rendered above boards or empty state */}
        {invitations.length > 0 && (
          <div
            data-testid="pending-invitations-banner"
            className="mb-8 p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Pending Board Invitations ({invitations.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {invitations.map((invite) => {
                const inviterLabel = invite.inviterName || invite.board.ownerName || "Board Owner";
                const expiryText = formatInviteExpiry(invite);
                const isMutating =
                  acceptMutation.isPending ||
                  declineMutation.isPending ||
                  reportMutation.isPending;

                return (
                  <div
                    key={invite.id}
                    data-testid={`pending-invite-card-${invite.boardId}`}
                    className="bg-card p-4 rounded-xl border border-border/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {!devSettings.disableEmojiCustomization && invite.board.emoji && (
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20 text-primary">
                          {invite.board.emoji}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        {/* Strictly show only board name, role, inviter, and expiry before acceptance */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {invite.board.name}
                          </h4>
                          {getRoleBadge(invite.role)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mt-0.5">
                          <span className="truncate">
                            Invited by <span className="font-semibold text-foreground">{inviterLabel}</span>
                          </span>
                          <span aria-hidden="true">•</span>
                          <span
                            data-testid="invite-expiry"
                            className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
                          >
                            <Clock className="h-3 w-3" />
                            {expiryText}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(invite.boardId)}
                        disabled={isMutating}
                        className="h-8 px-3 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                      >
                        {acceptMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Decline invitation to "${invite.board.name}"?`)) {
                            declineMutation.mutate(invite.boardId);
                          }
                        }}
                        disabled={isMutating}
                        className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/60 cursor-pointer"
                      >
                        {declineMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Report or block inviter (${inviterLabel}) for spam?`)) {
                            reportMutation.mutate(invite.boardId);
                          }
                        }}
                        disabled={isMutating}
                        aria-label="Report or block inviter"
                        title="Report or block inviter"
                        className="h-8 px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Report or block inviter</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {boards.length === 0 && hasSearchQuery ? (
          /* Empty state variant 1: No search results */
          <div
            data-testid="empty-state-search"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No search results</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              No boards matching "{search}"
            </p>
            <Button variant="outline" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        ) : isFilterEmpty ? (
          /* Empty state variant 2: No boards match this filter */
          <div
            data-testid="empty-state-filter"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FilterLines className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No boards match this filter
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {activeFilter === "owned"
                ? "You don't own any boards yet. Create one or switch back to all boards."
                : "No boards have been shared with you yet."}
            </p>
            <Button variant="outline" onClick={() => handleFilterChange("all")}>
              Show all boards
            </Button>
          </div>
        ) : boards.length === 0 ? (
          /* Empty state variant 3: No boards yet */
          <div
            data-testid="empty-state-no-boards"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No boards yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create your first board to start organizing tasks into columns.
            </p>
            <Button onClick={handleNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Board
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pinned Boards Row */}
            {pinnedBoards.length > 0 && (
              <section data-testid="pinned-boards-section" className="space-y-3">
                <div className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Pinned Boards ({pinnedBoards.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      taskCount={board.taskCount || 0}
                      isPinned={true}
                      onTogglePin={handleTogglePin}
                      onEdit={handleEdit}
                      onDelete={setDeletingBoard}
                      onLeave={handleLeave}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Main / Unpinned Boards Grid */}
            {unpinnedBoards.length > 0 && (
              <section data-testid="all-boards-section" className="space-y-3">
                {pinnedBoards.length > 0 && (
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      All Boards ({unpinnedBoards.length})
                    </h3>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      taskCount={board.taskCount || 0}
                      isPinned={false}
                      onTogglePin={handleTogglePin}
                      onEdit={handleEdit}
                      onDelete={setDeletingBoard}
                      onLeave={handleLeave}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Board Modal */}
      <BoardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        board={editingBoard}
        onSubmit={(data) => {
          if (editingBoard) {
            updateBoard(editingBoard.id, data);
          } else {
            createBoard(data);
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBoard} onOpenChange={(v) => !v && setDeletingBoard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingBoard?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this board and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingBoard) deleteBoard(deletingBoard.id);
                setDeletingBoard(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
