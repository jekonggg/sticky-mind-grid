import React from "react";
import { useActivity } from "@/hooks/useActivity";
import { ActivityItem } from "./ActivityItem";
import { ClockRewind as History } from "@untitledui/icons";
import { ScrollArea } from "@/components/ui/scroll-area";

export const LatestChangesPanel: React.FC = () => {
  const { activities } = useActivity();

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="font-bold text-sm tracking-tight uppercase">History</h2>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 w-full">
        <div className="p-4 space-y-1">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                 <History className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                No recent activity to show
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
