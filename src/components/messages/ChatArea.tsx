import React, { useState, useEffect, useRef } from "react";
import { Conversation, Message, MessageAttachment, MessageReplySnippet } from "@/types/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Smile,
  CornerUpLeft,
  Trash2,
  Download,
  FileText,
  ChevronDown,
  Info,
  CheckCheck,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { MessageComposer } from "./MessageComposer";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";

interface ChatAreaProps {
  conversation?: Conversation | null;
  messages: Message[];
  isLoadingMessages: boolean;
  onSendMessage: (data: {
    content: string;
    attachments: MessageAttachment[];
    replyToId?: string | null;
  }) => Promise<any>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<any>;
  onDeleteMessage: (messageId: string) => Promise<any>;
  onToggleMobileSidebar?: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀", "🎉", "👏"];

export function ChatArea({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onToggleMobileSidebar,
}: ChatAreaProps) {
  const { user: currentUser } = useAuth();
  const [replyingTo, setReplyingTo] = useState<MessageReplySnippet | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on conversation change or new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Group messages by calendar day for dividers
  const groupedMessages: { dateLabel: string; items: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateLabel = formatDateDivider(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.dateLabel === dateLabel) {
      lastGroup.items.push(msg);
    } else {
      groupedMessages.push({ dateLabel, items: [msg] });
    }
  });

  const handleDownloadAttachment = async (att: MessageAttachment) => {
    try {
      await fileApi.downloadFile(att.url, att.name);
    } catch (err: any) {
      toast.error("Failed to download file");
    }
  };

