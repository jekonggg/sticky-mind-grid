import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const columnConfig: Record<TaskStatus, { dot: string }> = {
  todo: { dot: "bg-muted-foreground" },
  "in-progress": { dot: "bg-primary" },
  done: { dot: "bg-green-500" },
};

export function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const config = columnConfig[id];

  return (
    <div className="flex flex-col min-w-[280px] w-full max-w-sm">
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        <span className="text-xs font-medium bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-2 space-y-2 transition-colors duration-200 min-h-[120px]
          ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/40"}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              No tasks yet
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}
