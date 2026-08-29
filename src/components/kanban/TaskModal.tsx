import { useState, useEffect, useRef } from "react";
import { Task, UpdateTaskData, Priority, Column, Attachment, ChecklistItem, Tag } from "@/types/task";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  ImagePlus,
  X,
  Check,
  FileText,
  User,
  Users,
  Eye,
  CheckSquare,
  Square,
  Tag as TagIcon,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";
import { TaskComments } from "./TaskComments";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";
import { boardApi } from "@/services/boardApi";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  columns?: Column[];
  boardId?: string;
  members?: BoardMember[];
  readOnly?: boolean;
  onSubmit: (data: UpdateTaskData) => void;
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

export function TaskModal({
  open,
  onClose,
  task,
  columns = [],
  boardId,
  members = [],
  readOnly = false,
  onSubmit,
  onDelete,
}: TaskModalProps) {
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(members);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
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
    if (members && members.length > 0) {
      setBoardMembers(members);
    } else {
      const activeBoardId = boardId || task?.boardId;
      if (activeBoardId && open) {
        boardApi
          .getMembers(activeBoardId)
          .then((data) => {
            setBoardMembers(data || []);
          })
          .catch(() => {});
      }
    }
  }, [members, boardId, task?.boardId, open]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEmoji(task.emoji || "");
      setDescription(task.description || "");
      setPriority(task.priority || "medium");
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
      setProgress(task.progress || 0);
      setAssignedTo(task.assignedTo || "unassigned");
      setAttachments(task.attachments || []);
      setChecklist(task.checklist || []);
      setTags(task.tags || []);
    } else {
      setTitle("");
      setEmoji("");
      setDescription("");
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
  }, [task, open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const uploaded = await fileApi.uploadFile(file);
        setAttachments((prev) => [
          ...prev,
          {
            id: uploaded.id,
            name: uploaded.name,
            size: uploaded.size,
            type: uploaded.type,
            url: uploaded.url,
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
  };

  const handleToggleChecklistItem = (id: string) => {
    if (readOnly) return;
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    // Auto calculate progress from checklist if present
    const completedCount = updated.filter((i) => i.completed).length;
    if (updated.length > 0) {
      setProgress(Math.round((completedCount / updated.length) * 100));
    }
  };

  const handleDeleteChecklistItem = (id: string) => {
    if (readOnly) return;
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // Tag Actions
  const handleAddTag = () => {
    if (!newTagName.trim() || readOnly) return;
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: selectedTagColor,
    };
    setTags((prev) => [...prev, newTag]);
    setNewTagName("");
    setIsAddingTag(false);
  };

  const handleDeleteTag = (id: string) => {
    if (readOnly) return;
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (readOnly || !title.trim()) return;

    onSubmit({
      title: title.trim(),
      emoji: emoji || undefined,
      description: description.trim() || undefined,
      priority,
      status: task?.status,
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      progress,
      checklist,
      tags,
      attachments,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border/80"
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
              {!readOnly ? (
                <EmojiSelector value={emoji} onChange={setEmoji} />
              ) : emoji ? (
                <div className="h-10 w-10 flex items-center justify-center text-xl bg-muted rounded-md shrink-0">
                  {emoji}
                </div>
              ) : null}
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
          <div className="space-y-1.5">
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
                  <Plus className="h-3 w-3" /> Add Tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center min-h-[34px] p-1.5 rounded-lg bg-muted/30 border border-border/40">
              {tags.length === 0 && !isAddingTag && (
                <span className="text-[11px] text-muted-foreground italic px-1">
                  No tags added
                </span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    borderColor: `${tag.color}60`,
                    color: tag.color,
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border shadow-xs"
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
                    placeholder="Tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
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
                    onClick={handleAddTag}
                    className="h-7 px-2 text-xs font-bold"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingTag(false)}
                    className="h-7 px-1.5 text-xs text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
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

            {/* Consistent Due Date Field */}
            <div className="space-y-1.5">
              <Label
                htmlFor="due-date"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5 text-primary" /> Due Date & Time
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="due-date"
                  type="datetime-local"
                  value={dueDate}
                  disabled={readOnly}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 text-xs font-sans font-medium bg-background/50 border-border/60 focus-visible:ring-primary pr-8 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
                {dueDate && !readOnly && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                    title="Clear due date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Assignee
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo} disabled={readOnly}>
              <SelectTrigger className="h-10 bg-background/50 border-border/60 text-xs">
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
                {boardMembers.map((m) => {
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
                  <div className="flex items-center gap-2 min-w-0">
                    {item.completed ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
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
                  {file.url ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground mb-1" />
                  )}
                  <a
                    href={file.url}
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
              <TaskComments taskId={task.id} boardMembers={boardMembers} readOnly={readOnly} />
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
              {isEditing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold"
                  onClick={() => {
                    onDelete(task.id);
                    onClose();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Task
                </Button>
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
