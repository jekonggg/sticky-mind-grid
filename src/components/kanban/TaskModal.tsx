import { useState, useEffect, useRef } from "react";
import { Task, UpdateTaskData, Priority, Column, Attachment } from "@/types/task";
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
import { Trash2, ImagePlus, X, Check, FileText, File, Film, Music } from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  columns?: Column[];
  onSubmit: (data: UpdateTaskData) => void;
  onDelete?: (id: string) => void;
}

export function TaskModal({ open, onClose, task, columns, onSubmit, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setEmoji(task.emoji || "");
      setDescription(task.description || "");
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
      setProgress(task.progress || 0);
      setAttachments(task.attachments || []);
    } else {
      setTitle("");
      setEmoji("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setProgress(0);
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
          type: file.type
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
    if (type.startsWith('image/')) return null;
    if (type.startsWith('video/')) return <Film className="h-6 w-6 text-blue-500" />;
    if (type.startsWith('audio/')) return <Music className="h-6 w-6 text-purple-500" />;
    if (type.includes('pdf') || type.includes('word') || type.includes('text')) return <FileText className="h-6 w-6 text-orange-500" />;
    return <File className="h-6 w-6 text-slate-400" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalStatus = task?.status;
    if (columns && columns.length >= 3) {
      if (progress === 100) finalStatus = 'done';
      else if (progress === 30) finalStatus = 'in_progress';
      else if (progress === 0) finalStatus = 'todo';
    }

    onSubmit({
      title: title.trim(),
      emoji: emoji || undefined,
      description: description.trim() || undefined,
      priority,
      status: finalStatus,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      progress,
      attachments,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Task Icon & Title</Label>
            <div className="flex gap-2">
              <EmojiSelector 
                currentEmoji={emoji}
                onSelect={setEmoji}
              />
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task name…"
                autoFocus
                required
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Priority</Label>
                <div className="flex gap-1.5 p-1 bg-muted rounded-lg">
                   {(["low", "medium", "high"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1 px-2 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all
                        ${priority === p ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                   id="due-date"
                   type="date"
                   value={dueDate}
                   onChange={(e) => setDueDate(e.target.value)}
                   className="h-9 py-1 px-3 text-xs font-bold"
                />
             </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Task Progress</Label>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getProgressColor(progress).replace('bg-', 'text-').replace('shadow-', '').replace('-500', '-600')} bg-muted`}>
                {progress}% {progress === 100 ? "Completed" : "In Progress"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-between">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProgress(val)}
                  className={`h-7 w-7 flex items-center justify-center rounded-md text-[9px] font-black transition-all border
                    ${progress === val ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary"}`}
                >
                  {val === 100 ? <Check className="h-3 w-3" /> : val}
                </button>
              ))}
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
               <div 
                  className={`h-full transition-all duration-500 ease-out ${getProgressColor(progress)}`}
                  style={{ width: `${progress}%` }}
               />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label>Attachments</Label>
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="relative aspect-square group rounded-md border overflow-hidden bg-muted flex items-center justify-center">
                  {file.type.startsWith('image/') ? (
                    <img src={file.url} className="w-full h-full object-cover" alt={file.name} />
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      {getFileIcon(file.type)}
                      <span className="text-[8px] font-black tracking-tighter truncate w-full px-1 uppercase">{file.name.split('.').pop()}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground/60 hover:text-primary text-[9px] font-bold"
              >
                <ImagePlus className="h-4 w-4" />
                Upload
              </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="*/*" multiple onChange={handleFileChange} />
          </div>

          <DialogFooter className="flex items-center !justify-between pt-5 border-t">
            {isEditing && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold"
                onClick={() => { onDelete(task.id); onClose(); }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Task
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4 font-bold text-xs" onClick={onClose}>Cancel</Button>
              <Button type="submit" size="sm" className="h-9 px-4 font-bold text-xs" disabled={!title.trim()}>{isEditing ? "Update Task" : "Create Task"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
