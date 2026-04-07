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
import { Plus, Search, LayoutGrid } from "lucide-react";
import { BoardsHeroBanner } from "@/components/boards/BoardsHeroBanner";
import { BoardHeader } from "@/components/kanban/BoardHeader";

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
