import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard } from "lucide-react";

interface BoardHeaderProps {
  onAddTask: () => void;
}

export function BoardHeader({ onAddTask }: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div className="flex items-center gap-2.5">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground tracking-tight">Task Board</h1>
      </div>
      <Button size="sm" onClick={onAddTask} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add Task
      </Button>
    </header>
  );
}
