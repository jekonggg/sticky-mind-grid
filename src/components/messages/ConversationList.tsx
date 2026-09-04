import React, { useState } from "react";
import { Conversation } from "@/types/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onOpenNewChat: () => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "direct" | "group">("all");

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const filteredConversations = conversations.filter((conv) => {
    if (filterTab !== "all" && conv.type !== filterTab) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = conv.displayTitle?.toLowerCase().includes(q);
      const matchSnippet = conv.lastMessagePreview?.toLowerCase().includes(q);
      const matchEmail = conv.otherUser?.email?.toLowerCase().includes(q);
      return matchTitle || matchSnippet || matchEmail;
    }
    return true;
  });

  return (
    <div className="w-full md:w-80 h-full flex flex-col bg-card/95 border-r border-border/60 shrink-0 select-none">
      {/* 1. HEADER */}
      <div className="p-3 border-b border-border/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Messages</h2>
          </div>

          <Button
            size="sm"
            onClick={onOpenNewChat}
            className="h-7 text-xs px-2.5 rounded-xl bg-primary text-primary-foreground shadow-2xs gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-muted/40 border-border/60 text-xs rounded-xl h-8 focus-visible:ring-primary"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filterTab}
          onValueChange={(v) => setFilterTab(v as "all" | "direct" | "group")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-0.5 rounded-xl h-7">
            <TabsTrigger value="all" className="text-[11px] py-1 rounded-lg">
              All
            </TabsTrigger>
            <TabsTrigger value="direct" className="text-[11px] py-1 rounded-lg">
              Direct
            </TabsTrigger>
            <TabsTrigger value="group" className="text-[11px] py-1 rounded-lg">
              Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 2. CONVERSATION LIST */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
        {isLoading && conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 stroke-[1.5]" />
            <p className="text-xs font-semibold text-foreground">No conversations</p>
            <p className="text-[11px] text-muted-foreground">
              {search.trim()
                ? "No chats matched your search."
                : "Start a new conversation with your teammates."}
            </p>
            {!search.trim() && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNewChat}
                className="text-xs h-7 rounded-xl mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Start Chat
              </Button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const hasUnread = (conv.unreadCount || 0) > 0;
            const initial = (conv.displayTitle?.charAt(0) || "C").toUpperCase();

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left cursor-pointer group relative ${
                  isActive
                    ? "bg-primary/10 text-foreground border border-primary/25 shadow-2xs"
                    : "hover:bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.type === "group" ? (
                    <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-2xs">
                      <Users className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar className="h-10 w-10 border border-border/60 shadow-2xs">
                      <AvatarImage
                        src={conv.displayAvatar || conv.otherUser?.avatarUrl || undefined}
                        alt={conv.displayTitle}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {conv.type === "direct" && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>

                {/* Info and Preview */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        hasUnread || isActive ? "font-bold text-foreground" : "font-semibold"
                      }`}
                    >
                      {conv.displayTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatTimestamp(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[11px] truncate leading-tight ${
                        hasUnread
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.lastMessagePreview || "No messages yet"}
                    </span>

                    {hasUnread && (
                      <Badge className="h-4 px-1.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
