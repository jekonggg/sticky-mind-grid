import { Tag, Task } from "@/types/task";

const STORAGE_PREFIX = "sticky_mind_grid_board_labels_";

export function getBoardLabelsStorageKey(boardId?: string): string {
  return `${STORAGE_PREFIX}${boardId || "global"}`;
}

export function normalizeTagName(name: string): string {
  return (name || "").trim().toLowerCase();
}

/**
 * Loads board-level labels from localStorage and merges with any task tags.
 * Deduplicates by case-insensitive name.
 */
export function getBoardLabels(boardId?: string, taskTags?: Tag[]): Tag[] {
  if (!boardId) return [];

  const key = getBoardLabelsStorageKey(boardId);
  let stored: Tag[] = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch {
    stored = [];
  }

  const map = new Map<string, Tag>();

  // 1. Add stored labels first
  if (Array.isArray(stored)) {
    for (const tag of stored) {
      if (tag && tag.name) {
        const norm = normalizeTagName(tag.name);
        if (!map.has(norm)) {
          map.set(norm, {
            id: tag.id || `tag_${norm}`,
            name: tag.name.trim(),
            color: tag.color || "#3b82f6",
          });
        }
      }
    }
  }

  // 2. Merge with any tags found on existing tasks
  if (Array.isArray(taskTags)) {
    for (const tag of taskTags) {
      if (tag && tag.name) {
        const norm = normalizeTagName(tag.name);
        if (!map.has(norm)) {
          map.set(norm, {
            id: tag.id || `tag_${norm}`,
            name: tag.name.trim(),
            color: tag.color || "#3b82f6",
          });
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Saves a single label into the board's pool.
 */
export function saveBoardLabel(boardId: string, tag: Tag): void {
  if (!boardId || !tag || !tag.name?.trim()) return;
  saveBoardLabels(boardId, [tag]);
}

/**
 * Merges and saves multiple labels into the board's pool in localStorage,
 * and notifies all listeners via a custom DOM event.
 */
export function saveBoardLabels(boardId: string, newTags: Tag[]): void {
  if (!boardId || !Array.isArray(newTags) || newTags.length === 0) return;

  const current = getBoardLabels(boardId);
  const map = new Map<string, Tag>();

  for (const tag of current) {
    map.set(normalizeTagName(tag.name), tag);
  }

  let hasChanges = false;
  for (const tag of newTags) {
    if (!tag || !tag.name?.trim()) continue;
    const norm = normalizeTagName(tag.name);
    if (!map.has(norm)) {
      map.set(norm, {
        id: tag.id || `tag_${norm}`,
        name: tag.name.trim(),
        color: tag.color || "#3b82f6",
      });
      hasChanges = true;
    }
  }

  if (hasChanges) {
    const updated = Array.from(map.values());
    try {
      localStorage.setItem(getBoardLabelsStorageKey(boardId), JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("board:labels-updated", {
          detail: { boardId, labels: updated },
        })
      );
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Removes a label from the board's stored pool.
 */
export function removeBoardLabel(boardId: string, tagNameOrId: string): void {
  if (!boardId || !tagNameOrId) return;

  const current = getBoardLabels(boardId);
  const normTarget = normalizeTagName(tagNameOrId);
  const filtered = current.filter(
    (t) => t.id !== tagNameOrId && normalizeTagName(t.name) !== normTarget
  );

  try {
    localStorage.setItem(getBoardLabelsStorageKey(boardId), JSON.stringify(filtered));
    window.dispatchEvent(
      new CustomEvent("board:labels-updated", {
        detail: { boardId, labels: filtered },
      })
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Deduplicates a list of tags by normalized name.
 */
export function deduplicateTags(tags: Tag[]): Tag[] {
  if (!Array.isArray(tags)) return [];
  const map = new Map<string, Tag>();
  for (const tag of tags) {
    if (!tag || !tag.name?.trim()) continue;
    const norm = normalizeTagName(tag.name);
    if (!map.has(norm)) {
      map.set(norm, {
        ...tag,
        name: tag.name.trim(),
      });
    }
  }
  return Array.from(map.values());
}
