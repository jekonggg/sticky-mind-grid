import React, { useState } from "react";
import { useActivity } from "@/hooks/useActivity";
import { ActivityItem } from "./ActivityItem";
import { ChevronRight, ChevronLeft, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const LatestChangesPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { activities, clearActivities } = useActivity();

  return (
    <div
      className={`relative h-full flex flex-col border-l border-border bg-card transition-all duration-300 ease-in-out
        ${isExpanded ? "w-80" : "w-12"}`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-3 top-6 h-6 w-6 rounded-full bg-border border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
      >
        {isExpanded ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Header */}
      <div className={`p-4 border-b border-border flex items-center justify-between overflow-hidden whitespace-nowrap
        ${!isExpanded ? "flex-col gap-8 items-center pt-8 px-0" : ""}`}>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground shrink-0" />
          {isExpanded && <h2 className="font-semibold text-sm">Latest changes</h2>}
        </div>
        
        {!isExpanded && (
           <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-50">
             Latest changes
           </span>
        )}

        {isExpanded && activities.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={clearActivities}
            title="Clear activity log"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 w-full">
        {isExpanded ? (
          <div className="p-4 space-y-1">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 italic">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 gap-4 opacity-50">
             {activities.slice(0, 5).map(a => (
                <div key={a.id} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
             ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
