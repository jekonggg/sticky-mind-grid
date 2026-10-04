import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { userApi } from "@/services/userApi";
import { messageApi } from "@/services/messageApi";
import { useAuth } from "@/contexts/AuthContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Board, BoardInvitation } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Mail,
  Check,
  X,
  Shield,
  User,
  Eye,
  MessageSquare,
  Plus,
  Search,
  LayoutGrid,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { InviteMemberDialog } from "@/components/board/InviteMemberDialog";
import { toast } from "sonner";

export default function TeamsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedBoardForInvite, setSelectedBoardForInvite] = useState<string>("");

  // Fetch Boards
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => boardApi.getBoards(),
  });

  // Fetch Pending Invitations
  const { data: invitations = [] } = useQuery<BoardInvitation[]>({
    queryKey: ["pendingInvitations"],
    queryFn: () => boardApi.getPendingInvitations(),
    refetchInterval: 6000,
  });

  // Fetch Teammates
  const { data: teammates = [], isLoading: isTeammatesLoading } = useQuery({
    queryKey: ["teammates"],
    queryFn: () => userApi.getTeammates(),
  });

  // Accept/Decline Invitations
  const acceptMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.acceptInvitation(boardId),
    onSuccess: (data, boardId) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["teammates"] });
      toast.success("Invitation accepted!");
      navigate(`/boards/${boardId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept invitation");
    },
  });

  const declineMutation = useMutation({
    mutationFn: (boardId: string) => boardApi.declineInvitation(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      toast.info("Invitation declined");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to decline invitation");
    },
  });

  // Start 1-on-1 Direct Chat
  const startChatMutation = useMutation({
    mutationFn: (participantId: string) =>
      messageApi.createConversation({
        type: "direct",
        participantIds: [participantId],
      }),
    onSuccess: (conversation) => {
      navigate(`/messages/${conversation.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start direct message");
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
            <Shield className="h-3 w-3 mr-1" /> Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-bold">
            <Shield className="h-3 w-3 mr-1" /> Admin
          </Badge>
        );
      case "viewer":
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/30 text-[10px] font-bold">
            <Eye className="h-3 w-3 mr-1" /> Viewer
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
            <User className="h-3 w-3 mr-1" /> Member
          </Badge>
        );
    }
  };

  const filteredTeammates = teammates.filter(
    (t) =>
      t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenInvite = (boardId?: string) => {
    if (boards.length === 0) {
      toast.error("Please create a board first.");
      return;
    }
    setSelectedBoardForInvite(boardId || boards[0].id);
    setIsInviteDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
      <BoardHeader showSearch={false} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Users className="h-4 w-4" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Teams & Collaborators
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage workspace members, pending invitations, and board permissions
            </p>
          </div>

          <Button onClick={() => handleOpenInvite()} className="gap-1.5 font-semibold text-xs h-9 shadow-xs">
            <Plus className="h-4 w-4" />
            Invite Teammate
          </Button>
        </div>

        {/* 1. Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 shadow-xs space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Pending Board Invitations ({invitations.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-card p-4 rounded-xl border border-border/80 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20">
                      {invite.board.emoji || "📋"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate">
                          {invite.board.name}
                        </h4>
                        {getRoleBadge(invite.role)}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Invited by <span className="font-semibold text-foreground">{invite.board.ownerName || "Owner"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate(invite.boardId)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="h-8 px-3 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs"
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineMutation.mutate(invite.boardId)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="h-8 px-2.5 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {declineMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Workspace Boards & Role Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" />
              Workspace Boards ({boards.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => (
              <div
                key={b.id}
                onClick={() => navigate(`/boards/${b.id}`)}
                className="p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20">
                    {b.emoji || "📋"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {b.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {b.taskCount || 0} tasks • Role: {b.role || "member"}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInvite(b.id);
                  }}
                  className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3 mr-1" /> Invite
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Collaborators & Teammates Directory */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Collaborator Directory ({teammates.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search teammates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-card border-border/60"
              />
            </div>
          </div>

          {filteredTeammates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border/60 text-muted-foreground text-xs">
              No teammates found matching "{search}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeammates.map((teammate) => (
                <div
                  key={teammate.id}
                  className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-11 w-11 border border-border/60 shrink-0">
                      <AvatarImage src={teammate.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(teammate.fullName?.charAt(0) || teammate.email?.charAt(0) || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-foreground truncate">
                        {teammate.fullName || teammate.email?.split("@")[0]}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {teammate.email}
                      </span>
                      <div className="mt-1">
                        {getRoleBadge(teammate.role)}
                      </div>
                    </div>
                  </div>

                  {/* Shared Boards List */}
                  {teammate.sharedBoards && teammate.sharedBoards.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                        Shared Boards:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {teammate.sharedBoards.slice(0, 3).map((sb) => (
                          <Badge
                            key={sb.id}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-medium"
                          >
                            {sb.emoji || "📋"} {sb.name}
                          </Badge>
                        ))}
                        {teammate.sharedBoards.length > 3 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            +{teammate.sharedBoards.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1-click Direct Message Action */}
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startChatMutation.mutate(teammate.id)}
                      disabled={startChatMutation.isPending}
                      className="w-full h-8 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Direct Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        boardId={selectedBoardForInvite || (boards[0]?.id ?? "")}
        onInvited={() => {
          queryClient.invalidateQueries({ queryKey: ["teammates"] });
          queryClient.invalidateQueries({ queryKey: ["boards"] });
        }}
      />
    </div>
  );
}
