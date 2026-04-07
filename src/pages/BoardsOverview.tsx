import { useState } from "react";
import { useBoards, SortOption } from "@/hooks/useBoards";
import { Board } from "@/types/board";
import { BoardCard } from "@/components/boards/BoardCard";
import { BoardModal } from "@/components/boards/BoardModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, LayoutDashboard } from "lucide-react";

// Mock task counts per board – in a real app this would come from the API
const MOCK_TASK_COUNTS: Record<string, number> = {
  "board-1": 3,
  "board-2": 2,
  "board-3": 0,
};

export default function BoardsOverview() {
  const { boards, loading, search, setSearch, sort, setSort, createBoard, updateBoard, deleteBoard } = useBoards();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  const handleEdit = (board: Board) => {
    setEditingBoard(board);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingBoard(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground tracking-tight">My Boards</h1>
            </div>
            <Button onClick={handleNew} className="gap-1.5 font-semibold">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Board</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>

          {/* Search + Sort */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search boards…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
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
              <LayoutDashboard className="h-8 w-8 text-primary" />
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
                taskCount={MOCK_TASK_COUNTS[board.id] || 0}
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
