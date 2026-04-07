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
import { Task, TaskStatus, CreateTaskData } from "@/types/task";
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

import { BoardOverview } from "./BoardOverview";
import { TaskListView } from "./TaskListView";
import { CalendarView } from "./CalendarView";
import { DocumentsView } from "./DocumentsView";

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
  } = useTasks(boardId || "", board?.columns);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState(true); // Default open
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<"overview" | "list" | "board" | "calendar" | "documents">("board");

  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleBoardUpdate = async (data: any) => {
    if (!boardId) return;
    try {
      const updated = await boardApi.updateBoard(boardId, data);
      setBoard(updated);
      toast.success("Board updated");
    } catch (error) {
      toast.error("Failed to update board");
    }
  };

  const handleRenameColumn = async (id: string, newTitle: string) => {
    if (!board) return;
    const updatedColumns = board.columns.map(c => c.id === id ? { ...c, title: newTitle } : c);
    handleBoardUpdate({ columns: updatedColumns });
  };

  const handleAddNewState = async () => {
    if (!board) return;
    const newId = `col_${Date.now()}`;
    const archiveCol = board.columns.find(c => c.id === 'archive');
    const baseCols = board.columns.filter(c => c.id !== 'archive');
    const updatedColumns = [...baseCols, { id: newId, title: "New State" }];
    if (archiveCol) updatedColumns.push(archiveCol);
    handleBoardUpdate({ columns: updatedColumns });
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
        const visibleCols = columns.filter((c) => c.id !== "archive");
        let newProgress = activeData.progress;
        
        if (overStatus === 'done' || overStatus === visibleCols[visibleCols.length - 1].id) {
          newProgress = 100;
        } else if (overStatus === 'todo' || overStatus === visibleCols[0].id) {
          newProgress = 0;
        } else if (overStatus === 'in_progress') {
          newProgress = 30;
        } else if (activeData.progress === 100 || activeData.progress <= 10) {
          newProgress = 50; 
        }

        updateTask(activeData.id, { status: overStatus, progress: newProgress });
      }
    },
    [updateTask, columns]
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
        const visibleCols = columns.filter((c) => c.id !== "archive");
        let newProgress = activeData.progress;
        
        if (overStatus === 'done' || overStatus === visibleCols[visibleCols.length - 1].id) {
          newProgress = 100;
        } else if (overStatus === 'todo' || overStatus === visibleCols[0].id) {
          newProgress = 0;
        } else if (overStatus === 'in_progress') {
          newProgress = 30;
        } else if (activeData.progress === 100 || activeData.progress <= 10) {
          newProgress = 50;
        }

        updateTask(activeData.id, { status: overStatus, progress: newProgress });
      }
    },
    [updateTask, columns]
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

  // All tasks matching search (for non-kanban views)
  const filteredAllTasks = tasks.filter(t => 
    !searchTerm.trim() || 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !board) {
    return (
      <div className="flex flex-col h-screen bg-background">
      <BoardHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const views = [
    { id: "overview", label: "Overview" },
    { id: "board", label: "Board" },
    { id: "list", label: "List" },
    { id: "calendar", label: "Calendar" },
    { id: "documents", label: "Documents" },
  ] as const;

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return <BoardOverview board={board} tasks={tasks} />;
      case "list":
        return <TaskListView tasks={filteredAllTasks} onTaskClick={handleTaskClick} />;
      case "calendar":
        return <CalendarView tasks={filteredAllTasks} onTaskClick={handleTaskClick} />;
      case "documents":
        return <DocumentsView tasks={filteredAllTasks} onTaskClick={handleTaskClick} />;
      case "board":
      default:
        return (
          <main ref={scrollRef} className="p-6 md:p-8 overflow-x-auto h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 md:gap-8 h-full min-w-max pb-4">
                {columns
                  .filter((col) => col.id !== "archive")
                  .map((col) => (
                    <KanbanColumn
                      key={col.id}
                      id={col.id}
                      title={col.title}
                      tasks={filteredTasksByStatus(col.id)}
                      onTaskClick={handleTaskClick}
                      onRename={handleRenameColumn}
                    />
                  ))}

                <div className="w-80 shrink-0">
                  <button
                    onClick={handleAddNewState}
                    className="w-full flex items-center justify-center gap-2 p-4 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl border border-dashed border-border/60 transition-all group bg-white/40"
                  >
                    <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                    <span className="text-sm font-bold">New State</span>
                  </button>
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
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      <BoardHeader search={searchTerm} onSearchChange={setSearchTerm} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Scrollable View Container */}
        <div className="flex-1 overflow-y-scroll overflow-x-hidden min-h-0 custom-scrollbar flex flex-col [scrollbar-gutter:stable]">
          <div className="relative h-48 md:h-56 shrink-0 overflow-hidden">
            <BoardHeroImage src={board.heroImageUrl} alt={board.name} color={board.color} className="h-full w-full" aspectRatio="auto" />
          </div>

          {/* Board Identity & Navigation Section */}
          <div className="bg-background border-b border-border/50 shrink-0">
            <div className="px-6 py-5 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1600px] mx-auto w-full">
              
              {/* Left: Title & Description */}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-3xl font-black text-foreground tracking-tight truncate">
                    {board.name}
                  </h1>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-muted transition-colors shrink-0" 
                    onClick={() => setIsBoardModalOpen(true)} 
                    title="Board Settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {board.description && (
                  <p className="text-[11px] md:text-xs font-medium text-muted-foreground leading-tight max-w-2xl text-pretty opacity-70">
                    {board.description}
                  </p>
                )}
              </div>

              {/* Right: Pill-style Tab Switcher */}
              <div className="flex items-center p-1 bg-muted/40 backdrop-blur-sm rounded-full border border-border/40 shadow-inner group/tabs shrink-0">
                {views.map((view) => (
                  <button 
                    key={view.id} 
                    onClick={() => setActiveView(view.id)} 
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest transition-all rounded-full relative z-10 
                      ${activeView === view.id 
                        ? "text-primary-foreground shadow-lg scale-105" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {activeView === view.id && (
                      <div className="absolute inset-0 bg-primary rounded-full -z-10 shadow-[0_0_15px_rgba(var(--primary),0.3)] animate-in zoom-in-95 duration-200" />
                    )}
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active View Content Container */}
          <div className="flex-1 bg-muted/20 min-h-[500px]">
            {renderActiveView()}
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

      {/* Floating Action Button (FAB) */}
      <Button
        onClick={openNewModal}
        className="fixed bottom-8 right-8 h-14 w-14 hover:w-40 rounded-full shadow-2xl shadow-primary/20 flex items-center justify-center group/fab hover:scale-105 active:scale-95 transition-all duration-500 ease-out z-50 bg-primary hover:bg-primary/90 overflow-hidden px-0 border-4 border-background"
        title="Create New Task"
      >
        <div className="flex items-center justify-center w-full h-full relative">
           <Plus className="h-6 w-6 text-primary-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 group-hover/fab:rotate-90 group-hover/fab:left-6" />
           <span className="text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] whitespace-nowrap absolute left-14 opacity-0 group-hover/fab:opacity-100 translate-x-4 group-hover/fab:translate-x-0 transition-all duration-500 ease-out delay-75">
             Add Task
           </span>
        </div>
      </Button>

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
        columns={board.columns}
        onSubmit={(data) => {
          if (editingTask) {
            updateTask(editingTask.id, data);
          } else {
            addTask(data as CreateTaskData);
          }
        }}
        onDelete={deleteTask}
      />
    </div>
  );
}
