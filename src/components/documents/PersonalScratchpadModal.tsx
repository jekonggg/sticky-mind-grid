import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FormattingToolbar,
  NoteContentEditor as ScratchpadContentEditor,
  useRichTextFormatter,
} from "./RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  File06 as StickyNote,
  Plus,
  Trash01 as Trash2,
  Copy01 as Copy,
  Check,
  SearchLg as Search,
  ArrowLeft,
  Pin01 as Pin,
} from "@untitledui/icons";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { scratchpadApi } from "@/services/scratchpadApi";
import { ScratchpadNote } from "@/types/scratchpad";
import { DEFAULT_NOTES, getStorageKey } from "@/utils/scratchpadUtils";
import {
  htmlToPlainText,
  sanitizeNoteHtml,
  toEditorHtml,
} from "@/utils/scratchpadHtml";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type PersonalNote = ScratchpadNote;
export { getPersonalNotesCount } from "@/utils/scratchpadUtils";

const COLOR_PRESETS = [
  { name: "Amber", bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  { name: "Emerald", bg: "#d1fae5", border: "#a7f3d0", text: "#065f46" },
  { name: "Sky", bg: "#e0f2fe", border: "#bae6fd", text: "#075985" },
  { name: "Purple", bg: "#f3e8ff", border: "#e9d5ff", text: "#6b21a8" },
  { name: "Rose", bg: "#ffe4e6", border: "#fecdd3", text: "#9f1239" },
  { name: "Slate", bg: "#f1f5f9", border: "#e2e8f0", text: "#334155" },
];

interface NoteActionButtonsProps {
  note: PersonalNote;
  copied: boolean;
  className?: string;
  onTogglePin: () => void;
  onCopy: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

function NoteActionButtons({
  note,
  copied,
  className,
  onTogglePin,
  onCopy,
  onDelete,
}: NoteActionButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        size="sm"
        variant="ghost"
        onClick={onTogglePin}
        className={`h-8 gap-1 px-2.5 text-xs ${
          note.pinned ? "bg-amber-500/10 text-amber-500" : "text-muted-foreground"
        }`}
        aria-label={note.pinned ? "Unpin note" : "Pin note"}
        title={note.pinned ? "Unpin note" : "Pin note"}
      >
        <Pin className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {note.pinned ? "Pinned" : "Pin"}
        </span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCopy}
        className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        aria-label="Copy note"
        title="Copy note"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Copy</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
        aria-label="Delete note"
        title="Delete note"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface PersonalScratchpadModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalScratchpadModal({
  open,
  onClose,
}: PersonalScratchpadModalProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const storageKey = getStorageKey(user?.id);

  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || "");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingUpdatesRef = useRef<Record<string, Partial<PersonalNote>>>({});
  const contentEditorRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef(notes);

  const updateNotes = useCallback(
    (updater: React.SetStateAction<PersonalNote[]>) => {
      setNotes((previous) => {
        const next =
          typeof updater === "function"
            ? (updater as (current: PersonalNote[]) => PersonalNote[])(previous)
            : updater;
        notesRef.current = next;
        return next;
      });
    },
    []
  );

  // Start on the note list when the mobile modal is opened.
  useEffect(() => {
    if (open && isMobile) {
      setMobilePane("list");
    }
  }, [open, isMobile]);

  // Sync from backend when modal is opened or user changes
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    scratchpadApi
      .getScratchpads()
      .then((serverNotes) => {
        if (!isMounted) return;
        if (serverNotes && serverNotes.length > 0) {
          updateNotes(serverNotes);
          setSelectedNoteId((prevId) =>
            serverNotes.some((n) => n.id === prevId) ? prevId : serverNotes[0]?.id || ""
          );
        }
      })
      .catch((err) => {
        // Fallback to local cache gracefully if offline/unreachable
        console.warn("Scratchpad cloud sync unavailable, using local cache:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [open, updateNotes, user?.id]);

  // Sync to user-scoped localStorage for instantaneous offline render
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
      window.dispatchEvent(new Event("personal_notes_updated"));
    } catch (e) {
      console.error("Failed to cache personal notes locally:", e);
    }
  }, [notes, storageKey]);

  // Cleanup pending debounce timeouts
  useEffect(() => {
    const timeouts = saveTimeoutRef.current;
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, []);

  const queueServerUpdate = (
    noteId: string,
    updates: Partial<PersonalNote>,
    immediate: boolean = false
  ) => {
    if (saveTimeoutRef.current[noteId]) {
      clearTimeout(saveTimeoutRef.current[noteId]);
    }

    const pendingUpdates = {
      ...(pendingUpdatesRef.current[noteId] ?? {}),
      ...updates,
    };
    pendingUpdatesRef.current[noteId] = pendingUpdates;

    const runSync = async () => {
      delete saveTimeoutRef.current[noteId];
      delete pendingUpdatesRef.current[noteId];

      try {
        await scratchpadApi.updateScratchpad(noteId, pendingUpdates);
      } catch (err) {
        console.warn("Failed to sync scratchpad note to cloud:", err);
      }
    };

    if (immediate) {
      void runSync();
    } else {
      saveTimeoutRef.current[noteId] = setTimeout(runSync, 600);
    }
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];
  const activeContentText = useMemo(
    () => htmlToPlainText(activeNote?.content || ""),
    [activeNote?.content]
  );

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    if (isMobile) {
      setMobilePane("editor");
    }
  };

  const handleCreateNote = async () => {
    const randomColor = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].bg;
    const tempId = "note-" + Math.random().toString(36).substring(2, 9);
    const newNote: PersonalNote = {
      id: tempId,
      title: "Untitled Scratchpad",
      content: "",
      color: randomColor,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local add
    updateNotes((previous) => [newNote, ...previous]);
    setSelectedNoteId(newNote.id);
    if (isMobile) {
      setMobilePane("editor");
    }

    try {
      const created = await scratchpadApi.createScratchpad({
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        pinned: newNote.pinned,
      });

      // Preserve anything the user typed while the create request was in flight.
      const localNote = notesRef.current.find((note) => note.id === tempId);
      const pendingSave = saveTimeoutRef.current[tempId];
      if (pendingSave) {
        clearTimeout(pendingSave);
        delete saveTimeoutRef.current[tempId];
      }
      delete pendingUpdatesRef.current[tempId];

      const mergedNote: PersonalNote = {
        ...created,
        title: localNote?.title ?? created.title,
        content: localNote?.content ?? created.content,
        color: localNote?.color ?? created.color,
        pinned: localNote?.pinned ?? created.pinned,
        updatedAt: localNote?.updatedAt || created.updatedAt,
      };
      const hasLocalChanges =
        !!localNote &&
        (localNote.title !== created.title ||
          localNote.content !== created.content ||
          localNote.color !== created.color ||
          localNote.pinned !== created.pinned);

      // Replace temporary ID with server ID
      updateNotes((previous) =>
        previous.map((note) => (note.id === tempId ? mergedNote : note))
      );
      setSelectedNoteId((previous) =>
        previous === tempId ? created.id : previous
      );

      if (hasLocalChanges) {
        void scratchpadApi
          .updateScratchpad(created.id, {
            title: mergedNote.title,
            content: mergedNote.content,
            color: mergedNote.color,
            pinned: mergedNote.pinned,
          })
          .catch((error) => {
            console.warn("Failed to sync rapid scratchpad edits:", error);
          });
      }

      toast.success("New personal note created");
    } catch {
      toast.success("New personal note created (saved locally)");
    }
  };

  const handleUpdateActiveNote = useCallback(
    (updates: Partial<PersonalNote>, immediateSync: boolean = false) => {
      if (!activeNote) return;
      const updatedDate = new Date().toISOString();

      updateNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id
            ? { ...n, ...updates, updatedAt: updatedDate }
            : n
        )
      );

      // If updating pinned, re-order so pinned notes stay on top
      if ("pinned" in updates) {
        updateNotes((prev) => {
          const updatedList = prev.map((n) =>
            n.id === activeNote.id ? { ...n, ...updates, updatedAt: updatedDate } : n
          );
          return [...updatedList].sort((a, b) => {
            if (a.pinned === b.pinned) {
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return a.pinned ? -1 : 1;
          });
        });
      }

      queueServerUpdate(activeNote.id, updates, immediateSync);
    },
    [activeNote, updateNotes]
  );

  const handleContentChange = useCallback(
    (html: string) => {
      handleUpdateActiveNote({ content: sanitizeNoteHtml(html) });
    },
    [handleUpdateActiveNote]
  );

  const { saveEditorSelection, restoreEditorSelection, handleFormat } =
    useRichTextFormatter(contentEditorRef, handleContentChange);

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filtered = notesRef.current.filter((n) => n.id !== id);
    const pendingSave = saveTimeoutRef.current[id];
    if (pendingSave) {
      clearTimeout(pendingSave);
      delete saveTimeoutRef.current[id];
    }
    delete pendingUpdatesRef.current[id];
    updateNotes(filtered);
    if (selectedNoteId === id) {
      setSelectedNoteId(filtered[0]?.id || "");
      if (isMobile) {
        setMobilePane("list");
      }
    }

    try {
      await scratchpadApi.deleteScratchpad(id);
      toast.info("Note deleted");
    } catch {
      toast.info("Note deleted");
    }
  };

  const handleCopy = () => {
    if (!activeNote) return;
    navigator.clipboard.writeText(`${activeNote.title}\n\n${activeContentText}`);
    setCopied(true);
    toast.success("Note copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        htmlToPlainText(note.content).toLowerCase().includes(query)
    );
  }, [notes, search]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex h-[calc(100dvh_-_1.5rem)] max-h-[calc(100dvh_-_1.5rem)] w-[calc(100%_-_1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border-border/70 bg-card p-0 shadow-2xl sm:h-[620px] sm:w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 py-4 pl-4 pr-12 sm:pl-6 sm:pr-12">
          <div className="flex min-w-0 items-center gap-2.5">
            {isMobile && mobilePane === "editor" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobilePane("list")}
                className="-ml-1 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Back to notes"
                title="Back to notes"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-bold text-foreground">
                Scratchpad
              </DialogTitle>
              <DialogDescription className="sr-only">
                Private notes synced securely to your personal account
              </DialogDescription>
            </div>
          </div>

          {(!isMobile || mobilePane === "list") && (
            <Button
              size="sm"
              onClick={handleCreateNote}
              className="h-8 shrink-0 gap-1.5 bg-amber-500 text-xs font-semibold text-white shadow-xs hover:bg-amber-600"
            >
              <Plus className="h-3.5 w-3.5" />
              New Note
            </Button>
          )}
        </div>

        {/* Body: split view on desktop, single-page navigation on mobile */}
        <div className="flex min-h-0 flex-1">
          {/* Left Notes List */}
          {(!isMobile || mobilePane === "list") && (
            <div
              data-testid="scratchpad-note-list"
              className={cn(
                "flex min-h-0 flex-col bg-muted/10 p-3",
                isMobile ? "w-full" : "w-64 border-r border-border/50 xl:w-72"
              )}
            >
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background/60 border-border/60"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">
                  <StickyNote className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  <p>No notes found</p>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleSelectNote(note.id)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-all group ${
                        isSelected
                          ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                          : "bg-card/50 border-border/50 hover:bg-card hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: note.color }}
                          />
                          <span className="text-xs font-bold text-foreground truncate">
                            {note.title || "Untitled"}
                          </span>
                        </div>
                        {note.pinned && (
                          <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {htmlToPlainText(note.content) || "Empty note..."}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          )}

          {/* Right Note Editor */}
          {(!isMobile || mobilePane === "editor") &&
            (activeNote ? (
            <div
              data-testid="scratchpad-note-editor"
              className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card p-4 sm:p-5"
            >
              {/* Note Controls Bar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Color:</span>
                  <div className="flex items-center gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleUpdateActiveNote({ color: c.bg }, true)}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          activeNote.color === c.bg
                            ? "scale-110 ring-2 ring-primary ring-offset-1"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.bg, borderColor: c.border }}
                        title={c.name}
                        aria-label={`Use ${c.name} note color`}
                      />
                    ))}
                  </div>

                  {!isMobile && (
                    <>
                      <div
                        className="mx-1 h-4 w-px bg-border/70"
                        aria-hidden="true"
                      />
                      <FormattingToolbar
                        key={activeNote.id}
                        placement="inline"
                        onSaveSelection={saveEditorSelection}
                        onFormat={handleFormat}
                        onRestoreSelection={restoreEditorSelection}
                      />
                    </>
                  )}
                </div>

                {isMobile && (
                  <NoteActionButtons
                    note={activeNote}
                    copied={copied}
                    className="ml-auto"
                    onTogglePin={() =>
                      handleUpdateActiveNote(
                        { pinned: !activeNote.pinned },
                        true
                      )
                    }
                    onCopy={handleCopy}
                    onDelete={(event) =>
                      handleDeleteNote(activeNote.id, event)
                    }
                  />
                )}
              </div>

              {/* Title & Body Inputs */}
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={activeNote.title}
                  onChange={(e) =>
                    handleUpdateActiveNote({ title: e.target.value })
                  }
                  placeholder="Note Title..."
                  className="flex-1 border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
                />
                {!isMobile && (
                  <NoteActionButtons
                    note={activeNote}
                    copied={copied}
                    className="shrink-0"
                    onTogglePin={() =>
                      handleUpdateActiveNote(
                        { pinned: !activeNote.pinned },
                        true
                      )
                    }
                    onCopy={handleCopy}
                    onDelete={(event) =>
                      handleDeleteNote(activeNote.id, event)
                    }
                  />
                )}
              </div>

              <div className="relative min-h-0 flex-1">
                {activeContentText.trim().length === 0 && (
                  <p className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/70">
                    Type your notes, lists, or reminders...
                  </p>
                )}
                <ScratchpadContentEditor
                  key={activeNote.id}
                  initialContent={activeNote.content}
                  onChange={handleContentChange}
                  editorRef={contentEditorRef}
                />
              </div>

              {/* Footer status */}
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
                  isMobile ? "pt-1" : "border-t border-border/40 pt-2"
                )}
              >
                <span>
                  {activeContentText.length} characters •{" "}
                  {activeContentText.trim()
                    ? activeContentText.trim().split(/\s+/).filter(Boolean).length
                    : 0}{" "}
                  words
                </span>
                <span>
                  Updated{" "}
                  {new Date(activeNote.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {isMobile && (
                <div className="mt-1 border-t border-border/40 pt-2">
                  <FormattingToolbar
                    key={activeNote.id}
                    placement="bottom"
                    onSaveSelection={saveEditorSelection}
                    onFormat={handleFormat}
                    onRestoreSelection={restoreEditorSelection}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <StickyNote className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Select or create a note to begin</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
