import { useState, useEffect, useCallback, useMemo } from "react";
import { Tag, Task } from "@/types/task";
import {
  getBoardLabels,
  saveBoardLabel,
  saveBoardLabels,
  removeBoardLabel,
  deduplicateTags,
  normalizeTagName,
} from "@/utils/boardLabels";

export function useBoardLabels(boardId?: string, boardTasks?: Task[]) {
  // Extract all tags from current board tasks to seed the pool
  const taskTags = useMemo(() => {
    if (!boardTasks || !Array.isArray(boardTasks)) return [];
    return boardTasks.flatMap((t) => t.tags || []);
  }, [boardTasks]);

  const [boardLabels, setBoardLabels] = useState<Tag[]>(() =>
    getBoardLabels(boardId, taskTags)
  );

  // Re-sync when boardId or taskTags change
  useEffect(() => {
    if (!boardId) {
      setBoardLabels([]);
      return;
    }
    const initial = getBoardLabels(boardId, taskTags);
    setBoardLabels(initial);
    // If taskTags had labels not in localStorage, persist them
    if (taskTags.length > 0) {
      saveBoardLabels(boardId, taskTags);
    }
  }, [boardId, taskTags]);

  // Listen for custom event across components
  useEffect(() => {
    if (!boardId) return;

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ boardId: string; labels: Tag[] }>;
      if (customEvent.detail?.boardId === boardId) {
        setBoardLabels(customEvent.detail.labels);
      }
    };

    window.addEventListener("board:labels-updated", handleUpdate);
    return () => {
      window.removeEventListener("board:labels-updated", handleUpdate);
    };
  }, [boardId]);

  const addLabel = useCallback(
    (tag: Tag) => {
      if (!boardId) return;
      saveBoardLabel(boardId, tag);
    },
    [boardId]
  );

  const removeLabel = useCallback(
    (tagIdOrName: string) => {
      if (!boardId) return;
      removeBoardLabel(boardId, tagIdOrName);
    },
    [boardId]
  );

  return {
    boardLabels,
    addLabel,
    removeLabel,
    deduplicateTags,
    normalizeTagName,
  };
}
