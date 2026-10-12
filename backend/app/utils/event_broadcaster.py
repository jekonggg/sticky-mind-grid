import json
import queue
import threading
from collections import defaultdict
from datetime import datetime

class EventBroadcaster:
    def __init__(self):
        self._lock = threading.Lock()
        self._subscriptions = defaultdict(set)
        self._queue_users = {}

    def subscribe(self, channel_id: str, user_id: str = None) -> queue.Queue:
        """Register a client queue for a specific channel (board, user, or conversation)."""
        q = queue.Queue(maxsize=100)
        with self._lock:
            self._subscriptions[channel_id].add(q)
            if user_id is not None:
                self._queue_users[q] = str(user_id)
        return q

    def unsubscribe(self, channel_id: str, q: queue.Queue):
        """Unregister a client queue when connection closes."""
        with self._lock:
            self._queue_users.pop(q, None)
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

    def send_to_user(self, channel_id: str, user_id: str, event_type: str, payload: dict = None):
        """Send a targeted SSE event only to subscriber queues on channel_id matching user_id."""
        if not channel_id or user_id is None:
            return

        target_user_id = str(user_id)
        message = {
            "type": event_type,
            "channelId": channel_id,
            "boardId": channel_id if not channel_id.startswith("user:") and not channel_id.startswith("conv:") else None,
            "data": payload or {},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        formatted = f"data: {json.dumps(message)}\n\n"

        with self._lock:
            subscribers = [
                q for q in self._subscriptions.get(channel_id, [])
                if self._queue_users.get(q) == target_user_id
            ]

        for q in subscribers:
            try:
                q.put_nowait(formatted)
            except queue.Full:
                pass

    def disconnect_user(self, channel_id: str, user_id: str):
        """Force-disconnect all SSE queues for a specific user on a given channel."""
        if not channel_id or user_id is None:
            return

        target_user_id = str(user_id)
        message = {
            "type": "force_disconnect",
            "channelId": channel_id,
            "boardId": channel_id if not channel_id.startswith("user:") and not channel_id.startswith("conv:") else None,
            "data": {"boardId": str(channel_id), "userId": target_user_id},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        formatted = f"data: {json.dumps(message)}\n\n"

        with self._lock:
            channel_subs = self._subscriptions.get(channel_id, set())
            target_queues = [
                q for q in list(channel_subs)
                if self._queue_users.get(q) == target_user_id
            ]
            for q in target_queues:
                channel_subs.discard(q)
                self._queue_users.pop(q, None)
            if channel_id in self._subscriptions and not self._subscriptions[channel_id]:
                del self._subscriptions[channel_id]

        for q in target_queues:
            try:
                q.put_nowait(formatted)
            except queue.Full:
                pass
            try:
                q.put_nowait(None)
            except queue.Full:
                pass

# Global singleton instance
broadcaster = EventBroadcaster()
