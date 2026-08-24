import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "@/services/commentApi";
import { Comment } from "@/types/task";
import { BoardMember } from "@/types/board";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2, AtSign, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface TaskCommentsProps {
  taskId: string;
  boardMembers: BoardMember[];
  readOnly?: boolean;
}

export function TaskComments({ taskId, boardMembers, readOnly }: TaskCommentsProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["taskComments", taskId],
    queryFn: () => commentApi.getComments(taskId),
    enabled: !!taskId,
  });

  const addMutation = useMutation({
    mutationFn: (text: string) => commentApi.addComment(taskId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskComments", taskId] });
      setContent("");
      setMentionQuery(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to post comment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => commentApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskComments", taskId] });
      toast.success("Comment deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete comment");
    },
  });

  // Handle @mention detection in input text
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setContent(val);
    setCursorPos(pos);

    // Look for @ prefix before current cursor position
    const textBeforeCursor = val.slice(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      // Only suggest if no space after @ or minimal space
      if (!query.includes(" ") || query.length < 15) {
        setMentionQuery(query.toLowerCase());
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (member: BoardMember) => {
    const name = member.user?.fullName || member.user?.email || "user";
    const textBeforeCursor = content.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const before = content.slice(0, lastAtIndex);
      const after = content.slice(cursorPos);
      const newText = `${before}@${name} ${after}`;
      setContent(newText);
      setMentionQuery(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const filteredMembers = mentionQuery !== null
    ? boardMembers.filter((m) => {
        const name = (m.user?.fullName || "").toLowerCase();
        const email = (m.user?.email || "").toLowerCase();
        return name.includes(mentionQuery) || email.includes(mentionQuery);
      })
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addMutation.mutate(content.trim());
  };

  // Render comment text highlighting @mentions
  const renderFormattedContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9._\-\s]+?(?=\s|$|[.,!?]))/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="inline-flex items-center font-bold text-primary bg-primary/10 px-1 py-0.2 rounded text-[11px]"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-primary" /> Discussion ({comments.length})
        </span>
      </div>

      {/* Comments List */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
            No comments yet. Start the discussion below!
          </div>
        ) : (
          comments.map((c) => {
            const authorName = c.user?.fullName || c.user?.email || "User";
            const initial = (c.user?.fullName || c.user?.email || "U").charAt(0).toUpperCase();
            const isOwn = c.userId === currentUser?.id;

            return (
              <div
                key={c.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs group/comment relative"
              >
                <Avatar className="h-7 w-7 border border-primary/20 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-foreground truncate">{authorName}</span>
                      {isOwn && (
                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {renderFormattedContent(c.content)}
                  </div>
                </div>

                {!readOnly && isOwn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this comment?")) deleteMutation.mutate(c.id);
                    }}
                    className="h-6 w-6 opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Comment Composer */}
      {!readOnly && (
        <div className="space-y-2 relative pt-1">
          {/* @Mentions Autocomplete Popover */}
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 bg-popover text-popover-foreground rounded-xl border border-border/80 shadow-xl overflow-hidden max-h-36 overflow-y-auto">
              <div className="p-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 py-0.5 block">
                  Mention Team Member
                </span>
                {filteredMembers.map((m) => {
                  const name = m.user?.fullName || m.user?.email || "Member";
                  const initial = (m.user?.fullName || m.user?.email || "U").charAt(0).toUpperCase();
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => handleSelectMention(m)}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted text-left transition-colors cursor-pointer"
                    >
                      <Avatar className="h-5 w-5 border border-primary/20 shrink-0">
                        <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto truncate">
                        {m.user?.email}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Write a comment... (Type @ to mention team members)"
              value={content}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={2}
              className="resize-none text-xs pr-16 bg-background/50 border-border/60"
            />
            <Button
              type="button"
              onClick={handleSubmit}
              size="sm"
              disabled={addMutation.isPending || !content.trim()}
              className="absolute right-2 bottom-2 h-7 px-2.5 gap-1 text-xs font-bold"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1">
              <AtSign className="h-3 w-3 text-primary" /> Type @ to tag member
            </span>
            <span>Ctrl + Enter to send</span>
          </div>
        </div>
      )}
    </div>
  );
}
