import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, History } from "lucide-react";

interface BoardHeaderProps {
  onAddTask: () => void;
  onOpenActivity?: () => void;
}

export function BoardHeader({ onAddTask, onOpenActivity }: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="flex items-center gap-2.5">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground tracking-tight">Task Board</h1>
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