  const isImageAttachment = (att: MessageAttachment) => {
    if (att.mimeType?.startsWith("image/")) return true;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name || "");
  };

  // No conversation selected placeholder
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/50 select-none">
        <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-sm">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground">Welcome to Messages</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
          Connect with your team members in real-time, collaborate on projects, and share ideas.
        </p>
        <div className="flex items-center gap-2">
          {onToggleMobileSidebar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleMobileSidebar}
              className="text-xs h-8 rounded-xl md:hidden"
            >
              <PanelLeft className="h-3.5 w-3.5 mr-1.5" />
              View Conversations
            </Button>
          )}
        </div>
      </div>
    );
  }

  const initial =
    conversation.displayTitle?.charAt(0) ||
    conversation.otherUser?.fullName?.charAt(0) ||
    "C";

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative overflow-hidden">
      {/* 1. CHAT HEADER */}
      <div className="h-14 px-4 border-b border-border/60 flex items-center justify-between shrink-0 bg-card/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleMobileSidebar}
              className="h-8 w-8 rounded-xl md:hidden shrink-0 text-muted-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="relative shrink-0">
            {conversation.type === "group" ? (
              <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-2xs">
                <Users className="h-4 w-4" />
              </div>
            ) : (
              <Avatar className="h-9 w-9 border border-border/60 shadow-2xs">
                <AvatarImage src={conversation.displayAvatar || conversation.otherUser?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            {conversation.type === "direct" && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            )}
          </div>

          <div className="flex flex-col min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                {conversation.displayTitle}
              </span>
              {conversation.type === "group" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-muted-foreground border-border/70">
                  {conversation.participantCount} members
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {conversation.type === "group"
                ? conversation.participants.map((p) => p.user?.fullName || p.user?.email).filter(Boolean).join(", ")
                : conversation.otherUser?.email || "Direct Message"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                title="Conversation details"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-64 p-3 bg-card/95 backdrop-blur-xl border border-border/70 shadow-xl rounded-2xl">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">
                  {conversation.displayTitle}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {conversation.type === "group" ? "Team Group Chat" : "Direct 1-on-1 Conversation"}
                </p>
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Participants ({conversation.participants?.length || 0})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {conversation.participants?.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs py-1">
                        <Avatar className="h-5 w-5 border border-border/50">
                          <AvatarImage src={p.user?.avatarUrl} />
                          <AvatarFallback className="text-[9px]">
                            {p.user?.fullName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-foreground font-medium text-[11px] flex-1">
                          {p.user?.fullName || p.user?.email}
                        </span>
                        {p.role === "admin" && (
                          <Badge className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20">
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 2. MESSAGES STREAM */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {isLoadingMessages && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center">
              <Smile className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-semibold text-foreground">No messages yet</p>
            <p className="text-[11px] text-muted-foreground">
              Say hello or share an update to start the thread.
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              {/* Date Header Divider */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-muted/60 text-muted-foreground border border-border/50 shadow-2xs">
                  {group.dateLabel}
                </span>
              </div>

              {/* Messages in Day Group */}
              {group.items.map((message) => {
                const isMe = message.senderId === currentUser?.id;
                const senderName = isMe
                  ? "You"
                  : message.sender?.fullName || message.sender?.email || "User";
                const senderInitial = (senderName.charAt(0) || "U").toUpperCase();
                const timeStr = message.createdAt
                  ? format(new Date(message.createdAt), "p")
                  : "";

                return (
                  <div
                    key={message.id}
                    className={`group relative flex gap-2.5 items-end transition-all ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Incoming Avatar */}
                    {!isMe && (
                      <Avatar className="h-7 w-7 border border-border/60 shrink-0 mb-0.5 shadow-2xs">
                        <AvatarImage src={message.sender?.avatarUrl} alt={senderName} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                          {senderInitial}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Message Bubble Container */}
                    <div
                      className={`flex flex-col max-w-[78%] sm:max-w-[70%] space-y-1 ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Sender Name in Group Chat */}
                      {!isMe && conversation.type === "group" && (
                        <span className="text-[10px] font-bold text-muted-foreground ml-1">
                          {senderName}
                        </span>
                      )}

                      {/* Reply Quoted Preview */}
                      {message.replyTo && (
                        <div
                          className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 opacity-85 ${
                            isMe
                              ? "bg-primary/15 border-primary/25 text-foreground"
                              : "bg-muted/80 border-border/60 text-muted-foreground"
                          }`}
                        >
                          <CornerUpLeft className="h-3 w-3 shrink-0" />
                          <span className="font-semibold text-[10px] shrink-0">
                            {message.replyTo.senderName}:
                          </span>
                          <span className="truncate max-w-[180px]">
                            {message.replyTo.content || "Attachment"}
                          </span>
                        </div>
                      )}

                      {/* Actual Bubble */}
                      <div
                        className={`relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs transition-all ${
                          message.isDeleted
                            ? "bg-muted/40 border border-border/50 text-muted-foreground italic rounded-2xl"
                            : isMe
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-card border border-border/70 text-foreground rounded-bl-xs"
                        }`}
                      >
                        {/* Message Text */}
                        {message.content && (
                          <p className="whitespace-pre-wrap select-text">{message.content}</p>
                        )}

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {message.attachments.map((att, attIdx) => {
                              const isImg = isImageAttachment(att);
                              if (isImg) {
                                return (
                                  <div
                                    key={attIdx}
                                    onClick={() => setLightboxImage(att.url)}
                                    className="relative rounded-xl overflow-hidden border border-border/40 cursor-pointer group/img max-h-48 max-w-xs bg-black/10"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={attIdx}
                                  className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-[11px] ${
                                    isMe
                                      ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
                                      : "bg-muted/60 border-border/70 text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-4 w-4 shrink-0 opacity-80" />
                                    <span className="truncate max-w-[150px] font-medium">
                                      {att.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="h-6 w-6 rounded-lg hover:bg-black/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                    title="Download file"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Timestamp & Read Tick */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] select-none ${
                            isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                          }`}
                        >
                          <span>{timeStr}</span>
                          {isMe && <CheckCheck className="h-3 w-3 stroke-[2.5]" />}
                        </div>
                      </div>

                      {/* Emoji Reactions Row */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5 ml-1">
                          {Object.entries(message.reactions).map(([emoji, uids]) => {
                            if (!uids || uids.length === 0) return null;
                            const hasReacted = uids.includes(currentUser?.id || "");
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onToggleReaction(message.id, emoji)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                  hasReacted
                                    ? "bg-primary/15 border-primary/30 text-primary font-bold scale-105"
                                    : "bg-muted/60 hover:bg-muted border-border/60 text-muted-foreground"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px]">{uids.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Message Hover Actions Toolbar */}
                    {!message.isDeleted && (
                      <div
                        className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-0.5 bg-card border border-border/70 rounded-xl shadow-md z-10 ${
                          isMe ? "right-0 -top-7" : "left-0 -top-7"
                        }`}
                      >
                        {/* Quick Reaction buttons */}
                        {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => onToggleReaction(message.id, emoji)}
                            className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted text-xs hover:scale-115 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}

                        {/* More emojis popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Add reaction"
                            >
                              <Smile className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            side="top"
                            align="center"
                            className="w-48 p-1.5 bg-card/95 backdrop-blur-xl border border-border/70 shadow-xl rounded-xl"
                          >
                            <div className="grid grid-cols-6 gap-1">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => onToggleReaction(message.id, emoji)}
                                  className="h-7 w-7 flex items-center justify-center text-sm rounded-lg hover:bg-muted/70 hover:scale-110 active:scale-95 transition-all"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Reply button */}
                        <button
                          type="button"
                          onClick={() =>
                            setReplyingTo({
                              id: message.id,
                              senderId: message.senderId,
                              senderName: senderName,
                              content: message.content,
                              hasAttachments: Boolean(message.attachments?.length),
                            })
                          }
                          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Reply"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete button for sender */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(message.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. MESSAGE COMPOSER */}
      <MessageComposer
        onSendMessage={onSendMessage}
        replyingTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        placeholder={`Message ${conversation.displayTitle}...`}
      />

      {/* Lightbox Modal for Full Image Previews */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={lightboxImage}
              alt="Preview"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
