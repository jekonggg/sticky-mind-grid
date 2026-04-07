import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Task, TaskStatus } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { LatestChangesPanel } from "./LatestChangesPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BoardHeader } from "./BoardHeader";
import { Loader2 } from "lucide-react";

const columns: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export function KanbanBoard() {
  const { loading, addTask, updateTask, moveTask, deleteTask, getTasksByStatus } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current?.task as Task | undefined;
      if (!activeData) return;

      const overId = over.id as string;
      const overStatus = columns.find((c) => c.id === overId)?.id;

      if (overStatus && activeData.status !== overStatus) {
        moveTask(activeData.id, overStatus);
      }
    },
    [moveTask]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      if (!over) return;

      const activeData = active.data.current?.task as Task | undefined;
      if (!activeData) return;

      const overId = over.id as string;
      const overStatus = columns.find((c) => c.id === overId)?.id;

      if (overStatus && activeData.status !== overStatus) {
        moveTask(activeData.id, overStatus);
      }
    },
    [moveTask]
  );

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const openNewModal = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <BoardHeader onAddTask={openNewModal} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      <BoardHeader onAddTask={openNewModal} onOpenActivity={() => setIsActivityOpen(true)} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <main className="flex-1 overflow-x-auto p-4 md:p-6 min-w-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 md:gap-5 h-full min-w-max">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={getTasksByStatus(col.id)}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="drag-overlay">
                  <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>

        {/* Desktop Latest Changes Sidebar */}
        <aside className="hidden lg:block h-full shrink-0 border-l border-border bg-card shadow-lg overflow-hidden">
           <LatestChangesPanel />
        </aside>
      </div>

      {/* Mobile Activity Drawer */}
      <Sheet open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <SheetContent side="right" className="p-0 w-[85%] sm:w-[400px]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Recent Activity</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-hidden">
             <LatestChangesPanel />
          </div>
        </SheetContent>
      </Sheet>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editingTask}
        onSubmit={(data) => {
          if (editingTask) {
            updateTask(editingTask.id, data);
          } else {
            addTask(data);
          }
        }}
        onDelete={deleteTask}
      />
    </div>
  );
}
