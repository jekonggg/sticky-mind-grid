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
import {
  Check,
  XClose as X,
  Plus,
  Stars01 as Sparkles,
  Link01 as LinkIcon,
  Upload01 as Upload,
  Sliders04,
  ChevronDown,
  ChevronUp,
} from "@untitledui/icons";
import { EmojiSelector } from "../common/EmojiSelector";
import { useDevMode } from "@/contexts/DevModeContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useQuery } from "@tanstack/react-query";
import { taskApi } from "@/services/api";
import { fileApi } from "@/services/fileApi";
import { getMediaUrl } from "@/components/ui/avatar";
import { toast } from "sonner";

interface BoardModalProps {
  open: boolean;
  onClose: () => void;
  board?: Board | null;
  onSubmit: (data: CreateBoardData) => void;
}

export const MIN_COLUMNS = 1;
export const MAX_BANNER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_BANNER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const ALLOWED_BANNER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;
export const ALLOWED_BANNER_HOSTS = ["images.unsplash.com", "plus.unsplash.com"] as const;

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  columns: Column[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "kanban",
    name: "Kanban",
    description: "Classic 3-stage workflow",
    columns: [
      { id: "todo", title: "To Do", emoji: "📝" },
      { id: "in_progress", title: "In Progress", emoji: "⏳" },
      { id: "done", title: "Done", emoji: "✅" },
    ],
  },
  {
    id: "sprint",
    name: "Sprint",
    description: "Agile sprint planning & review",
    columns: [
      { id: "backlog", title: "Backlog", emoji: "📋" },
      { id: "todo", title: "To Do", emoji: "📝" },
      { id: "in_progress", title: "In Progress", emoji: "⚡" },
      { id: "in_review", title: "In Review", emoji: "👀" },
      { id: "done", title: "Done", emoji: "🚀" },
    ],
  },
  {
    id: "personal",
    name: "Personal to-do",
    description: "Simple 2-step personal checklist",
    columns: [
      { id: "todo", title: "To Do", emoji: "📌" },
      { id: "done", title: "Done", emoji: "✅" },
    ],
  },
  {
    id: "ideas",
    name: "Ideas / Doing",
    description: "Lightweight capture & execution",
    columns: [
      { id: "ideas", title: "Ideas", emoji: "💡" },
      { id: "doing", title: "Doing", emoji: "🛠️" },
    ],
  },
  {
    id: "custom",
    name: "Custom Kanban",
    description: "Empty board states (start from scratch)",
    columns: [],
  },
];

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

  if (trimmed.startsWith("data:image/") || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const formatted =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
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

export function validateBannerUrl(rawUrl: string): { valid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeImageUrl(rawUrl);
  if (!sanitized) {
    return { valid: true, sanitized: "" };
  }

  if (sanitized.startsWith("/api/files/")) {
    return { valid: true, sanitized };
  }

  if (sanitized.startsWith("data:image/")) {
    const isAllowedMime = ALLOWED_BANNER_MIME_TYPES.some((mime) =>
      sanitized.startsWith(`data:${mime};base64,`)
    );
    if (!isAllowedMime) {
      return {
        valid: false,
        sanitized: "",
        error: "Unsupported image format. Allowed formats: JPG, PNG, WebP, GIF.",
      };
    }
    return { valid: true, sanitized };
  }

  try {
    const urlObj = new URL(sanitized);
    if (urlObj.protocol !== "https:") {
      return {
        valid: false,
        sanitized: "",
        error: "Banner URL must use HTTPS.",
      };
    }
    const hostname = urlObj.hostname.toLowerCase();
    const isInternalFile =
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      urlObj.pathname.startsWith("/api/files/");
    const isTrustedHost = (ALLOWED_BANNER_HOSTS as readonly string[]).includes(hostname);

    if (!isInternalFile && !isTrustedHost) {
      return {
        valid: false,
        sanitized: "",
        error:
          "External third-party image URLs are blocked to prevent tracking and broken links. Please upload an image or choose a preset.",
      };
    }

    return { valid: true, sanitized: isInternalFile ? urlObj.pathname : urlObj.toString() };
  } catch {
    return {
      valid: false,
      sanitized: "",
      error: "Invalid banner image URL.",
    };
  }
}

export function validateBannerFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_BANNER_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = (ALLOWED_BANNER_MIME_TYPES as readonly string[]).includes(file.type);

  if (!hasValidExt || !hasValidMime) {
    return "Invalid file type. Only JPG, PNG, WebP, and GIF images are allowed.";
  }

  if (file.size <= 0) {
    return "Selected image file is empty.";
  }

  if (file.size > MAX_BANNER_SIZE_BYTES) {
    return "Image exceeds the 5MB size limit. Please choose a file under 5MB.";
  }

  return null;
}

