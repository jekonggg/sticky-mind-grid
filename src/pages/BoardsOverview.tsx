import { useState } from "react";
import { useBoards, SortOption } from "@/hooks/useBoards";
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
import { Plus, Search, LayoutGrid, Mail, Check, X, Shield, User, Eye, Loader2, Sparkles } from "lucide-react";
import { BoardsHeroBanner } from "@/components/boards/BoardsHeroBanner";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function BoardsOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { boards, loading, search, setSearch, sort, setSort, createBoard, updateBoard, deleteBoard } = useBoards();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  // Fetch pending invitations
  const { data: invitations = [], isLoading: isInvitesLoading } = useQuery<BoardInvitation[]>({
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

  const handleEdit = (board: Board) => {
    setEditingBoard(board);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingBoard(null);
    setModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
      case "viewer":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30 text-[10px]"><Eye className="h-3 w-3 mr-1" /> Viewer</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]"><User className="h-3 w-3 mr-1" /> Member</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BoardHeader showSearch={false} />
      <BoardsHeroBanner />

      {/* Toolbox */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 md:-mt-12 relative z-10">
        <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl shadow-xl p-4 md:p-6 mb-8">
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
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="mb-8 p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Pending Board Invitations ({invitations.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-card p-4 rounded-xl border border-border/80 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20">
                      {invite.board.emoji || "📋"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate">
                          {invite.board.name}
                        </h4>
                        {getRoleBadge(invite.role)}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Invited by <span className="font-semibold text-foreground">{invite.board.ownerName || "Board Owner"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate(invite.boardId)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
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
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/60 cursor-pointer"
                    >
                      {declineMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-lg" />
            ))}
          </div>
        ) : boards.length === 0 && !search ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
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
        ) : boards.length === 0 && search ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground">No boards matching "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                taskCount={board.taskCount || 0}
                onEdit={handleEdit}
                onDelete={setDeletingBoard}
              />
            ))}
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
