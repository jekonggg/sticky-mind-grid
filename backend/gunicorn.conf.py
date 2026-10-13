"""
Gunicorn configuration for Sticky Mind Grid backend.

ARCHITECTURE NOTE (OQ-16):
Sticky Mind Grid uses an in-process EventBroadcaster (Python threading.Lock + queue.Queue)
for real-time Server-Sent Events (SSE).

To ensure that broadcasts reach all connected SSE clients, Gunicorn MUST run with:
- workers = 1
- worker_class = "gthread"
- threads = 8 (or higher, depending on concurrent subscriber load)

DO NOT increase `workers` beyond 1 without first migrating `EventBroadcaster`
to Redis Pub/Sub (or an external event broker). Running multiple worker processes
without Redis Pub/Sub will partition SSE connections across workers and cause missed real-time events.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# STRICT: Single worker process to preserve in-memory SSE event bus integrity
workers = 1

# Threaded worker model to serve multiple concurrent SSE streaming requests
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", "8"))

# Long timeout for SSE stream connections (in seconds)
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
