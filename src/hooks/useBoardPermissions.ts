import { useMemo } from "react";
import { Board, BoardMember, BoardRole } from "@/types/board";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";

export interface BoardPermissions {
  role: BoardRole;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  canEditBoard: boolean;
  canDeleteBoard: boolean;
  canManageMembers: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canMoveTask: boolean;
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
    // Dev Mode Role Spoofing
    if (devSettings.simulatedRole && devSettings.simulatedRole !== "none") {
      const role = devSettings.simulatedRole as BoardRole;
      const isOwner = role === "owner";
      const isAdmin = role === "admin" || isOwner;
      const isMember = role === "member" || isAdmin;
      const isViewer = role === "viewer";

      return {
        role,
        isOwner,
        isAdmin,
        isMember,
        isViewer,
        canEditBoard: isAdmin,
        canDeleteBoard: isOwner,
        canManageMembers: isAdmin,
        canCreateTask: isMember,
        canEditTask: isMember,
        canDeleteTask: isMember,
        canMoveTask: isMember,
        isReadOnly: isViewer,
        isSimulated: true,
      };
    }
    if (!user || !board) {
      return {
        role: "viewer",
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isViewer: true,
        canEditBoard: false,
        canDeleteBoard: false,
        canManageMembers: false,
        canCreateTask: false,
        canEditTask: false,
        canDeleteTask: false,
        canMoveTask: false,
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
    const isMember = role === "member" || isAdmin;
    const isViewer = role === "viewer";

    return {
      role,
      isOwner,
      isAdmin,
      isMember,
      isViewer,
      canEditBoard: isAdmin,
      canDeleteBoard: isOwner,
      canManageMembers: isAdmin,
      canCreateTask: isMember,
      canEditTask: isMember,
      canDeleteTask: isMember,
      canMoveTask: isMember,
      isReadOnly: isViewer,
      isSimulated: false,
    };
  }, [user, board, members, devSettings.simulatedRole]);
}
