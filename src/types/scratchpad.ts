export interface ScratchpadNote {
  id: string;
  userId?: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface CreateScratchpadData {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
}

export interface UpdateScratchpadData {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
}
