import React from "react";
import { Activity } from "@/types/task";
import { formatDistanceToNow } from "date-fns";
import { PlusCircle, ArrowRightCircle, Edit3, Trash2 } from "lucide-react";

interface ActivityItemProps {
  activity: Activity;
}

const iconMap = {
  create: <PlusCircle className="h-4 w-4 text-green-500" />,
  move: <ArrowRightCircle className="h-4 w-4 text-blue-500" />,
  update: <Edit3 className="h-4 w-4 text-amber-500" />,
  delete: <Trash2 className="h-4 w-4 text-red-500" />,
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0 group">
      <div className="mt-0.5 shrink-0 transition-transform group-hover:scale-110">
        {iconMap[activity.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">{activity.taskTitle}</span>{" "}
          <span className="text-muted-foreground">
            {activity.message.replace(`"${activity.taskTitle}"`, "").replace(`'${activity.taskTitle}'`, "").trim() || activity.message}
          </span>
        </p>
        <span className="text-[10px] text-muted-foreground mt-1 block font-medium">
          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};
