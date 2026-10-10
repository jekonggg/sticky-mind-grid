import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Task, TaskStatus, CreateTaskData, TaskFormData } from "@/types/task";
import { useTasks } from "@/hooks/useTasks";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TrashModal } from "./TrashModal";
import { BoardHeader } from "./BoardHeader";
import { TaskModal } from "./TaskModal";
import { TaskDetailWorkspace } from "../task/TaskDetailWorkspace";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Loading01 as Loader2,
  Plus,
  Settings01 as Settings,
  FaceSmile as Smile,
  Edit01 as Pencil,
  FilterLines as Filter,
  User01 as User,
  Users01 as Users,
  Eye,
  ShieldZap as ShieldAlert,
  Signal01 as Radio,
  Trash01 as Trash2,
  Tag01 as TagIcon,
  LayoutGrid01 as LayoutGrid,
  List,
  Calendar,
  File06 as FileText,
  BarChart01 as BarChart3,
} from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useNavigate } from "react-router-dom";
import { boardApi } from "@/services/boardApi";
import { Board, BoardMember } from "@/types/board";
import { BoardModal } from "../boards/BoardModal";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { getContainerGeometry } from "@/utils/geometryUtils";

import { BoardOverview } from "./BoardOverview";
import { TaskListView } from "./TaskListView";
import { CalendarView } from "./CalendarView";
import { DocumentsView } from "./DocumentsView";
import { BoardMembers } from "../board/BoardMembers";
import { InviteMemberDialog } from "../board/InviteMemberDialog";

import { useActivity } from "@/hooks/useActivity";
import { useSettings } from "@/contexts/SettingsContext";
import { PillNavBar } from "@/components/common/PillNavBar";

