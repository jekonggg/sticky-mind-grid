const PINNED_BOARDS_STORAGE_KEY = "sticky_mind_grid_pinned_boards";

function getStorageKey(userId?: string): string {
  return userId ? `${PINNED_BOARDS_STORAGE_KEY}:${userId}` : PINNED_BOARDS_STORAGE_KEY;
}

export function getPinnedBoardIds(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isBoardPinned(boardId: string, userId?: string, boardPinnedFlag?: boolean): boolean {
  if (typeof boardPinnedFlag === "boolean" && boardPinnedFlag) {
    return true;
  }
  return getPinnedBoardIds(userId).includes(boardId);
}

export function unpinBoardId(boardId: string, userId?: string): boolean {
  const current = getPinnedBoardIds(userId);
  if (!current.includes(boardId)) return false;

  const next = current.filter((id) => id !== boardId);

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(
    new CustomEvent("pinned_boards_updated", {
      detail: { boardId, isPinned: false, pinnedIds: next },
    })
  );

  return true;
}

export function togglePinnedBoardId(boardId: string, userId?: string): boolean {
  const current = getPinnedBoardIds(userId);
  const exists = current.includes(boardId);
  const next = exists ? current.filter((id) => id !== boardId) : [...current, boardId];

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(
    new CustomEvent("pinned_boards_updated", {
      detail: { boardId, isPinned: !exists, pinnedIds: next },
    })
  );

  return !exists;
}
