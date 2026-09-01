import json
import queue
import threading
from collections import defaultdict
from datetime import datetime

class EventBroadcaster:
    def __init__(self):
        self._lock = threading.Lock()
        self._subscriptions = defaultdict(set)

    def subscribe(self, channel_id: str) -> queue.Queue:
        """Register a client queue for a specific channel (board, user, or conversation)."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._subscriptions[channel_id].add(q)
        return q

    def unsubscribe(self, channel_id: str, q: queue.Queue):
        """Unregister a client queue when connection closes."""
        with self._lock:
            if channel_id in self._subscriptions:
                self._subscriptions[channel_id].discard(q)
                if not self._subscriptions[channel_id]:
                    del self._subscriptions[channel_id]

    def broadcast(self, channel_id: str, event_type: str, payload: dict = None):
        """Broadcast an event to all active SSE subscribers of the given channel."""
        if not channel_id:
            return

        message = {
            "type": event_type,
            "channelId": channel_id,
            "boardId": channel_id if not channel_id.startswith("user:") and not channel_id.startswith("conv:") else None,
            "data": payload or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        formatted = f"data: {json.dumps(message)}\n\n"

        with self._lock:
            subscribers = list(self._subscriptions.get(channel_id, []))

        for q in subscribers:
            try:
                q.put_nowait(formatted)
            except queue.Full:
                # Discard stale messages if client is too slow
                pass

# Global singleton instance
broadcaster = EventBroadcaster()
