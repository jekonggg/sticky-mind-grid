import type { ComponentType } from "react";
import {
  LayoutGrid01 as LayoutGrid,
  List,
  Calendar,
  File06 as FileText,
  BarChart01 as BarChart,
  Users01 as Users,
} from "@untitledui/icons";

export type BoardViewId =
  | "board"
  | "list"
  | "calendar"
  | "documents"
  | "overview"
  | "members";

export interface BoardViewDefinition {
  id: BoardViewId;
  label: string;
  icon: ComponentType<{ className?: string; size?: number | string }>;
}

/**
 * Single source of truth for the six board destinations. Both the board shell
 * and the board-scoped Tasks page render their navigation from this list.
 */
export const BOARD_VIEWS: readonly BoardViewDefinition[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "documents", label: "Docs & Files", icon: FileText },
  { id: "overview", label: "Analytics", icon: BarChart },
  { id: "members", label: "Team", icon: Users },
];
