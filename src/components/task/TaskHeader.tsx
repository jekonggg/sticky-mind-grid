import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Copy, Check, Sparkles, Image as ImageIcon, Smile, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmojiSelector } from "../common/EmojiSelector";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskHeaderProps {
  boardId: string;
  boardName: string;
  title: string;
  emoji: string;
  coverImage?: string;
  readOnly?: boolean;
  onClose?: () => void;
  onTitleChange: (title: string) => void;
  onTitleBlur?: () => void;
  onEmojiChange: (emoji: string) => void;
  onCoverChange?: (cover: string) => void;
  onDelete?: () => void;
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

export function TaskHeader({
  boardId,
  boardName,
  title,
  emoji,
  coverImage,
  readOnly,
  onClose,
  onTitleChange,
  onTitleBlur,
  onEmojiChange,
  onCoverChange,
  onDelete,
}: TaskHeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [selectedCover, setSelectedCover] = useState(coverImage || "");

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(`/boards/${boardId}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Task link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRandomCover = () => {
    const randomGradient = COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)];
    setSelectedCover(randomGradient);
    onCoverChange?.(randomGradient);
  };

  const handleRemoveCover = () => {
    setSelectedCover("");
    onCoverChange?.("");
  };

  return (
    <div className="w-full">
      {/* Top Breadcrumb Navigation & Action Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-xs font-semibold px-2.5 h-8 hover:text-foreground text-muted-foreground"
            title="Close task (Esc)"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Board</span>
          </Button>
          <span className="text-muted-foreground/40 font-light">/</span>
          <button
            onClick={handleBack}
            className="hover:text-foreground transition-colors truncate max-w-[160px] font-medium text-xs text-muted-foreground"
          >
            {boardName}
          </button>
          <span className="text-muted-foreground/40 font-light">/</span>
          <span className="text-foreground font-semibold truncate max-w-[200px] text-xs">
            {emoji ? `${emoji} ` : ""}{title || "Untitled Task"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title="Copy task URL link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
          </Button>

          {!readOnly && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete Task"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* Optional Cover Banner */}
      {selectedCover && (
        <div
          className="w-full h-36 sm:h-48 relative group transition-all duration-300 overflow-hidden"
          style={{ background: selectedCover }}
        >
          {!readOnly && (
            <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-background/70 backdrop-blur-md px-2 py-1 rounded-md border border-border/40 text-xs">
              <button
                onClick={handleRandomCover}
                className="text-xs text-foreground/80 hover:text-foreground font-medium px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors"
              >
                Change Cover
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                onClick={handleRemoveCover}
                className="text-xs text-destructive hover:underline font-medium px-1.5 py-0.5"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notion-style Page Action Helpers (Add Icon, Add Cover) */}
      <div className={`max-w-4xl mx-auto px-6 sm:px-12 ${selectedCover ? "-mt-10" : "pt-8"}`}>
        <div className="flex items-center gap-2 mb-3">
          {/* Emoji Icon Button */}
          {!readOnly ? (
            <EmojiSelector
              selectedEmoji={emoji}
              onSelect={onEmojiChange}
              size="lg"
              className={`transition-transform hover:scale-105 shadow-sm ${
                selectedCover ? "bg-background border-2 border-background ring-2 ring-border/30 rounded-2xl" : ""
              }`}
            />
          ) : emoji ? (
            <div className="text-4xl">{emoji}</div>
          ) : null}

          {/* Quick Notion-style hover controls if no icon / cover */}
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
              {!emoji && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEmojiChange("📌")}
                  className="text-xs text-muted-foreground gap-1.5 h-7 px-2"
                >
                  <Smile className="h-3.5 w-3.5" />
                  <span>Add icon</span>
                </Button>
              )}
              {!selectedCover && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomCover}
                  className="text-xs text-muted-foreground gap-1.5 h-7 px-2"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Add cover</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Notion-Style Huge Page Title Input */}
        <div className="w-full">
          {readOnly ? (
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground py-1">
              {title || "Untitled Task"}
            </h1>
          ) : (
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              placeholder="Untitled Task"
              className="w-full text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/30 py-1 transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
}
