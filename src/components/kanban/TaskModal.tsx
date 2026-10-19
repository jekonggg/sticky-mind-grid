import { useState, useEffect, useRef, useMemo } from "react";
import { Task, UpdateTaskData, TaskFormData, Priority, Column, Attachment, ChecklistItem, Tag } from "@/types/task";
import { BoardMember } from "@/types/board";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage, getMediaUrl } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash01 as Trash2,
  ImagePlus,
  XClose as X,
  Check,
  File06 as FileText,
  User01 as User,
  Users01 as Users,
  Eye,
  CheckSquare,
  Square,
  Tag01 as TagIcon,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  Stars01 as Sparkles,
  LayoutGrid01 as LayoutGrid,
  Archive,
  ArrowRight,
  Sliders01 as Sliders,
} from "@untitledui/icons";
import { FolderKanban, Lock } from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";
import { DateTimePicker } from "@/components/common/DateTimePicker";
import { TaskComments } from "./TaskComments";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";
import { boardApi } from "@/services/boardApi";
import { useDevMode } from "@/contexts/DevModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Board } from "@/types/board";
import { useBoardLabels } from "@/hooks/useBoardLabels";
import { normalizeTagName, deduplicateTags, saveBoardLabels } from "@/utils/boardLabels";
import { toSafeIsoDateInputString, parseSafeDate } from "@/utils/dateUtils";
import { computeTaskProgress, getTaskProgressInfo } from "@/utils/taskUtils";
import { cn } from "@/lib/utils";

interface TaskModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  task?: Task | null;
  initialStatus?: string;
  columns?: Column[];
  boardId?: string;
  boardTasks?: Task[];
  members?: BoardMember[];
  availableBoards?: Board[];
  allowBoardChange?: boolean;
  readOnly?: boolean;
  canComment?: boolean;
  onSubmit?: (data: TaskFormData) => void;
  onSave?: (data: TaskFormData) => void;
  onDelete?: (id: string) => void;
}

const TAG_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ec4899", // Pink
];

const EMPTY_COLUMNS: Column[] = [];

