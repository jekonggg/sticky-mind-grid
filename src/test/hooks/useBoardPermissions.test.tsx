import { renderHook } from "@testing-library/react";
import React, { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { Board, BoardMember } from "@/types/board";
import { User } from "@/types/user";

const testUser: User = {
  id: "user-owner-1",
  email: "owner@example.com",
  fullName: "Owner User",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function createWrapper(user: User | null) {
  const authValue: AuthContextType = {
    user,
    token: user ? "mock-token" : null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        {children}
      </AuthContext.Provider>
    );
  };
}

const mockBoard: Board = {
  id: "board-123",
  name: "Test Board",
  description: "Test description",
  color: "hsl(220, 80%, 60%)",
  columns: [],
  ownerId: "user-owner-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("useBoardPermissions hook", () => {
  it("returns read-only viewer defaults when user is null", () => {
    const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
      wrapper: createWrapper(null),
    });

    expect(result.current.role).toBe("viewer");
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.canCreateTask).toBe(false);
    expect(result.current.canEditBoard).toBe(false);
    expect(result.current.canComment).toBe(false);
  });

  it("returns read-only viewer defaults when board is null", () => {
    const { result } = renderHook(() => useBoardPermissions(null, []), {
      wrapper: createWrapper(testUser),
    });

    expect(result.current.role).toBe("viewer");
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canComment).toBe(false);
  });

  it("correctly identifies direct board owner with full capabilities", () => {
    const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
      wrapper: createWrapper(testUser),
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isEditor).toBe(true);
    expect(result.current.isCommenter).toBe(true);
    expect(result.current.isViewer).toBe(false);

    // Board Management
    expect(result.current.canEditBoard).toBe(true);
    expect(result.current.canExportBoard).toBe(true);
    expect(result.current.canManageBilling).toBe(true);
    expect(result.current.canTransferOwnership).toBe(true);
    expect(result.current.canDeleteBoard).toBe(true);
    expect(result.current.canLeaveBoard).toBe(false); // Sole owner cannot leave

    // Members & Invites
    expect(result.current.canViewFullMemberList).toBe(true);
    expect(result.current.canInviteMembers).toBe(true);
    expect(result.current.canRevokeInvites).toBe(true);
    expect(result.current.canGrantAdminOwner).toBe(true);
    expect(result.current.canGrantEditorCommenter).toBe(true);
    expect(result.current.canManageMembers).toBe(true);

    // Columns
    expect(result.current.canManageColumns).toBe(true);
    expect(result.current.canDeleteColumn).toBe(true);

    // Cards & Comments
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.canEditTask).toBe(true);
    expect(result.current.canMoveTask).toBe(true);
    expect(result.current.canAssignTask).toBe(true);
    expect(result.current.canArchiveTask).toBe(true);
    expect(result.current.canDeleteTask).toBe(true); // Soft delete goes to trash
    expect(result.current.canViewTrash).toBe(true);
    expect(result.current.canRestoreTask).toBe(true);
    expect(result.current.canPurgeTask).toBe(true); // Purge permanently
    expect(result.current.canComment).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("allows owner to leave if another owner exists", () => {
    const members: BoardMember[] = [
      {
        id: "mem-1",
        boardId: "board-123",
        userId: "user-owner-1",
        role: "owner",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
      {
        id: "mem-2",
        boardId: "board-123",
        userId: "user-owner-2",
        role: "owner",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(testUser) }
    );

    expect(result.current.isOwner).toBe(true);
    expect(result.current.canLeaveBoard).toBe(true);
  });

  it("correctly derives admin role with management but no delete/transfer/grant-admin", () => {
    const adminUser: User = { ...testUser, id: "user-admin-2" };
    const members: BoardMember[] = [
      {
        id: "mem-1",
        boardId: "board-123",
        userId: "user-admin-2",
        role: "admin",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(adminUser) }
    );

    expect(result.current.role).toBe("admin");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isEditor).toBe(true);
    expect(result.current.isCommenter).toBe(true);
    expect(result.current.isViewer).toBe(false);

    // Board Management
    expect(result.current.canEditBoard).toBe(true);
    expect(result.current.canExportBoard).toBe(true);
    expect(result.current.canManageBilling).toBe(false);
    expect(result.current.canTransferOwnership).toBe(false);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canLeaveBoard).toBe(true);

    // Members & Invites
    expect(result.current.canViewFullMemberList).toBe(true);
    expect(result.current.canInviteMembers).toBe(true);
    expect(result.current.canRevokeInvites).toBe(true);
    expect(result.current.canGrantAdminOwner).toBe(false); // Admin cannot grant admin or owner
    expect(result.current.canGrantEditorCommenter).toBe(true);
    expect(result.current.canManageMembers).toBe(true);

    // Columns
    expect(result.current.canManageColumns).toBe(true);
    expect(result.current.canDeleteColumn).toBe(true);

    // Cards & Comments
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.canEditTask).toBe(true);
    expect(result.current.canMoveTask).toBe(true);
    expect(result.current.canAssignTask).toBe(true);
    expect(result.current.canArchiveTask).toBe(true);
    expect(result.current.canDeleteTask).toBe(true); // Soft delete goes to trash
    expect(result.current.canViewTrash).toBe(true);
    expect(result.current.canRestoreTask).toBe(true);
    expect(result.current.canPurgeTask).toBe(true); // Admin can permanently purge cards
    expect(result.current.canComment).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("correctly derives editor role (card editing and soft delete allowed, purge blocked)", () => {
    const editorUser: User = { ...testUser, id: "user-editor-3" };
    const members: BoardMember[] = [
      {
        id: "mem-2",
        boardId: "board-123",
        userId: "user-editor-3",
        role: "editor",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(editorUser) }
    );

    expect(result.current.role).toBe("editor");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isEditor).toBe(true);
    expect(result.current.isCommenter).toBe(true);
    expect(result.current.isViewer).toBe(false);

    // Board Management
    expect(result.current.canEditBoard).toBe(false);
    expect(result.current.canExportBoard).toBe(false);
    expect(result.current.canManageBilling).toBe(false);
    expect(result.current.canTransferOwnership).toBe(false);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canLeaveBoard).toBe(true);

    // Members
    expect(result.current.canViewFullMemberList).toBe(true);
    expect(result.current.canInviteMembers).toBe(false);
    expect(result.current.canManageMembers).toBe(false);

    // Columns
    expect(result.current.canManageColumns).toBe(false);
    expect(result.current.canDeleteColumn).toBe(false);

    // Cards & Comments
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.canEditTask).toBe(true);
    expect(result.current.canMoveTask).toBe(true);
    expect(result.current.canAssignTask).toBe(true);
    expect(result.current.canArchiveTask).toBe(true);
    expect(result.current.canDeleteTask).toBe(true); // Editor can soft delete card (goes to trash)
    expect(result.current.canViewTrash).toBe(true); // Editor can view trash
    expect(result.current.canRestoreTask).toBe(true); // Editor can restore card
    expect(result.current.canPurgeTask).toBe(false); // Editor cannot permanently purge cards
    expect(result.current.canComment).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("supports legacy member role mapped to editor capabilities", () => {
    const memberUser: User = { ...testUser, id: "user-member-3" };
    const members: BoardMember[] = [
      {
        id: "mem-2",
        boardId: "board-123",
        userId: "user-member-3",
        role: "member",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(memberUser) }
    );

    expect(result.current.isEditor).toBe(true);
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.canEditTask).toBe(true);
    expect(result.current.canArchiveTask).toBe(true);
    expect(result.current.canDeleteTask).toBe(true); // Soft delete goes to trash
    expect(result.current.canViewTrash).toBe(true);
    expect(result.current.canRestoreTask).toBe(true);
    expect(result.current.canPurgeTask).toBe(false);
    expect(result.current.canComment).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("correctly derives commenter role (can comment, cannot edit cards or manage board)", () => {
    const commenterUser: User = { ...testUser, id: "user-commenter-4" };
    const members: BoardMember[] = [
      {
        id: "mem-4",
        boardId: "board-123",
        userId: "user-commenter-4",
        role: "commenter",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(commenterUser) }
    );

    expect(result.current.role).toBe("commenter");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isEditor).toBe(false);
    expect(result.current.isCommenter).toBe(true);
    expect(result.current.isViewer).toBe(false);

    // Board & Columns
    expect(result.current.canEditBoard).toBe(false);
    expect(result.current.canExportBoard).toBe(false);
    expect(result.current.canManageColumns).toBe(false);

    // Members (redacted name/avatar only)
    expect(result.current.canViewFullMemberList).toBe(false);
    expect(result.current.canInviteMembers).toBe(false);
    expect(result.current.canManageMembers).toBe(false);

    // Cards
    expect(result.current.canCreateTask).toBe(false);
    expect(result.current.canEditTask).toBe(false);
    expect(result.current.canMoveTask).toBe(false);
    expect(result.current.canAssignTask).toBe(false);
    expect(result.current.canArchiveTask).toBe(false);
    expect(result.current.canDeleteTask).toBe(false);
    expect(result.current.canViewTrash).toBe(false);
    expect(result.current.canRestoreTask).toBe(false);
    expect(result.current.canPurgeTask).toBe(false);

    // Comments
    expect(result.current.canComment).toBe(true);
    expect(result.current.isReadOnly).toBe(true);
  });

  it("correctly derives viewer role as strictly read only (cannot comment)", () => {
    const viewerUser: User = { ...testUser, id: "user-viewer-5" };
    const members: BoardMember[] = [
      {
        id: "mem-5",
        boardId: "board-123",
        userId: "user-viewer-5",
        role: "viewer",
        status: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(
      () => useBoardPermissions(mockBoard, members),
      { wrapper: createWrapper(viewerUser) }
    );

    expect(result.current.role).toBe("viewer");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isEditor).toBe(false);
    expect(result.current.isCommenter).toBe(false);
    expect(result.current.isViewer).toBe(true);

    // Board & Columns
    expect(result.current.canEditBoard).toBe(false);
    expect(result.current.canExportBoard).toBe(false);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canManageColumns).toBe(false);

    // Members (redacted name/avatar only)
    expect(result.current.canViewFullMemberList).toBe(false);
    expect(result.current.canInviteMembers).toBe(false);
    expect(result.current.canManageMembers).toBe(false);

    // Cards & Comments
    expect(result.current.canCreateTask).toBe(false);
    expect(result.current.canEditTask).toBe(false);
    expect(result.current.canMoveTask).toBe(false);
    expect(result.current.canAssignTask).toBe(false);
    expect(result.current.canArchiveTask).toBe(false);
    expect(result.current.canDeleteTask).toBe(false);
    expect(result.current.canViewTrash).toBe(false);
    expect(result.current.canRestoreTask).toBe(false);
    expect(result.current.canPurgeTask).toBe(false);
    expect(result.current.canComment).toBe(false);
    expect(result.current.isReadOnly).toBe(true);
  });
});
