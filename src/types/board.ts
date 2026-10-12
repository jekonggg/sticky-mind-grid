import { Column } from "./task";

export type BoardRole = 'owner' | 'admin' | 'editor' | 'member' | 'commenter' | 'viewer';

export interface BoardMemberPreview {
  id: string;
  fullName: string;
  avatarUrl?: string;
  role?: BoardRole;
}

export interface Board {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  color: string;
  heroImageUrl?: string;
  columns: Column[];
  ownerId?: string;
  workspaceId?: string;
  role?: BoardRole;
  taskCount?: number;
  openTaskCount?: number;
  overdueCount?: number;
  dueSoonCount?: number;
  memberCount?: number;
  isShared?: boolean;
  membersPreview?: BoardMemberPreview[];
  ownerCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoardData {
  name: string;
  emoji?: string;
  description?: string;
  color?: string;
  heroImageUrl?: string;
  columns?: Column[];
  workspaceId?: string;
}

export interface UpdateBoardData {
  name?: string;
  emoji?: string;
  description?: string;
  color?: string;
  heroImageUrl?: string;
  columns?: Column[];
  workspaceId?: string;
}

export const BOARD_COLORS = [
  "hsl(220, 80%, 56%)",   // blue
  "hsl(142, 60%, 45%)",   // green
  "hsl(280, 60%, 55%)",   // purple
  "hsl(25, 90%, 55%)",    // orange
  "hsl(350, 70%, 55%)",   // red
  "hsl(190, 70%, 45%)",   // teal
] as const;

import { User } from "./user";

export type BoardMemberStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: BoardRole;
  status: BoardMemberStatus;
  isMuted?: boolean;
  user?: User;
  createdAt: string;
  expiresAt?: string;
  isInvitation?: boolean;
}

export interface BoardInvitation {
  id: string;
  boardId: string;
  role: BoardRole;
  status: BoardMemberStatus;
  email?: string;
  inviterId?: string;
  inviterName?: string;
  createdAt: string;
  expiresAt?: string;
  board: {
    id: string;
    name: string;
    emoji?: string;
    description?: string;
    color: string;
    heroImageUrl?: string;
    ownerName?: string;
  };
}