export function TaskModal({
  open,
  isOpen,
  onClose,
  task,
  initialStatus,
  columns = EMPTY_COLUMNS,
  boardId,
  boardTasks,
  members = [],
  availableBoards,
  allowBoardChange = false,
  readOnly = false,
  canComment,
  onSubmit,
  onSave,
  onDelete,
}: TaskModalProps) {
  const { devSettings } = useDevMode();
  const { user: currentUser } = useAuth();
  const isModalOpen = open ?? isOpen ?? false;
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(members);
  const assignableMembers = boardMembers.filter(
    (m) =>
      (!m.status || m.status === "accepted") &&
      ["owner", "admin", "editor", "member"].includes(m.role)
  );
  const [userBoards, setUserBoards] = useState<Board[]>(availableBoards || []);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(
    task?.boardId || boardId || (availableBoards && availableBoards.length > 0 ? availableBoards[0].id : "")
  );
  const [activeColumns, setActiveColumns] = useState<Column[]>(columns || EMPTY_COLUMNS);
  const currentBoardId = selectedBoardId || task?.boardId || boardId || "";
  const { boardLabels, addLabel } = useBoardLabels(currentBoardId, boardTasks);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>(
    task?.status || initialStatus || (columns && columns.length > 0 ? columns[0].id : "todo")
  );
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagColor, setSelectedTagColor] = useState(TAG_COLORS[0]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;

  useEffect(() => {
    if (availableBoards && availableBoards.length > 0) {
      setUserBoards(availableBoards);
    } else if (isModalOpen) {
      boardApi.getBoards().then((b) => setUserBoards(b || [])).catch(() => {});
    }
  }, [availableBoards, isModalOpen]);

  useEffect(() => {
    const nextBoardId =
      task?.boardId ||
      boardId ||
      (availableBoards && availableBoards.length > 0 ? availableBoards[0].id : "") ||
      (userBoards.length > 0 ? userBoards[0].id : "");
    if (nextBoardId) {
      setSelectedBoardId(nextBoardId);
    }
  }, [task?.boardId, boardId, availableBoards, userBoards, isModalOpen]);

  useEffect(() => {
    if (columns && columns.length > 0) {
      setActiveColumns(columns);
    } else if (selectedBoardId && userBoards.length > 0) {
      const currentBoard = userBoards.find((b) => b.id === selectedBoardId);
      if (currentBoard?.columns && currentBoard.columns.length > 0) {
        setActiveColumns(currentBoard.columns);
      }
    }
  }, [columns, selectedBoardId, userBoards]);

  useEffect(() => {
    if (members && members.length > 0) {
      setBoardMembers(members);
    } else {
      const activeBoardId = selectedBoardId || boardId || task?.boardId;
      if (activeBoardId && isModalOpen) {
        boardApi
          .getMembers(activeBoardId)
          .then((data) => {
            setBoardMembers(data || []);
          })
          .catch(() => {});
      }
    }
  }, [members, selectedBoardId, boardId, task?.boardId, isModalOpen]);

  const handleBoardChange = async (newBoardId: string) => {
    setSelectedBoardId(newBoardId);
    let targetBoard = userBoards.find((b) => b.id === newBoardId);
    if (!targetBoard?.columns || targetBoard.columns.length === 0) {
      try {
        const fullBoard = await boardApi.getBoard(newBoardId);
        if (fullBoard) {
          targetBoard = fullBoard;
        }
      } catch {
        // ignore
      }
    }

    if (targetBoard?.columns && targetBoard.columns.length > 0) {
      setActiveColumns(targetBoard.columns);
      const hasCurrentStatus = targetBoard.columns.some((c) => c.id === status);
      if (!hasCurrentStatus) {
        const nextStatus = targetBoard.columns[0].id;
        setStatus(nextStatus);
        setProgress(computeTaskProgress({ checklist, status: nextStatus }, nextStatus, targetBoard.columns));
      }
    }

    try {
      const fetchedMembers = await boardApi.getMembers(newBoardId);
      setBoardMembers(fetchedMembers || []);
      const isAssigneeValid = (fetchedMembers || []).some(
        (m) =>
          m.userId === assignedTo &&
          (!m.status || m.status === "accepted") &&
          ["owner", "admin", "editor", "member"].includes(m.role)
      );
      if (!isAssigneeValid) {
        setAssignedTo("unassigned");
      }
    } catch (err) {
      console.error("Failed to load members for board:", err);
    }
  };

  const displayBoards = useMemo(() => {
    if (userBoards.length === 0) {
      if (selectedBoardId) {
        return [
          {
            id: selectedBoardId,
            name: "Current Board",
            columns: activeColumns,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Board,
        ];
      }
      return [];
    }
    const hasSelected = userBoards.some((b) => b.id === selectedBoardId);
    if (!hasSelected && selectedBoardId) {
      return [
        {
          id: selectedBoardId,
          name: "Current Board",
          columns: activeColumns,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Board,
        ...userBoards,
      ];
    }
    return userBoards;
  }, [userBoards, selectedBoardId, activeColumns]);

  const isBoardSelectionDisabled =
    readOnly ||
    allowBoardChange === false ||
    displayBoards.length <= 1;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEmoji(task.emoji || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority((task.priority === "urgent" ? "high" : task.priority) || "medium");
      setDueDate(toSafeIsoDateInputString(task.dueDate));
      setProgress(task.progress || 0);
      setAssignedTo(task.assignedTo || "unassigned");
      setAttachments(task.attachments || []);
      setChecklist(task.checklist || []);
      setTags(task.tags || []);
    } else {
      setTitle("");
      setEmoji("");
      setDescription("");
      setStatus(initialStatus || (columns && columns.length > 0 ? columns[0].id : "todo"));
      setPriority("medium");
      setDueDate("");
      setProgress(0);
      setAssignedTo("unassigned");
      setAttachments([]);
      setChecklist([]);
      setTags([]);
    }
    setNewChecklistText("");
    setIsAddingTag(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, isModalOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const uploaded = await fileApi.uploadFile(file, undefined, currentBoardId);
        setAttachments((prev) => [
          ...prev,
          {
            id: uploaded.id,
            name: uploaded.name,
            storedName: uploaded.storedName,
            size: uploaded.size,
            type: uploaded.type,
            url: uploaded.url,
            uploaderId: currentUser?.id,
          },
        ]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err: any) {
        toast.error(err.message || `Failed to upload ${file.name}`);
      }
    }
  };

  const removeAttachment = (index: number) => {
    if (readOnly) return;
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const nextProgress = computeTaskProgress(
      { checklist, status: newStatus },
      newStatus,
      activeColumns
    );
    setProgress(nextProgress);
  };

  // Checklist Actions
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim() || readOnly) return;
    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: newChecklistText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistText("");
    const nextProgress = computeTaskProgress(
      { checklist: updated, status },
      status,
      activeColumns
    );
    setProgress(nextProgress);
  };

  const handleToggleChecklistItem = (id: string) => {
    if (readOnly) return;
    const updated = checklist.map((item) => {
      if (item.id !== id) return item;
      const isNowCompleted = !item.completed;
      return {
        ...item,
        completed: isNowCompleted,
        completedBy: isNowCompleted && currentUser
          ? {
              id: currentUser.id,
              fullName: currentUser.fullName || undefined,
              email: currentUser.email,
              avatarUrl: currentUser.avatarUrl || undefined,
            }
          : null,
        completedAt: isNowCompleted ? new Date().toISOString() : null,
      };
    });
    setChecklist(updated);
    const nextProgress = computeTaskProgress(
      { checklist: updated, status },
      status,
      activeColumns
    );
    setProgress(nextProgress);
  };

  const handleDeleteChecklistItem = (id: string) => {
    if (readOnly) return;
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    const nextProgress = computeTaskProgress(
      { checklist: updated, status },
      status,
      activeColumns
    );
    setProgress(nextProgress);
  };

  // Tag Actions
  const handleAddTag = (tagToAdd?: Tag) => {
    if (readOnly) return;
    if (tagToAdd) {
      const normToAdd = normalizeTagName(tagToAdd.name);
      if (tags.some((t) => normalizeTagName(t.name) === normToAdd)) {
        // Toggle off if already on card
        setTags((prev) => prev.filter((t) => normalizeTagName(t.name) !== normToAdd));
        return;
      }
      setTags((prev) => deduplicateTags([...prev, tagToAdd]));
      if (currentBoardId) addLabel(tagToAdd);
      return;
    }

    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const norm = normalizeTagName(trimmed);

    // Prevent duplicate on the same card
    if (tags.some((t) => normalizeTagName(t.name) === norm)) {
      toast.info(`"${trimmed}" is already added to this card`);
      setNewTagName("");
      setIsAddingTag(false);
      return;
    }

    // Reuse existing board label if matching name exists
    const existingBoardLabel = boardLabels.find((t) => normalizeTagName(t.name) === norm);
    const newTag: Tag = existingBoardLabel
      ? existingBoardLabel
      : {
          id: `tag_${Date.now()}`,
          name: trimmed,
          color: selectedTagColor,
        };

    setTags((prev) => deduplicateTags([...prev, newTag]));
    if (currentBoardId) addLabel(newTag);
    setNewTagName("");
    setIsAddingTag(false);
  };

  const handleDeleteTag = (idOrName: string) => {
    if (readOnly) return;
    const norm = normalizeTagName(idOrName);
    setTags((prev) => prev.filter((t) => t.id !== idOrName && normalizeTagName(t.name) !== norm));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (readOnly || !title.trim()) return;

    const cleanedTags = deduplicateTags(tags);
    if (currentBoardId && cleanedTags.length > 0) {
      saveBoardLabels(currentBoardId, cleanedTags);
    }

    const finalProgress = computeTaskProgress(
      { checklist, status, progress },
      status,
      activeColumns
    );

    const payload: TaskFormData = {
      title: title.trim(),
      emoji: devSettings.disableEmojiCustomization ? undefined : (emoji || undefined),
      description: description.trim() || undefined,
      priority,
      status: status || task?.status || (activeColumns && activeColumns.length > 0 ? activeColumns[0].id : "todo"),
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      boardId: selectedBoardId || undefined,
      dueDate: dueDate ? parseSafeDate(dueDate) || null : null,
      progress: finalProgress,
      checklist,
      tags: cleanedTags,
      attachments,
    };

    if (onSubmit) {
      onSubmit(payload);
    }
    if (onSave) {
      onSave(payload);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="w-full max-w-none sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh] rounded-none sm:rounded-lg flex flex-col p-0 overflow-hidden shadow-2xl border-border/80"
      >
        {/* Header with Top Quick Save Option */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0 bg-background">
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {readOnly ? (
                <>
                  <span>Task Details</span>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Eye className="h-3 w-3" /> View Only
                  </span>
                </>
              ) : isEditing ? (
                <div className="flex items-center gap-2">
                  <span>Edit Task</span>
                  <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                    (Ctrl + Enter to save)
                  </span>
                </div>
              ) : (
                "New Task"
              )}
            </DialogTitle>

            {!readOnly && isEditing && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmit()}
                disabled={!title.trim()}
                className="h-8 px-3.5 font-bold text-xs gap-1.5 shadow-sm ml-auto"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save</span>
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            Task details, assignments, attachments, checklists, and discussions
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          id="task-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {/* Title & Emoji */}
          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Task Title <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              {!devSettings.disableEmojiCustomization && (
                !readOnly ? (
                  <EmojiSelector value={emoji} onChange={setEmoji} />
                ) : emoji ? (
                  <div className="h-10 w-10 flex items-center justify-center text-xl bg-muted rounded-md shrink-0">
                    {emoji}
                  </div>
                ) : null
              )}
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                disabled={readOnly}
                className="h-10 text-sm font-semibold flex-1 bg-background/50 border-border/60 focus-visible:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Labels & Tags Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <TagIcon className="h-3.5 w-3.5 text-primary" /> Labels / Tags ({tags.length})
              </Label>
              {!readOnly && !isAddingTag && (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> New Label
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center min-h-[34px] p-2 rounded-lg bg-muted/30 border border-border/40">
              {tags.length === 0 && !isAddingTag && (
                <span className="text-[11px] text-muted-foreground italic px-1">
                  No labels attached yet.
                </span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag.id || tag.name}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    borderColor: `${tag.color}60`,
                    color: tag.color,
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                      title="Remove from card"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}

              {/* Inline Tag Creator */}
              {isAddingTag && (
                <div className="flex items-center gap-1.5 w-full pt-1">
                  <Input
                    placeholder="Label name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                      if (e.key === "Escape") {
                        setIsAddingTag(false);
                      }
                    }}
                    className="h-7 text-xs flex-1"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedTagColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-4 w-4 rounded-full transition-transform cursor-pointer ${
                          selectedTagColor === c ? "ring-2 ring-primary scale-110" : "opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddTag()}
                    className="h-7 px-2 text-xs font-bold"
                    aria-label="Confirm add label"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingTag(false)}
                    className="h-7 px-1.5 text-xs text-muted-foreground"
                    aria-label="Cancel add label"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Available Board Labels Quick-Pick */}
            {boardLabels.length > 0 && !readOnly && (
              <div className="pt-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Available board labels (click to toggle):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {boardLabels.map((bl) => {
                    const isSelected = tags.some(
                      (t) => normalizeTagName(t.name) === normalizeTagName(bl.name)
                    );
                    return (
                      <button
                        key={bl.id || bl.name}
                        type="button"
                        onClick={() => handleAddTag(bl)}
                        aria-label={isSelected ? `Remove ${bl.name} label` : `Add ${bl.name} label`}
                        style={{
                          backgroundColor: isSelected ? `${bl.color}25` : "transparent",
                          borderColor: isSelected ? bl.color : `${bl.color}45`,
                          color: isSelected ? bl.color : "inherit",
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-all cursor-pointer hover:scale-105 border ${
                          isSelected
                            ? "font-bold ring-1 shadow-xs"
                            : "opacity-75 hover:opacity-100 bg-background/50"
                        }`}
                        title={isSelected ? `Remove "${bl.name}"` : `Add "${bl.name}" to card`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: bl.color }}
                        />
                        <span>{bl.name}</span>
                        {isSelected ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3 opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                readOnly ? "No description provided." : "Add more details, requirements, or links…"
              }
              rows={3}
              disabled={readOnly}
              className="resize-none text-xs leading-relaxed bg-background/50 border-border/60 focus-visible:ring-primary"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority Section with Color Indicators */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-primary" /> Priority
              </Label>
              <div className="flex gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40 h-10 items-center">
                {(["low", "medium", "high"] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  const config = {
                    low: {
                      dot: "bg-blue-500",
                      active:
                        "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs font-bold",
                      label: "Low",
                    },
                    medium: {
                      dot: "bg-amber-500",
                      active:
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs font-bold",
                      label: "Medium",
                    },
                    high: {
                      dot: "bg-red-500",
                      active:
                        "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 shadow-xs font-bold",
                      label: "High",
                    },
                  }[p];

                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setPriority(p)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] uppercase tracking-wider rounded-md border transition-all cursor-pointer ${
                        isSelected
                          ? `${config.active} border`
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/40 font-semibold"
                      } ${readOnly ? "cursor-default opacity-80" : ""}`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot}`} />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rich Date & Time Picker Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="due-date"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" /> Due Date & Time
              </Label>
              <DateTimePicker
                id="due-date"
                value={dueDate}
                disabled={readOnly}
                readOnly={readOnly}
                onChange={setDueDate}
                ariaLabel="Due Date & Time"
              />
            </div>
          </div>

          {/* Target Board & Stage / Column Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Board Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-primary" /> Target Board
                </Label>
                {!allowBoardChange ? (
                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded">
                    <Lock className="h-2.5 w-2.5" /> Current Board
                  </span>
                ) : displayBoards.length > 1 ? (
                  <span className="text-[10px] font-medium text-primary flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded">
                    Select Board
                  </span>
                ) : null}
              </div>
              <Select
                value={selectedBoardId}
                onValueChange={handleBoardChange}
                disabled={isBoardSelectionDisabled}
              >
                <SelectTrigger
                  data-testid="task-modal-board-select"
                  aria-label="Target Board"
                  className="h-10 bg-background/50 border-border/60 text-xs"
                >
                  <SelectValue placeholder="Select board..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {displayBoards.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span>{b.emoji || "📋"}</span>
                        <span className="font-medium truncate">{b.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage / Column */}
            {activeColumns && activeColumns.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Stage / Column
                </Label>
                <Select value={status} onValueChange={handleStatusChange} disabled={readOnly}>
                  <SelectTrigger
                    data-testid="task-modal-status-select"
                    aria-label="Stage / Column"
                    className="h-10 bg-background/50 border-border/60 text-xs"
                  >
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {activeColumns.map((c) => (
                      <SelectItem key={c.id} value={c.id} hideIndicator className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          {!devSettings.disableEmojiCustomization && c.emoji ? (
                            <span className="text-sm shrink-0 leading-none">{c.emoji}</span>
                          ) : (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color || "var(--primary)" }}
                            />
                          )}
                          <span>{c.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Assignee
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={readOnly}>
              <SelectTrigger
                data-testid="task-modal-assignee-select"
                aria-label="Assignee"
                className="h-10 bg-background/50 border-border/60 text-xs"
              >
                <SelectValue placeholder="Assign to team member..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="unassigned" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium">Unassigned</span>
                  </div>
                </SelectItem>
                {assignableMembers.map((m) => {
                  const name = m.user?.fullName || m.user?.email || "Member";
                  const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                  return (
                    <SelectItem key={m.userId} value={m.userId} className="cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-6 w-6 border border-primary/20">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold leading-tight">{name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.user?.email}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Computed Progress Display */}
          {(() => {
            const progressInfo = getTaskProgressInfo(
              { checklist, status, progress },
              status,
              activeColumns
            );
            const displayProgress = progressInfo.progress;
            return (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" /> Progress
                  </Label>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold border shrink-0",
                        progressInfo.mode === "complete"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : progressInfo.mode === "checklist"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      {progressInfo.label}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {displayProgress}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted/80 rounded-full overflow-hidden border border-border/40">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      displayProgress === 100
                        ? "bg-emerald-500"
                        : displayProgress > 0
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Subtasks / Checklist Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                Checklist ({checklist.filter((i) => i.completed).length}/{checklist.length})
              </Label>
              {checklist.length > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground">
                  {Math.round(
                    (checklist.filter((i) => i.completed).length / checklist.length) * 100
                  )}
                  % done
                </span>
              )}
            </div>

            {/* Checklist Items List */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklistItem(item.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    item.completed
                      ? "bg-muted/30 text-muted-foreground border-border/30 line-through"
                      : "bg-background/80 text-foreground border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.completed ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.completed && item.completedBy && (() => {
                      const isCompletedByMe =
                        item.completedBy.id === currentUser?.id ||
                        (currentUser?.email && item.completedBy.email === currentUser.email);
                      const completedAvatarUrl = isCompletedByMe
                        ? (currentUser?.avatarUrl ?? item.completedBy.avatarUrl)
                        : item.completedBy.avatarUrl;

                      return (
                        <div
                          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-muted-foreground"
                          title={`Completed by ${item.completedBy.fullName || item.completedBy.email}${
                            item.completedAt
                              ? ` on ${new Date(item.completedAt).toLocaleDateString()}`
                              : ""
                          }`}
                        >
                          <Avatar className="h-3.5 w-3.5 text-[7px] ring-1 ring-emerald-500/30">
                            <AvatarImage
                              src={completedAvatarUrl}
                              alt={item.completedBy.fullName || item.completedBy.email}
                            />
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                              {(item.completedBy.fullName || item.completedBy.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium max-w-[80px] truncate text-foreground/80">
                            {item.completedBy.fullName || item.completedBy.email}
                          </span>
                        </div>
                      );
                    })()}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChecklistItem(item.id);
                        }}
                        className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Checklist Item Input */}
            {!readOnly && (
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Add a subtask..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  className="h-8 text-xs bg-background/50 border-border/60"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistText.trim()}
                  className="h-8 px-3 text-xs font-bold gap-1 shrink-0"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attachments ({attachments.length})
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {attachments.map((file, i) => (
                <div
                  key={file.id || file.url || `attachment-${i}`}
                  className="relative group aspect-square rounded-lg border border-border bg-muted/40 flex flex-col items-center justify-center p-2 text-center overflow-hidden hover:border-primary/50 transition-colors"
                >
                  {file.url && file.type?.startsWith("image/") ? (
                    <img
                      src={getMediaUrl(file.url)}
                      alt={file.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-6 w-6 text-orange-500 mb-1" />
                      <span className="text-[9px] font-bold text-foreground line-clamp-1">{file.name}</span>
                    </div>
                  )}
                  <a
                    href={getMediaUrl(file.url)}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-2 text-[10px] font-medium transition-opacity"
                  >
                    <span className="line-clamp-2 break-all text-foreground">{file.name}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">{file.size}</span>
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background z-10 shadow-sm cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground/60 hover:text-primary text-[9px] font-bold cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload
                </button>
              )}
            </div>
            {!readOnly && (
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="*/*"
                multiple
                onChange={handleFileChange}
              />
            )}
          </div>

          {/* Task Comments & Mentions Discussion Thread */}
          {isEditing && task && (
            <div className="pt-2 border-t border-border/40">
              <TaskComments
                taskId={task.id}
                boardMembers={boardMembers}
                readOnly={canComment !== undefined ? !canComment : readOnly}
              />
            </div>
          )}
        </form>

        {/* Sticky Footer: Always visible on screen */}
        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-background/95 backdrop-blur-md shrink-0 flex items-center !justify-between">
          {readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-5 font-bold text-xs ml-auto"
              onClick={onClose}
            >
              Close
            </Button>
          ) : (
            <>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (status === "archive") {
                        const defaultCol = activeColumns.find((c) => c.id !== "archive")?.id || "todo";
                        setStatus(defaultCol);
                        toast.success("Task unarchived");
                      } else {
                        setStatus("archive");
                        toast.success("Task marked for archive");
                      }
                    }}
                    title={status === "archive" ? "Unarchive task" : "Archive task"}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>{status === "archive" ? "Unarchive" : "Archive"}</span>
                  </Button>
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Delete Task"
                      className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold"
                      onClick={() => {
                        onDelete(task.id);
                        onClose();
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Move to Trash
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 font-bold text-xs"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="task-modal-form"
                  size="sm"
                  className="h-9 px-4 font-bold text-xs shadow-sm"
                  disabled={!title.trim()}
                >
                  {isEditing ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
