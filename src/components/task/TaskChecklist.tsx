import React, { useState } from "react";
import { ChecklistItem } from "@/types/task";
import { CheckSquare, Square, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskChecklistProps {
  checklist: ChecklistItem[];
  readOnly?: boolean;
  onChange: (items: ChecklistItem[]) => void;
  onProgressSync?: (newProgress: number) => void;
}

export function TaskChecklist({ checklist, readOnly, onChange, onProgressSync }: TaskChecklistProps) {
  const [newText, setNewText] = useState("");

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (id: string) => {
    if (readOnly) return;
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onChange(updated);

    if (onProgressSync && updated.length > 0) {
      const done = updated.filter((i) => i.completed).length;
      onProgressSync(Math.round((done / updated.length) * 100));
    }
  };

  const handleAdd = () => {
    if (!newText.trim() || readOnly) return;
    const newItem: ChecklistItem = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newText.trim(),
      text: newText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    onChange(updated);
    setNewText("");

    if (onProgressSync && updated.length > 0) {
      const done = updated.filter((i) => i.completed).length;
      onProgressSync(Math.round((done / updated.length) * 100));
    }
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    const updated = checklist.filter((item) => item.id !== id);
    onChange(updated);

    if (onProgressSync && updated.length > 0) {
      const done = updated.filter((i) => i.completed).length;
      onProgressSync(Math.round((done / updated.length) * 100));
    }
  };

  const handleUpdateText = (id: string, text: string) => {
    if (readOnly) return;
    onChange(
      checklist.map((item) => (item.id === id ? { ...item, title: text } : item))
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6 border-b border-border/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Subtasks & Checklist</span>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>
              {completedCount} of {totalCount} completed ({completionPercentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-muted/60 rounded-full h-1.5 mb-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              completionPercentage === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      )}

      {/* Checklist Items List */}
      <div className="space-y-1.5">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => handleToggle(item.id)}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0 disabled:cursor-not-allowed"
              >
                {item.completed ? (
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {readOnly ? (
                <span
                  className={`text-sm ${
                    item.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {item.title || item.text}
                </span>
              ) : (
                <input
                  type="text"
                  value={item.title || item.text || ""}
                  onChange={(e) => handleUpdateText(item.id, e.target.value)}
                  className={`flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 px-0 ${
                    item.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                />
              )}
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                title="Delete subtask"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Subtask Input */}
      {!readOnly && (
        <div className="flex items-center gap-2 mt-3 pt-2">
          <Input
            type="text"
            placeholder="Add a subtask (press Enter)..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="h-8 text-xs bg-background/50 border-border/60"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="h-8 px-3 text-xs gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </Button>
        </div>
      )}
    </div>
  );
}
