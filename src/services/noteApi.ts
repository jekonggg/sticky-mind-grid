import { Note, CreateNoteData, UpdateNoteData } from "@/types/note";
import { authenticatedFetch } from "./apiUtils";

const mapNote = (n: any): Note => ({
  ...n,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
});

export const noteApi = {
  async getNotes(boardId: string): Promise<Note[]> {
    const res = await authenticatedFetch(`/boards/${boardId}/notes`);
    if (!res.ok) throw new Error("Failed to fetch notes");
    const data = await res.json();
    return data.map(mapNote);
  },

  async createNote(boardId: string, data: CreateNoteData): Promise<Note> {
    const res = await authenticatedFetch(`/boards/${boardId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create note");
    }
    const resData = await res.json();
    return mapNote(resData);
  },

  async updateNote(noteId: string, data: UpdateNoteData): Promise<Note> {
    const res = await authenticatedFetch(`/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update note");
    }
    const resData = await res.json();
    return mapNote(resData);
  },

  async deleteNote(noteId: string): Promise<void> {
    const res = await authenticatedFetch(`/notes/${noteId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete note");
    }
  },
};
