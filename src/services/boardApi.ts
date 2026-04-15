import { Board, CreateBoardData, UpdateBoardData, BoardMember } from "@/types/board";
import { authenticatedFetch } from "./apiUtils";

const mapBoard = (board: any): Board => ({
  ...board,
  createdAt: new Date(board.createdAt),
  updatedAt: new Date(board.updatedAt),
});

export const boardApi = {
  async getBoards(): Promise<Board[]> {
    const res = await authenticatedFetch("/boards");
    if (!res.ok) throw new Error("Failed to fetch boards");
    const data = await res.json();
    return data.map(mapBoard);
  },

  async getBoard(id: string): Promise<Board | undefined> {
    const res = await authenticatedFetch(`/boards/${id}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return mapBoard(data);
  },

  async createBoard(data: CreateBoardData): Promise<Board> {
    const res = await authenticatedFetch("/boards", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create board");
    const board = await res.json();
    return mapBoard(board);
  },

  async updateBoard(id: string, data: UpdateBoardData): Promise<Board> {
    const res = await authenticatedFetch(`/boards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update board");
    const board = await res.json();
    return mapBoard(board);
  },

  async deleteBoard(id: string): Promise<void> {
    const res = await authenticatedFetch(`/boards/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete board");
  },

  async getMembers(boardId: string): Promise<BoardMember[]> {
    const res = await authenticatedFetch(`/boards/${boardId}/members`);
    if (!res.ok) throw new Error("Failed to fetch members");
    return res.json();
  },

  async inviteMember(boardId: string, email: string, role: string): Promise<BoardMember> {
    const res = await authenticatedFetch(`/boards/${boardId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to invite member");
    }
    return res.json();
  },

  async removeMember(boardId: string, userId: string): Promise<void> {
    const res = await authenticatedFetch(`/boards/${boardId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to remove member");
    }
  },
};
