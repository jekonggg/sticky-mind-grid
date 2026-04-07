import { useNavigate } from "react-router-dom";
import { Board } from "@/types/board";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, LayoutDashboard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BoardHeroImage } from "./BoardHeroImage";

interface BoardCardProps {
  board: Board;
  taskCount?: number;
  onEdit: (board: Board) => void;
  onDelete: (board: Board) => void;
}

export function BoardCard({ board, taskCount = 0, onEdit, onDelete }: BoardCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm"
      onClick={() => navigate(`/boards/${board.id}`)}
    >
      <BoardHeroImage
        src={board.heroImageUrl}
        alt={board.name}
        color={board.color}
        aspectRatio="video"
      />
      
      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: board.color }} />

      <CardContent className="p-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/50 shadow-sm
                ${board.emoji ? "bg-primary/5" : "bg-muted/50"}`}
              style={{ borderColor: board.emoji ? "transparent" : board.color + "44" }}
            >
              {board.emoji ? (
                <span className="text-xl leading-none">{board.emoji}</span>
              ) : (
                <LayoutDashboard className="h-5 w-5" style={{ color: board.color }} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate">{board.name}</h3>
              {board.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(board)}>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(board)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span>{taskCount} {taskCount === 1 ? "task" : "tasks"}</span>
          <span>·</span>
          <span>Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
