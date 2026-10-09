import React, { useState, useEffect, useRef } from "react";
import { Conversation, Message, MessageAttachment, MessageReplySnippet } from "@/types/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Smile,
  SmilePlus,
  CornerUpLeft,
  Trash2,
  Download,
  FileText,
  ChevronDown,
  Info,
  CheckCheck,
  PanelLeft,
  Sparkles,
  Forward,
  RotateCcw,
  Video,
  Pin,
  PinOff,
  MoreHorizontal,
  X,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageComposer } from "./MessageComposer";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { fileApi } from "@/services/fileApi";
import { toast } from "sonner";

interface ChatAreaProps {
  conversation?: Conversation | null;
  conversations?: Conversation[];
  messages: Message[];
  isLoadingMessages: boolean;
  onSendMessage: (data: {
    content: string;
    attachments: MessageAttachment[];
    replyToId?: string | null;
  }) => Promise<any>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<any>;
  onDeleteMessage: (messageId: string) => Promise<any>;
  onTogglePin?: (messageId: string) => Promise<any>;
  onForwardSuccess?: (targetConvId: string) => void;
  onToggleMobileSidebar?: () => void;
}

const ALL_EMOJIS = [
  "👍", "❤️", "🔥", "🚀", "🎉", "👏",
  "😂", "😮", "🙌", "💡", "✨", "💯",
  "✅", "⏳", "👀", "🤝", "🙏", "💪"
];

