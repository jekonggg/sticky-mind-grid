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
  Download01 as Download,
  Bell01 as Bell,
  BellOff01 as BellOff,
} from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { computeTaskProgress, isDoneColumn } from "@/utils/taskUtils";

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

// Module-level in-memory cache for board metadata across route navigations
export const boardMetadataCache = new Map<string, { board: Board; timestamp: number }>();
export const BOARD_METADATA_CACHE_TTL_MS = 60_000;

export function clearBoardMetadataCache(boardId?: string) {
  if (boardId) {
    boardMetadataCache.delete(boardId);
  } else {
    boardMetadataCache.clear();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:session-expired", () => clearBoardMetadataCache());
  window.addEventListener("smg-dev-data-mode-changed", () => clearBoardMetadataCache());
}

export function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { devSettings } = useDevMode();
  const { settings, playSound } = useSettings();
  const cachedBoardEntry = boardId ? boardMetadataCache.get(boardId) : undefined;
  const [board, setBoardState] = useState<Board | null>(() => cachedBoardEntry?.board || null);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);

  const setBoard = useCallback(
    (action: Board | null | ((prev: Board | null) => Board | null)) => {
      setBoardState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        if (boardId && next) {
          boardMetadataCache.set(boardId, { board: next, timestamp: Date.now() });
        }
        return next;
      });
    },
    [boardId]
  );

  useEffect(() => {
    if (!boardId) {
      navigate("/");
      return;
    }
    const loadBoard = (force = false) => {
      const cached = boardMetadataCache.get(boardId);
      const isFresh = cached && Date.now() - cached.timestamp < BOARD_METADATA_CACHE_TTL_MS;
      if (cached && !force) {
        setBoardState(cached.board);
      }
      if (!isFresh || force || !cached) {
        boardApi.getBoard(boardId).then((b) => {
          if (!b) {
            navigate("/");
            return;
          }
          setBoard(b);
        });
      }
    };
    loadBoard(false);
    const handleDataModeChange = () => {
      boardMetadataCache.clear();
      loadBoard(true);
    };
    window.addEventListener("smg-dev-data-mode-changed", handleDataModeChange);
    return () => window.removeEventListener("smg-dev-data-mode-changed", handleDataModeChange);
  }, [boardId, navigate, setBoard]);

  // Fetch Board Members for Assignee & Filters
  const { data: members = [] } = useQuery<BoardMember[]>({
    queryKey: ["boardMembers", boardId],
    queryFn: () => (boardId ? boardApi.getMembers(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  });

  const {
    loading,
    tasks,
    setTasks,
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
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all"); // 'all' | 'me' | userId
  const [tagFilter, setTagFilter] = useState<string>("all"); // 'all' | tagName
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view");
  const initialView = useMemo<"overview" | "list" | "board" | "calendar" | "documents" | "members">(() => {
    if (viewParam && ["overview", "list", "board", "calendar", "documents", "members"].includes(viewParam)) {
      return viewParam as any;
    }
    if (viewParam === "files" || viewParam === "docs") return "documents";
    return (settings.defaultBoardView as any) || "board";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeView, setActiveView] = useState<"overview" | "list" | "board" | "calendar" | "documents" | "members">(
    initialView
  );

  useEffect(() => {
    if (viewParam && ["overview", "list", "board", "calendar", "documents", "members"].includes(viewParam)) {
      setActiveView(viewParam as any);
    } else if (viewParam === "files" || viewParam === "docs") {
      setActiveView("documents");
    }
  }, [viewParam]);

  const handleViewChange = useCallback((id: string) => {
    setActiveView(id as any);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === "board") {
        next.delete("view");
      } else {
        next.set("view", id);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("todo");
  const [createdDraftTask, setCreatedDraftTask] = useState<Task | null>(null);

  const triggerTaskHighlight = useCallback((taskId: string) => {
    if (!taskId) return;
    setHighlightedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    const existing = highlightTimeoutsRef.current.get(taskId);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      setHighlightedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      highlightTimeoutsRef.current.delete(taskId);
    }, 2500);
    highlightTimeoutsRef.current.set(taskId, timeout);
  }, []);

  useEffect(() => {
    const timeouts = highlightTimeoutsRef.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

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
  const { isConnected, isReconnecting } = useBoardRealtime({
    boardId,
    onTaskChange: (data) => {
      const isRemoteActor =
        data?.actorId !== undefined &&
        currentUser?.id !== undefined &&
        String(data.actorId) !== String(currentUser.id);
      if (!isRemoteActor && Date.now() - lastLocalEditTimeRef.current < 3000) return;
      fetchTasks?.();
    },
    onTaskUpdate: (updatedTask) => {
      if (updatedTask?.id) {
        setTasks?.((prev) =>
          prev.map((t) =>
            t.id === updatedTask.id
              ? {
                  ...t,
                  ...updatedTask,
                  updatedAt: updatedTask.updatedAt ? new Date(updatedTask.updatedAt) : new Date(),
                }
              : t
          )
        );
      }
    },
    onTaskMoved: (movedTask) => {
      if (movedTask?.id) {
        setTasks?.((prev) =>
          prev.map((t) =>
            t.id === movedTask.id
              ? {
                  ...t,
                  ...movedTask,
                  updatedAt: movedTask.updatedAt ? new Date(movedTask.updatedAt) : new Date(),
                }
              : t
          )
        );
        if (!movedTask.actorId || String(movedTask.actorId) !== String(currentUser?.id)) {
          triggerTaskHighlight(movedTask.id);
        }
      }
    },
    onTasksReordered: (data) => {
      if (Array.isArray(data?.tasks)) {
        const isRemote = !data.actorId || String(data.actorId) !== String(currentUser?.id);
        if (isRemote) {
          data.tasks.forEach((rt: any) => {
            const existing = tasks.find((t) => t.id === rt.id);
            if (!existing || (rt.status && existing.status !== rt.status)) {
              triggerTaskHighlight(rt.id);
            }
          });
        }
        fetchTasks?.();
      }
    },
    onActivityChange: () => refreshActivities?.(),
    onMemberChange: (data) => {
      if (
        data?.eventType === "member:removed" &&
        currentUser?.id !== undefined &&
        String(data?.userId) === String(currentUser.id)
      ) {
        toast.error("You no longer have access to this board.");
        navigate("/");
        return;
      }

      if (
        data?.eventType === "member:role_updated" &&
        currentUser?.id !== undefined &&
        String(data?.userId) === String(currentUser.id) &&
        data?.role
      ) {
        toast.info(`Your role on this board was updated to ${data.role}.`);
        if (data.role === "viewer" || data.role === "commenter") {
          setIsNewTaskModalOpen(false);
          setIsBoardModalOpen(false);
          setIsTrashOpen(false);
        }
        queryClient.setQueryData<BoardMember[]>(["boardMembers", boardId], (prev) =>
          prev
            ? prev.map((m) =>
                String(m.userId) === String(currentUser.id) ? { ...m, role: data.role } : m
              )
            : prev
        );
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                role: data.role,
                ownerId:
                  data.role !== "owner" && String(prev.ownerId) === String(currentUser.id)
                    ? ""
                    : prev.ownerId,
              }
            : prev
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      if (boardId) {
        boardApi.getBoard(boardId).then((b) => {
          if (!b) {
            toast.error("You no longer have access to this board.");
            navigate("/");
            return;
          }
          setBoard(b);
        });
      }
    },
    onForceDisconnect: () => {
      toast.error("You no longer have access to this board.");
      navigate("/");
    },
    onReconnect: () => {
      fetchTasks?.();
      refreshActivities?.();
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      if (boardId) {
        boardApi.getBoard(boardId).then((b) => b && setBoard(b)).catch(() => {});
      }
    },
    onBoardChange: (updated) => setBoard(updated),
    onBoardDeleted: () => {
      toast.error("This board was deleted by its owner.");
      navigate("/");
    },
  }) || { isConnected: true, isReconnecting: false };

  const effectiveReadOnly = permissions.isReadOnly || Boolean(isReconnecting);

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
    } catch (error: any) {
      toast.error(error.message || "Failed to update board");
    }
  };

  const handleExportBoard = async () => {
    if (!board) return;
    try {
      const data = await boardApi.exportBoard(board.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${board.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Board data exported successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to export board data");
    }
  };

  const handleRenameColumn = async (id: string, newTitle: string, emoji?: string) => {
    if (!board) return;
    const oldCol = board.columns.find(c => c.id === id);
    if (!oldCol) return;
    
    const nextEmoji = emoji !== undefined ? emoji : oldCol.emoji;
    if (oldCol.title === newTitle && oldCol.emoji === nextEmoji) return;

    const updatedColumns = board.columns.map(c => c.id === id ? { ...c, title: newTitle, emoji: nextEmoji } : c);
    
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

      if (effectiveReadOnly || !over) return;

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
        const visibleCols = columns.filter((c) => c.id !== "archive");
        const firstColId = visibleCols[0]?.id;
        const lastColId = visibleCols[visibleCols.length - 1]?.id;

        const hasChecklist = (activeTaskItem.checklist || []).length > 0;
        const nextProgress = computeTaskProgress(activeTaskItem, targetStatus, columns);

        if (!hasChecklist && nextProgress === 0 && activeTaskItem.progress && activeTaskItem.progress > 0) {
          const targetColTitle = columns.find((c) => c.id === targetStatus)?.title || "first column";
          toast.info(`Task progress reset to 0% in ${targetColTitle}`);
        }

        const updatedActiveTask = { ...activeTaskItem, status: targetStatus, progress: nextProgress };
        const filtered = targetColumnTasks.filter((t) => t.id !== activeId);
        const insertIdx = overIndexInTarget >= 0 ? overIndexInTarget : filtered.length;
        newTasksInTarget = [
          ...filtered.slice(0, insertIdx),
          updatedActiveTask,
          ...filtered.slice(insertIdx),
        ];

        const isDoneCol = isDoneColumn(targetStatus, columns);

        if (isDoneCol) {
          playSound("complete");
        } else {
          playSound("move");
        }
      }

      const visibleCols = columns.filter((c) => c.id !== "archive");

      // Continuous 1000-based position indices for MySQL persistence
      const reorderItems = newTasksInTarget.map((t, idx) => {
        const item: { id: string; status?: string; fromStatus?: string; position: number; progress?: number } = {
          id: t.id,
          status: targetStatus,
          fromStatus: t.id === activeId ? activeTaskItem.status : t.status,
          position: (idx + 1) * 1000.0,
        };
        if (t.id === activeId) {
          item.progress = computeTaskProgress(t, targetStatus, columns);
        }
        return item;
      });

      reorderTasks(reorderItems);
    },
    [effectiveReadOnly, tasks, columns, reorderTasks, playSound]
  );

  const handleTaskClick = useCallback((task: Task) => {
    if (isDraggingTaskRef.current) return;
    setCreatedDraftTask(null);
    setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
  }, []);

  const handleArchiveTask = useCallback(
    async (task: Task) => {
      if (!permissions.canEditTask || effectiveReadOnly) return;
      lastLocalEditTimeRef.current = Date.now();
      const nextStatus =
        task.status === "archive"
          ? board?.columns?.find((c) => c.id !== "archive")?.id || "todo"
          : "archive";
      await updateTask(task.id, { status: nextStatus });
      toast.success(nextStatus === "archive" ? "Task archived" : "Task unarchived");
    },
    [permissions.canEditTask, effectiveReadOnly, board?.columns, updateTask]
  );

  const handleQuickDeleteTask = useCallback(
    (task: Task) => {
      if (!permissions.canDeleteTask || effectiveReadOnly) return;
      deleteTask(task.id);
      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
        setCreatedDraftTask(null);
      }
    },
    [permissions.canDeleteTask, effectiveReadOnly, deleteTask, selectedTaskId]
  );

  const openNewModal = useCallback((targetStatus?: TaskStatus) => {
    if (!permissions.canCreateTask || effectiveReadOnly || !board) return;
    const defaultStatus = targetStatus || (board.columns && board.columns.length > 0 ? board.columns[0].id : "todo");
    setNewTaskStatus(defaultStatus);
    setIsNewTaskModalOpen(true);
  }, [permissions.canCreateTask, effectiveReadOnly, board]);

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
    { id: "documents", label: "Docs & Files", icon: FileText },
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
            <DocumentsView tasks={filteredAllTasks} boardId={board.id} readOnly={effectiveReadOnly} onTaskClick={handleTaskClick} />
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
              {permissions.canManageMembers && !effectiveReadOnly && <InviteMemberDialog boardId={board.id} />}
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
                {(() => {
                  const workflowCols = columns.filter((col) => col.id !== "archive");
                  return workflowCols.map((col, idx) => (
                    <KanbanColumn
                      key={col.id}
                      id={col.id}
                      title={col.title}
                      emoji={col.emoji}
                      wipLimit={col.wipLimit}
                      tasks={filteredTasksByStatus(col.id)}
                      canRename={permissions.canEditBoard && !effectiveReadOnly}
                      canCreateTask={permissions.canCreateTask && !effectiveReadOnly}
                      isDragDisabled={effectiveReadOnly}
                      selectedTaskId={selectedTaskId}
                      highlightedTaskIds={highlightedTaskIds}
                      onTaskClick={handleTaskClick}
                      onAddTask={openNewModal}
                      onRename={handleRenameColumn}
                      isFirstColumn={idx === 0}
                      isLastColumn={idx === workflowCols.length - 1}
                      onArchiveTask={
                        permissions.canEditTask && !effectiveReadOnly ? handleArchiveTask : undefined
                      }
                      onDeleteTask={
                        permissions.canDeleteTask && !effectiveReadOnly
                          ? handleQuickDeleteTask
                          : undefined
                      }
                    />
                  ));
                })()}

                {permissions.canEditBoard && !effectiveReadOnly && (
                  <div
                    className={`${
                      isCompact
                        ? "w-[260px] min-w-[260px] max-w-[260px]"
                        : "w-[315px] min-w-[315px] max-w-[315px]"
                    } shrink-0 h-full min-h-[220px]`}
                  >
                    <button
                      onClick={handleAddNewState}
                      style={geom.isCustom ? { borderRadius: `${geom.outerRadius}px` } : undefined}
                      className="w-full h-full min-h-[140px] flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground/70 hover:text-primary hover:bg-background/80 rounded-[12px] border border-dashed border-border/70 hover:border-primary/40 transition-all group bg-slate-100/40 dark:bg-slate-900/30 cursor-pointer shadow-xs"
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
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize text-[10px] font-bold py-0.5 px-2 shrink-0">
                      {devSettings.disableEmojiCustomization
                        ? permissions.role
                        : permissions.role === "owner"
                        ? "👑 Owner"
                        : permissions.role === "admin"
                        ? "🛡️ Admin"
                        : permissions.role === "commenter"
                        ? "💬 Commenter"
                        : permissions.role === "viewer"
                        ? "👁️ Viewer"
                        : "✏️ Editor"}
                    </Badge>
                    {isConnected && !isReconnecting && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[10px] font-bold py-0.5 px-2 shrink-0">
                        <Radio className="h-3 w-3 animate-pulse text-emerald-500" /> Live
                      </Badge>
                    )}
                    {isReconnecting && (
                      <Badge
                        data-testid="realtime-reconnecting-badge"
                        variant="outline"
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px] font-bold py-0.5 px-2 shrink-0"
                      >
                        <Radio className="h-3 w-3 animate-pulse text-amber-500" /> Read-only • Reconnecting...
                      </Badge>
                    )}
                    {permissions.canEditBoard && !effectiveReadOnly && (
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 rounded-lg hover:bg-muted transition-colors shrink-0 ${
                        board.isMuted ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={async () => {
                        const nextMuted = !board.isMuted;
                        setBoard((prev) => (prev ? { ...prev, isMuted: nextMuted } : prev));
                        try {
                          await boardApi.setBoardMute(board.id, nextMuted);
                          toast.success(
                            nextMuted
                              ? `Muted notifications for "${board.name}"`
                              : `Unmuted notifications for "${board.name}"`
                          );
                        } catch (err: any) {
                          setBoard((prev) => (prev ? { ...prev, isMuted: !nextMuted } : prev));
                          toast.error(err?.message || "Failed to update notification mute setting");
                        }
                      }}
                      title={board.isMuted ? "Unmute board notifications" : "Mute board notifications"}
                      aria-label={board.isMuted ? "Unmute board notifications" : "Mute board notifications"}
                      data-testid="board-mute-toggle"
                    >
                      {board.isMuted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    </Button>
                    {permissions.canExportBoard && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground" 
                        onClick={handleExportBoard} 
                        title="Export Board Data (JSON)"
                      >
                        <Download className="h-3.5 w-3.5" />
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

                  {members.length > 0 && (() => {
                    const MAX_VISIBLE = 4;
                    const hasOverflow = members.length > MAX_VISIBLE;
                    const visibleMembers = hasOverflow ? members.slice(0, MAX_VISIBLE - 1) : members;
                    const overflowMembers = hasOverflow ? members.slice(MAX_VISIBLE - 1) : [];
                    const isOverflowSelected = overflowMembers.some((m) => m.userId === assigneeFilter);

                    return (
                      <div className="flex items-center pl-2 border-l border-border/60 shrink-0">
                        <div className="flex items-center -space-x-2 overflow-visible">
                          {visibleMembers.map((m) => {
                            const isSelected = assigneeFilter === m.userId;
                            const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                            const fullName = m.user?.fullName || m.user?.email || "Member";

                            return (
                              <button
                                key={m.userId}
                                onClick={() => setAssigneeFilter(isSelected ? "all" : m.userId)}
                                title={`Filter by ${fullName}`}
                                aria-label={`Filter by ${fullName}`}
                                className={`relative rounded-full transition-transform cursor-pointer focus:outline-none ${
                                  isSelected
                                    ? "ring-2 ring-primary scale-110 z-20 shadow-xs"
                                    : "ring-2 ring-background hover:scale-110 hover:z-10"
                                }`}
                              >
                                <Avatar className={`${isCompact ? "h-6 w-6" : "h-7 w-7"} border-0`}>
                                  <AvatarImage src={m.user?.avatarUrl} alt={fullName} />
                                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                    {initial}
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                            );
                          })}

                          {hasOverflow && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={`relative flex items-center justify-center ${
                                    isCompact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs"
                                  } rounded-full bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold transition-transform cursor-pointer focus:outline-none ${
                                    isOverflowSelected
                                      ? "ring-2 ring-primary text-primary scale-110 z-20 shadow-xs"
                                      : "ring-2 ring-background hover:bg-slate-300 dark:hover:bg-slate-700 hover:scale-110 hover:z-10"
                                  }`}
                                  title={`+${overflowMembers.length} more members`}
                                  aria-label={`+${overflowMembers.length} more members`}
                                >
                                  +{overflowMembers.length}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48 max-h-56 overflow-y-auto">
                                {overflowMembers.map((m) => {
                                  const isSelected = assigneeFilter === m.userId;
                                  const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                                  const fullName = m.user?.fullName || m.user?.email || "Member";

                                  return (
                                    <DropdownMenuItem
                                      key={m.userId}
                                      onClick={() => setAssigneeFilter(isSelected ? "all" : m.userId)}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={m.user?.avatarUrl} alt={fullName} />
                                        <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                                          {initial}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className={`text-xs truncate ${isSelected ? "font-bold text-primary" : ""}`}>
                                        {fullName}
                                      </span>
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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
                {permissions.canViewTrash && (
                  <button
                    onClick={() => setIsTrashOpen(true)}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border border-border/50 bg-background/80 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 shrink-0 cursor-pointer"
                    title="View Trash Bin"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Trash</span>
                  </button>
                )}
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
            onChange={handleViewChange}
            accentColor="primary"
            layoutId="metaFloatingBottomDock"
          />

          {/* Adjacent Add Task Button: Left-to-Right Expansion */}
          {permissions.canCreateTask && !effectiveReadOnly && (
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
              readOnly={effectiveReadOnly}
              canComment={permissions.canComment && !isReconnecting}
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
          boardTasks={tasks}
          columns={board.columns}
          members={members}
          availableBoards={[board]}
          allowBoardChange={false}
          canComment={permissions.canComment}
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
        canManage={permissions.canPurgeTask}
      />
    </div>
  );
}
