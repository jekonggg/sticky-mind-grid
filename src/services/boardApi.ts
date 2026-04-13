import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
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
};
