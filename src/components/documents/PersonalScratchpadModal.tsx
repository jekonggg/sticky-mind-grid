import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  File06 as StickyNote,
  Plus,
  Trash01 as Trash2,
  Copy01 as Copy,
  Check,
  SearchLg as Search,
  FolderLock,
  Pin01 as Pin,
} from "@untitledui/icons";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { scratchpadApi } from "@/services/scratchpadApi";
import { ScratchpadNote } from "@/types/scratchpad";
import { DEFAULT_NOTES, getStorageKey } from "@/utils/scratchpadUtils";

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

interface PersonalScratchpadModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalScratchpadModal({
  open,
  onClose,
}: PersonalScratchpadModalProps) {
  const { user } = useAuth();
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
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync from backend when modal is opened or user changes
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    scratchpadApi
      .getScratchpads()
      .then((serverNotes) => {
        if (!isMounted) return;
        if (serverNotes && serverNotes.length > 0) {
          setNotes(serverNotes);
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
  }, [open, user?.id]);

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

    const runSync = async () => {
      try {
        await scratchpadApi.updateScratchpad(noteId, updates);
      } catch (err) {
        console.warn("Failed to sync scratchpad note to cloud:", err);
      }
    };

    if (immediate) {
      runSync();
    } else {
      saveTimeoutRef.current[noteId] = setTimeout(runSync, 600);
    }
  };

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

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
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);

    try {
      const created = await scratchpadApi.createScratchpad({
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        pinned: newNote.pinned,
      });

      // Replace temporary ID with server ID
      setNotes((prev) =>
        prev.map((n) => (n.id === tempId ? { ...created, updatedAt: created.updatedAt || n.updatedAt } : n))
      );
      setSelectedNoteId(created.id);
      toast.success("New personal note created");
    } catch {
      toast.success("New personal note created (saved locally)");
    }
  };

  const handleUpdateActiveNote = (updates: Partial<PersonalNote>, immediateSync: boolean = false) => {
    if (!activeNote) return;
    const updatedDate = new Date().toISOString();

    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? { ...n, ...updates, updatedAt: updatedDate }
          : n
      )
    );

    // If updating pinned, re-order so pinned notes stay on top
    if ("pinned" in updates) {
      setNotes((prev) => {
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
  };

  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filtered = notes.filter((n) => n.id !== id);
    setNotes(filtered);
    if (selectedNoteId === id) {
      setSelectedNoteId(filtered[0]?.id || "");
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
    navigator.clipboard.writeText(`${activeNote.title}\n\n${activeNote.content}`);
    setCopied(true);
    toast.success("Note copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[620px] p-0 overflow-hidden flex flex-col rounded-2xl border-border/70 shadow-2xl bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <FolderLock className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Personal Files & Scratchpad
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Private notes synced securely to your personal account
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleCreateNote}
            className="gap-1.5 text-xs font-semibold h-8 bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Note
          </Button>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex min-h-0">
          {/* Left Notes List */}
          <div className="w-72 border-r border-border/50 flex flex-col bg-muted/10 p-3">
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
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`p-2.5 rounded-xl cursor-pointer border transition-all text-left group ${
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
                        {note.content || "Empty note..."}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Note Editor */}
          {activeNote ? (
            <div className="flex-1 flex flex-col p-5 bg-card overflow-hidden">
              {/* Note Controls Bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/40 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Color:</span>
                  <div className="flex items-center gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => handleUpdateActiveNote({ color: c.bg }, true)}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          activeNote.color === c.bg
                            ? "scale-110 ring-2 ring-primary ring-offset-1"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.bg, borderColor: c.border }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateActiveNote({ pinned: !activeNote.pinned }, true)}
                    className={`h-8 px-2.5 text-xs gap-1 ${
                      activeNote.pinned ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground"
                    }`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {activeNote.pinned ? "Pinned" : "Pin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteNote(activeNote.id, e)}
                    className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Title & Body Inputs */}
              <Input
                value={activeNote.title}
                onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
                placeholder="Note Title..."
                className="text-lg font-bold border-0 px-0 focus-visible:ring-0 shadow-none mb-2"
              />

              <Textarea
                value={activeNote.content}
                onChange={(e) => handleUpdateActiveNote({ content: e.target.value })}
                placeholder="Type your markdown thoughts, lists, or reminders..."
                className="flex-1 resize-none border-0 px-0 focus-visible:ring-0 shadow-none text-sm leading-relaxed custom-scrollbar bg-transparent"
              />

              {/* Footer status */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {activeNote.content.length} characters • {activeNote.content.split(/\s+/).filter(Boolean).length} words
                </span>
                <span>
                  Updated {new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <StickyNote className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">Select or create a note to begin</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
