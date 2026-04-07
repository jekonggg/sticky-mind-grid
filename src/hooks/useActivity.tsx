import React, { createContext, useContext, useState, useCallback } from "react";
import { Activity, ActivityType } from "@/types/task";

interface ActivityContextType {
  activities: Activity[];
  addActivity: (type: ActivityType, taskTitle: string, message: string) => void;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback((type: ActivityType, taskTitle: string, message: string) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      taskTitle,
      message,
      timestamp: new Date(),
    };

    setActivities((prev) => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, 20); // Limit to last 20 items
    });
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, addActivity, clearActivities }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
};
