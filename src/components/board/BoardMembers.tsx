import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "@/services/boardApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserMinus01 as UserMinus,
  ShieldZap as ShieldAlert,
  Award01 as Crown,
  Shield01 as Shield,
  User01 as User,
  Eye,
  LogOut01 as LogOut,
  MessageChatSquare as MessageSquare,
  Send01 as Send,
  Mail01 as Mail,
} from "@untitledui/icons";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BoardMember, BoardRole } from "@/types/board";
import { useActivity } from "@/hooks/useActivity";
import { useBoards } from "@/hooks/useBoards";
import { useNavigate } from "react-router-dom";
import { useDevMode } from "@/contexts/DevModeContext";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";

interface BoardMembersProps {
  boardId: string;
}

export function BoardMembers({ boardId }: BoardMembersProps) {
  const navigate = useNavigate();
  const { devSettings } = useDevMode();
  const { user: currentUser } = useAuth();
  const { addActivity } = useActivity();
  const { boards } = useBoards();
  const currentBoard = boards.find((b) => b.id === boardId);
  const queryClient = useQueryClient();

  const [pendingOwnerPromotion, setPendingOwnerPromotion] = useState<{
    member: BoardMember;
    mode: "role_update" | "transfer_ownership";
  } | null>(null);
  const [confirmBoardName, setConfirmBoardName] = useState("");

  useEffect(() => {
    setConfirmBoardName("");
  }, [pendingOwnerPromotion]);

  const boardNameToConfirm = currentBoard?.name || "Board";
  const isOwnerPromotionConfirmed =
    Boolean(pendingOwnerPromotion) &&
    confirmBoardName.trim() === boardNameToConfirm.trim();

  const { data: members, isLoading } = useQuery({
    queryKey: ["boardMembers", boardId],
    queryFn: () => boardApi.getMembers(boardId),
  });

  const permissions = useBoardPermissions(currentBoard, members || []);

  const acceptedMembers = (members || []).filter(
    (m) => !m.status || m.status === "accepted"
  );
  const pendingMembers = (members || []).filter(
    (m) => m.status === "pending" || m.status === "expired"
  );
  const acceptedOwners = acceptedMembers.filter((m) => m.role === "owner");
  const ownerCount = acceptedOwners.length || (currentBoard?.ownerId ? 1 : 0);

  const removeMutation = useMutation({
    mutationFn: (userId: string) => boardApi.removeMember(boardId, userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      const isLeaving = userId === currentUser?.id;
      if (isLeaving) {
        toast.success(`You have left "${currentBoard?.name || "the board"}"`);
        navigate("/");
      } else {
        const removedUser = members?.find((m) => m.userId === userId);
        const userName = removedUser?.user?.fullName || removedUser?.user?.email || "User";
        addActivity("update", currentBoard?.name || "Board", `Removed member ${userName}`, boardId);
        toast.success("Member removed");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (targetId: string) => boardApi.revokeInvitation(boardId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      toast.success("Invitation revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke invitation");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      boardApi.updateMemberRole(boardId, data.userId, data.role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      const name = updated.user?.fullName || updated.user?.email || "Member";
      addActivity("update", currentBoard?.name || "Board", `Updated role of ${name} to ${updated.role}`, boardId);
      toast.success(`Role updated to ${updated.role}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (userId: string) => boardApi.resendInvite(boardId, userId),
    onSuccess: () => {
      toast.success("Invitation reminder resent");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (userId: string) => boardApi.transferOwnership(boardId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board ownership transferred successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to transfer ownership");
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "admin":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "editor":
      case "member":
        return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "commenter":
        return "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "viewer":
      default:
        return "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 text-amber-500 mr-1" />;
      case "admin":
        return <Shield className="h-3 w-3 text-blue-500 mr-1" />;
      case "editor":
      case "member":
        return <User className="h-3 w-3 text-emerald-500 mr-1" />;
      case "commenter":
        return <MessageSquare className="h-3 w-3 text-purple-500 mr-1" />;
      case "viewer":
      default:
        return <Eye className="h-3 w-3 text-slate-500 mr-1" />;
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground animate-pulse p-4">Loading members...</div>;
  }

  if (!members || members.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Avatars summary row */}
      <div className="flex -space-x-2 overflow-hidden items-center group">
        {acceptedMembers.map((member) => {
          const isCurrentUser =
            member.userId === currentUser?.id ||
            (currentUser?.email && member.user?.email === currentUser.email);
          const avatarUrl = isCurrentUser
            ? (currentUser?.avatarUrl ?? member.user?.avatarUrl)
            : member.user?.avatarUrl;

          return (
            <Avatar
              key={member.id}
              className="inline-block h-9 w-9 rounded-full ring-2 ring-background transition-transform hover:scale-110 hover:z-10 cursor-pointer shadow-sm"
              title={`${member.user?.fullName || member.user?.email || "Member"} (${member.role})`}
            >
              <AvatarImage src={avatarUrl} alt={member.user?.fullName || member.user?.email} />
              <AvatarFallback className="text-xs bg-muted font-bold">
                {member.user?.fullName?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>

      {/* Active Members detailed list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3 whitespace-nowrap">
          <ShieldAlert className="h-3.5 w-3.5 text-primary shrink-0" /> Active Board Members ({acceptedMembers.length})
        </h4>

        {acceptedMembers.map((member) => {
          const isMemberOwner = member.role === "owner";
          const isMemberAdmin = member.role === "admin";
          const isSelf = member.userId === currentUser?.id;
          const isSoleOwner = isMemberOwner && ownerCount <= 1;

          // Permission to change this member's role:
          // Owner can edit anyone (except sole owner demotion is blocked).
          // Admin can only edit Editor and below (not Admin, not Owner).
          const canEditThisMember =
            (permissions.isOwner && !isSoleOwner && !isSelf) ||
            (permissions.isAdmin && !permissions.isOwner && !isMemberOwner && !isMemberAdmin && !isSelf);

          // Permission to remove this member:
          // Owner can remove anyone (except sole owner).
          // Admin can only remove Editor and below.
          const canRemoveThisMember =
            (permissions.isOwner && !isSoleOwner && !isSelf) ||
            (permissions.isAdmin && !permissions.isOwner && !isMemberOwner && !isMemberAdmin && !isSelf);

          // Owner can transfer ownership to any other active accepted member
          const canTransferToThisMember =
            permissions.isOwner && !isSelf && !isMemberOwner && member.status === "accepted";

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/60 hover:border-border transition-all shadow-sm gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 border border-border/80 shrink-0">
                  <AvatarImage
                    src={isSelf ? (currentUser?.avatarUrl ?? member.user?.avatarUrl) : member.user?.avatarUrl}
                    alt={member.user?.fullName || member.user?.email}
                  />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {member.user?.fullName?.charAt(0).toUpperCase() || member.user?.email?.charAt(0).toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs md:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                    {member.user?.fullName || member.user?.email || "Member"}
                    {isSelf && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-black">
                        You
                      </span>
                    )}
                  </span>
                  {/* Show email only if available (redacted for commenter and viewer) */}
                  {permissions.canViewFullMemberList && member.user?.email && (
                    <span className="text-[11px] text-muted-foreground truncate">{member.user.email}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEditThisMember ? (
                  <Select
                    value={member.role}
                    onValueChange={(newRole) => {
                      if (newRole === "owner") {
                        setPendingOwnerPromotion({
                          member,
                          mode: "role_update",
                        });
                        return;
                      }
                      updateRoleMutation.mutate({ userId: member.userId || member.id, role: newRole });
                    }}
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs font-semibold capitalize bg-background/50 border-border/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {permissions.canGrantAdminOwner && (
                        <>
                          <SelectItem value="owner">
                            <span className="flex items-center text-xs">
                              {!devSettings.disableEmojiCustomization && "👑 "}Owner
                            </span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center text-xs">
                              {!devSettings.disableEmojiCustomization && "🛡️ "}Admin
                            </span>
                          </SelectItem>
                        </>
                      )}
                      <SelectItem value="editor">
                        <span className="flex items-center text-xs">
                          {!devSettings.disableEmojiCustomization && "✏️ "}Editor
                        </span>
                      </SelectItem>
                      <SelectItem value="commenter">
                        <span className="flex items-center text-xs">
                          {!devSettings.disableEmojiCustomization && "💬 "}Commenter
                        </span>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <span className="flex items-center text-xs">
                          {!devSettings.disableEmojiCustomization && "👁️ "}Viewer
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] font-bold py-1 px-2.5 flex items-center ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {getRoleIcon(member.role)}
                    {member.role === "member" ? "editor" : member.role}
                  </Badge>
                )}

                {/* Transfer Ownership button for Owner */}
                {canTransferToThisMember && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg gap-1"
                    title="Transfer board ownership"
                    onClick={() => {
                      setPendingOwnerPromotion({
                        member,
                        mode: "transfer_ownership",
                      });
                    }}
                    disabled={transferOwnershipMutation.isPending}
                  >
                    <Crown className="h-3 w-3 text-amber-500" />
                    <span className="whitespace-nowrap">Transfer Ownership</span>
                  </Button>
                )}

                {/* Remove member button */}
                {canRemoveThisMember && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    title="Remove member from board"
                    onClick={() => {
                      if (confirm(`Remove ${member.user?.fullName || member.user?.email || "this member"} from this board?`)) {
                        removeMutation.mutate(member.userId || member.id);
                      }
                    }}
                    disabled={removeMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}

                {/* Leave board button */}
                {isSelf && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 rounded-lg font-bold gap-1 cursor-pointer ${
                      isSoleOwner ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title={
                      isSoleOwner
                        ? "The last Owner cannot leave the board. Transfer ownership or delete the board."
                        : "Leave this board"
                    }
                    onClick={() => {
                      if (isSoleOwner) {
                        toast.error(
                          "A board must always have at least one Owner. Transfer ownership before leaving."
                        );
                        return;
                      }
                      if (confirm(`Are you sure you want to leave "${currentBoard?.name || "this board"}"?`)) {
                        removeMutation.mutate(member.userId);
                      }
                    }}
                    disabled={removeMutation.isPending || isSoleOwner}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Leave</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dedicated Invited Members / Pending Invitations Container */}
      {pendingMembers.length > 0 && (
        <div className="space-y-2.5 pt-4 border-t border-border/60" data-testid="board-invited-members-container">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3 whitespace-nowrap">
            <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Invited Members ({pendingMembers.length})
          </h4>

          {pendingMembers.map((member) => {
            const isSelf = member.userId === currentUser?.id;
            const canManage = permissions.isAdmin && !isSelf;
            const displayName = member.user?.fullName || member.user?.email || "Invited User";

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/60 hover:border-border transition-all shadow-sm gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 border border-border/80 shrink-0">
                    <AvatarImage
                      src={isSelf ? (currentUser?.avatarUrl ?? member.user?.avatarUrl) : member.user?.avatarUrl}
                      alt={displayName}
                    />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs md:text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                      {displayName}
                      {member.status === "pending" && (
                        <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                          Pending
                        </span>
                      )}
                      {member.status === "expired" && (
                        <span className="text-[9px] bg-destructive/15 text-destructive border border-destructive/30 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider">
                          Expired
                        </span>
                      )}
                    </span>
                    {permissions.canViewFullMemberList && member.user?.email && displayName !== member.user.email && (
                      <span className="text-[11px] text-muted-foreground truncate">{member.user.email}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`capitalize text-[11px] font-bold py-1 px-2.5 flex items-center ${getRoleColor(
                      member.role
                    )}`}
                  >
                    {getRoleIcon(member.role)}
                    {member.role === "member" ? "editor" : member.role}
                  </Badge>

                  {/* Resend invite for pending or expired members */}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg cursor-pointer"
                      title="Resend invitation"
                      onClick={() => resendInviteMutation.mutate(member.userId || member.id)}
                      disabled={resendInviteMutation.isPending}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Revoke invite for pending or expired members */}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      title="Revoke invitation"
                      onClick={() => {
                        const promptMsg = `Revoke invitation for ${displayName}?`;
                        if (confirm(promptMsg)) {
                          revokeInviteMutation.mutate(member.userId || member.id);
                        }
                      }}
                      disabled={revokeInviteMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer Ownership Confirmation with Type-to-Confirm */}
      <AlertDialog
        open={!!pendingOwnerPromotion}
        onOpenChange={(open) => {
          if (!open) {
            setPendingOwnerPromotion(null);
            setConfirmBoardName("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Transfer Ownership to{" "}
              {pendingOwnerPromotion?.member.user?.fullName ||
                pendingOwnerPromotion?.member.user?.email ||
                "this member"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transferring <span className="font-semibold text-foreground">Ownership</span> gives{" "}
              <span className="font-semibold text-foreground">
                {pendingOwnerPromotion?.member.user?.fullName ||
                  pendingOwnerPromotion?.member.user?.email ||
                  "this member"}
              </span>{" "}
              full control over this board, including managing owners and admins, modifying workflow
              states, and deleting the board. You will be stepped down to{" "}
              <span className="font-semibold text-foreground">Admin</span>. Please type{" "}
              <span className="font-semibold text-foreground">"{boardNameToConfirm}"</span> below to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder={boardNameToConfirm}
              value={confirmBoardName}
              onChange={(e) => setConfirmBoardName(e.target.value)}
              aria-label="Type board name to confirm owner promotion"
              data-testid="confirm-promote-owner-input"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !isOwnerPromotionConfirmed ||
                updateRoleMutation.isPending ||
                transferOwnershipMutation.isPending
              }
              data-testid="confirm-promote-owner-btn"
              className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none"
              onClick={(e) => {
                if (!isOwnerPromotionConfirmed || !pendingOwnerPromotion) {
                  e.preventDefault();
                  return;
                }
                const targetId =
                  pendingOwnerPromotion.member.userId || pendingOwnerPromotion.member.id;
                if (pendingOwnerPromotion.mode === "transfer_ownership") {
                  transferOwnershipMutation.mutate(targetId);
                } else {
                  updateRoleMutation.mutate({ userId: targetId, role: "owner" });
                }
                setPendingOwnerPromotion(null);
                setConfirmBoardName("");
              }}
            >
              Promote to Owner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
