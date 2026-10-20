import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { userApi } from "@/services/userApi";
import { messageApi } from "@/services/messageApi";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { BoardHeader } from "@/components/kanban/BoardHeader";
import { Board, BoardInvitation } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users01 as Users,
  Mail01 as Mail,
  Check,
  XClose as X,
  Shield01 as Shield,
  User01 as User,
  Eye,
  Edit01 as Edit,
  MessageChatSquare as MessageSquare,
  Plus,
  SearchLg as Search,
  LayoutGrid01 as LayoutGrid,
  Loading01 as Loader2,
  Stars01 as Sparkles,
  LinkExternal01 as ExternalLink,
  Send01 as Send,
  UserMinus01 as UserMinus,
  Clock,
} from "@untitledui/icons";
import { InviteMemberDialog } from "@/components/board/InviteMemberDialog";
import { toast } from "sonner";
import { TeamsPageSkeleton } from "@/components/skeletons";

export default function TeamsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { devSettings } = useDevMode();
  const { settings } = useSettings();

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
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  // Fetch Sent / Outgoing Pending Invitations
  const { data: sentInvitations = [] } = useQuery<BoardInvitation[]>({
    queryKey: ["sentInvitations"],
    queryFn: () => boardApi.getSentInvitations(),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
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

  // Resend / Revoke Sent Invitations
  const resendSentInviteMutation = useMutation({
    mutationFn: ({ boardId, inviteId }: { boardId: string; inviteId: string }) =>
      boardApi.resendInvite(boardId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
      toast.success("Invitation reminder resent");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to resend invitation");
    },
  });

  const revokeSentInviteMutation = useMutation({
    mutationFn: ({ boardId, inviteId }: { boardId: string; inviteId: string }) =>
      boardApi.revokeInvitation(boardId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["boardMembers"] });
      toast.success("Invitation revoked");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke invitation");
    },
  });

  // Start 1-on-1 Direct Chat
  const startChatMutation = useMutation({
    mutationFn: (participantId: string) =>
      messageApi.createConversation({
        type: "direct",
        recipientId: participantId,
      }),
    onSuccess: (conversation) => {
      navigate(`/messages/${conversation.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to start direct message");
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
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
      case "editor":
      case "member":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
            <Edit className="h-3 w-3 mr-1" /> Editor
          </Badge>
        );
      case "commenter":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px] font-bold">
            <MessageSquare className="h-3 w-3 mr-1" /> Commenter
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
            <Edit className="h-3 w-3 mr-1" /> Editor
          </Badge>
        );
    }
  };

  const filteredTeammates = teammates.filter(
    (t) =>
      t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  const canInviteToBoard = (b: Board) => {
    if (devSettings.simulatedRole && devSettings.simulatedRole !== "none") {
      return devSettings.simulatedRole === "admin" || devSettings.simulatedRole === "owner";
    }
    const role = b.role?.toLowerCase();
    const isOwner = Boolean(role === "owner" || (user?.id && b.ownerId === user.id));
    const isAdmin = role === "admin" || isOwner;
    return isAdmin;
  };

  const invitableBoards = boards.filter(canInviteToBoard);
  const canInviteAnywhere = invitableBoards.length > 0;

  const handleOpenInvite = (boardId?: string) => {
    if (boards.length === 0) {
      toast.error("Please create a board first.");
      return;
    }
    const targetBoardId = boardId || invitableBoards[0]?.id;
    if (!targetBoardId) {
      toast.error("You do not have permission to invite members to any boards.");
      return;
    }
    setSelectedBoardForInvite(targetBoardId);
    setIsInviteDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-background">
      <BoardHeader showSearch={false} />

      {isTeammatesLoading || settings.simulateSkeletonLoading ? (
        <TeamsPageSkeleton />
      ) : (
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

          {canInviteAnywhere && (
            <Button onClick={() => handleOpenInvite()} className="gap-1.5 font-semibold text-xs h-9 shadow-xs">
              <Plus className="h-4 w-4" />
              Invite Teammate
            </Button>
          )}
        </div>

        {/* 1. Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 shadow-xs space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-[11px] sm:text-sm font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
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
                    {!devSettings.disableEmojiCustomization && invite.board.emoji && (
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20 text-primary">
                        {invite.board.emoji}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground truncate">
                          {invite.board.name}
                        </h4>
                        {getRoleBadge(invite.role)}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Invited by <span className="font-semibold text-foreground">{invite.board.ownerName || "Owner"}</span>
                        {invite.expiresAt && (
                          <span className="ml-1.5 opacity-80">
                            • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        )}
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

        {/* Outgoing / Sent Teammate Invitations */}
        {sentInvitations.length > 0 && (
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4 animate-in fade-in" data-testid="sent-invitations-container">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-xs font-bold">
                  <Send className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-[11px] sm:text-sm font-bold uppercase tracking-wider text-foreground whitespace-nowrap">
                  Pending Teammate Invitations ({sentInvitations.length})
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Awaiting acceptance by invited collaborators
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sentInvitations.map((invite) => {
                const initial = (invite.email || "U").charAt(0).toUpperCase();
                const isResending =
                  resendSentInviteMutation.isPending &&
                  resendSentInviteMutation.variables?.inviteId === invite.id;
                const isRevoking =
                  revokeSentInviteMutation.isPending &&
                  revokeSentInviteMutation.variables?.inviteId === invite.id;

                return (
                  <div
                    key={invite.id}
                    data-testid={`sent-invite-${invite.id}`}
                    className="p-4 rounded-xl bg-background/50 border border-border/70 hover:border-border shadow-xs flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 border border-primary/20 shrink-0">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground truncate">
                              {invite.email}
                            </span>
                            {getRoleBadge(invite.role)}
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30"
                            >
                              Pending
                            </Badge>
                          </div>
                          {invite.expiresAt && (
                            <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Board association chip & quick actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 mt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/boards/${invite.boardId}`)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground transition-colors max-w-[200px] truncate group cursor-pointer"
                        title={`Go to ${invite.board?.name || "Board"}`}
                      >
                        {!devSettings.disableEmojiCustomization && invite.board?.emoji && (
                          <span className="text-sm shrink-0">{invite.board.emoji}</span>
                        )}
                        <span className="truncate group-hover:text-primary transition-colors">
                          {invite.board?.name || "Board"}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            resendSentInviteMutation.mutate({
                              boardId: invite.boardId,
                              inviteId: invite.id,
                            })
                          }
                          disabled={isResending || isRevoking}
                          className="h-7 px-2.5 text-xs font-medium gap-1 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Resend invitation email reminder"
                        >
                          {isResending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Resend</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Revoke invitation for ${invite.email}?`)) {
                              revokeSentInviteMutation.mutate({
                                boardId: invite.boardId,
                                inviteId: invite.id,
                              });
                            }
                          }}
                          disabled={isResending || isRevoking}
                          className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Revoke invitation"
                        >
                          {isRevoking ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Revoke</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Workspace Boards & Role Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 whitespace-nowrap">
              <LayoutGrid className="h-4 w-4 text-primary shrink-0" />
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
                  {!devSettings.disableEmojiCustomization && b.emoji && (
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0 border border-primary/20 text-primary">
                      {b.emoji}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate" title={b.name}>
                      {b.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap truncate">
                      {b.taskCount || 0} tasks • Role: {b.role || "member"}
                    </span>
                  </div>
                </div>

                {canInviteToBoard(b) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInvite(b.id);
                    }}
                    className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1 shrink-0" /> Invite
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Collaborators & Teammates Directory */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 whitespace-nowrap">
              <Users className="h-4 w-4 text-primary shrink-0" />
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
            search.trim() ? (
              <div className="p-12 text-center rounded-2xl bg-card border border-border/60 text-muted-foreground text-xs space-y-3">
                <p>No teammates found matching &quot;{search}&quot;.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="h-7 text-xs font-semibold cursor-pointer"
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-card border border-border/60 flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-sm text-center">
                  <h3 className="text-sm font-bold text-foreground">No teammates found</h3>
                  <p className="text-xs text-muted-foreground">
                    Invite colleagues and collaborators to your workspace boards to start working together.
                  </p>
                </div>
                {canInviteAnywhere && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenInvite()}
                    className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Invite Teammate
                  </Button>
                )}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeammates.map((teammate) => (
                <div
                  key={teammate.id}
                  className="p-5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {(() => {
                      const isCurrentUser =
                        teammate.id === user?.id ||
                        (user?.email && teammate.email === user.email);
                      const avatarUrl = isCurrentUser
                        ? (user?.avatarUrl ?? teammate.avatarUrl)
                        : teammate.avatarUrl;

                      return (
                        <Avatar className="h-11 w-11 border border-border/60 shrink-0">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {(teammate.fullName?.charAt(0) || teammate.email?.charAt(0) || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })()}

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
                            className="text-[10px] px-1.5 py-0 font-medium inline-flex items-center gap-1"
                          >
                            {!devSettings.disableEmojiCustomization && (
                              <span>{sb.emoji || "📋"}</span>
                            )}
                            <span>{sb.name}</span>
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
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        boardId={selectedBoardForInvite || (boards[0]?.id ?? "")}
        onInvited={() => {
          queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
          queryClient.invalidateQueries({ queryKey: ["teammates"] });
          queryClient.invalidateQueries({ queryKey: ["boards"] });
        }}
      />
    </div>
  );
}
