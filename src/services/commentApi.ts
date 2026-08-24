import { Comment } from "@/types/task";
import { authenticatedFetch } from "./apiUtils";

const mapComment = (c: any): Comment => ({
  ...c,
  createdAt: new Date(c.createdAt),
  updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
});

export const commentApi = {
  async getComments(taskId: string): Promise<Comment[]> {
    const res = await authenticatedFetch(`/tasks/${taskId}/comments`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    const data = await res.json();
    return data.map(mapComment);
  },

  async addComment(taskId: string, content: string): Promise<Comment> {
    const res = await authenticatedFetch(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to post comment");
    }
    const data = await res.json();
    return mapComment(data);
  },

  async deleteComment(commentId: string): Promise<void> {
    const res = await authenticatedFetch(`/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete comment");
    }
  },
};
