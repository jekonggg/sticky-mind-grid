import React from "react";
import { useActivity } from "@/hooks/useActivity";
import { History, Activity as ActivityIcon, ArrowRight, CheckCircle2, User, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";

interface TaskActivityLogProps {
  taskTitle: string;
}

export function TaskActivityLog({ taskTitle }: TaskActivityLogProps) {
  const { activities } = useActivity();

  // Filter activities relevant to this task (by title match or general task actions)
  const taskActivities = activities.filter((act) => {
    if (!taskTitle) return false;
    return (
      act.taskTitle?.toLowerCase() === taskTitle.toLowerCase() ||
      act.message?.toLowerCase().includes(taskTitle.toLowerCase())
    );
  });

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
            const userName = act.user?.fullName || act.user?.email || "User";
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
