import { Board, CreateBoardData, UpdateBoardData, BOARD_COLORS } from "@/types/board";

const API_BASE = "http://127.0.0.1:5000/api";

const mapBoard = (board: any): Board => ({
  ...board,
  createdAt: new Date(board.createdAt),
  updatedAt: new Date(board.updatedAt),
});

export const boardApi = {
  async getBoards(): Promise<Board[]> {
    const res = await fetch(`${API_BASE}/boards`);
    if (!res.ok) throw new Error("Failed to fetch boards");
    const data = await res.json();
    return data.map(mapBoard);
  },

  async getBoard(id: string): Promise<Board | undefined> {
    const res = await fetch(`${API_BASE}/boards/${id}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return mapBoard(data);
  },

  async createBoard(data: CreateBoardData): Promise<Board> {
    const res = await fetch(`${API_BASE}/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create board");
    const board = await res.json();
    return mapBoard(board);
  },

  async updateBoard(id: string, data: UpdateBoardData): Promise<Board> {
    const res = await fetch(`${API_BASE}/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update board");
    const board = await res.json();
    return mapBoard(board);
  },

  async deleteBoard(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/boards/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete board");
  },
};