import { BoardViewSkeleton } from "@/components/skeletons";

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { devSettings } = useDevMode();
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

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo");
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
      // Suppress full board reload if the edit was made locally in this window within last 3 seconds
      if (Date.now() - lastLocalEditTimeRef.current < 3000) return;
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
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Enable smooth horizontal scrolling with mouse wheel over board canvas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || activeView !== "board") return;

    const handleWheel = (e: WheelEvent) => {
      // If user is scrolling mostly vertically on mouse wheel
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Check if the event target is inside an element that handles vertical scrolling
        let target = e.target as HTMLElement | null;
        let isInnerScrollable = false;
        while (target && target !== el) {
          if (
            target.scrollHeight > target.clientHeight &&
            (getComputedStyle(target).overflowY === "auto" || getComputedStyle(target).overflowY === "scroll")
          ) {
            isInnerScrollable = true;
            break;
          }
          target = target.parentElement;
        }

        // If not inside an inner scrollable container and board has horizontal overflow
        if (!isInnerScrollable && el.scrollWidth > el.clientWidth) {
          el.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [activeView]);

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

  const isDraggingTaskRef = useRef<boolean>(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingTaskRef.current = true;
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
      lastLocalEditTimeRef.current = Date.now();
      const { active, over } = event;
      setActiveTask(null);

      // Prevent mouseup/click from immediately opening task detail modal
      setTimeout(() => {
        isDraggingTaskRef.current = false;
      }, 150);

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
    if (isDraggingTaskRef.current) return;
    setCreatedDraftTask(null);
    setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
  }, []);

  const openNewModal = useCallback((targetStatus?: TaskStatus) => {
    if (!permissions.canCreateTask || !board) return;
    const defaultStatus = targetStatus || (board.columns && board.columns.length > 0 ? board.columns[0].id : "todo");
    setNewTaskStatus(defaultStatus);
    setIsNewTaskModalOpen(true);
  }, [permissions.canCreateTask, board]);

  const handleCreateTaskFromModal = async (data: TaskFormData) => {
    try {
      const newTask = await addTask({
        title: data.title,
        description: data.description,
        status: data.status || newTaskStatus,
        priority: data.priority,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        tags: data.tags,
        checklist: data.checklist,
        attachments: data.attachments,
        emoji: data.emoji,
        progress: data.progress,
      });
      if (newTask && newTask.id) {
        toast.success(`Task "${newTask.title}" created`);
      }
      setIsNewTaskModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    }
  };

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

  if (loading || !board || settings.simulateSkeletonLoading) {
    return <BoardViewSkeleton />;
  }

  const views = [
    { id: "board", label: "Board", icon: LayoutGrid },
    { id: "list", label: "List", icon: List },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "documents", label: "Docs", icon: FileText },
    { id: "overview", label: "Analytics", icon: BarChart3 },
    { id: "members", label: "Team", icon: Users },
  ] as const;

  const isCompact = settings.uiDensity === "compact";

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return (
          <div className={`${isCompact ? "p-3.5 md:p-4" : "p-6 md:p-8"} flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28`}>
            <BoardOverview board={board} tasks={tasks} />
          </div>
        );
      case "list":
        return (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28">
            <TaskListView tasks={filteredAllTasks} columns={board?.columns} selectedTaskId={selectedTaskId} onTaskClick={handleTaskClick} />
          </div>
        );
      case "calendar":
        return (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28">
            <CalendarView tasks={filteredAllTasks} columns={board?.columns} selectedTaskId={selectedTaskId} onTaskClick={handleTaskClick} />
          </div>
        );
      case "documents":
        return (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28">
            <DocumentsView tasks={filteredAllTasks} boardId={board.id} readOnly={permissions.isReadOnly} onTaskClick={handleTaskClick} />
          </div>
        );
      case "members":
        return (
          <div className={`${isCompact ? "p-3.5 md:p-4" : "p-6 md:p-8"} max-w-4xl mx-auto w-full flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28`}>
            <div className={`flex items-center justify-between ${isCompact ? "mb-4" : "mb-8"}`}>
              <div>
                <h2 className={`${isCompact ? "text-2xl" : "text-3xl"} font-black tracking-tight text-foreground`}>Board Members</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage who has access to this board</p>
              </div>
              {permissions.canManageMembers && <InviteMemberDialog boardId={board.id} />}
            </div>
            <div className={`bg-card rounded-xl border border-border/50 shadow-sm ${isCompact ? "p-4" : "p-6"} max-h-[70vh] overflow-y-auto`}>
              <BoardMembers boardId={board.id} />
            </div>
          </div>
        );
      case "board":
      default: {
        const geom = getContainerGeometry(
          isCompact,
          devSettings.customPadding,
          devSettings.customInnerRadius,
          devSettings.customOuterRadius
        );

        return (
          <main
            ref={scrollRef}
            style={
              geom.isCustom
                ? {
                    paddingTop: `${geom.padding}px`,
                    paddingRight: `${Math.max(geom.padding, isCompact ? 24 : 32)}px`,
                    paddingBottom: `${geom.padding}px`,
                  }
                : undefined
            }
            className={`${isCompact ? "pl-4 md:pl-6 py-2 pr-4 md:pr-6" : "pl-6 md:pl-8 py-3 pr-6 md:pr-8"} flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar h-full density-kanban-board`}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div
                style={geom.isCustom ? { gap: `${geom.padding}px` } : undefined}
                className={`flex ${isCompact ? "gap-2" : "gap-3"} h-full min-w-max pb-20 md:pb-24 items-stretch`}
              >
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
                  <div className={`${isCompact ? "w-60" : "w-72"} shrink-0 h-full min-h-[220px]`}>
                    <button
                      onClick={handleAddNewState}
                      style={geom.isCustom ? { borderRadius: `${geom.outerRadius}px` } : undefined}
                      className={`w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground/70 hover:text-primary hover:bg-background/80 ${
                        isCompact ? "rounded-[18px]" : "rounded-[24px]"
                      } border border-dashed border-border/70 hover:border-primary/40 transition-all group bg-slate-100/40 dark:bg-slate-900/30 cursor-pointer shadow-xs`}
                      title="Add new column stage"
                    >
                      <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 text-primary" />
                      <span className="text-xs sm:text-sm font-bold">New Stage</span>
                    </button>
                  </div>
                )}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <div className="drag-overlay">
                    <TaskCard task={activeTask} isDragDisabled={true} onClick={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </main>
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
      <BoardHeader search={searchTerm} onSearchChange={setSearchTerm} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Board Viewport Screen */}
        <div className="flex-1 h-full min-w-0 relative flex flex-col overflow-hidden">
          {/* Pinned Board Header */}
          <div className="bg-background border-b border-border/50 shrink-0">
            {/* Row 1: Board Name, Emoji, Badges, & Edit */}
            <div className={`${isCompact ? "px-4 pt-2.5 pb-1.5 md:px-6" : "px-6 pt-3.5 pb-2 md:px-8"} flex items-center justify-between gap-4 w-full`}>
              <div className="flex items-center gap-3 min-w-0">
                {!devSettings.disableEmojiCustomization && board.emoji && (
                  <div className="h-10 w-10 md:h-11 md:w-11 bg-primary/10 flex items-center justify-center rounded-xl border border-primary/20 shadow-2xs shrink-0">
                    <span className="text-xl md:text-2xl">{board.emoji}</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 group/title flex-wrap">
                    <h1 className="text-lg md:text-2xl font-black text-foreground tracking-tight truncate">
                      {board.name}
                    </h1>
                    {permissions.isReadOnly ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1 text-[11px] font-bold py-0.5 px-2.5 shrink-0">
                        <Eye className="h-3 w-3" /> View Only
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize text-[10px] font-bold py-0.5 px-2 shrink-0">
                        {devSettings.disableEmojiCustomization
                          ? permissions.role
                          : permissions.role === "owner" ? "👑 Owner" : permissions.role === "admin" ? "🛡️ Admin" : "👤 Member"}
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
                        className="h-7 w-7 rounded-lg hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground" 
                        onClick={() => setIsBoardModalOpen(true)} 
                        title="Edit Board & Icon"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {board.description && (
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1 opacity-80">
                      {board.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Left-Aligned Minimalist Filter Toolbar */}
            {(activeView === "board" || activeView === "list" || activeView === "calendar") && (
              <div className={`${isCompact ? "px-4 pb-2 md:px-6" : "px-6 pb-2.5 md:px-8"} w-full flex items-center justify-between gap-3 flex-wrap`}>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full custom-scrollbar shrink-0 py-0.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold shrink-0 mr-0.5">
                    <Filter className="h-3.5 w-3.5" />
                  </div>

                  <button
                    onClick={() => setAssigneeFilter("all")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      assigneeFilter === "all"
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    All ({tasks.length})
                  </button>

                  <button
                    onClick={() => setAssigneeFilter("me")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      assigneeFilter === "me"
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    <User className="h-3 w-3" />
                    <span>Me ({tasks.filter((t) => t.assignedTo === currentUser?.id).length})</span>
                  </button>

                  <button
                    onClick={() => setAssigneeFilter("unassigned")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      assigneeFilter === "unassigned"
                        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    Unassigned ({tasks.filter((t) => !t.assignedTo).length})
                  </button>

                  {members.length > 0 && (
                    <div className="flex items-center gap-1 pl-1.5 border-l border-border/60 shrink-0">
                      {members.map((m) => {
                        const isSelected = assigneeFilter === m.userId;
                        const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                        const name = m.user?.fullName?.split(" ")[0] || m.user?.email?.split("@")[0] || "Member";
                        return (
                          <button
                            key={m.userId}
                            onClick={() => setAssigneeFilter(isSelected ? "all" : m.userId)}
                            title={`Filter by ${m.user?.fullName || m.user?.email}`}
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                : "bg-background/80 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            <Avatar className="h-4 w-4 shrink-0">
                              <AvatarImage src={m.user?.avatarUrl} alt={name} />
                              <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
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
                    <div className="flex items-center gap-1 pl-1.5 border-l border-border/60 shrink-0">
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
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all border shadow-2xs cursor-pointer"
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Trash Bin Trigger on the right */}
                <button
                  onClick={() => setIsTrashOpen(true)}
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border border-border/50 bg-background/80 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 shrink-0 cursor-pointer"
                  title="View Trash Bin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Trash</span>
                </button>
              </div>
            )}
          </div>

          {/* Active View Container */}
          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-muted/20">
            {renderActiveView()}
          </div>
        </div>

        {/* Meta Floating Dock Pill Navigation Bar + Adjacent Add Task Button (Fixed Bottom Center) */}
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2.5 max-w-[calc(100vw-2rem)]">
          <PillNavBar
            items={views}
            activeId={activeView}
            onChange={(id) => setActiveView(id as any)}
            accentColor="violet"
            layoutId="metaFloatingBottomDock"
          />

          {/* Adjacent Add Task Button: Left-to-Right Expansion */}
          {permissions.canCreateTask && (
            <button
              type="button"
              onClick={() => openNewModal()}
              className="group/add relative h-11 w-11 hover:w-[124px] rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-xl shadow-primary/30 border border-white/20 dark:border-white/15 flex items-center overflow-hidden transition-all duration-300 ease-out cursor-pointer shrink-0 select-none pl-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              title="Create New Task"
              aria-label="Create New Task"
            >
              {/* Plus Icon: stays on the left and rotates 90° on hover */}
              <Plus className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/add:rotate-90" />

              {/* Label: reveals smoothly from left to right */}
              <span className="text-xs font-bold whitespace-nowrap opacity-0 -translate-x-2 group-hover/add:opacity-100 group-hover/add:translate-x-0 transition-all duration-300 ease-out ml-2">
                Add Task
              </span>
            </button>
          )}
        </div>

        {/* Screen-Wide Backdrop Dimming Overlay when Task Drawer is Open */}
        {selectedTask && board && (
          <div
            data-testid="task-drawer-backdrop"
            aria-label="Close task details"
            onClick={() => {
              setSelectedTaskId(null);
              setCreatedDraftTask(null);
            }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[1.5px] z-40 transition-opacity animate-in fade-in duration-200 cursor-pointer"
          />
        )}

        {/* Notion-Style Right-Side Task Detail Workspace */}
        {selectedTask && board && (
          <aside
            data-testid="task-detail-drawer"
            className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] lg:w-[720px] xl:w-[780px] border-l border-border bg-background shadow-2xl h-full overflow-hidden flex flex-col z-50 transition-all duration-200 animate-in slide-in-from-right duration-250 ease-out"
          >
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

      {/* Create New Task Dialog Box */}
      {board && isNewTaskModalOpen && (
        <TaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          task={null}
          initialStatus={newTaskStatus}
          boardId={board.id}
          columns={board.columns}
          members={members}
          onSave={handleCreateTaskFromModal}
        />
      )}

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
