import { useState, useEffect, useRef } from "react";
import { Board, CreateBoardData, BOARD_COLORS } from "@/types/board";
import { Column } from "@/types/task";
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
import { Check, ImagePlus, X, Plus } from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";

interface BoardModalProps {
  open: boolean;
  onClose: () => void;
  board?: Board | null;
  onSubmit: (data: CreateBoardData) => void;
}

export function BoardModal({ open, onClose, board, onSubmit }: BoardModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(BOARD_COLORS[0]);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!board;

  useEffect(() => {
    if (board) {
      setName(board.name);
      setEmoji(board.emoji || "");
      setDescription(board.description || "");
      setColor(board.color);
      setHeroImageUrl(board.heroImageUrl || "");
      setColumns(board.columns || []);
    } else {
      setName("");
      setEmoji("");
      setDescription("");
      setColor(BOARD_COLORS[0]);
      setHeroImageUrl("");
      setColumns([
        { id: "todo", title: "To Do", emoji: "📝" },
        { id: "in_progress", title: "In Progress", emoji: "⏳" },
        { id: "done", title: "Done", emoji: "✅" },
      ]);
    }
  }, [board, open]);

  const handleAddColumn = () => {
    const id = `col_${Date.now()}`;
    setColumns([...columns, { id, title: "New State", emoji: "📌" }]);
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 3) return;
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleColumnRename = (id: string, title: string, emoji?: string) => {
    setColumns(columns.map((c) => (c.id === id ? { ...c, title, emoji } : c)));
  };

  const sanitizeImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("data:image")) return trimmed;
    const unsplashMatch = trimmed.match(/unsplash\.com\/photos\/(?:.*-)?([a-zA-Z0-9_-]+)/);
    if (unsplashMatch && unsplashMatch[1]) {
      return `https://images.unsplash.com/photo-${unsplashMatch[1]}?auto=format&fit=crop&q=80&w=1000`;
    }
    return trimmed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please choose a file under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setHeroImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const finalUrl = sanitizeImageUrl(heroImageUrl);
    let finalColumns = [...columns];
    if (!finalColumns.some(c => c.id === 'archive')) {
       finalColumns.push({ id: 'archive', title: 'Archive', emoji: "📦" });
    }

    onSubmit({
      name: name.trim(),
      emoji: emoji || undefined,
      description: description.trim() || undefined,
      color,
      heroImageUrl: finalUrl || undefined,
      columns: finalColumns,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Board" : "Create Board"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="board-name">Board Icon & Name</Label>
            <div className="flex gap-2">
              <EmojiSelector 
                currentEmoji={emoji}
                onSelect={setEmoji}
              />
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name…"
                autoFocus
                required
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-desc">Description</Label>
            <Textarea
              id="board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board for?"
              rows={2}
            />
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <Label>Board States (Workflow)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddColumn} className="h-7 text-xs gap-1">
                   <Plus className="h-3 w-3" /> Add State
                </Button>
             </div>
             <div className="space-y-2">
                {columns.filter(c => c.id !== 'archive').map((col, idx) => (
                   <div key={col.id} className="flex gap-2 group/col">
                      <EmojiSelector 
                        currentEmoji={col.emoji}
                        onSelect={(e) => handleColumnRename(col.id, col.title, e)}
                        className="h-9 w-9"
                      />
                      <Input 
                         value={col.title}
                         onChange={(e) => handleColumnRename(col.id, e.target.value, col.emoji)}
                         placeholder={`State ${idx + 1}`}
                         className="h-9 flex-1"
                      />
                      <Button 
                         type="button" 
                         variant="ghost" 
                         size="icon" 
                         className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                         disabled={columns.length <= 3}
                         onClick={() => handleRemoveColumn(col.id)}
                      >
                         <X className="h-4 w-4" />
                      </Button>
                   </div>
                ))}
             </div>
             <p className="text-[10px] text-muted-foreground font-medium italic">
                Minimum 3 states required. Each state can have a unique icon.
             </p>
          </div>
          
          <div className="space-y-2 pt-2 border-t">
            <Label>Board Header Image</Label>
            <div className="space-y-3">
              {heroImageUrl && (
                <div className="relative aspect-video rounded-lg border overflow-hidden bg-muted group">
                  <img src={sanitizeImageUrl(heroImageUrl)} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button" 
                    onClick={() => setHeroImageUrl("")}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={heroImageUrl.startsWith("data:") ? "Local Image Uploaded" : heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="Paste Unsplash or Image URL..."
                  className="flex-1"
                  readOnly={heroImageUrl.startsWith("data:")}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload image"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label>Theme Color</Label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                  }}
                >
                  {color === c && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {isEditing ? "Save" : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
