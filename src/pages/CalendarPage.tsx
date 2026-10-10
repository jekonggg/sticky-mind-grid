import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { boardApi } from "@/services/boardApi";
import { useSettings } from "@/contexts/SettingsContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { CalendarView } from "@/components/kanban/CalendarView";
import { Task, CreateTaskData, Column } from "@/types/task";
import { Board, BoardMember } from "@/types/board";
import { TaskModal } from "@/components/kanban/TaskModal";
import { TaskDetailWorkspace } from "@/components/task/TaskDetailWorkspace";
import { toast } from "sonner";
import { CalendarPageSkeleton } from "@/components/skeletons";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { devSettings } = useDevMode();
  const { settings } = useSettings();

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date>(new Date());

  // Fetch Boards
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  // Fetch all tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["globalTasks"],
    queryFn: () => taskApi.getTasks(),
  });

  // Aggregate columns across boards for emoji and color styling
  const allColumns = useMemo(() => {
    const colMap = new Map<string, Column>();
    boards.forEach((b) => {
      (b.columns || []).forEach((c) => {
        if (!colMap.has(c.id)) colMap.set(c.id, c);
      });
    });
    return Array.from(colMap.values());
  }, [boards]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const activeTaskBoard = useMemo(() => {
    if (!selectedTask) return null;
    return (
      boards.find((b) => b.id === selectedTask.boardId) || {
        id: selectedTask.boardId,
        name: selectedTask.boardName || "Workspace Board",
        emoji: devSettings.disableEmojiCustomization ? "" : (selectedTask.boardEmoji || "📋"),
        color: "#3b82f6",
        ownerId: selectedTask.createdBy || "",
        columns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }, [boards, selectedTask, devSettings.disableEmojiCustomization]);

  const { data: activeTaskBoardMembers = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", activeTaskBoard?.id],
    queryFn: () =>
      activeTaskBoard?.id ? boardApi.getMembers(activeTaskBoard.id) : Promise.resolve([]),
    enabled: !!activeTaskBoard?.id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      toast.success("Task updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData & { boardId: string }) =>
      taskApi.createTask(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
      toast.success(`Task "${newTask.title}" scheduled!`);
      setIsNewTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to schedule task");
    },
  });

  const activeTargetBoard = boards[0];

  const handleAddTask = (date?: Date) => {
    if (boards.length === 0) {
      toast.error("Please create a board first.");
      return;
    }
    setModalInitialDate(date || new Date());
    setIsNewTaskModalOpen(true);
  };

  if (isLoading || settings.simulateSkeletonLoading) {
    return (
      <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
        <BoardHeader showSearch={false} />
        <CalendarPageSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
      <BoardHeader showSearch={false} />

      <main className="flex-1 w-full pb-16">
        <CalendarView
          tasks={tasks}
          columns={allColumns}
          boards={boards}
          selectedTaskId={selectedTaskId}
          onTaskClick={(task) => setSelectedTaskId(task.id)}
          onAddTask={handleAddTask}
          scope="global"
          title="Global Calendar"
          subtitle="Track deadlines and milestone schedules across all active boards"
        />
      </main>

      {/* Screen-Wide Backdrop Dimming Overlay when Task Drawer is Open */}
      {selectedTask && activeTaskBoard && (
        <div
          data-testid="task-drawer-backdrop"
          aria-label="Close task details"
          onClick={() => setSelectedTaskId(null)}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[1.5px] z-40 transition-opacity animate-in fade-in duration-200 cursor-pointer"
        />
      )}

      {/* Right-Side Task Detail Workspace Drawer */}
      {selectedTask && activeTaskBoard && (
        <aside
          data-testid="task-detail-drawer"
          className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] lg:w-[720px] xl:w-[780px] border-l border-border bg-background shadow-2xl h-full overflow-hidden flex flex-col z-50 transition-all duration-200 animate-in slide-in-from-right duration-250 ease-out"
        >
          <TaskDetailWorkspace
            task={selectedTask}
            board={activeTaskBoard}
            members={activeTaskBoardMembers}
            readOnly={false}
            onClose={() => setSelectedTaskId(null)}
            onUpdateTask={async (updates) => {
              await updateTaskMutation.mutateAsync({
                id: selectedTask.id,
                data: updates,
              });
            }}
            onDeleteTask={async (id) => {
              try {
                await taskApi.deleteTask(id);
                queryClient.invalidateQueries({ queryKey: ["globalTasks"] });
                setSelectedTaskId(null);
                toast.success("Task deleted");
              } catch (err: any) {
                toast.error(err.message || "Failed to delete task");
              }
            }}
          />
        </aside>
      )}

      {/* Task Creation Modal */}
      {activeTargetBoard && (
        <TaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          task={null}
          boardId={activeTargetBoard.id}
          columns={activeTargetBoard.columns || [{ id: "todo", title: "To Do" }]}
          onSave={async (data) => {
            await createTaskMutation.mutateAsync({
              ...data,
              dueDate: modalInitialDate,
              boardId: activeTargetBoard.id,
            });
          }}
        />
      )}
    </div>
  );
}
