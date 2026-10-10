import { useMemo } from "react";
import { Board, BoardMember, BoardRole } from "@/types/board";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";

export interface BoardPermissions {
  role: BoardRole;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isCommenter: boolean;
  isViewer: boolean;
  isMember: boolean;
  // Board management
  canEditBoard: boolean;
  canExportBoard: boolean;
  canManageBilling: boolean;
  canTransferOwnership: boolean;
  canDeleteBoard: boolean;
  canLeaveBoard: boolean;
  // Members and invites
  canViewFullMemberList: boolean;
  canInviteMembers: boolean;
  canRevokeInvites: boolean;
  canGrantAdminOwner: boolean;
  canGrantEditorCommenter: boolean;
  canManageMembers: boolean;
  // Columns
  canManageColumns: boolean;
  canDeleteColumn: boolean;
  // Cards
  canCreateTask: boolean;
  canEditTask: boolean;
  canMoveTask: boolean;
  canAssignTask: boolean;
  canArchiveTask: boolean;
  canDeleteTask: boolean; // soft delete, goes to trash
  canViewTrash: boolean;
  canRestoreTask: boolean;
  canPurgeTask: boolean;
  // Comments and mentions
  canComment: boolean;
  canDeleteAnyComment: boolean;
  // Attachments and activity
  canUploadAttachment: boolean;
  canDeleteAnyAttachment: boolean;
  canViewBoardActivity: boolean;
  canMoveCrossBoard: boolean;
  isReadOnly: boolean;
  isSimulated?: boolean;
}

export function useBoardPermissions(
  board?: Board | null,
  members: BoardMember[] = []
): BoardPermissions {
  const { user } = useAuth();
  const { devSettings } = useDevMode();

  return useMemo(() => {
    // Count owners on the board
    const acceptedOwners = new Set<string>();
    if (board?.ownerId) acceptedOwners.add(String(board.ownerId));
    members.forEach((m) => {
      if (m.role === "owner" && m.status === "accepted" && m.userId) {
        acceptedOwners.add(String(m.userId));
      }
    });
    const ownerCount = acceptedOwners.size || (board?.ownerId ? 1 : 0);

    // Dev Mode Role Spoofing
    if (devSettings.simulatedRole && devSettings.simulatedRole !== "none") {
      const role = devSettings.simulatedRole as BoardRole;
      const isOwner = role === "owner";
      const isAdmin = role === "admin" || isOwner;
      const isEditor = role === "editor" || role === "member" || isAdmin;
      const isCommenter = role === "commenter" || isEditor;
      const isViewer = role === "viewer";

      return {
        role,
        isOwner,
        isAdmin,
        isEditor,
        isCommenter,
        isViewer,
        isMember: isEditor,
        canEditBoard: isAdmin,
        canExportBoard: isAdmin,
        canManageBilling: isOwner,
        canTransferOwnership: isOwner,
        canDeleteBoard: isOwner,
        canLeaveBoard: isOwner ? ownerCount > 1 : true,
        canViewFullMemberList: isEditor,
        canInviteMembers: isAdmin,
        canRevokeInvites: isAdmin,
        canGrantAdminOwner: isOwner,
        canGrantEditorCommenter: isAdmin,
        canManageMembers: isAdmin,
        canManageColumns: isAdmin,
        canDeleteColumn: isAdmin,
        canCreateTask: isEditor,
        canEditTask: isEditor,
        canMoveTask: isEditor,
        canAssignTask: isEditor,
        canArchiveTask: isEditor,
        canDeleteTask: isEditor,
        canViewTrash: isEditor,
        canRestoreTask: isEditor,
        canPurgeTask: isAdmin,
        canComment: isCommenter,
        canDeleteAnyComment: isAdmin,
        canUploadAttachment: isEditor,
        canDeleteAnyAttachment: isAdmin,
        canViewBoardActivity: isAdmin,
        canMoveCrossBoard: isEditor,
        isReadOnly: !isEditor,
        isSimulated: true,
      };
    }

    if (!user || !board) {
      return {
        role: "viewer",
        isOwner: false,
        isAdmin: false,
        isEditor: false,
        isCommenter: false,
        isViewer: true,
        isMember: false,
        canEditBoard: false,
        canExportBoard: false,
        canManageBilling: false,
        canTransferOwnership: false,
        canDeleteBoard: false,
        canLeaveBoard: false,
        canViewFullMemberList: false,
        canInviteMembers: false,
        canRevokeInvites: false,
        canGrantAdminOwner: false,
        canGrantEditorCommenter: false,
        canManageMembers: false,
        canManageColumns: false,
        canDeleteColumn: false,
        canCreateTask: false,
        canEditTask: false,
        canMoveTask: false,
        canAssignTask: false,
        canArchiveTask: false,
        canDeleteTask: false,
        canViewTrash: false,
        canRestoreTask: false,
        canPurgeTask: false,
        canComment: false,
        canDeleteAnyComment: false,
        canUploadAttachment: false,
        canDeleteAnyAttachment: false,
        canViewBoardActivity: false,
        canMoveCrossBoard: false,
        isReadOnly: true,
      };
    }

    // Check if user is board owner
    const isDirectOwner = Boolean(board.ownerId && user?.id && String(board.ownerId) === String(user.id));
    const membership = members.find((m) => Boolean(m.userId && user?.id && String(m.userId) === String(user.id)));

    let role: BoardRole = "viewer";
    if (isDirectOwner || membership?.role === "owner") {
      role = "owner";
    } else if (membership?.role) {
      role = membership.role;
    }

    const isOwner = role === "owner";
    const isAdmin = role === "admin" || isOwner;
    const isEditor = role === "editor" || role === "member" || isAdmin;
    const isCommenter = role === "commenter" || isEditor;
    const isViewer = role === "viewer";

    return {
      role,
      isOwner,
      isAdmin,
      isEditor,
      isCommenter,
      isViewer,
      isMember: isEditor,
      canEditBoard: isAdmin,
      canExportBoard: isAdmin,
      canManageBilling: isOwner,
      canTransferOwnership: isOwner,
      canDeleteBoard: isOwner,
      canLeaveBoard: isOwner ? ownerCount > 1 : true,
      canViewFullMemberList: isEditor,
      canInviteMembers: isAdmin,
      canRevokeInvites: isAdmin,
      canGrantAdminOwner: isOwner,
      canGrantEditorCommenter: isAdmin,
      canManageMembers: isAdmin,
      canManageColumns: isAdmin,
      canDeleteColumn: isAdmin,
      canCreateTask: isEditor,
      canEditTask: isEditor,
      canMoveTask: isEditor,
      canAssignTask: isEditor,
      canArchiveTask: isEditor,
      canDeleteTask: isEditor,
      canViewTrash: isEditor,
      canRestoreTask: isEditor,
      canPurgeTask: isAdmin,
      canComment: isCommenter,
      canDeleteAnyComment: isAdmin,
      canUploadAttachment: isEditor,
      canDeleteAnyAttachment: isAdmin,
      canViewBoardActivity: isAdmin,
      canMoveCrossBoard: isEditor,
      isReadOnly: !isEditor,
      isSimulated: false,
    };
  }, [user, board, members, devSettings.simulatedRole]);
}

