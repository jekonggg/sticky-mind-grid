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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  });

  it("returns read-only viewer defaults when board is null", () => {
    const { result } = renderHook(() => useBoardPermissions(null, []), {
      wrapper: createWrapper(testUser),
    });

    expect(result.current.role).toBe("viewer");
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.canDeleteBoard).toBe(false);
  });

  it("correctly identifies direct board owner", () => {
    const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
      wrapper: createWrapper(testUser),
    });

    expect(result.current.role).toBe("owner");
    expect(result.current.isOwner).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isMember).toBe(true);
    expect(result.current.isViewer).toBe(false);
    expect(result.current.canDeleteBoard).toBe(true);
    expect(result.current.canEditBoard).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("correctly derives admin role from membership", () => {
    const nonOwnerUser: User = { ...testUser, id: "user-admin-2" };
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
      { wrapper: createWrapper(nonOwnerUser) }
    );

    expect(result.current.role).toBe("admin");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isMember).toBe(true);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canEditBoard).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("correctly derives member role with task permissions but no board admin", () => {
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

    expect(result.current.role).toBe("member");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isMember).toBe(true);
    expect(result.current.canDeleteBoard).toBe(false);
    expect(result.current.canEditBoard).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
    expect(result.current.canCreateTask).toBe(true);
    expect(result.current.canEditTask).toBe(true);
    expect(result.current.canDeleteTask).toBe(true);
    expect(result.current.canMoveTask).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it("correctly derives viewer role as read only", () => {
    const viewerUser: User = { ...testUser, id: "user-viewer-4" };
    const members: BoardMember[] = [
      {
        id: "mem-3",
        boardId: "board-123",
        userId: "user-viewer-4",
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
    expect(result.current.isMember).toBe(false);
    expect(result.current.isViewer).toBe(true);
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.canCreateTask).toBe(false);
    expect(result.current.canEditTask).toBe(false);
    expect(result.current.canDeleteTask).toBe(false);
  });
});