export function BoardModal({ open, onClose, board, onSubmit }: BoardModalProps) {
  const { devSettings } = useDevMode();
  const permissions = useBoardPermissions(board);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(BOARD_COLORS[0]);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("kanban");
  const [isCustomized, setIsCustomized] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!board;
  const canEditBoard = !isEditing || permissions.canEditBoard;
  const canManageColumns = !isEditing || permissions.canManageColumns;

  const { data: boardTasks = [] } = useQuery({
    queryKey: ["boardTasks", board?.id],
    queryFn: () => (board?.id ? taskApi.getTasks(board.id) : Promise.resolve([])),
    enabled: open && !!board?.id,
  });

  useEffect(() => {
    setBannerError(null);
    setShowCustomUrlInput(false);
    if (board) {
      setName(board.name);
      setEmoji(board.emoji || "");
      setDescription(board.description || "");
      setColor(board.color);
      setHeroImageUrl(board.heroImageUrl || "");
      setColumns(board.columns || []);
      setIsCustomized(true);
    } else {
      setName("");
      setEmoji("");
      setDescription("");
      setColor(BOARD_COLORS[0]);
      setHeroImageUrl("");
      setSelectedTemplateId("kanban");
      setColumns(BOARD_TEMPLATES[0].columns.map((c) => ({ ...c })));
      setIsCustomized(false);
    }
  }, [board, open]);

  const visibleColumns = columns.filter((c) => c.id !== "archive");

  const handleSelectTemplate = (template: BoardTemplate) => {
    if (!canManageColumns) {
      toast.error("Only Admins and Owners can modify workflow states");
      return;
    }
    setSelectedTemplateId(template.id);
    setColumns(template.columns.map((c) => ({ ...c })));
  };

  const handleAddColumn = () => {
    if (!canManageColumns) {
      toast.error("Only Admins and Owners can modify workflow states");
      return;
    }
    const id = `col_${Date.now()}`;
    setColumns([...columns, { id, title: "New State", emoji: "📌" }]);
  };

  const handleRemoveColumn = (id: string) => {
    if (!canManageColumns) {
      toast.error("Only Admins and Owners can modify workflow states");
      return;
    }
    if (visibleColumns.length <= MIN_COLUMNS) return;
    const cardCount = boardTasks.filter((t) => !t.isDeleted && t.status === id).length;
    if (cardCount > 0) {
      const colTitle = columns.find((c) => c.id === id)?.title || id;
      toast.error(
        `Cannot delete column "${colTitle}" because it contains ${cardCount} active card${
          cardCount > 1 ? "s" : ""
        }. Move or delete cards first.`
      );
      return;
    }
    setColumns(columns.filter((c) => c.id !== id));
  };

  const handleColumnRename = (id: string, title: string, colEmoji?: string) => {
    if (!canManageColumns) return;
    setColumns(columns.map((c) => (c.id === id ? { ...c, title, emoji: colEmoji } : c)));
  };

  const handleColumnWipLimitChange = (id: string, rawValue: string) => {
    if (!canManageColumns) return;
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setColumns(columns.map((c) => (c.id === id ? { ...c, wipLimit: null } : c)));
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setColumns(columns.map((c) => (c.id === id ? { ...c, wipLimit: parsed } : c)));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateBannerFile(file);
    if (validationError) {
      setBannerError(validationError);
      toast.error(validationError);
      e.target.value = "";
      return;
    }

    setBannerError(null);
    setIsUploadingBanner(true);
    try {
      const uploaded = await fileApi.uploadFile(file, "banner");
      const storedPath = uploaded.storedName
        ? `/api/files/${uploaded.storedName}`
        : uploaded.url;
      setHeroImageUrl(storedPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload banner image";
      setBannerError(message);
      toast.error(message);
    } finally {
      setIsUploadingBanner(false);
      e.target.value = "";
    }
  };

  const handleCustomUrlChange = (rawValue: string) => {
    setHeroImageUrl(rawValue);
    if (!rawValue.trim()) {
      setBannerError(null);
      return;
    }
    const result = validateBannerUrl(rawValue);
    setBannerError(result.valid ? null : result.error || "Invalid banner URL");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const urlValidation = validateBannerUrl(heroImageUrl);
    if (!urlValidation.valid) {
      setBannerError(urlValidation.error || "Invalid banner image URL");
      toast.error(urlValidation.error || "Invalid banner image URL");
      return;
    }

    const activeCols = columns.filter((c) => c.id !== "archive" && c.title.trim());
    if (activeCols.length < MIN_COLUMNS) {
      setIsCustomized(true);
      toast.error(`At least ${MIN_COLUMNS} workflow state is required.`);
      return;
    }

    const finalColumns = columns.map((col) => ({
      ...col,
      emoji: devSettings.disableEmojiCustomization ? undefined : col.emoji,
      ...(col.id !== "archive"
        ? {
            wipLimit:
              typeof col.wipLimit === "number" && col.wipLimit >= 1
                ? Math.floor(col.wipLimit)
                : null,
          }
        : {}),
    }));
    if (!finalColumns.some((c) => c.id === "archive")) {
      finalColumns.push({
        id: "archive",
        title: "Archive",
        emoji: devSettings.disableEmojiCustomization ? undefined : "📦",
      });
    }

    onSubmit({
      name: name.trim(),
      emoji: devSettings.disableEmojiCustomization ? undefined : emoji || undefined,
      description: description.trim() || undefined,
      color,
      heroImageUrl: urlValidation.sanitized || undefined,
      columns: finalColumns,
    });
    onClose();
  };

  const urlCheck = validateBannerUrl(heroImageUrl);
  const previewUrl = urlCheck.valid && urlCheck.sanitized ? getMediaUrl(urlCheck.sanitized) : "";

  if (isEditing && !canEditBoard) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive">Permission Denied</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Only board Owners and Admins have permission to edit board settings and workflow states.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const activeTemplateName =
    BOARD_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || "Custom";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-none sm:max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] rounded-none sm:rounded-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? "Edit Board" : "Create Board"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon & Name (Always visible by default) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="board-name"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {devSettings.disableEmojiCustomization ? "Board Name" : "Board Icon & Name"}
            </Label>
            <div className="flex gap-2">
              {!devSettings.disableEmojiCustomization && (
                <EmojiSelector value={emoji} onChange={setEmoji} />
              )}
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

          {/* Progressive Disclosure Toggle */}
          {!isEditing && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground">
                Starter: <span className="font-semibold text-foreground">{activeTemplateName}</span>{" "}
                ({visibleColumns.length} {visibleColumns.length === 1 ? "column" : "columns"})
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomized((prev) => !prev)}
                aria-expanded={isCustomized}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Sliders04 className="h-3.5 w-3.5" />
                <span>Customize</span>
                {isCustomized ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}

          {isCustomized && (
            <div className="space-y-5 pt-2 border-t border-border/50">
              {/* Starter Templates */}
              {canManageColumns && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Starter Templates
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BOARD_TEMPLATES.map((template) => {
                      const isSelected = selectedTemplateId === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleSelectTemplate(template)}
                          className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border/70 hover:border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="font-semibold text-xs text-foreground">
                            <span>{template.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {template.columns.length > 0
                              ? template.columns.map((c) => c.title).join(" → ")
                              : "Empty states (start from scratch)"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="board-desc"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
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
                    Board States (Workflow) {!canManageColumns && "(Admin & Owner Only)"}
                  </Label>
                  {canManageColumns && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-7 text-xs font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3" /> Add State
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {visibleColumns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border/70 bg-muted/20 text-center">
                      <p className="text-xs text-muted-foreground">
                        No workflow states yet. Add states to build your custom board.
                      </p>
                      {canManageColumns && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddColumn}
                          className="mt-2 h-7 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Plus className="h-3 w-3" /> Add First State
                        </Button>
                      )}
                    </div>
                  ) : (
                    visibleColumns.map((col, idx) => {
                    const cardCount = boardTasks.filter(
                      (t) => !t.isDeleted && t.status === col.id
                    ).length;
                    const isBlocked = cardCount > 0;
                    const isAtMinColumns = visibleColumns.length <= MIN_COLUMNS;
                    return (
                      <div key={col.id} className="flex gap-2 group/col items-center">
                        {!devSettings.disableEmojiCustomization && (
                          <EmojiSelector
                            value={col.emoji || "📌"}
                            onChange={(e) => handleColumnRename(col.id, col.title, e)}
                            disabled={!canManageColumns}
                          />
                        )}
                        <Input
                          value={col.title}
                          onChange={(e) => handleColumnRename(col.id, e.target.value, col.emoji)}
                          placeholder={`State ${idx + 1}`}
                          className="h-9 flex-1 text-xs font-medium"
                          disabled={!canManageColumns}
                        />
                        <Input
                          type="number"
                          min={1}
                          value={col.wipLimit ?? ""}
                          onChange={(e) => handleColumnWipLimitChange(col.id, e.target.value)}
                          placeholder="WIP"
                          aria-label={`WIP limit for ${col.title}`}
                          title="Optional WIP limit (max cards before soft warning)"
                          className="h-9 w-20 text-xs font-medium text-center shrink-0"
                          disabled={!canManageColumns}
                        />
                        {canManageColumns && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${col.title}`}
                            className={`h-9 w-9 shrink-0 ${
                              isBlocked || isAtMinColumns
                                ? "opacity-40 cursor-not-allowed text-muted-foreground"
                                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            }`}
                            disabled={isAtMinColumns || isBlocked}
                            title={
                              isBlocked
                                ? `Cannot delete column: contains ${cardCount} active card${
                                    cardCount > 1 ? "s" : ""
                                  }`
                                : isAtMinColumns
                                ? `Minimum ${MIN_COLUMNS} state required`
                                : "Remove column"
                            }
                            onClick={() => handleRemoveColumn(col.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  }))}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium italic">
                  Minimum {MIN_COLUMNS} state required. Optional WIP limits highlight columns when at or over capacity.{" "}
                  {!canManageColumns && "Only Admins and Owners can modify workflow states."}
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
                      onClick={() => {
                        setHeroImageUrl("");
                        setBannerError(null);
                      }}
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
                      onClick={() => {
                        setHeroImageUrl("");
                        setBannerError(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-md"
                      title="Remove image"
                    >
                      <X className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                )}

                {/* Primary Actions: Upload + Preset Themes */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingBanner}
                    className="h-9 px-3 gap-1.5 text-xs font-semibold"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload banner image (JPG, PNG, WebP, GIF up to 5MB)"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{isUploadingBanner ? "Uploading…" : "Upload Image (Max 5MB)"}</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowCustomUrlInput((prev) => !prev)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span>{showCustomUrlInput ? "Hide URL input" : "Use preset URL"}</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  data-testid="banner-file-input"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                />

                {showCustomUrlInput && (
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={
                        heroImageUrl.startsWith("data:")
                          ? "Local Image File Selected"
                          : heroImageUrl
                      }
                      onChange={(e) => handleCustomUrlChange(e.target.value)}
                      placeholder="Paste an Unsplash URL (third-party URLs are blocked for privacy)..."
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                )}

                {bannerError && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {bannerError}
                  </p>
                )}

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
                        onClick={() => {
                          setHeroImageUrl(preset.url);
                          setBannerError(null);
                        }}
                        title={preset.name}
                        className={`relative aspect-video rounded-md overflow-hidden border transition-all group hover:scale-105 ${
                          heroImageUrl === preset.url
                            ? "ring-2 ring-primary border-transparent shadow-sm"
                            : "border-border/60 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
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
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || !!bannerError || isUploadingBanner}
            >
              {isEditing ? "Save Changes" : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

