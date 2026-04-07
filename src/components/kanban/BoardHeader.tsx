import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, History, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BoardHeaderProps {
  onAddTask: () => void;
  onOpenActivity?: () => void;
  boardName?: string;
}

export function BoardHeader({ onAddTask, onOpenActivity, boardName }: BoardHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => navigate("/")}
          title="Back to boards"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {boardName && (
          <>
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate max-w-[120px] sm:max-w-none">
              {boardName}
            </h1>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={onOpenActivity}
          title="Recent Activity"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onAddTask} className="gap-1.5 font-semibold">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
}
