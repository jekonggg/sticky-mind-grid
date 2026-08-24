import { useState, useEffect, useRef } from "react";
import { Task, UpdateTaskData, Priority, Column, Attachment } from "@/types/task";
import { BoardMember } from "@/types/board";
import { getProgressColor } from "@/utils/taskUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ImagePlus, X, Check, FileText, File, Film, Music, User, Users } from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";

import { boardApi } from "@/services/boardApi";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  columns?: Column[];
  boardId?: string;
  members?: BoardMember[];
  onSubmit: (data: UpdateTaskData) => void;
  onDelete?: (id: string) => void;
}

export function TaskModal({
  open,
  onClose,
  task,
  columns,
  boardId,
  members = [],
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;

  // Sync passed members or fetch if boardId is provided
  useEffect(() => {
    if (members && members.length > 0) {
      setBoardMembers(members);
    } else {
      const activeBoardId = boardId || task?.boardId;
      if (activeBoardId && open) {
        boardApi.getMembers(activeBoardId).then((data) => {
          setBoardMembers(data || []);
        }).catch(() => {});
      }
    }
  }, [members, boardId, task?.boardId, open]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEmoji(task.emoji || "");
      setDescription(task.description || "");
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
      setProgress(task.progress || 0);
      setAssignedTo(task.assignedTo || "unassigned");
      setAttachments(task.attachments || []);
    } else {
      setTitle("");
      setEmoji("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setProgress(0);
      setAssignedTo("unassigned");
      setAttachments([]);
    }
  }, [task, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: Attachment = {
          name: file.name,
          url: reader.result as string,
          type: file.type,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return null;
    if (type.startsWith("video/")) return <Film className="h-6 w-6 text-blue-500" />;
    if (type.startsWith("audio/")) return <Music className="h-6 w-6 text-purple-500" />;
    if (type.includes("pdf") || type.includes("word") || type.includes("text"))
      return <FileText className="h-6 w-6 text-orange-500" />;
    return <File className="h-6 w-6 text-slate-400" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalStatus = task?.status;
    if (columns && columns.length >= 3) {
      if (progress === 100) finalStatus = "done";
      else if (progress === 30) finalStatus = "in_progress";
      else if (progress === 0) finalStatus = "todo";
    }

    onSubmit({
      title: title.trim(),
      emoji: emoji || undefined,
      description: description.trim() || undefined,
      priority,
      status: finalStatus,
      assignedTo: assignedTo === "unassigned" ? null : assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      progress,
      attachments,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {isEditing ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Title & Emoji */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Task Title
            </Label>
            <div className="flex gap-2">
              <EmojiSelector value={emoji} onChange={setEmoji} />
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?…"
                autoFocus
                required
                className="flex-1 font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details, requirements, or links…"
              rows={3}
              className="resize-none text-xs leading-relaxed"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Priority
              </Label>
              <div className="flex gap-1 p-1 bg-muted/60 rounded-lg border border-border/40">
                {(["low", "medium", "high"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1 px-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all
                      ${
                        priority === p
                          ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Due Date & Time
              </Label>
              <Input
                id="due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 py-1 px-3 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Assignee Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Assignee
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="h-10 bg-background/50 border-border/60">
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

          {/* Progress Slider / Selection */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Task Progress
              </Label>
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getProgressColor(
                  progress
                )
                  .replace("bg-", "text-")
                  .replace("shadow-", "")
                  .replace("-500", "-600")} bg-muted`}
              >
                {progress}% {progress === 100 ? "Completed" : "In Progress"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 justify-between">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProgress(val)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md text-[9px] font-black transition-all border
                    ${
                      progress === val
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                    }`}
                >
                  {val === 100 ? <Check className="h-3 w-3" /> : val}
                </button>
              ))}
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${getProgressColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attachments
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((file, i) => (
                <div
                  key={i}
                  className="relative aspect-square group rounded-lg border border-border/60 overflow-hidden bg-muted flex items-center justify-center"
                >
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex flex-col items-center justify-center hover:bg-muted/50 transition-colors"
                  >
                    {file.type.startsWith("image/") ? (
                      <img src={file.url} className="w-full h-full object-cover" alt={file.name} />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 text-center">
                        {getFileIcon(file.type)}
                        <span className="text-[8px] font-black tracking-tighter truncate w-full px-1 uppercase">
                          {file.name.split(".").pop()}
                        </span>
                      </div>
                    )}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground/60 hover:text-primary text-[9px] font-bold"
              >
                <ImagePlus className="h-4 w-4" />
                Upload
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="*/*"
              multiple
              onChange={handleFileChange}
            />
          </div>

          <DialogFooter className="flex items-center !justify-between pt-4 border-t border-border/50">
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
                size="sm"
                className="h-9 px-4 font-bold text-xs"
                disabled={!title.trim()}
              >
                {isEditing ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
