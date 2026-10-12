import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse

def load_env_files():
    """Load RENDER_API_KEY and RENDER_SERVICE_ID from local .env files if present."""
    env_paths = [
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    ]
    for p in env_paths:
        abs_p = os.path.abspath(p)
        if os.path.isfile(abs_p):
            with open(abs_p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v

def make_render_request(endpoint, api_key):
    url = f"https://api.render.com/v1/{endpoint.lstrip('/')}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "User-Agent": "StickyMindGrid-Agent/1.0"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else str(e)
        print(f"Render API HTTP Error ({e.code}): {err_msg}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Network error contacting Render API: {e}", file=sys.stderr)
        return None

def main():
    load_env_files()
    api_key = os.getenv("RENDER_API_KEY")
    if not api_key:
        print("ERROR: RENDER_API_KEY is not set.")
        print("Please add 'RENDER_API_KEY=rnd_...' to your .env file.")
        sys.exit(1)

    service_id = os.getenv("RENDER_SERVICE_ID")

    # Fetch services to get ownerId and confirm service_id
    services_data = make_render_request("services?limit=20", api_key)
    if not services_data:
        print("Failed to retrieve services from Render.")
        sys.exit(1)

    services = [s.get("service", s) for s in services_data]
    if not services:
        print("No services found on this Render account.")
        sys.exit(0)

    # Match target service
    target_service = None
    if service_id:
        target_service = next((s for s in services if s.get("id") == service_id), None)
    if not target_service:
        target_service = next((s for s in services if "sticky" in (s.get("name") or "").lower()), services[0])

    service_id = target_service.get("id")
    owner_id = target_service.get("ownerId")
    service_name = target_service.get("name")
    service_url = target_service.get("serviceDetails", {}).get("url", "")

    print(f"==================================================")
    print(f"Render Service: {service_name} ({service_id})")
    print(f"URL: {service_url}")
    print(f"==================================================")

    # 1. Check Recent Deploys
    print("\n--- Recent Deployment Status ---")
    deploys = make_render_request(f"services/{service_id}/deploys?limit=3", api_key)
    if deploys and isinstance(deploys, list):
        for d in deploys:
            dep = d.get("deploy", d)
            status = dep.get("status")
            commit_msg = dep.get("commit", {}).get("message", "N/A") if dep.get("commit") else "N/A"
            created = dep.get("createdAt", "")
            print(f"• [{status.upper()}] Created: {created[:19]} | Commit: {commit_msg[:50]}")

    # 2. Fetch Live Logs (direction=backward gets latest logs first)
    limit = 50
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])

    print(f"\n--- Latest Live Server Logs ({limit} most recent lines) ---")
    query_params = {
        "ownerId": owner_id,
        "resource": service_id,
        "limit": limit,
        "direction": "backward"
    }
    encoded_query = urllib.parse.urlencode(query_params)
    logs_res = make_render_request(f"logs?{encoded_query}", api_key)

    if not logs_res or "logs" not in logs_res:
        print("No log entries returned or failed to query logs.")
        return

    logs = logs_res.get("logs", [])
    if not logs:
        print("No recent log lines found.")
        return

    # Print in chronological order (oldest -> newest in the fetched window)
    for entry in reversed(logs):
        ts = entry.get("timestamp", "")[:19].replace("T", " ")
        msg = entry.get("message", "").rstrip()
        
        # Check log level from labels
        labels = {lb.get("name"): lb.get("value") for lb in entry.get("labels", []) if isinstance(lb, dict)}
        level = labels.get("level", "info").upper()

        if level in ("ERROR", "FATAL") or "500" in msg or "traceback" in msg.lower() or "exception" in msg.lower():
            print(f"[{ts}] [{level}] ! {msg}")
        else:
            print(f"[{ts}] [{level}] {msg}")

if __name__ == "__main__":
    main()
