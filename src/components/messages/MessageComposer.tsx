import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send,
  Paperclip,
  Smile,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CornerUpLeft,
} from "lucide-react";
import { MessageAttachment, MessageReplySnippet } from "@/types/message";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";

interface MessageComposerProps {
  onSendMessage: (data: {
    content: string;
    attachments: MessageAttachment[];
    replyToId?: string | null;
  }) => Promise<any>;
  replyingTo?: MessageReplySnippet | null;
  onClearReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "🔥", "🚀", "🎉", "👏",
  "😂", "😮", "🙌", "💡", "✨", "💯",
  "✅", "⏳", "👀", "🤝", "🙏", "💪"
];

export function MessageComposer({
  onSendMessage,
  replyingTo,
  onClearReply,
  disabled = false,
  placeholder = "Type a message... (Enter to send, Shift+Enter for new line)",
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [content]);

  // Focus textarea when replyingTo changes
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds 15MB upload limit.`);
          continue;
        }
        const uploaded = await fileApi.uploadFile(file);
        setAttachments((prev) => [
          ...prev,
          {
            name: uploaded.name || file.name,
            url: uploaded.url,
            size: uploaded.sizeBytes || file.size,
            mimeType: file.type || uploaded.type,
          },
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload attachment");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled || isSending || isUploading) return;

    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSending(true);
    try {
      await onSendMessage({
        content: trimmed,
        attachments,
        replyToId: replyingTo?.id || null,
      });

      setContent("");
      setAttachments([]);
      if (onClearReply) onClearReply();

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    } catch (err: any) {
      // Handled in caller
    } finally {
      setIsSending(false);
    }
  };

  const isImageFile = (mime?: string, name?: string) => {
    if (mime?.startsWith("image/")) return true;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name || "");
  };

  return (
    <div className="p-3 bg-card/95 backdrop-blur-md border-t border-border/60 transition-all">
      {/* Active Reply Banner */}
      {replyingTo && (
        <div className="mb-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-[11px] font-bold text-primary truncate">
                Replying to {replyingTo.senderName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-md">
                {replyingTo.content || (replyingTo.hasAttachments ? "📎 Attachment" : "Message")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClearReply}
            className="h-5 w-5 rounded-full hover:bg-primary/20 text-primary shrink-0"
            title="Cancel reply"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="group relative flex items-center gap-2 p-1.5 bg-muted/60 hover:bg-muted border border-border/70 rounded-xl text-xs max-w-[220px] transition-all"
            >
              {isImageFile(att.mimeType, att.name) ? (
                <div className="h-8 w-8 rounded-lg overflow-hidden bg-background shrink-0 border border-border/50">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <FileText className="h-5 w-5 text-primary shrink-0 ml-1" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[11px] font-medium truncate text-foreground">
                  {att.name}
                </span>
                {att.size && (
                  <span className="text-[10px] text-muted-foreground">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="h-4 w-4 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors shrink-0 mr-1"
                title="Remove attachment"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 bg-muted/40 border border-border/70 rounded-2xl p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Attachment Upload Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || isUploading || isSending}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          title="Attach files or images"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1 bg-transparent border-0 resize-none py-1.5 px-1 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none min-h-[32px] max-h-[140px] leading-relaxed custom-scrollbar"
        />

        {/* Emoji Popover Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || isSending}
              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-56 p-2 bg-card/95 backdrop-blur-xl border-border/70 shadow-2xl rounded-2xl"
          >
            <div className="grid grid-cols-6 gap-1.5">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className="h-8 w-8 flex items-center justify-center text-lg rounded-xl hover:bg-muted/70 hover:scale-110 active:scale-95 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={
            disabled ||
            isSending ||
            isUploading ||
            (!content.trim() && attachments.length === 0)
          }
          className="h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 transition-all disabled:opacity-40"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
