import json
import queue
import threading
from collections import defaultdict
from datetime import datetime

class EventBroadcaster:
    def __init__(self):
        self._lock = threading.Lock()
        self._subscriptions = defaultdict(set)

    def subscribe(self, board_id: str) -> queue.Queue:
        """Register a client queue for a specific board."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._subscriptions[board_id].add(q)
        return q

    def unsubscribe(self, board_id: str, q: queue.Queue):
        """Unregister a client queue when connection closes."""
        with self._lock:
            if board_id in self._subscriptions:
                self._subscriptions[board_id].discard(q)
                if not self._subscriptions[board_id]:
                    del self._subscriptions[board_id]

    def broadcast(self, board_id: str, event_type: str, payload: dict = None):
        """Broadcast an event to all active SSE subscribers of the given board."""
        if not board_id:
            return

        message = {
            "type": event_type,
            "boardId": board_id,
            "data": payload or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        formatted = f"data: {json.dumps(message)}\n\n"

        with self._lock:
            subscribers = list(self._subscriptions.get(board_id, []))

        for q in subscribers:
            try:
                q.put_nowait(formatted)
            except queue.Full:
                # Discard stale messages if client is too slow
                pass

# Global singleton instance
broadcaster = EventBroadcaster()
