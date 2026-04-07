import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Activity, ActivityType } from "@/types/task";

interface ActivityContextType {
  activities: Activity[];
  addActivity: (type: ActivityType, taskTitle: string, message: string, boardId?: string) => void;
  clearActivities: () => void;
  setBoardId: (boardId: string | null) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const API_BASE = "http://127.0.0.1:5000/api";

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  const fetchActivities = useCallback(async (boardId: string | null) => {
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
    fetchActivities(currentBoardId);
  }, [currentBoardId, fetchActivities]);

  const setBoardId = useCallback((id: string | null) => {
    setCurrentBoardId(id);
  }, []);

  const addActivity = useCallback(async (type: ActivityType, taskTitle: string, message: string, boardId?: string) => {
    const finalBoardId = boardId || currentBoardId;
    
    // Optimistic update
    const tempActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      taskTitle,
      message,
      timestamp: new Date(),
    };
    
    // Only show in local state if it belongs to current filter
    if (!currentBoardId || currentBoardId === finalBoardId) {
      setActivities((prev) => [tempActivity, ...prev].slice(0, 50));
    }

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
      fetchActivities(currentBoardId); // Refresh with actual server data
    } catch (err) {
      console.error("Failed to post activity:", err);
    }
  }, [currentBoardId, fetchActivities]);

  const clearActivities = useCallback(async () => {
    try {
      const url = currentBoardId ? `${API_BASE}/activities?boardId=${currentBoardId}` : `${API_BASE}/activities`;
      await fetch(url, { method: "DELETE" });
      setActivities([]);
    } catch (err) {
      console.error("Failed to clear activities:", err);
    }
  }, [currentBoardId]);

  return (
    <ActivityContext.Provider value={{ activities, addActivity, clearActivities, setBoardId }}>
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
