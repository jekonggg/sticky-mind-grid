import { useState, useEffect } from "react";
import { Note, CreateNoteData, UpdateNoteData } from "@/types/note";
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
import { Trash2, StickyNote, Check } from "lucide-react";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  note?: Note | null;
  onSubmit: (data: CreateNoteData | UpdateNoteData) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

const NOTE_COLORS = [
  { label: "Warm Amber", value: "#fef3c7", border: "#fde68a" },
  { label: "Sky Blue", value: "#e0f2fe", border: "#bae6fd" },
  { label: "Mint Green", value: "#dcfce7", border: "#bbf7d0" },
  { label: "Lavender", value: "#f3e8ff", border: "#e9d5ff" },
  { label: "Rose Pink", value: "#fce7f3", border: "#fbcfe8" },
  { label: "Peach Orange", value: "#ffedd5", border: "#fed7aa" },
];

export function NoteModal({
  open,
  onClose,
  note,
  onSubmit,
  onDelete,
  readOnly,
}: NoteModalProps) {
  const isEditing = !!note;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("#fef3c7");

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setColor(note.color || "#fef3c7");
    } else {
      setTitle("");
      setContent("");
      setColor("#fef3c7");
    }
  }, [note, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || readOnly) return;
    onSubmit({
      title: title.trim(),
      content,
      color,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            <span>{isEditing ? "Edit Note" : "New Project Note"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create or edit a project note for documentation and ideas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Note Title */}
          <div className="space-y-1.5">
            <Label htmlFor="note-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="note-title"
              placeholder="e.g. Architecture Overview, Meeting Notes..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              className="h-10 text-sm font-semibold bg-background/50 border-border/60"
              autoFocus
            />
          </div>

          {/* Color Palette Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Note Color
            </Label>
            <div className="flex items-center gap-2.5 pt-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value, borderColor: c.border }}
                  className={`h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer shadow-sm hover:scale-110 ${
                    color === c.value ? "ring-2 ring-primary ring-offset-2 scale-105" : "opacity-80 hover:opacity-100"
                  }`}
                  title={c.label}
                >
                  {color === c.value && <Check className="h-3.5 w-3.5 text-neutral-800" />}
                </button>
              ))}
            </div>
          </div>

          {/* Content Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="note-content" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Content
            </Label>
            <Textarea
              id="note-content"
              placeholder="Write your note, specifications, markdown, or key takeaways..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={readOnly}
              rows={8}
              className="resize-y text-xs leading-relaxed bg-background/50 border-border/60"
            />
          </div>

          <DialogFooter className="flex items-center !justify-between pt-4 border-t border-border/50">
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
                      if (note) {
                        onDelete(note.id);
                        onClose();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Note
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
                    {isEditing ? "Save Changes" : "Create Note"}
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