export function ChatArea({
  conversation,
  conversations = [],
  messages,
  isLoadingMessages,
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onTogglePin,
  onForwardSuccess,
  onToggleMobileSidebar,
}: ChatAreaProps) {
  const { user: currentUser } = useAuth();
  const { settings } = useSettings();
  const [replyingTo, setReplyingTo] = useState<MessageReplySnippet | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [unsendTargetId, setUnsendTargetId] = useState<string | null>(null);
  const [isUnsending, setIsUnsending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on conversation change or new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  const pinnedMessages = messages.filter((m) => m.isPinned && !m.isDeleted);

  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-container-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

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

  const isVideoAttachment = (att: MessageAttachment) => {
    if (att.mimeType?.startsWith("video/")) return true;
    return /\.(mp4|webm|mov|ogg|mkv|avi)$/i.test(att.name || "");
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
              View Chats
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-background overflow-hidden select-none">
      {/* 1. CONVERSATION HEADER */}
      <div className="p-3.5 px-4 border-b border-border/60 bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMobileSidebar}
              className="h-8 w-8 rounded-xl md:hidden text-muted-foreground hover:text-foreground shrink-0"
              title="Open conversation list"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 border border-border/60 shadow-xs">
              <AvatarImage
                src={conversation.displayAvatar || undefined}
                alt={conversation.displayTitle}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {conversation.type === "group" ? (
                  <Users className="h-4 w-4" />
                ) : (
                  (conversation.displayTitle.charAt(0) || "U").toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
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
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
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

      {/* Pinned Messages Top Banner (when conversation has pinned messages) */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-foreground shrink-0 shadow-2xs backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
            title="Jump to pinned message"
          >
            <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500/30" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] shrink-0">
                Pinned ({pinnedMessages.length})
              </span>
              <span className="text-muted-foreground truncate text-[11px] max-w-sm">
                {pinnedMessages[pinnedMessages.length - 1].content ||
                  (pinnedMessages[pinnedMessages.length - 1].attachments?.length ? "📎 Attachment" : "Pinned message")}
              </span>
            </div>
          </div>
          {onTogglePin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(pinnedMessages[pinnedMessages.length - 1].id);
              }}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-amber-500 rounded-lg cursor-pointer"
            >
              Unpin
            </Button>
          )}
        </div>
      )}

      {/* 2. MESSAGES STREAM */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      >
        {(isLoadingMessages && messages.length === 0) || settings.simulateSkeletonLoading ? (
          <div className="space-y-4 py-2">
            {/* Received message 1 */}
            <div className="flex items-start gap-2.5 max-w-[70%]">
              <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
              <div className="space-y-1">
                <Skeleton className="h-16 w-56 rounded-2xl rounded-tl-sm" />
                <Skeleton className="h-2.5 w-12 rounded-sm" />
              </div>
            </div>

            {/* Sent message 1 */}
            <div className="flex flex-col items-end ml-auto max-w-[70%] space-y-1">
              <Skeleton className="h-12 w-48 rounded-2xl rounded-tr-sm bg-primary/20" />
              <Skeleton className="h-2.5 w-12 rounded-sm" />
            </div>

            {/* Received message 2 */}
            <div className="flex items-start gap-2.5 max-w-[70%]">
              <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
              <div className="space-y-1">
                <Skeleton className="h-20 w-72 rounded-2xl rounded-tl-sm" />
                <Skeleton className="h-2.5 w-12 rounded-sm" />
              </div>
            </div>

            {/* Sent message 2 */}
            <div className="flex flex-col items-end ml-auto max-w-[70%] space-y-1">
              <Skeleton className="h-14 w-64 rounded-2xl rounded-tr-sm bg-primary/20" />
              <Skeleton className="h-2.5 w-12 rounded-sm" />
            </div>
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
          <div className="min-h-full flex flex-col justify-end space-y-4">
            {groupedMessages.map((group, gIdx) => (
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

                  const hasReactions = Boolean(
                    message.reactions &&
                      Object.values(message.reactions).some((uids) => uids && uids.length > 0)
                  );

                  const isHighlighted = highlightedMessageId === message.id;

                  return (
                    <div
                      key={message.id}
                      id={`msg-container-${message.id}`}
                      className={`group/msg relative flex gap-2.5 items-end transition-all ${
                        isMe ? "justify-end" : "justify-start"
                      } ${isHighlighted ? "scale-[1.01]" : ""}`}
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

                      {/* Hover Timestamp for My Messages (shown on hover to the left) */}
                      {isMe && timeStr && (
                        <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] text-muted-foreground self-center px-1 select-none whitespace-nowrap pointer-events-none shrink-0">
                          <span>{timeStr}</span>
                          <CheckCheck className="h-3 w-3 stroke-[2] text-primary/70" />
                        </div>
                      )}

                      {/* Message Bubble Container with scoped hover rule */}
                      <div
                        className={`relative group/bubble flex flex-col max-w-[78%] sm:max-w-[70%] space-y-1 ${
                          hasReactions ? "mb-2.5" : ""
                        } ${isMe ? "items-end" : "items-start"}`}
                      >
                        {/* Sender Name in Group Chat */}
                        {!isMe && conversation.type === "group" && (
                          <span className="text-[10px] font-bold text-muted-foreground ml-1">
                            {senderName}
                          </span>
                        )}

                        {/* Reply Quoted Preview (Click to jump to target message) */}
                        {message.replyTo && (
                          <div
                            onClick={() => scrollToMessage(message.replyTo!.id)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer hover:opacity-100 transition-all ${
                              isMe
                                ? "bg-primary/15 border-primary/25 text-foreground hover:bg-primary/20"
                                : "bg-muted/80 border-border/60 text-muted-foreground hover:bg-muted"
                            }`}
                            title="Click to jump to replied message"
                          >
                            <CornerUpLeft className="h-3 w-3 shrink-0" />
                            <span className="font-semibold text-[10px] shrink-0">
                              {message.replyTo.senderName}:
                            </span>
                            <span className="truncate max-w-[180px]">
                              {message.replyTo.content || (message.replyTo.hasAttachments ? "📎 Attachment" : "")}
                            </span>
                          </div>
                        )}

                        {/* Actual Bubble / Unsent Trail */}
                        {message.isDeleted ? (
                          <div
                            title={timeStr}
                            className="relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed italic bg-muted/30 border border-dashed border-border/70 text-muted-foreground/80 flex items-center gap-2 select-none shadow-2xs"
                          >
                            <RotateCcw className="h-3.5 w-3.5 opacity-60 shrink-0" />
                            <span>{isMe ? "You unsent a message" : "This message was unsent"}</span>
                          </div>
                        ) : (
                          <div
                            title={timeStr}
                            className={`relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs transition-all ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-xs"
                                : "bg-card border border-border/70 text-foreground rounded-bl-xs"
                            } ${
                              isHighlighted
                                ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background"
                                : ""
                            }`}
                          >
                            {/* Pinned Indicator Badge */}
                            {message.isPinned && (
                              <div
                                className={`flex items-center gap-1 text-[10px] font-bold mb-1 select-none ${
                                  isMe ? "text-primary-foreground/90" : "text-amber-500"
                                }`}
                              >
                                <Pin className="h-3 w-3 fill-current" />
                                <span>Pinned</span>
                              </div>
                            )}

                            {/* Forwarded Header */}
                            {message.isForwarded && (
                              <div
                                className={`flex items-center gap-1 text-[10px] font-medium mb-1 italic ${
                                  isMe ? "text-primary-foreground/75" : "text-muted-foreground"
                                }`}
                              >
                                <Forward className="h-3 w-3 shrink-0" />
                                <span>Forwarded</span>
                              </div>
                            )}

                            {/* Message Text */}
                            {message.content && (
                              <p className="whitespace-pre-wrap select-text">{message.content}</p>
                            )}

                            {/* Attachments: Images, Videos, and Files */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {message.attachments.map((att, attIdx) => {
                                  const isImg = isImageAttachment(att);
                                  const isVid = isVideoAttachment(att);

                                  if (isImg) {
                                    return (
                                      <div
                                        key={attIdx}
                                        onClick={() => setLightboxImage(att.url)}
                                        className="relative rounded-xl overflow-hidden border border-border/40 cursor-pointer group/img max-h-52 max-w-xs bg-black/10 shadow-xs"
                                      >
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                        />
                                      </div>
                                    );
                                  }

                                  if (isVid) {
                                    return (
                                      <div
                                        key={attIdx}
                                        className="rounded-xl overflow-hidden border border-border/50 bg-black/30 max-w-xs shadow-xs"
                                      >
                                        <video
                                          controls
                                          src={att.url}
                                          className="w-full max-h-56 object-contain bg-black/60 rounded-t-xl"
                                          preload="metadata"
                                        />
                                        <div
                                          className={`p-1.5 px-2 flex items-center justify-between text-[11px] ${
                                            isMe
                                              ? "bg-primary-foreground/10 text-primary-foreground"
                                              : "bg-muted/70 text-foreground"
                                          }`}
                                        >
                                          <span className="truncate max-w-[140px] font-medium">
                                            {att.name}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadAttachment(att)}
                                            className="h-6 w-6 rounded-md hover:bg-black/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                            title="Download video"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
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

                            {/* Overlapping Reaction Badges (placed on bottom rightmost edge of the message container) */}
                            {hasReactions && (
                              <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 z-10">
                                {Object.entries(message.reactions).map(([emoji, uids]) => {
                                  if (!uids || uids.length === 0) return null;
                                  const hasReacted = uids.includes(currentUser?.id || "");
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => onToggleReaction(message.id, emoji)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] leading-none border shadow-xs transition-all cursor-pointer select-none ${
                                        hasReacted
                                          ? "bg-card border-primary/50 text-primary font-bold shadow-xs scale-105 ring-1 ring-primary/20"
                                          : "bg-card/95 hover:bg-card border-border/80 text-foreground hover:scale-105"
                                      }`}
                                      title={`${uids.length} reaction${uids.length > 1 ? "s" : ""}`}
                                    >
                                      <span className="text-xs leading-none">{emoji}</span>
                                      {uids.length > 1 && (
                                        <span className="text-[10px] font-bold opacity-80 leading-none">
                                          {uids.length}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hover Action Toolbar: ONLY visible when hovered directly over or nearby the message container */}
                        {!message.isDeleted && (
                          <div
                            className={`absolute opacity-0 group-hover/bubble:opacity-100 transition-all duration-150 flex items-center gap-0.5 p-0.5 bg-card/95 dark:bg-card/90 backdrop-blur-md border border-border/80 rounded-full shadow-md z-30 pointer-events-none group-hover/bubble:pointer-events-auto ${
                              isMe ? "-top-3.5 right-2" : "-top-3.5 left-2"
                            }`}
                          >
                            {/* 1. React Button with Emoticon Popover */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="React"
                                  aria-label="React with emoji"
                                >
                                  <SmilePlus className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                side="top"
                                align={isMe ? "end" : "start"}
                                className="w-56 p-2 bg-card/95 backdrop-blur-xl border border-border/70 shadow-2xl rounded-2xl z-50"
                              >
                                <div className="grid grid-cols-6 gap-1">
                                  {ALL_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => onToggleReaction(message.id, emoji)}
                                      className="h-7 w-7 flex items-center justify-center text-sm rounded-lg hover:bg-muted/70 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* 2. Reply Button */}
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
                              className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Reply"
                              aria-label="Reply to message"
                            >
                              <CornerUpLeft className="h-3.5 w-3.5" />
                            </button>

                            {/* 3. Three-dot Menu (Unsend, Forward, Pin) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="More options"
                                  aria-label="More options"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="top"
                                align={isMe ? "end" : "start"}
                                className="w-44 p-1 bg-card/95 backdrop-blur-xl border border-border/70 shadow-xl rounded-xl z-50"
                              >
                                {/* Pin / Unpin Choice */}
                                <DropdownMenuItem
                                  onClick={() => onTogglePin && onTogglePin(message.id)}
                                  className="text-xs cursor-pointer gap-2"
                                >
                                  {message.isPinned ? (
                                    <>
                                      <PinOff className="h-3.5 w-3.5 text-amber-500" />
                                      <span>Unpin Message</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>Pin Message</span>
                                    </>
                                  )}
                                </DropdownMenuItem>

                                {/* Forward Choice */}
                                <DropdownMenuItem
                                  onClick={() => setForwardingMessage(message)}
                                  className="text-xs cursor-pointer gap-2"
                                >
                                  <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Forward Message</span>
                                </DropdownMenuItem>

                                {/* Unsend Choice (if isMe and not deleted) */}
                                {isMe && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setUnsendTargetId(message.id)}
                                      className="text-xs text-destructive focus:text-destructive cursor-pointer gap-2"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      <span>Unsend Message</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* Hover Timestamp for Received Messages (shown on hover to the right) */}
                      {!isMe && timeStr && (
                        <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 flex items-center gap-1 text-[10px] text-muted-foreground self-center px-1 select-none whitespace-nowrap pointer-events-none shrink-0">
                          <span>{timeStr}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
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

      {/* Forward Message Modal */}
      <ForwardMessageModal
        open={Boolean(forwardingMessage)}
        onOpenChange={(open) => !open && setForwardingMessage(null)}
        message={forwardingMessage}
        conversations={conversations}
        onForwardSuccess={onForwardSuccess}
      />

      {/* Unsend Confirmation Dialog */}
      <Dialog
        open={Boolean(unsendTargetId)}
        onOpenChange={(open) => !open && setUnsendTargetId(null)}
      >
        <DialogContent className="w-full max-w-none sm:max-w-sm h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-2xl bg-card border-border/70 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <RotateCcw className="h-4 w-4" />
              Unsend Message?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              This will remove this message for everyone in the conversation. An unsent trail will remain in its place.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnsendTargetId(null)}
              className="text-xs h-8 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isUnsending}
              onClick={async () => {
                const target = unsendTargetId;
                if (!target) return;
                setIsUnsending(true);
                try {
                  await onDeleteMessage(target);
                  setUnsendTargetId(null);
                } finally {
                  setIsUnsending(false);
                }
              }}
              className="text-xs h-8 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnsending ? "Unsending..." : "Unsend for Everyone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
