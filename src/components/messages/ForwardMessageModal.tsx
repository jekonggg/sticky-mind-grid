import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Forward,
  Check,
  Loader2,
  Users,
  User as UserIcon,
  FileText,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Conversation, Message } from "@/types/message";
import { useForwardMessage } from "@/hooks/useMessages";

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  conversations: Conversation[];
  onForwardSuccess?: (targetConvId: string) => void;
}

export function ForwardMessageModal({
  open,
  onOpenChange,
  message,
  conversations,
  onForwardSuccess,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);

  const forwardMutation = useForwardMessage();

  // Reset state when opening/closing
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery("");
      setSelectedConvIds([]);
    }
    onOpenChange(newOpen);
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const title = c.displayTitle?.toLowerCase() || "";
      const otherName = c.otherUser?.fullName?.toLowerCase() || "";
      const otherEmail = c.otherUser?.email?.toLowerCase() || "";
      return title.includes(q) || otherName.includes(q) || otherEmail.includes(q);
    });
  }, [conversations, searchQuery]);

  const toggleSelectConv = (convId: string) => {
    setSelectedConvIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleForward = async () => {
    if (!message || selectedConvIds.length === 0) return;

    try {
      await forwardMutation.mutateAsync({
        messageId: message.id,
        targetConversationIds: selectedConvIds,
      });
      const firstTarget = selectedConvIds[0];
      handleOpenChange(false);
      if (onForwardSuccess && firstTarget) {
        onForwardSuccess(firstTarget);
      }
    } catch (err) {
      // Error handled by hook toast
    }
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/70 rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Forward className="h-4 w-4 text-primary" />
            Forward Message
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select one or more conversations to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {/* Message Preview Box */}
        <div className="mx-4 mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
          <span className="font-semibold text-primary block text-[11px] mb-1">
            Message Preview:
          </span>
          {message.content && (
            <p className="line-clamp-2 text-foreground/90 whitespace-pre-wrap">{message.content}</p>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5 items-center">
              {message.attachments.map((att, idx) => {
                const isImg = att.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.name);
                const isVid = att.mimeType?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(att.name);
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border text-[10px] text-muted-foreground font-medium"
                  >
                    {isImg ? (
                      <ImageIcon className="h-3 w-3 text-primary" />
                    ) : isVid ? (
                      <Video className="h-3 w-3 text-blue-500" />
                    ) : (
                      <FileText className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-8 h-8 text-xs bg-muted/30 border-border/60 rounded-xl"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="max-h-60 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConvIds.includes(conv.id);
              const initial = (conv.displayTitle?.charAt(0) || "C").toUpperCase();

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => toggleSelectConv(conv.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 border border-border/60 shrink-0">
                      <AvatarImage src={conv.displayAvatar || undefined} alt={conv.displayTitle} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {conv.type === "group" ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : (
                          initial
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {conv.displayTitle}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {conv.type === "group"
                          ? `Group • ${conv.participantCount} members`
                          : conv.otherUser?.email || "Direct Message"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border/80 bg-background"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer with Send Button */}
        <DialogFooter className="p-3 border-t border-border/50 bg-muted/20 flex sm:justify-between items-center">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            {selectedConvIds.length > 0
              ? `${selectedConvIds.length} conversation${selectedConvIds.length > 1 ? "s" : ""} selected`
              : "Select a recipient"}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-xs h-8 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedConvIds.length === 0 || forwardMutation.isPending}
              onClick={handleForward}
              className="text-xs h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {forwardMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Forward className="h-3.5 w-3.5 mr-1" />
                  Forward ({selectedConvIds.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
