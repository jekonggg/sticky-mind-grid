import React, { useRef, useEffect } from "react";
import { FileText } from "lucide-react";

interface TaskDescriptionProps {
  description: string;
  readOnly?: boolean;
  onChange: (description: string) => void;
}

export function TaskDescription({ description, readOnly, onChange }: TaskDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height to fit content smoothly without internal scrollbars
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(160, textareaRef.current.scrollHeight)}px`;
    }
  }, [description]);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>Description & Notes</span>
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
            value={description}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write detailed task notes, requirements, background context, or instructions..."
            className="w-full min-h-[140px] text-sm text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/30 focus:ring-0 leading-relaxed transition-all"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 pt-2 border-t border-border/20">
            <span>Markdown formatted notes</span>
            <span>{description ? `${description.trim().split(/\s+/).filter(Boolean).length} words` : "0 words"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
