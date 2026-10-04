import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Search,
  FolderLock,
  Pin,
} from "lucide-react";
import { toast } from "sonner";

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned?: boolean;
  updatedAt: string;
}

const COLOR_PRESETS = [
  { name: "Amber", bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  { name: "Emerald", bg: "#d1fae5", border: "#a7f3d0", text: "#065f46" },
  { name: "Sky", bg: "#e0f2fe", border: "#bae6fd", text: "#075985" },
  { name: "Purple", bg: "#f3e8ff", border: "#e9d5ff", text: "#6b21a8" },
  { name: "Rose", bg: "#ffe4e6", border: "#fecdd3", text: "#9f1239" },
  { name: "Slate", bg: "#f1f5f9", border: "#e2e8f0", text: "#334155" },
];

const STORAGE_KEY = "sticky_mind_grid_personal_notes";

const DEFAULT_NOTES: PersonalNote[] = [
  {
    id: "note-1",
    title: "⚡ Quick Ideas & Brainstorm",
    content: "• Review Q4 sprint goals\n• Schedule team retro for Friday 3 PM\n• Explore new design tokens for dark mode",
    color: "#fef3c7",
    pinned: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    title: "🔒 Private Scratchpad",
    content: "Key reminders & personal draft notes. These are stored privately in your personal workspace.",
    color: "#e0f2fe",
    pinned: false,
    updatedAt: new Date().toISOString(),
  },
];

interface PersonalScratchpadModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalScratchpadModal({
  open,
  onClose,
}: PersonalScratchpadModalProps) {
  const [notes, setNotes] = useState<PersonalNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || "");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const handleCreateNote = () => {
    const newNote: PersonalNote = {
      id: "note-" + Math.random().toString(36).substring(2, 9),
      title: "Untitled Scratchpad",
      content: "",
      color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].bg,
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    toast.success("New personal note created");
  };

  const handleUpdateActiveNote = (updates: Partial<PersonalNote>) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote.id
          ? { ...n, ...updates, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filtered = notes.filter((n) => n.id !== id);
    setNotes(filtered);
    if (selectedNoteId === id) {
      setSelectedNoteId(filtered[0]?.id || "");
    }
    toast.info("Note deleted");
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
                Private notes and quick thoughts stored locally in your workspace
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
                        onClick={() => handleUpdateActiveNote({ color: c.bg })}
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
                    onClick={() => handleUpdateActiveNote({ pinned: !activeNote.pinned })}
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
