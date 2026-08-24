import { useState } from "react";
import { Task, Attachment } from "@/types/task";
import { Note, CreateNoteData, UpdateNoteData } from "@/types/note";
import { noteApi } from "@/services/noteApi";
import { fileApi } from "@/services/fileApi";
import { NoteModal } from "../documents/NoteModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Clock,
  HardDrive,
  Filter,
  Plus,
  File,
  Film,
  Music,
  Eye,
  StickyNote,
  Pencil,
  Trash2,
  User,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface DocumentsViewProps {
  tasks: Task[];
  boardId?: string;
  readOnly?: boolean;
  onTaskClick: (task: Task) => void;
}

export function DocumentsView({ tasks, boardId, readOnly, onTaskClick }: DocumentsViewProps) {
  const [search, setSearch] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const queryClient = useQueryClient();

  // Fetch Board Project Notes
  const { data: notes = [], isLoading: isNotesLoading } = useQuery<Note[]>({
    queryKey: ["boardNotes", boardId],
    queryFn: () => (boardId ? noteApi.getNotes(boardId) : Promise.resolve([])),
    enabled: !!boardId,
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: CreateNoteData) => {
      if (!boardId) throw new Error("Board ID required");
      return noteApi.createNote(boardId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardNotes", boardId] });
      toast.success("Note created");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create note");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteData }) => noteApi.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardNotes", boardId] });
      toast.success("Note updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update note");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => noteApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardNotes", boardId] });
      toast.success("Note deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete note");
    },
  });

  const handleOpenNewNote = () => {
    if (readOnly) return;
    setEditingNote(null);
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleNoteSubmit = (data: CreateNoteData | UpdateNoteData) => {
    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data });
    } else {
      createNoteMutation.mutate(data as CreateNoteData);
    }
  };

  const handleNoteDelete = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  // Aggregate all attachments from all tasks with accurate metadata
  const allDocuments = tasks.flatMap((task) =>
    (task.attachments || []).map((attachment) => {
      let sizeStr = attachment.size;
      if (!sizeStr) {
        if (attachment.url.startsWith("data:")) {
          const approxBytes = Math.round(attachment.url.length * 0.75);
          sizeStr = approxBytes < 1024 * 1024
            ? `${(approxBytes / 1024).toFixed(1)} KB`
            : `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else {
          sizeStr = "Asset";
        }
      }

      return {
        ...attachment,
        taskId: task.id,
        taskTitle: task.title,
        updatedAt: task.updatedAt,
        size: sizeStr,
      };
    })
  );

  const filteredDocs = allDocuments.filter(
    (doc) =>
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.taskTitle.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(search.toLowerCase()))
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) return <Film className="h-10 w-10 text-blue-500/40" />;
    if (type.startsWith("audio/")) return <Music className="h-10 w-10 text-purple-500/40" />;
    if (type.includes("pdf") || type.includes("word") || type.includes("text"))
      return <FileText className="h-10 w-10 text-orange-500/40" />;
    return <File className="h-10 w-10 text-slate-400/40" />;
  };

  const handleDownload = async (doc: { url: string; name: string }) => {
    try {
      toast.info(`Downloading ${doc.name}...`);
      await fileApi.downloadFile(doc.url, doc.name);
    } catch {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground uppercase italic tracking-tight">
              Project <span className="text-primary not-italic">Hub</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Project documentation, shared notes, and task assets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search notes & assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 border-border/50 bg-background/50 focus:bg-background rounded-full text-xs"
            />
          </div>
          {!readOnly && (
            <Button
              onClick={handleOpenNewNote}
              variant="default"
              size="sm"
              className="h-9 gap-1.5 font-black uppercase text-[11px] px-4 rounded-full shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New Note
            </Button>
          )}
        </div>
      </div>

      {/* Section 1: Project Notes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Project Notes & Documentation ({filteredNotes.length})
            </h3>
          </div>
        </div>

        {isNotesLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/10 border border-dashed border-border/50 rounded-2xl">
            <StickyNote className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <h4 className="text-xs font-bold text-foreground">No notes created yet</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
              Click "New Note" above to capture specs, guidelines, and meeting minutes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredNotes.map((note) => {
              const authorName = note.user?.fullName || note.user?.email || "Member";
              const initial = (note.user?.fullName || note.user?.email || "U").charAt(0).toUpperCase();

              return (
                <div
                  key={note.id}
                  onClick={() => handleEditNote(note)}
                  style={{ backgroundColor: note.color || "#fef3c7" }}
                  className="group relative rounded-2xl p-4 text-neutral-900 border border-black/10 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[160px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm tracking-tight line-clamp-1">
                        {note.title}
                      </h4>
                      {!readOnly && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNote(note);
                            }}
                            className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-neutral-800"
                            title="Edit Note"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this note?")) handleNoteDelete(note.id);
                            }}
                            className="p-1 rounded-full bg-black/10 hover:bg-destructive hover:text-white text-neutral-800"
                            title="Delete Note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-neutral-700 whitespace-pre-wrap line-clamp-4 leading-relaxed font-normal">
                      {note.content || "(No content)"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-black/10 text-[10px] text-neutral-600 font-semibold mt-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <Avatar className="h-4 w-4 border border-black/20">
                        <AvatarFallback className="text-[8px] font-bold bg-black/10 text-neutral-800">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{authorName}</span>
                    </div>
                    <span className="shrink-0">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Task Assets & Attachments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Task Assets & Files ({filteredDocs.length})
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-muted/10 border border-dashed border-border/50 rounded-3xl">
              <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center mb-3 shadow-sm">
                <FileText className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No task attachments found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Upload files to individual tasks to see them aggregated here.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const isImage = doc.type.startsWith("image/");
              const currentTask = tasks.find((t) => t.id === doc.taskId);

              return (
                <Card
                  key={`${doc.taskId}-${idx}`}
                  className="group border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 overflow-hidden rounded-2xl"
                >
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted/30 relative flex items-center justify-center overflow-hidden border-b border-border/10">
                      {isImage ? (
                        <img
                          src={doc.url}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={doc.name}
                        />
                      ) : (
                        <div className="transition-transform duration-500 group-hover:scale-110">
                          {getFileIcon(doc.type)}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-500">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-lg border-border/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => currentTask && onTaskClick(currentTask)}
                          title="View Task"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-lg border-border/10 hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                          onClick={() => handleDownload(doc)}
                          title="Download File"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>

                      {!isImage && (
                        <div className="absolute top-3 left-3">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-background/80 backdrop-blur px-2 py-0.5 rounded-full border border-border/50">
                            {doc.name.split(".").pop()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col gap-3">
                      <div>
                        <h4
                          className="font-bold text-sm text-foreground truncate leading-tight group-hover:text-primary transition-colors"
                          title={doc.name}
                        >
                          {doc.name}
                        </h4>
                        <div
                          onClick={() => currentTask && onTaskClick(currentTask)}
                          className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1 hover:text-primary cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <span className="opacity-50">Source:</span> {doc.taskTitle}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-bold border-t border-border/5 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 opacity-40" />
                          {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <span className="bg-muted px-1.5 py-0.5 rounded-sm text-[9px]">
                          {doc.size}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Note Creation / Edit Modal */}
      <NoteModal
        open={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        note={editingNote}
        onSubmit={handleNoteSubmit}
        onDelete={handleNoteDelete}
        readOnly={readOnly}
      />
    </div>
  );
}
