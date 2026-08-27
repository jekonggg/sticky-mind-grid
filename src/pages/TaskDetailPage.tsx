import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { taskApi } from "@/services/api";
import { boardApi } from "@/services/boardApi";
import { Task, Priority, ChecklistItem, Tag, Attachment, Column } from "@/types/task";
import { Board, BoardMember } from "@/types/board";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { useActivity } from "@/hooks/useActivity";
import { useSettings } from "@/contexts/SettingsContext";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TaskDetailPage() {
  const { boardId, taskId } = useParams<{ boardId: string; taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { playSound } = useSettings();
  const { addActivity, setBoardId } = useActivity();

  const [task, setTask] = useState<Task | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set active board ID for activity context
  useEffect(() => {
    if (boardId) {
      setBoardId(boardId);
    }
  }, [boardId, setBoardId]);

  // Fetch Board Members
  const { data: members = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", boardId],
    queryFn: () => (boardId ? boardApi.getMembers(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  });

  // Calculate permissions
  const permissions = useBoardPermissions(board, members);

  // Load Task & Board data
  useEffect(() => {
    if (!boardId || !taskId) {
      navigate("/");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      boardApi.getBoard(boardId),
      taskApi.getTask(taskId),
    ])
      .then(([boardData, taskData]) => {
        if (!isMounted) return;
        if (!boardData) {
          setError("Board not found");
          setIsLoading(false);
          return;
        }
        if (!taskData) {
          setError("Task not found or has been deleted");
          setIsLoading(false);
          return;
        }
        setBoard(boardData);
        setTask(taskData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load task details:", err);
        setError("Failed to load task details. You might not have access to this board.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [boardId, taskId, navigate]);

  // Real-time SSE updates for task & board
  useBoardRealtime({
    boardId: boardId || "",
    onTaskUpdate: (updatedTask: Task) => {
      if (updatedTask.id === taskId) {
        setTask((prev) => (prev ? { ...prev, ...updatedTask } : updatedTask));
      }
    },
    onTaskDelete: (deletedTaskId: string) => {
      if (deletedTaskId === taskId) {
        toast.info("This task was deleted by another user");
        navigate(`/boards/${boardId}`);
      }
    },
  });

  // Keyboard shortcut: Escape to return to board
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          navigate(`/boards/${boardId}`);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [boardId, navigate]);

  // Debounced / immediate update dispatcher
  const saveTaskUpdates = useCallback(
    async (updates: Partial<Task>, logActivity = false, activityMsg = "") => {
      if (!taskId || permissions.isReadOnly) return;

      // Optimistically update local state
      setTask((prev) => (prev ? { ...prev, ...updates } : null));

      try {
        await taskApi.updateTask(taskId, updates as any);
        if (logActivity && activityMsg && boardId) {
          addActivity("update", updates.title || task?.title || "Task", activityMsg, boardId);
        }
      } catch (err: any) {
        toast.error("Failed to save changes");
        console.error("Update task error:", err);
      }
    },
    [taskId, permissions.isReadOnly, boardId, task?.title, addActivity]
  );

  // Field change handlers
  const handleTitleChange = (newTitle: string) => {
    setTask((prev) => (prev ? { ...prev, title: newTitle } : null));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveTaskUpdates({ title: newTitle }, true, `Renamed task to "${newTitle}"`);
    }, 600);
  };

  const handleDescriptionChange = (newDesc: string) => {
    setTask((prev) => (prev ? { ...prev, description: newDesc } : null));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveTaskUpdates({ description: newDesc });
    }, 800);
  };

  const handleEmojiChange = (newEmoji: string) => {
    saveTaskUpdates({ emoji: newEmoji });
  };

  const handleStatusChange = (newStatus: string) => {
    const colName = board?.columns?.find((c) => c.id === newStatus)?.title || newStatus;
    saveTaskUpdates({ status: newStatus }, true, `Moved task to ${colName}`);
    playSound("move");
    toast.success(`Status updated to ${colName}`);
  };

  const handlePriorityChange = (newPriority: Priority) => {
    saveTaskUpdates({ priority: newPriority }, true, `Changed priority to ${newPriority}`);
    toast.success(`Priority set to ${newPriority}`);
  };

  const handleAssigneeChange = (newUserId: string) => {
    const assignedUser = members.find((m) => m.userId === newUserId);
    const name = assignedUser?.user?.fullName || assignedUser?.user?.email || "Unassigned";
    saveTaskUpdates({ assignedTo: newUserId }, true, `Assigned task to ${name}`);
    toast.success(`Assigned to ${name}`);
  };

  const handleDueDateChange = (newDueDate: string) => {
    saveTaskUpdates({ dueDate: newDueDate ? new Date(newDueDate) : undefined });
  };

  const handleProgressChange = (newProgress: number) => {
    saveTaskUpdates({ progress: newProgress });
  };

  const handleTagsChange = (newTags: Tag[]) => {
    saveTaskUpdates({ tags: newTags });
  };

  const handleChecklistChange = (newChecklist: ChecklistItem[]) => {
    saveTaskUpdates({ checklist: newChecklist });
  };

  const handleAttachmentsChange = (newAttachments: Attachment[]) => {
    saveTaskUpdates({ attachments: newAttachments });
  };

  const handleDeleteTask = async () => {
    if (!taskId || !boardId || permissions.isReadOnly) return;
    try {
      await taskApi.deleteTask(taskId);
      addActivity("delete", task?.title || "Task", `Moved task "${task?.title}" to trash`, boardId);
      toast.success("Task moved to trash");
      navigate(`/boards/${boardId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  if (error || !task || !board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">Unable to Open Task</h2>
          <p className="text-xs text-muted-foreground">{error || "Task not found."}</p>
          <Button onClick={() => navigate(boardId ? `/boards/${boardId}` : "/")} className="gap-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Board</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      <TaskDetailWorkspace
        task={task}
        board={board}
        members={members}
        readOnly={permissions.isReadOnly}
        onClose={() => navigate(`/boards/${board.id}`)}
        onUpdateTask={(updates) => saveTaskUpdates(updates)}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
