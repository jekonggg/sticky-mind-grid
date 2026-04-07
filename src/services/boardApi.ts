import { Board, CreateBoardData, UpdateBoardData, BOARD_COLORS } from "@/types/board";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mockBoards: Board[] = [
  {
    id: "board-1",
    name: "Product Launch",
    description: "Q3 product launch planning and execution",
    color: BOARD_COLORS[0],
    heroImageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: "board-2",
    name: "Engineering Sprint",
    description: "Current sprint tasks and bugs",
    color: BOARD_COLORS[2],
    heroImageUrl: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=800&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 14 * 86400000),
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    id: "board-3",
    name: "Design System",
    color: BOARD_COLORS[4],
    heroImageUrl: "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 30 * 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
];

let nextId = 4;

export const boardApi = {
  async getBoards(): Promise<Board[]> {
    await delay(300);
    return [...mockBoards];
  },

  async getBoard(id: string): Promise<Board | undefined> {
    await delay(150);
    return mockBoards.find((b) => b.id === id);
  },

  async createBoard(data: CreateBoardData): Promise<Board> {
    await delay(200);
    const board: Board = {
      id: `board-${nextId++}`,
      name: data.name,
      description: data.description,
      color: data.color || BOARD_COLORS[0],
      heroImageUrl: data.heroImageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockBoards.push(board);
    return board;
  },

  async updateBoard(id: string, data: UpdateBoardData): Promise<Board> {
    await delay(150);
    const idx = mockBoards.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error("Board not found");
    mockBoards[idx] = { ...mockBoards[idx], ...data, updatedAt: new Date() };
    return { ...mockBoards[idx] };
  },

  async deleteBoard(id: string): Promise<void> {
    await delay(150);
    mockBoards = mockBoards.filter((b) => b.id !== id);
  },
};
