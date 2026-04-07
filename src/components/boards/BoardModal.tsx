import { useState, useEffect, useRef } from "react";
import { Board, CreateBoardData, BOARD_COLORS } from "@/types/board";
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
import { Check, ImagePlus, X } from "lucide-react";

interface BoardModalProps {
  open: boolean;
  onClose: () => void;
  board?: Board | null;
  onSubmit: (data: CreateBoardData) => void;
}

export function BoardModal({ open, onClose, board, onSubmit }: BoardModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(BOARD_COLORS[0]);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!board;

  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || "");
      setColor(board.color);
      setHeroImageUrl(board.heroImageUrl || "");
    } else {
      setName("");
      setDescription("");
      setColor(BOARD_COLORS[0]);
      setHeroImageUrl("");
    }
  }, [board, open]);

  const sanitizeImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";

    // Don't sanitize local base64 images
    if (trimmed.startsWith("data:image")) return trimmed;

    // Handle Unsplash photo page URLs (e.g., https://unsplash.com/photos/XYZ)
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
    
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      heroImageUrl: finalUrl || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Board" : "Create Board"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">Name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name…"
              autoFocus
              required
            />
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
          
          <div className="space-y-2">
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
              <p className="text-[11px] text-muted-foreground">
                Tip: Paste a direct image link/Unsplash page URL, or upload a local file (max 2MB).
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="space-y-2">
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
