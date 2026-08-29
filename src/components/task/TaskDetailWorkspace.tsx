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
  }, [task.id]);

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

  // Field change handlers
  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      onUpdateTask({ title: newTitle });
    }, 600);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
      titleDebounceRef.current = null;
    }
    if (localTitle.trim() && localTitle !== task.title) {
      onUpdateTask({ title: localTitle.trim() });
    }
  };

  const handleDescriptionChange = (newDesc: string) => {
    setLocalDescription(newDesc);
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(() => {
      onUpdateTask({ description: newDesc });
    }, 800);
  };

  const handleEmojiChange = (newEmoji: string) => {
    setLocalEmoji(newEmoji);
    onUpdateTask({ emoji: newEmoji });
  };

  const handleStatusChange = (newStatus: string) => {
    setLocalStatus(newStatus);
    const colName = board.columns?.find((c) => c.id === newStatus)?.title || newStatus;
    onUpdateTask({ status: newStatus });
    playSound("move");
    addActivity("move", localTitle, `Moved task to ${colName}`, board.id);
    toast.success(`Status updated to ${colName}`);
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setLocalPriority(newPriority);
    onUpdateTask({ priority: newPriority });
    toast.success(`Priority set to ${newPriority}`);
  };

  const handleAssigneeChange = (newUserId: string) => {
    setLocalAssignedTo(newUserId);
    const assignedUser = members.find((m) => m.userId === newUserId);
    const name = assignedUser?.user?.fullName || assignedUser?.user?.email || "Unassigned";
    onUpdateTask({ assignedTo: newUserId });
    toast.success(`Assigned to ${name}`);
  };

  const handleDueDateChange = (newDueDate: string) => {
    setLocalDueDate(newDueDate);
    onUpdateTask({ dueDate: newDueDate ? new Date(newDueDate) : undefined });
  };

  const handleProgressChange = (newProgress: number) => {
    setLocalProgress(newProgress);
    onUpdateTask({ progress: newProgress });
  };

  const handleTagsChange = (newTags: Tag[]) => {
    setLocalTags(newTags);
    onUpdateTask({ tags: newTags });
  };

  const handleChecklistChange = (newChecklist: ChecklistItem[]) => {
    setLocalChecklist(newChecklist);
    onUpdateTask({ checklist: newChecklist });
  };

  const handleAttachmentsChange = (newAttachments: Attachment[]) => {
    setLocalAttachments(newAttachments);
    onUpdateTask({ attachments: newAttachments });
  };

  const handleDelete = () => {
    onDeleteTask(task.id);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background text-foreground selection:bg-primary/20">
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
  );
}
