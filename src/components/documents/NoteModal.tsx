import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Trash01 as Trash2, File06 as StickyNote, Check } from "@untitledui/icons";
import {
  FormattingToolbar,
  NoteContentEditor,
  useRichTextFormatter,
} from "./RichTextEditor";
import { htmlToPlainText, sanitizeNoteHtml } from "@/utils/scratchpadHtml";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  readOnly = false,
}: NoteModalProps) {
  const isEditing = Boolean(note);
  const isMobile = useIsMobile();
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || "#fef3c7");
  const editorRef = useRef<HTMLDivElement | null>(null);

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

  const handleContentChange = useCallback((html: string) => {
    setContent(sanitizeNoteHtml(html));
  }, []);

  const { saveEditorSelection, restoreEditorSelection, handleFormat } =
    useRichTextFormatter(editorRef, handleContentChange);

  const contentPlainText = useMemo(
    () => htmlToPlainText(content),
    [content]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || readOnly) return;
    onSubmit({
      title: title.trim(),
      content: sanitizeNoteHtml(content),
      color,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-none sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[88vh] rounded-none sm:rounded-2xl p-0 flex flex-col overflow-hidden border-border/70 bg-card shadow-2xl">
        <DialogHeader className="border-b border-border/50 bg-muted/20 px-5 py-3.5 sm:px-6">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2.5 text-foreground">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <StickyNote className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span>{readOnly ? "Project Note" : isEditing ? "Edit Note" : "New Project Note"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create or edit a project note for documentation and ideas with rich text formatting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4 custom-scrollbar">
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
                autoFocus={!readOnly}
              />
            </div>

            {/* Color Palette Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Note Color
              </Label>
              <div className="flex items-center gap-2.5 pt-0.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setColor(c.value)}
                    style={{ backgroundColor: c.value, borderColor: c.border }}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center shadow-xs",
                      readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
                      color === c.value ? "ring-2 ring-primary ring-offset-2 scale-105" : "opacity-80 hover:opacity-100"
                    )}
                    title={c.label}
                    aria-label={`Select ${c.label} color`}
                  >
                    {color === c.value && <Check className="h-3.5 w-3.5 text-neutral-800" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Section with Rich Text Formatter */}
            <div className="space-y-1.5 flex flex-col flex-1 min-h-[240px]">
              <div className="flex items-center justify-between">
                <Label htmlFor="note-content" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Content
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {contentPlainText.length} characters •{" "}
                  {contentPlainText.trim() ? contentPlainText.trim().split(/\s+/).filter(Boolean).length : 0} words
                </span>
              </div>

              {/* Rich Text Editor Container */}
              <div
                data-testid="note-editor-container"
                className="rounded-xl border border-border/70 bg-background/50 flex flex-col overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all min-h-[220px]"
              >
                {!readOnly && (
                  <div className="border-b border-border/50 bg-muted/20 px-3 py-2 flex flex-wrap items-center">
                    <FormattingToolbar
                      key={note?.id || (open ? "open" : "closed")}
                      placement={isMobile ? "bottom" : "inline"}
                      testId="scratchpad-format-toolbar"
                      onSaveSelection={saveEditorSelection}
                      onFormat={handleFormat}
                      onRestoreSelection={restoreEditorSelection}
                    />
                  </div>
                )}

                <div className="relative p-3.5 min-h-[160px] max-h-[320px] flex-1 overflow-y-auto">
                  {contentPlainText.trim().length === 0 && (
                    <p className="pointer-events-none absolute left-3.5 top-3.5 text-xs text-muted-foreground/60 select-none">
                      Write your note, specifications, markdown, or key takeaways...
                    </p>
                  )}
                  <NoteContentEditor
                    key={note?.id || (open ? "open" : "closed")}
                    initialContent={content}
                    onChange={handleContentChange}
                    editorRef={editorRef}
                    readOnly={readOnly}
                    testId="scratchpad-content-editor"
                    className="min-h-[140px] text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center !justify-between px-5 py-3 border-t border-border/50 bg-muted/10 shrink-0">
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
