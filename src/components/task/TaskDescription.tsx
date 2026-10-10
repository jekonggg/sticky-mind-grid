import React, { useRef, useEffect, useState } from "react";
import { File06 as FileText, Check, XClose as X, AlertCircle } from "@untitledui/icons";
import { Button } from "@/components/ui/button";

interface TaskDescriptionProps {
  description: string;
  readOnly?: boolean;
  onChange: (description: string) => void;
}

export function TaskDescription({ description, readOnly, onChange }: TaskDescriptionProps) {
  const [draft, setDraft] = useState(description);
  const [hasConflict, setHasConflict] = useState(false);
  const [remoteContent, setRemoteContent] = useState(description);
  const prevDescriptionRef = useRef(description);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // If remote description changed while user has unsaved draft changes
    if (description !== prevDescriptionRef.current) {
      if (draft !== prevDescriptionRef.current && draft !== description) {
        setHasConflict(true);
        setRemoteContent(description);
      } else {
        setDraft(description);
        setHasConflict(false);
      }
      prevDescriptionRef.current = description;
    }
  }, [description, draft]);

  // Auto-grow textarea height to fit content smoothly without internal scrollbars
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(160, textareaRef.current.scrollHeight)}px`;
    }
  }, [draft]);

  const handleSave = () => {
    setHasConflict(false);
    onChange(draft);
  };

  const handleCancel = () => {
    setDraft(description);
    setHasConflict(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const isDirty = draft !== description;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
      {hasConflict && (
        <div className="mb-3 p-3 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Concurrent Edit Conflict:</strong> Another user updated this description while you were editing.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] px-2"
              onClick={() => {
                setDraft(remoteContent);
                setHasConflict(false);
              }}
            >
              Load Remote
            </Button>
            <Button
              size="sm"
              className="h-6 text-[11px] px-2 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSave}
            >
              Overwrite With Mine
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>Description & Notes</span>
        </div>

        {!readOnly && isDirty && (
          <div className="flex items-center gap-1.5 animate-in fade-in">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-7 px-2.5 text-xs font-bold gap-1 shadow-xs"
            >
              <Check className="h-3 w-3" />
              <span>Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-0.5" />
              <span>Cancel</span>
            </Button>
          </div>
        )}
      </div>

      {readOnly ? (
        <div className="min-h-[120px] text-sm text-foreground leading-relaxed whitespace-pre-wrap py-2">
          {description || <span className="text-muted-foreground/50 italic">No description provided for this task.</span>}
        </div>
      ) : (
        <div className="relative group">
          <textarea
            ref={textareaRef}
            id="description"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write detailed task notes, requirements, background context, or instructions..."
            className="w-full min-h-[140px] text-sm text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 focus:ring-0 leading-relaxed transition-all"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 pt-2 border-t border-border/20">
            <span>{isDirty ? "Unsaved changes • Ctrl+Enter to save, Esc to cancel" : "Markdown formatted notes"}</span>
            <span>{draft ? `${draft.trim().split(/\s+/).filter(Boolean).length} words` : "0 words"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
