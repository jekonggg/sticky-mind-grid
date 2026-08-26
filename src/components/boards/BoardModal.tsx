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
import { Check, ImagePlus, X, Plus, Sparkles, Link as LinkIcon, Upload } from "lucide-react";
import { EmojiSelector } from "../common/EmojiSelector";

interface BoardModalProps {
  open: boolean;
  onClose: () => void;
  board?: Board | null;
  onSubmit: (data: CreateBoardData) => void;
}

const PRESET_BANNERS = [
  {
    name: "Aurora",
    url: "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Minimalist Abstract",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Cyber Space",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Modern Studio",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Atmosphere",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "High-Rise Geometry",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
  },
];

export const sanitizeImageUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // Accept local base64 or relative public paths
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const formatted = trimmed.startsWith("http://") || trimmed.startsWith("https://") 
      ? trimmed 
      : `https://${trimmed}`;
    const urlObj = new URL(formatted);

    // If Unsplash web page URL, convert to direct high-res image
    if (urlObj.hostname.includes("unsplash.com")) {
      if (urlObj.hostname.startsWith("images.") || urlObj.hostname.startsWith("plus.")) {
        return urlObj.toString();
      }

      const parts = urlObj.pathname.split("/").filter(Boolean);
      const photoIdx = parts.indexOf("photos");
      if (photoIdx !== -1 && parts[photoIdx + 1]) {
        const idSegment = parts[photoIdx + 1];
        const photoId = idSegment.split("-").pop() || idSegment;
        return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=1400`;
      }
    }

    return urlObj.toString();
  } catch {
    return trimmed;
  }
};

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image is too large. Please choose a file under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxWidth = 1400;
        const maxHeight = 800;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setHeroImageUrl(canvas.toDataURL("image/jpeg", 0.85));
        } else {
          setHeroImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalUrl = sanitizeImageUrl(heroImageUrl);
    const finalColumns = [...columns];
    if (!finalColumns.some((c) => c.id === "archive")) {
      finalColumns.push({ id: "archive", title: "Archive", emoji: "📦" });
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

  const previewUrl = sanitizeImageUrl(heroImageUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{isEditing ? "Edit Board" : "Create Board"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Icon & Name */}
          <div className="space-y-1.5">
            <Label htmlFor="board-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Board Icon & Name
            </Label>
            <div className="flex gap-2">
              <EmojiSelector value={emoji} onChange={setEmoji} />
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project or Board name…"
                autoFocus
                required
                className="flex-1 font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="board-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          {/* Board States (Columns) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Board States (Workflow)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddColumn}
                className="h-7 text-xs font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" /> Add State
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {columns
                .filter((c) => c.id !== "archive")
                .map((col, idx) => (
                  <div key={col.id} className="flex gap-2 group/col">
                    <EmojiSelector
                      value={col.emoji || "📌"}
                      onChange={(e) => handleColumnRename(col.id, col.title, e)}
                    />
                    <Input
                      value={col.title}
                      onChange={(e) => handleColumnRename(col.id, e.target.value, col.emoji)}
                      placeholder={`State ${idx + 1}`}
                      className="h-9 flex-1 text-xs font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

          {/* Header Image Management */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Board Banner / Header Image
              </Label>
              {heroImageUrl && (
                <button
                  type="button"
                  onClick={() => setHeroImageUrl("")}
                  className="text-[11px] font-bold text-destructive hover:underline"
                >
                  Remove Image
                </button>
              )}
            </div>

            {/* Live Preview */}
            {previewUrl && (
              <div className="relative aspect-video rounded-xl border border-border overflow-hidden bg-muted group shadow-sm">
                <img
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  alt="Preview"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setHeroImageUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-md"
                  title="Remove image"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              </div>
            )}

            {/* Input URL & Upload Button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={heroImageUrl.startsWith("data:") ? "Local Image File Selected" : heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="Paste any Image URL (Unsplash, Imgur, Pexels, direct link)..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Upload from computer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload</span>
              </Button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            {/* Presets Gallery */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Preset Themes
              </span>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_BANNERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setHeroImageUrl(preset.url)}
                    title={preset.name}
                    className={`relative aspect-video rounded-md overflow-hidden border transition-all group hover:scale-105 ${
                      heroImageUrl === preset.url
                        ? "ring-2 ring-primary border-transparent shadow-sm"
                        : "border-border/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Theme Color */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Theme Accent Color
            </Label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 hover:scale-105"
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

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              {isEditing ? "Save Changes" : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
