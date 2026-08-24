export interface Note {
  id: string;
  boardId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
  };
  title: string;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteData {
  title: string;
  content?: string;
  color?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  color?: string;
}
