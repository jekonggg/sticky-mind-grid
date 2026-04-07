import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Activity, ActivityType } from "@/types/task";
import { useParams } from "react-router-dom";

interface ActivityContextType {
  activities: Activity[];
  addActivity: (type: ActivityType, taskTitle: string, message: string, boardId?: string) => void;
  clearActivities: () => void;
  refreshActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const API_BASE = "http://127.0.0.1:5000/api";

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { boardId: paramBoardId } = useParams<{ boardId: string }>();

  const fetchActivities = useCallback(async (boardId?: string) => {
    try {
      const url = boardId ? `${API_BASE}/activities?boardId=${boardId}` : `${API_BASE}/activities`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })));
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  }, []);

  useEffect(() => {
    fetchActivities(paramBoardId);
  }, [paramBoardId, fetchActivities]);

  const addActivity = useCallback(async (type: ActivityType, taskTitle: string, message: string, boardId?: string) => {
    const finalBoardId = boardId || paramBoardId;
    
    // Optimistic update
    const tempActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      taskTitle,
      message,
      timestamp: new Date(),
    };
    setActivities((prev) => [tempActivity, ...prev].slice(0, 50));

    try {
      await fetch(`${API_BASE}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          taskTitle,
          message,
          boardId: finalBoardId
        }),
      });
      fetchActivities(finalBoardId); // Refresh with actual server data
    } catch (err) {
      console.error("Failed to post activity:", err);
    }
  }, [paramBoardId, fetchActivities]);

  const clearActivities = useCallback(async () => {
    try {
      const url = paramBoardId ? `${API_BASE}/activities?boardId=${paramBoardId}` : `${API_BASE}/activities`;
      await fetch(url, { method: "DELETE" });
      setActivities([]);
    } catch (err) {
      console.error("Failed to clear activities:", err);
    }
  }, [paramBoardId]);

  return (
    <ActivityContext.Provider value={{ activities, addActivity, clearActivities, refreshActivities: () => fetchActivities(paramBoardId) }}>
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
