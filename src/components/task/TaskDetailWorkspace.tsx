import React, { useState, useEffect, useCallback, useRef } from "react";
import { Task, Priority, ChecklistItem, Tag, Attachment } from "@/types/task";
import { Board, BoardMember } from "@/types/board";
import { useSettings } from "@/contexts/SettingsContext";
import { useActivity } from "@/hooks/useActivity";
import { TaskHeader } from "./TaskHeader";
import { TaskProperties } from "./TaskProperties";
import { TaskDescription } from "./TaskDescription";
import { TaskChecklist } from "./TaskChecklist";
import { TaskAttachments } from "./TaskAttachments";
import { TaskActivityLog } from "./TaskActivityLog";
import { TaskComments } from "../kanban/TaskComments";
import { formatDistanceToNow } from "date-fns";
import { Clock, Loader2, Check, Cloud } from "lucide-react";
import { toast } from "sonner";

interface TaskDetailWorkspaceProps {
  task: Task;
  board: Board;
  members: BoardMember[];
  readOnly?: boolean;
  onClose: () => void;
  onUpdateTask: (updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskDetailWorkspace({
  task,
  board,
  members,
  readOnly = false,
  onClose,
  onUpdateTask,
  onDeleteTask,
}: TaskDetailWorkspaceProps) {
  const { playSound } = useSettings();
  const { addActivity } = useActivity();

  // Local state initialized with current task prop
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localEmoji, setLocalEmoji] = useState(task.emoji || "");
  const [localDescription, setLocalDescription] = useState(task.description || "");
  const [localStatus, setLocalStatus] = useState(task.status);
  const [localPriority, setLocalPriority] = useState<Priority>(task.priority);
  const [localAssignedTo, setLocalAssignedTo] = useState(task.assignedTo || "unassigned");
  const [localDueDate, setLocalDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ""
  );
  const [localProgress, setLocalProgress] = useState(task.progress || 0);
  const [localTags, setLocalTags] = useState<Tag[]>(task.tags || []);
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(task.attachments || []);
  const [localUpdatedAt, setLocalUpdatedAt] = useState<Date | string | undefined>(task.updatedAt);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const descDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state whenever the selected task changes (e.g. user clicked another card)
  useEffect(() => {
    setLocalTitle(task.title);
    setLocalEmoji(task.emoji || "");
    setLocalDescription(task.description || "");
    setLocalStatus(task.status);
    setLocalPriority(task.priority);
    setLocalAssignedTo(task.assignedTo || "unassigned");
    setLocalDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
    setLocalProgress(task.progress || 0);
    setLocalTags(task.tags || []);
    setLocalChecklist(task.checklist || []);
    setLocalAttachments(task.attachments || []);
    setLocalUpdatedAt(task.updatedAt);
    setSaveStatus("idle");
  }, [task.id, task.updatedAt]);

  // Unified silent background update handler
  const performUpdate = useCallback(
    async (updates: Partial<Task>) => {
      setSaveStatus("saving");
      setLocalUpdatedAt(new Date());
      try {
        await onUpdateTask(updates);
        setSaveStatus("saved");
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (err: any) {
        setSaveStatus("idle");
        toast.error(err?.message || "Failed to update task");
      }
    },
    [onUpdateTask]
  );

  // Keyboard shortcut: Escape to close side panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Field change handlers (Silent & instant)
  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      performUpdate({ title: newTitle });
    }, 600);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    if (localTitle.trim() && localTitle !== task.title) {
      performUpdate({ title: localTitle.trim() });
    }
  };

  const handleDescriptionChange = (newDesc: string) => {
    setLocalDescription(newDesc);
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(() => {
      performUpdate({ description: newDesc });
    }, 800);
  };

  const handleEmojiChange = (newEmoji: string) => {
    setLocalEmoji(newEmoji);
    performUpdate({ emoji: newEmoji });
  };

  const handleStatusChange = (newStatus: string) => {
    setLocalStatus(newStatus);
    const colName = board.columns?.find((c) => c.id === newStatus)?.title || newStatus;
    performUpdate({ status: newStatus });
    playSound("move");
    addActivity("move", localTitle, `Moved task to ${colName}`, board.id);
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setLocalPriority(newPriority);
    performUpdate({ priority: newPriority });
  };

  const handleAssigneeChange = (newUserId: string) => {
    setLocalAssignedTo(newUserId);
    performUpdate({ assignedTo: newUserId });
  };

  const handleDueDateChange = (newDueDate: string) => {
    setLocalDueDate(newDueDate);
    performUpdate({ dueDate: newDueDate ? new Date(newDueDate) : undefined });
  };

  const handleProgressChange = (newProgress: number) => {
    setLocalProgress(newProgress);
    performUpdate({ progress: newProgress });
  };

  const handleTagsChange = (newTags: Tag[]) => {
    setLocalTags(newTags);
    performUpdate({ tags: newTags });
  };

  const handleChecklistChange = (newChecklist: ChecklistItem[]) => {
    setLocalChecklist(newChecklist);
    performUpdate({ checklist: newChecklist });
  };

  const handleAttachmentsChange = (newAttachments: Attachment[]) => {
    setLocalAttachments(newAttachments);
    performUpdate({ attachments: newAttachments });
  };

  const handleDelete = () => {
    onDeleteTask(task.id);
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Header & Page Controls */}
        <TaskHeader
          boardId={board.id}
          boardName={board.name}
          title={localTitle}
          emoji={localEmoji}
          readOnly={readOnly}
          onClose={onClose}
          onTitleChange={handleTitleChange}
          onTitleBlur={handleTitleBlur}
          onEmojiChange={handleEmojiChange}
          onDelete={handleDelete}
        />

        {/* Notion-Style Properties Grid */}
        <TaskProperties
          status={localStatus}
          columns={board.columns || []}
          priority={localPriority}
          assignedTo={localAssignedTo}
          members={members}
          dueDate={localDueDate}
          progress={localProgress}
          tags={localTags}
          createdAt={task.createdAt}
          updatedAt={task.updatedAt}
          readOnly={readOnly}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onAssigneeChange={handleAssigneeChange}
          onDueDateChange={handleDueDateChange}
          onProgressChange={handleProgressChange}
          onTagsChange={handleTagsChange}
        />

        {/* Document / Notes Body */}
        <TaskDescription
          description={localDescription}
          readOnly={readOnly}
          onChange={handleDescriptionChange}
        />

        {/* Subtasks & Checklist */}
        <TaskChecklist
          checklist={localChecklist}
          readOnly={readOnly}
          onChange={handleChecklistChange}
          onProgressSync={handleProgressChange}
        />

        {/* Attachments Section */}
        <TaskAttachments
          attachments={localAttachments}
          readOnly={readOnly}
          onChange={handleAttachmentsChange}
        />

        {/* Discussion & Comments Section */}
        <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
          <TaskComments
            taskId={task.id}
            boardMembers={members}
            readOnly={readOnly}
          />
        </div>

        {/* Task Audit & Activity History */}
        <TaskActivityLog taskTitle={localTitle} />
      </div>

      {/* Sticky Micro-Status Bar Footer (Option 1) */}
      <div className="h-8 px-6 shrink-0 border-t border-border/40 bg-muted/20 backdrop-blur-sm flex items-center justify-between text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          <span className="truncate">
            Updated {(() => {
              if (!localUpdatedAt) return "just now";
              let d: Date;
              if (localUpdatedAt instanceof Date) {
                d = localUpdatedAt;
              } else {
                const s = String(localUpdatedAt);
                d = s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s) ? new Date(s) : new Date(`${s}Z`);
              }
              if (isNaN(d.getTime())) return "just now";
              return formatDistanceToNow(d, { addSuffix: true });
            })()}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>Saving changes...</span>
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === "idle" && (
            <span className="flex items-center gap-1 text-muted-foreground/60">
              <Cloud className="h-3 w-3 text-muted-foreground/40" />
              <span>Synced</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
