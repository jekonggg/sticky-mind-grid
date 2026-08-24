import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { Task } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  canManage: boolean;
}

export function TrashModal({ open, onClose, boardId, canManage }: TrashModalProps) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: trashTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["trashTasks", boardId],
    queryFn: () => taskApi.getTrash(boardId),
    enabled: open && !!boardId,
  });

  const restoreMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.restoreTask(taskId),
    onSuccess: (restored) => {
      queryClient.invalidateQueries({ queryKey: ["trashTasks", boardId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", boardId] });
      toast.success(`Restored "${restored.title}"`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to restore task");
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.permanentlyDeleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trashTasks", boardId] });
      toast.success("Task permanently deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to permanently delete task");
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: () => taskApi.emptyTrash(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trashTasks", boardId] });
      toast.success("Trash bin emptied");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to empty trash");
    },
  });

  const filteredTasks = trashTasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Trash Bin ({trashTasks.length})</span>
            </DialogTitle>

            {canManage && trashTasks.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to permanently delete all items in the trash?")) {
                    emptyTrashMutation.mutate();
                  }
                }}
                disabled={emptyTrashMutation.isPending}
                className="h-8 px-3 text-xs font-bold gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Empty Trash
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Soft-deleted tasks can be restored back to the board or permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        {trashTasks.length > 0 && (
          <div className="relative pt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search deleted tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/50 border-border/60"
            />
          </div>
        )}

        {/* Deleted Tasks List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh] min-h-[160px] divide-y divide-border/30">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading trash bin...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-xs font-bold text-foreground">Trash bin is empty</p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Deleted tasks will appear here for recovery.
              </p>
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/50 text-base">
                    {t.emoji || "📝"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground truncate">{t.title}</span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-mono">
                        {t.status}
                      </Badge>
                      {t.deletedAt && (
                        <span>
                          Deleted {formatDistanceToNow(new Date(t.deletedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(t.id)}
                    disabled={restoreMutation.isPending}
                    className="h-7 px-2.5 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1"
                    title="Restore task"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Permanently delete "${t.title}"?`)) {
                          permanentDeleteMutation.mutate(t.id);
                        }
                      }}
                      disabled={permanentDeleteMutation.isPending}
                      className="h-7 px-2 text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Permanently delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 px-4 text-xs font-bold ml-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
