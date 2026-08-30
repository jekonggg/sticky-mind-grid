import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { TrashModal } from "./TrashModal";
import { BoardHeader } from "./BoardHeader";
import { TaskDetailWorkspace } from "../task/TaskDetailWorkspace";
import { arrayMove } from "@dnd-kit/sortable";
import { 
  Loader2, 
  Plus, 
  Settings, 
  Smile, 
  Pencil,
  Filter,
  User,
  Users,
  Eye,
  ShieldAlert,
  Radio,
  Trash2,
  Tag as TagIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useNavigate } from "react-router-dom";
import { boardApi } from "@/services/boardApi";
import { Board, BoardMember } from "@/types/board";
import { BoardHeroImage } from "../boards/BoardHeroImage";
import { BoardModal } from "../boards/BoardModal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";

import { BoardOverview } from "./BoardOverview";
import { TaskListView } from "./TaskListView";
import { CalendarView } from "./CalendarView";
import { DocumentsView } from "./DocumentsView";
import { BoardMembers } from "../board/BoardMembers";
import { InviteMemberDialog } from "../board/InviteMemberDialog";

import { useActivity } from "@/hooks/useActivity";
import { useSettings } from "@/contexts/SettingsContext";

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { settings, playSound } = useSettings();
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

  // Fetch Board Members for Assignee & Filters
  const { data: members = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", boardId],
    queryFn: () => (boardId ? boardApi.getMembers(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  });

  const {
    loading,
    tasks,
    columns,
    addTask,
    updateTask,
    reorderTasks,
    moveTask,
    deleteTask,
    addColumn,
    fetchTasks,
    getTasksByStatus,
  } = useTasks(boardId || "", board?.columns);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // 'all' | 'me' | userId
  const [tagFilter, setTagFilter] = useState<string>("all"); // 'all' | tagName
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "list" | "board" | "calendar" | "documents" | "members">(
    (settings.defaultBoardView as any) || "board"
  );

  const [createdDraftTask, setCreatedDraftTask] = useState<Task | null>(null);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || (createdDraftTask?.id === selectedTaskId ? createdDraftTask : null);
  }, [selectedTaskId, tasks, createdDraftTask]);
  
  const { addActivity, setBoardId, refreshActivities } = useActivity();
  const scrollRef = useRef<HTMLDivElement>(null);
  const permissions = useBoardPermissions(board, members);
  const queryClient = useQueryClient();

  // Extract unique tags across tasks
  const availableTags = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    tasks.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        map.set(tag.name.toLowerCase(), tag);
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  const lastLocalEditTimeRef = useRef<number>(0);

  // Real-time Server-Sent Events (SSE) stream synchronization
  const { isConnected } = useBoardRealtime({
    boardId,
    onTaskChange: () => {
      // Suppress full board reload if the edit was made locally in this window within last 2 seconds
      if (Date.now() - lastLocalEditTimeRef.current < 2000) return;
      fetchTasks();
    },
    onActivityChange: () => refreshActivities(),
    onMemberChange: () => queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] }),
    onBoardChange: (updated) => setBoard(updated),
  });

  useEffect(() => {
    if (boardId) {
      setBoardId(boardId);
    }
    return () => setBoardId(null);
  }, [boardId, setBoardId]);

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

  const handleRenameColumn = async (id: string, newTitle: string, emoji?: string) => {
    if (!board) return;
    const oldCol = board.columns.find(c => c.id === id);
    if (!oldCol) return;
    
    if (oldCol.title === newTitle && oldCol.emoji === emoji) return;

    const updatedColumns = board.columns.map(c => c.id === id ? { ...c, title: newTitle, emoji } : c);
    
    if (oldCol.title !== newTitle) {
      addActivity("update", board.name, `Renamed state from "${oldCol.title}" ➔ "${newTitle}"`, boardId);
    }
    
    try {
      const updated = await boardApi.updateBoard(board.id, { columns: updatedColumns });
      setBoard(updated);
      toast.success("State renamed");
    } catch {
      toast.error("Failed to update state");
    }
  };

  const handleAddNewState = async () => {
    if (!board) return;
    const title = prompt("Enter state name:");
    if (!title || !title.trim()) return;

    const id = title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newCol = { id, title: title.trim(), emoji: "✨" };

    const visibleCols = board.columns.filter(c => c.id !== 'archive');
    const archiveCol = board.columns.find(c => c.id === 'archive');
    
    const updatedColumns = [...visibleCols, newCol];
    if (archiveCol) {
      updatedColumns.push(archiveCol);
    }

    addActivity("create", board.name, `Added new state "${title.trim()}"`, boardId);
    handleBoardUpdate({ columns: updatedColumns });
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      // Over styles handled by Droppable
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      if (permissions.isReadOnly || !over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const activeTaskItem = tasks.find((t) => t.id === activeId);
      if (!activeTaskItem) return;

      // Determine target column status
      const isOverColumn = columns.some((c) => c.id === overId);
      const targetStatus: TaskStatus = isOverColumn
        ? (overId as TaskStatus)
        : (tasks.find((t) => t.id === overId)?.status || activeTaskItem.status);

      // Tasks currently in the target column sorted by position
      const targetColumnTasks = tasks
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      const activeIndexInTarget = targetColumnTasks.findIndex((t) => t.id === activeId);
      const overIndexInTarget = isOverColumn
        ? targetColumnTasks.length
        : targetColumnTasks.findIndex((t) => t.id === overId);

      let newTasksInTarget: Task[];
      if (activeTaskItem.status === targetStatus) {
        // Intra-column vertical reordering
        if (activeIndexInTarget === -1 || overIndexInTarget === -1 || activeIndexInTarget === overIndexInTarget) {
          return;
        }
        newTasksInTarget = arrayMove(targetColumnTasks, activeIndexInTarget, overIndexInTarget);
      } else {
        // Inter-column movement with exact drop index insertion
        const updatedActiveTask = { ...activeTaskItem, status: targetStatus };
        const filtered = targetColumnTasks.filter((t) => t.id !== activeId);
        const insertIdx = overIndexInTarget >= 0 ? overIndexInTarget : filtered.length;
        newTasksInTarget = [
          ...filtered.slice(0, insertIdx),
          updatedActiveTask,
          ...filtered.slice(insertIdx),
        ];

        const visibleCols = columns.filter((c) => c.id !== "archive");
        const isDoneCol = targetStatus === 'done' || targetStatus === visibleCols[visibleCols.length - 1]?.id;

        if (isDoneCol) {
          playSound("complete");
        } else {
          playSound("move");
        }
      }

      // Continuous 1000-based position indices for MySQL persistence
      const reorderItems = newTasksInTarget.map((t, idx) => ({
        id: t.id,
        status: targetStatus,
        position: (idx + 1) * 1000.0,
      }));

      reorderTasks(reorderItems);
    },
    [permissions.isReadOnly, tasks, columns, reorderTasks, playSound]
  );

  const handleTaskClick = useCallback((task: Task) => {
    setCreatedDraftTask(null);
    setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
  }, []);

  const openNewModal = useCallback(async (targetStatus?: TaskStatus) => {
    if (!permissions.canCreateTask || !board) return;
    try {
      const defaultStatus = targetStatus || (board.columns && board.columns.length > 0 ? board.columns[0].id : "todo");
      const newTask = await addTask({
        title: "Untitled Task",
        status: defaultStatus,
        priority: "medium",
      });
      if (newTask && newTask.id) {
        setCreatedDraftTask(newTask);
        setSelectedTaskId(newTask.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    }
  }, [permissions.canCreateTask, board, addTask]);

  // Filter task matching search query, assignee filter, and tag filter
  const isTaskMatchingFilters = useCallback(
    (t: Task) => {
      // Search matching
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) || false;
        const matchesTag = (t.tags || []).some((tag) => tag.name.toLowerCase().includes(query));
        const matchesAssignee = (t.assignee?.fullName || t.assignee?.email || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesAssignee) return false;
      }

      // Assignee filtering
      if (assigneeFilter === "me") {
        if (!currentUser || t.assignedTo !== currentUser.id) return false;
      } else if (assigneeFilter !== "all") {
        if (t.assignedTo !== assigneeFilter) return false;
      }

      // Tag filtering
      if (tagFilter !== "all") {
        const hasTag = (t.tags || []).some((tag) => tag.name.toLowerCase() === tagFilter.toLowerCase());
        if (!hasTag) return false;
      }

      return true;
    },
    [searchTerm, assigneeFilter, tagFilter, currentUser]
  );

  const filteredTasksByStatus = useCallback(
    (status: string) => {
      return getTasksByStatus(status).filter(isTaskMatchingFilters);
    },
    [getTasksByStatus, isTaskMatchingFilters]
  );

  const filteredAllTasks = useMemo(() => {
    return tasks.filter(isTaskMatchingFilters);
  }, [tasks, isTaskMatchingFilters]);

  if (loading || !board) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <BoardHeader search={searchTerm} onSearchChange={setSearchTerm} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const views = [
    { id: "board", label: "Board View" },
    { id: "list", label: "List View" },
    { id: "calendar", label: "Calendar" },
    { id: "documents", label: "Documents" },
    { id: "overview", label: "Analytics" },
    { id: "members", label: "Team" },
  ] as const;

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return <BoardOverview board={board} tasks={tasks} />;
      case "list":
        return <TaskListView tasks={filteredAllTasks} columns={board?.columns} selectedTaskId={selectedTaskId} onTaskClick={handleTaskClick} />;
      case "calendar":
        return <CalendarView tasks={filteredAllTasks} selectedTaskId={selectedTaskId} onTaskClick={handleTaskClick} />;
      case "documents":
        return <DocumentsView tasks={filteredAllTasks} boardId={board.id} readOnly={permissions.isReadOnly} onTaskClick={handleTaskClick} />;
      case "members":
        return (
          <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Board Members</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage who has access to this board</p>
              </div>
              {permissions.canManageMembers && <InviteMemberDialog boardId={board.id} />}
            </div>
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 max-h-[70vh] overflow-y-auto">
              <BoardMembers boardId={board.id} />
            </div>
          </div>
        );
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
                      emoji={col.emoji}
                      tasks={filteredTasksByStatus(col.id)}
                      canRename={permissions.canEditBoard}
                      canCreateTask={permissions.canCreateTask}
                      isDragDisabled={permissions.isReadOnly}
                      selectedTaskId={selectedTaskId}
                      onTaskClick={handleTaskClick}
                      onAddTask={openNewModal}
                      onRename={handleRenameColumn}
                    />
                  ))}

                {permissions.canEditBoard && (
                  <div className="w-80 shrink-0">
                    <button
                      onClick={handleAddNewState}
                      className="w-full flex items-center justify-center gap-2 p-4 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl border border-dashed border-border/60 transition-all group bg-white/40"
                    >
                      <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                      <span className="text-sm font-bold">New State</span>
                    </button>
                  </div>
                )}
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Board Viewport Screen */}
        <div className={`flex-1 h-full min-w-0 relative flex flex-col overflow-hidden transition-all duration-200 ${selectedTask ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 overflow-y-scroll overflow-x-hidden min-h-0 custom-scrollbar flex flex-col [scrollbar-gutter:stable]">
            <div className="relative h-48 md:h-56 shrink-0 overflow-hidden">
              <BoardHeroImage src={board.heroImageUrl} alt={board.name} color={board.color} className="h-full w-full" aspectRatio="auto" />
            </div>

          <div className="bg-background border-b border-border/50 shrink-0">
            <div className="px-6 py-5 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1600px] mx-auto w-full">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {board.emoji && (
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-primary/10 flex items-center justify-center rounded-2xl border border-primary/20 shadow-sm shrink-0">
                      <span className="text-xl md:text-2xl">{board.emoji}</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 group/title flex-wrap">
                      <h1 className="text-xl md:text-3xl font-black text-foreground tracking-tight truncate">
                        {board.name}
                      </h1>
                      {permissions.isReadOnly ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px] font-bold py-0.5 px-2.5 shrink-0">
                          <Eye className="h-3 w-3" /> View Only
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize text-[10px] font-bold py-0.5 px-2 shrink-0">
                          {permissions.role === "owner" ? "👑 Owner" : permissions.role === "admin" ? "🛡️ Admin" : "👤 Member"}
                        </Badge>
                      )}
                      {isConnected && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px] font-bold py-0.5 px-2 shrink-0">
                          <Radio className="h-3 w-3 animate-pulse text-emerald-500" /> Live
                        </Badge>
                      )}
                      {permissions.canEditBoard && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-muted transition-colors shrink-0 text-primary bg-primary/5" 
                          onClick={() => setIsBoardModalOpen(true)} 
                          title="Edit Board & Icon"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {board.description && (
                      <p className="text-xs md:text-sm text-muted-foreground font-medium line-clamp-1 opacity-80">
                        {board.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center p-1 bg-muted/40 backdrop-blur-sm rounded-full border border-border/40 shadow-inner group/tabs shrink-0">
                {views.map((view) => (
                  <button 
                    key={view.id} 
                    aria-selected={activeView === view.id}
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

            {/* Quick Member Filter Bar (Visible in Board and List views) */}
            {(activeView === "board" || activeView === "list" || activeView === "calendar") && (
              <div className="px-6 pb-3 md:px-10 max-w-[1600px] mx-auto w-full flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold shrink-0 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider">Filter:</span>
                </div>

                <button
                  onClick={() => setAssigneeFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    assigneeFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  All Tasks ({tasks.length})
                </button>

                <button
                  onClick={() => setAssigneeFilter("me")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    assigneeFilter === "me"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span>Assigned to Me ({tasks.filter((t) => t.assignedTo === currentUser?.id).length})</span>
                </button>

                <button
                  onClick={() => setAssigneeFilter("unassigned")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    assigneeFilter === "unassigned"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  Unassigned ({tasks.filter((t) => !t.assignedTo).length})
                </button>

                {members.length > 0 && (
                  <div className="flex items-center gap-1 pl-2 border-l border-border/60 shrink-0">
                    {members.map((m) => {
                      const isSelected = assigneeFilter === m.userId;
                      const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                      const name = m.user?.fullName?.split(" ")[0] || m.user?.email?.split("@")[0] || "Member";
                      return (
                        <button
                          key={m.userId}
                          onClick={() => setAssigneeFilter(isSelected ? "all" : m.userId)}
                          title={`Filter by ${m.user?.fullName || m.user?.email}`}
                          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={m.user?.avatarUrl} alt={name} />
                            <AvatarFallback className="text-[9px] font-black bg-primary/10 text-primary">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px]">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tag Filters */}
                {availableTags.length > 0 && (
                  <div className="flex items-center gap-1 pl-2 border-l border-border/60 shrink-0">
                    <TagIcon className="h-3 w-3 text-muted-foreground mr-0.5" />
                    {availableTags.map((tag) => {
                      const isSelected = tagFilter.toLowerCase() === tag.name.toLowerCase();
                      return (
                        <button
                          key={tag.id}
                          onClick={() => setTagFilter(isSelected ? "all" : tag.name)}
                          style={{
                            backgroundColor: isSelected ? tag.color : `${tag.color}15`,
                            color: isSelected ? "#ffffff" : tag.color,
                            borderColor: `${tag.color}40`,
                          }}
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold transition-all border shadow-2xs cursor-pointer"
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Trash Bin Trigger */}
                <button
                  onClick={() => setIsTrashOpen(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border border-border/60 bg-background text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 shrink-0 cursor-pointer"
                  title="View Trash Bin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Trash</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 bg-muted/20 min-h-[500px]">
            {renderActiveView()}
          </div>
        </div>

        {/* Floating Add Task FAB anchored to the actual board area screen */}
        {permissions.canCreateTask && (
          <Button
            onClick={() => openNewModal()}
            className="absolute bottom-8 right-8 h-14 w-14 hover:w-40 rounded-full shadow-2xl shadow-primary/20 flex items-center justify-center group/fab hover:scale-105 active:scale-95 transition-all duration-500 ease-out z-20 bg-primary hover:bg-primary/90 overflow-hidden px-0 border-4 border-background"
            title="Create New Task"
          >
            <div className="pointer-events-none flex items-center justify-center w-full h-full relative">
               <Plus className="h-6 w-6 text-primary-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 group-hover/fab:rotate-90 group-hover/fab:left-6" />
               <span className="text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] whitespace-nowrap absolute left-14 opacity-0 group-hover/fab:opacity-100 translate-x-4 group-hover/fab:translate-x-0 transition-all duration-500 ease-out delay-75">
                 Add Task
               </span>
            </div>
          </Button>
        )}
      </div>

      {/* Notion-Style Right-Side Task Detail Workspace */}
      {selectedTask && board && (
        <aside className="w-full md:w-[580px] lg:w-[680px] xl:w-[740px] shrink-0 border-l border-border bg-background shadow-2xl h-full overflow-hidden flex flex-col z-30 transition-all duration-200 animate-in slide-in-from-right duration-200">
          <TaskDetailWorkspace
            task={selectedTask}
            board={board}
            members={members}
            readOnly={permissions.isReadOnly}
            onClose={() => {
              setSelectedTaskId(null);
              setCreatedDraftTask(null);
            }}
            onUpdateTask={async (updates) => {
              lastLocalEditTimeRef.current = Date.now();
              await updateTask(selectedTask.id, updates);
            }}
            onDeleteTask={(id) => {
              deleteTask(id);
              setSelectedTaskId(null);
              setCreatedDraftTask(null);
            }}
          />
        </aside>
      )}
    </div>

      <BoardModal
        open={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        board={board}
        onSubmit={handleBoardUpdate}
      />

      <TrashModal
        open={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        boardId={board.id}
        canManage={permissions.isAdmin || permissions.isOwner}
      />
    </div>
  );
}
