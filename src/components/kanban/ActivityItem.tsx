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
  const getInitials = (user: any) => {
    if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
    return user?.email?.charAt(0).toUpperCase() || "?";
  };

  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0 group">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="h-6 w-6 rounded-full bg-muted border flex items-center justify-center text-[10px] font-bold text-muted-foreground" title={activity.user?.fullName || activity.user?.email}>
          {getInitials(activity.user)}
        </div>
        <div className="mt-0.5 transition-transform group-hover:scale-110">
          {iconMap[activity.type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">{activity.taskTitle}</span>{" "}
          <span className="text-muted-foreground whitespace-pre-wrap">
            {activity.message.replace(`"${activity.taskTitle}"`, "").replace(`'${activity.taskTitle}'`, "").trim() || activity.message}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground block font-medium">
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
          {activity.user && (
            <span className="text-[10px] text-primary/70 font-bold truncate max-w-[100px]">
              • {activity.user.fullName || activity.user.email.split('@')[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
