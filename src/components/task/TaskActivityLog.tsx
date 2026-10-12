import React, { useEffect, useState, useMemo } from "react";
import { useActivity } from "@/hooks/useActivity";
import { Activity } from "@/types/task";
import { authenticatedFetch } from "@/services/apiUtils";
import {
  ClockRewind as History,
  ArrowRight,
} from "@untitledui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface TaskActivityLogProps {
  taskTitle: string;
  taskId?: string;
  boardId?: string;
}

export function TaskActivityLog({ taskTitle, taskId, boardId }: TaskActivityLogProps) {
  const { activities: contextActivities } = useActivity();
  const [cardActivities, setCardActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!boardId || (!taskTitle && !taskId)) return;
    let cancelled = false;
    const params = new URLSearchParams({ boardId });
    if (taskTitle) params.set("taskTitle", taskTitle);
    if (taskId) params.set("taskId", taskId);

    authenticatedFetch(`/activities?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setCardActivities(
            data.map((a: any) => ({
              ...a,
              timestamp: new Date(a.timestamp),
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [boardId, taskTitle, taskId, contextActivities.length]);

  // Merge card-specific fetched activities with context activities matching this card
  const taskActivities = useMemo(() => {
    const matchedFromContext = contextActivities.filter((act) => {
      if (taskId && act.targetId && String(act.targetId) === String(taskId)) {
        return true;
      }
      if (!taskTitle) return false;
      return (
        act.taskTitle?.toLowerCase() === taskTitle.toLowerCase() ||
        act.message?.toLowerCase().includes(taskTitle.toLowerCase())
      );
    });

    const map = new Map<string, Activity>();
    for (const act of [...cardActivities, ...matchedFromContext]) {
      if (act.id && !map.has(act.id)) {
        map.set(act.id, act);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [cardActivities, contextActivities, taskTitle, taskId]);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 sm:px-12 py-6">
      <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        <span>Activity & History ({taskActivities.length})</span>
      </div>

      {taskActivities.length === 0 ? (
        <div className="text-xs text-muted-foreground/60 italic py-2">
          No audit activity recorded for this task yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
          {taskActivities.map((act) => {
            const userName = act.user?.fullName || act.user?.email || "Former member";
            const initial = userName.charAt(0).toUpperCase();
            const date = new Date(act.timestamp);
            const formattedTime = !isNaN(date.getTime())
              ? formatDistanceToNow(date, { addSuffix: true })
              : "just now";

            return (
              <div key={act.id} className="relative flex items-start gap-3 text-xs">
                {/* Dot */}
                <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-background border-2 border-primary" />

                <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                  <AvatarImage src={act.user?.avatarUrl} alt={userName} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground">{userName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 capitalize ${
                        act.type === "create"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : act.type === "move"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          : act.type === "delete"
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {act.type}
                    </Badge>
                    <span className="text-muted-foreground/60 text-[11px] ml-auto">
                      {formattedTime}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                    {act.message}
                  </p>
                  {(act.beforeValue || act.afterValue) && act.beforeValue !== act.afterValue && (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] bg-muted/50 border border-border/50 rounded px-2 py-0.5 text-muted-foreground max-w-full overflow-hidden">
                      {act.beforeValue && (
                        <span className="line-through opacity-75 truncate max-w-[160px]" title={act.beforeValue}>
                          {act.beforeValue}
                        </span>
                      )}
                      {act.beforeValue && act.afterValue && <ArrowRight className="h-2.5 w-2.5 shrink-0" />}
                      {act.afterValue && (
                        <span className="font-medium text-foreground truncate max-w-[160px]" title={act.afterValue}>
                          {act.afterValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

