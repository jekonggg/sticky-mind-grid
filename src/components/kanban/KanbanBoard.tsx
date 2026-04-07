import { useState, useCallback, useRef, useEffect } from "react";
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
import { Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useNavigate } from "react-router-dom";
import { boardApi } from "@/services/boardApi";
import { Board } from "@/types/board";
import { BoardHeroImage } from "../boards/BoardHeroImage";

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    if (!boardId) {
      navigate("/");
      return;
    }
    boardApi.getBoard(boardId).then((b) => {
      if (!b) {
        navigate("/");
        return;
      }
      setBoard(b);
    });
  }, [boardId, navigate]);

  const {
    loading,
    tasks,
    columns,
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    addColumn,
    getTasksByStatus,
  } = useTasks(boardId || "");

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addColumn(newColumnTitle.trim());
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

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
    [moveTask, columns]
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
    [moveTask, columns]
  );

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const openNewModal = useCallback(() => {
    setEditingTask(null);
    setModalOpen(true);
  }, []);

  if (loading || !board) {
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
      <div className="relative h-32 md:h-48 shrink-0 overflow-hidden">
        <BoardHeroImage
          src={board.heroImageUrl}
          alt={board.name}
          color={board.color}
          className="h-full"
          aspectRatio="auto"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-2xl">
                {board.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <BoardHeader
        onAddTask={openNewModal}
        onOpenActivity={() => setIsActivityOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0 relative group/board">
        {/* Scroll Buttons */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/board:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-lg border h-10 w-10 bg-background/80 backdrop-blur-sm"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
        <div className="absolute right-[330px] top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover/board:opacity-100 transition-opacity hidden lg:block">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shadow-lg border h-10 w-10 bg-background/80 backdrop-blur-sm"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <main
          ref={scrollRef}
          className="flex-1 overflow-x-auto p-4 md:p-6 min-w-0 scrollbar-hide"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 md:gap-6 h-full min-w-max pb-4">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  tasks={getTasksByStatus(col.id)}
                  onTaskClick={handleTaskClick}
                />
              ))}

              {/* Add Column Button/Form */}
              <div className="w-80 shrink-0">
                {isAddingColumn ? (
                  <form
                    onSubmit={handleAddColumn}
                    className="bg-muted/40 rounded-lg p-3 border border-border/50 animate-in fade-in zoom-in duration-200"
                  >
                    <Input
                      autoFocus
                      placeholder="Column title..."
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      className="bg-background mb-2"
                      onBlur={() => !newColumnTitle && setIsAddingColumn(false)}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm">
                        Add Column
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingColumn(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-dashed border-border transition-all group"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    <span className="text-sm font-medium">Add Column</span>
                  </button>
                )}
              </div>
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
