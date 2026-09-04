import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, UserPlus, Users, MessageSquare, Loader2, Check } from "lucide-react";
import { authApi } from "@/services/authApi";
import { useAuth } from "@/contexts/AuthContext";
import { messageApi } from "@/services/messageApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CONVERSATIONS_QUERY_KEY } from "@/hooks/useMessages";
import { toast } from "sonner";
import { User } from "@/types/user";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
}

export function NewChatModal({
  open,
  onOpenChange,
  onSelectConversation,
}: NewChatModalProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group creation states
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<User[]>([]);

  // Search users debounce
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setGroupTitle("");
      setSelectedGroupUsers([]);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await authApi.searchUsers(searchQuery.trim());
        // Filter out current user from selectable list
        const filtered = results.filter((u: User) => u.id !== currentUser?.id);
        setSearchResults(filtered);
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, open, currentUser?.id]);

  // Direct Conversation Mutation
  const createDirectMutation = useMutation({
    mutationFn: (recipientId: string) =>
      messageApi.createConversation({ type: "direct", recipientId }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      onOpenChange(false);
      onSelectConversation(conv.id);
      toast.success(`Chat opened with ${conv.displayTitle}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start direct conversation");
    },
  });

  // Group Conversation Mutation
  const createGroupMutation = useMutation({
    mutationFn: () => {
      if (!groupTitle.trim()) throw new Error("Group name is required");
      if (selectedGroupUsers.length === 0) throw new Error("Select at least one member");
      return messageApi.createConversation({
        type: "group",
        title: groupTitle.trim(),
        participantIds: selectedGroupUsers.map((u) => u.id),
      });
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      onOpenChange(false);
      onSelectConversation(conv.id);
      toast.success(`Group "${conv.displayTitle}" created!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create group");
    },
  });

  const toggleUserInGroup = (user: User) => {
    setSelectedGroupUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/70 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/40">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>New Conversation</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Start a direct message with a teammate or create a team group chat.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "direct" | "group")} className="w-full">
          <div className="px-5 pt-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="direct" className="text-xs flex items-center gap-1.5 rounded-lg py-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Direct Message</span>
              </TabsTrigger>
              <TabsTrigger value="group" className="text-xs flex items-center gap-1.5 rounded-lg py-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Group Chat</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: DIRECT MESSAGE */}
          <TabsContent value="direct" className="p-5 pt-3 space-y-4 focus-visible:outline-none">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-border/60 text-xs rounded-xl focus-visible:ring-primary h-9"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-primary animate-spin" />
              )}
            </div>

            <ScrollArea className="h-56 pr-2">
              {searchQuery.trim().length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <Search className="h-8 w-8 text-muted-foreground/40 stroke-[1.5]" />
                  <p className="text-xs">Type a name or email address above to find people.</p>
                </div>
              ) : searchResults.length === 0 && !isSearching ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-2">
                  <p className="text-xs">No users found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((user) => {
                    const initial = user.fullName?.charAt(0) || user.email?.charAt(0) || "U";
                    const isPending = createDirectMutation.isPending;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => createDirectMutation.mutate(user.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border border-border/60 shrink-0">
                            <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initial.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {user.fullName || "Unnamed User"}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground rounded-lg transition-colors shrink-0"
                        >
                          Chat
                        </Button>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* TAB: GROUP CHAT */}
          <TabsContent value="group" className="p-5 pt-3 space-y-4 focus-visible:outline-none">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Group Name
                </label>
                <Input
                  placeholder="e.g. Design Team, Sprint 24..."
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  className="bg-muted/40 border-border/60 text-xs rounded-xl focus-visible:ring-primary h-9"
                />
              </div>

              {/* Selected users chips */}
              {selectedGroupUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border border-border/40 rounded-xl max-h-20 overflow-y-auto">
                  {selectedGroupUsers.map((u) => (
                    <Badge
                      key={u.id}
                      variant="secondary"
                      className="text-[11px] font-medium pl-2 pr-1 py-0.5 flex items-center gap-1 rounded-lg bg-background border border-border/60"
                    >
                      <span className="truncate max-w-[120px]">{u.fullName || u.email}</span>
                      <button
                        type="button"
                        onClick={() => toggleUserInGroup(u)}
                        className="hover:text-destructive text-muted-foreground font-bold px-1 rounded"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search participants */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/40 border-border/60 text-xs rounded-xl focus-visible:ring-primary h-9"
                />
              </div>
            </div>

            <ScrollArea className="h-44 pr-2">
              {searchQuery.trim().length === 0 && selectedGroupUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-1.5">
                  <Users className="h-7 w-7 text-muted-foreground/40 stroke-[1.5]" />
                  <p className="text-xs">Search and select members to add to the group.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((user) => {
                    const isSelected = selectedGroupUsers.some((u) => u.id === user.id);
                    const initial = user.fullName?.charAt(0) || user.email?.charAt(0) || "U";
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserInGroup(user)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary/30"
                            : "hover:bg-muted/50 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 border border-border/60 shrink-0">
                            <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initial.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {user.fullName || "Unnamed User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>

                        <div className="pr-1">
                          <div
                            className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border/80 bg-background"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="pt-2 border-t border-border/40 flex items-center justify-between sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedGroupUsers.length} member{selectedGroupUsers.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                type="button"
                disabled={!groupTitle.trim() || selectedGroupUsers.length === 0 || createGroupMutation.isPending}
                onClick={() => createGroupMutation.mutate()}
                className="text-xs h-8 px-4 rounded-xl shadow-xs"
              >
                {createGroupMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                )}
                Create Group
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
