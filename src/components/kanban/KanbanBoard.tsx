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
import { Loader2, Plus, Home, PanelRightClose, PanelRightOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useNavigate } from "react-router-dom";
import { boardApi } from "@/services/boardApi";
import { Board } from "@/types/board";
import { BoardHeroImage } from "../boards/BoardHeroImage";
import { BoardModal } from "../boards/BoardModal";
import { toast } from "sonner";

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

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
  const [isActivityOpen, setIsActivityOpen] = useState(true); // Default open
  const [searchTerm, setSearchTerm] = useState("");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addColumn(newColumnTitle.trim());
    setNewColumnTitle("");
    setIsAddingColumn(false);
  };

  const handleBoardUpdate = async (data: any) => {
    if (!boardId) return;
    try {
      const updated = await boardApi.updateBoard(boardId, data);
      setBoard(updated);
      toast.success("Board details updated");
    } catch (error) {
      toast.error("Failed to update board");
    }
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

  const filteredTasksByStatus = useCallback((status: string) => {
    const statusTasks = getTasksByStatus(status);
    if (!searchTerm.trim()) return statusTasks;
    
    return statusTasks.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [getTasksByStatus, searchTerm]);

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
      <BoardHeader
        onAddTask={openNewModal}
        search={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Scrollable (Hero + Task Grid) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar flex flex-col">
          {/* Expanded Hero Image */}
          <div className="relative h-48 md:h-64 shrink-0 overflow-hidden">
            <BoardHeroImage
              src={board.heroImageUrl}
              alt={board.name}
              color={board.color}
              className="h-full w-full"
              aspectRatio="auto"
            />
          </div>

          {/* Board Title & Description Section (Below Image) */}
          <div className="px-6 py-8 md:px-10 bg-background border-b border-border/50 shrink-0">
            <div className="flex flex-col gap-1.5 max-w-4xl">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                  {board.name}
                </h1>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full hover:bg-muted transition-colors shrink-0"
                  onClick={() => setIsBoardModalOpen(true)}
                  title="Board Settings"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
              {board.description && (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl text-pretty">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          {/* Kanban Workspace Grid */}
          <div className="flex-1 bg-muted/20 min-h-[500px]">
            <main
              ref={scrollRef}
              className="p-6 md:p-8 overflow-x-auto h-full"
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-6 md:gap-8 h-full min-w-max pb-4">
                  {columns
                    .filter(col => col.id !== "archive")
                    .map((col) => (
                      <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={filteredTasksByStatus(col.id)}
                        onTaskClick={handleTaskClick}
                      />
                  ))}

                  {/* Add Column Button/Form */}
                  <div className="w-80 shrink-0">
                    {isAddingColumn ? (
                      <form
                        onSubmit={handleAddColumn}
                        className="bg-background rounded-xl p-4 border border-border shadow-sm animate-in fade-in zoom-in duration-200"
                      >
                        <Input
                          autoFocus
                          placeholder="Column title..."
                          value={newColumnTitle}
                          onChange={(e) => setNewColumnTitle(e.target.value)}
                          className="mb-3"
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
                        className="w-full flex items-center justify-center gap-2 p-4 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl border border-dashed border-border/60 transition-all group bg-white/40"
                      >
                        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                        <span className="text-sm font-bold">New State</span>
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
          </div>
        </div>

        {/* Right Side: Fixed Sidebar (Activity) */}
        <aside 
          className={`hidden lg:flex flex-col h-full shrink-0 border-l border-border bg-card shadow-xl transition-all duration-300 ease-in-out relative ${
            isActivityOpen ? "w-[340px]" : "w-6"
          }`}
        >
          {/* Local Toggle Button (Bar Style) */}
          <button
            onClick={() => setIsActivityOpen(!isActivityOpen)}
            className="absolute -left-3 top-8 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center z-20 shadow-md hover:bg-muted transition-all active:scale-95"
            title={isActivityOpen ? "Collapse Activity" : "Expand Activity"}
          >
            {isActivityOpen ? (
              <PanelRightClose className="h-3 w-3 text-muted-foreground" />
            ) : (
              <PanelRightOpen className="h-3 w-3 text-primary" />
            )}
          </button>
          
          <div className={`flex-1 overflow-hidden transition-opacity duration-300 flex flex-col ${isActivityOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className="p-4 border-b bg-muted/30 shrink-0">
               <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                  Recent Activity
               </h2>
            </div>
            <div className="flex-1 overflow-hidden">
               <LatestChangesPanel />
            </div>
          </div>
          
          {!isActivityOpen && (
            <div className="absolute inset-y-0 left-0 right-0 flex flex-col items-center py-20 pointer-events-none select-none opacity-40">
               <div className="rotate-90 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Activity Feed
               </div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile Activity Drawer (Hidden on Desktop Sidebar view) */}
      <Sheet open={isActivityOpen && !window.matchMedia("(min-width: 1024px)").matches} onOpenChange={setIsActivityOpen}>
        <SheetContent side="right" className="p-0 w-[85%] sm:w-[400px]">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Recent Activity</SheetTitle>
          </SheetHeader>
          <div className="h-full overflow-hidden">
             <LatestChangesPanel />
          </div>
        </SheetContent>
      </Sheet>

      <BoardModal
        open={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        board={board}
        onSubmit={handleBoardUpdate}
      />

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
