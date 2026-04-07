import { Column } from "./task";

export interface Board {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  color: string;
  heroImageUrl?: string;
  columns: Column[];
  taskCount?: number;
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
}

export interface UpdateBoardData {
  name?: string;
  emoji?: string;
  description?: string;
  color?: string;
  heroImageUrl?: string;
  columns?: Column[];
}

export const BOARD_COLORS = [
  "hsl(220, 80%, 56%)",   // blue
  "hsl(142, 60%, 45%)",   // green
  "hsl(280, 60%, 55%)",   // purple
  "hsl(25, 90%, 55%)",    // orange
  "hsl(350, 70%, 55%)",   // red
  "hsl(190, 70%, 45%)",   // teal
] as const;
