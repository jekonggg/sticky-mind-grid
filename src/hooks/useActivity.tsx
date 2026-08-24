import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Activity, ActivityType } from "@/types/task";
import { authenticatedFetch } from "@/services/apiUtils";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityContextType {
  activities: Activity[];
  addActivity: (type: ActivityType, taskTitle: string, message: string, boardId?: string) => void;
  clearActivities: () => void;
  setBoardId: (boardId: string | null) => void;
  refreshActivities: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  const fetchActivities = useCallback(async (boardId: string | null) => {
    if (!boardId) {
      setActivities([]);
      return;
    }
    try {
      const url = `/activities?boardId=${boardId}`;
      const res = await authenticatedFetch(url);
      if (res.ok) {
        const data = await res.json();
        setActivities(
          data.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  }, []);

  useEffect(() => {
    if (user && currentBoardId) {
      fetchActivities(currentBoardId);
      const interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchActivities(currentBoardId);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentBoardId, fetchActivities, user]);

  const setBoardId = useCallback((id: string | null) => {
    setCurrentBoardId(id);
  }, []);

  const refreshActivities = useCallback(async () => {
    if (currentBoardId) {
      await fetchActivities(currentBoardId);
    }
  }, [currentBoardId, fetchActivities]);

  const addActivity = useCallback(
    async (type: ActivityType, taskTitle: string, message: string, boardId?: string) => {
      const finalBoardId = boardId || currentBoardId;
      if (!finalBoardId) return;

      // Optimistic update
      const tempActivity: Activity = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        taskTitle,
        message,
        timestamp: new Date(),
        user: user ? { ...user } : undefined,
      };

      if (currentBoardId === finalBoardId) {
        setActivities((prev) => [tempActivity, ...prev].slice(0, 50));
      }

      try {
        await authenticatedFetch("/activities", {
          method: "POST",
          body: JSON.stringify({
            type,
            taskTitle,
            message,
            boardId: finalBoardId,
          }),
        });
        fetchActivities(currentBoardId);
      } catch (err) {
        console.error("Failed to post activity:", err);
      }
    },
    [currentBoardId, fetchActivities, user]
  );

  const clearActivities = useCallback(async () => {
    if (!currentBoardId) return;
    try {
      const url = `/activities?boardId=${currentBoardId}`;
      const res = await authenticatedFetch(url, { method: "DELETE" });
      if (res.ok) {
        setActivities([]);
      }
    } catch (err) {
      console.error("Failed to clear activities:", err);
    }
  }, [currentBoardId]);

  return (
    <ActivityContext.Provider
      value={{ activities, addActivity, clearActivities, setBoardId, refreshActivities }}
    >
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
