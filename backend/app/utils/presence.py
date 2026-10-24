import threading
import time
from typing import Callable, Dict, Optional

# A heartbeat is sent every 30 seconds by the client. Keeping the window at
# three missed beats prevents brief network hiccups or background-tab timer
# throttling from incorrectly marking a user as offline.
DEFAULT_PRESENCE_TTL_SECONDS = 90


class PresenceRegistry:
    """Thread-safe, in-memory registry of recently active users.

    Presence is intentionally ephemeral: it reflects whether a client currently
    has the application open. The registry lives inside the single Gunicorn
    worker used by the application, so it stays consistent with the existing
    in-process SSE broadcaster.
    """

    def __init__(
        self,
        ttl_seconds: float = DEFAULT_PRESENCE_TTL_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self._ttl_seconds = ttl_seconds
        self._clock = clock
        self._lock = threading.Lock()
        self._last_seen: Dict[str, float] = {}

    @property
    def ttl_seconds(self) -> float:
        return self._ttl_seconds

    def touch(self, user_id: Optional[str]) -> None:
        """Record a heartbeat for the given user."""
        if not user_id:
            return
        with self._lock:
            self._last_seen[str(user_id)] = self._clock()

    def mark_offline(self, user_id: Optional[str]) -> None:
        """Remove a user immediately (used on explicit logout)."""
        if not user_id:
            return
        with self._lock:
            self._last_seen.pop(str(user_id), None)

    def is_online(self, user_id: Optional[str]) -> bool:
        """Return True when the user has sent a heartbeat within the TTL."""
        if not user_id:
            return False

        now = self._clock()
        key = str(user_id)
        with self._lock:
            last_seen = self._last_seen.get(key)
            if last_seen is None:
                return False
            if now - last_seen > self._ttl_seconds:
                self._last_seen.pop(key, None)
                return False
            return True

    def clear(self) -> None:
        """Reset the registry (used by tests)."""
        with self._lock:
            self._last_seen.clear()


# Global singleton shared by routes and model serialization.
presence = PresenceRegistry()
