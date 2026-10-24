import argparse
import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse

CANONICAL_SERVICE_NAMES = {
    "prod": "sticky-mind-grid-api",
    "dev": "sticky-mind-grid-api-dev",
}


def normalize_env(env: str = "prod") -> str:
    return "dev" if (env or "prod").strip().lower() in ("dev", "development") else "prod"


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Fetch Render deployment status and live server logs."
    )
    parser.add_argument(
        "--env",
        choices=["prod", "production", "dev", "development"],
        default="prod",
        help="Target environment ('prod' or 'dev'). Defaults to 'prod'.",
    )
    parser.add_argument(
        "--service-id",
        default=None,
        help="Optional explicit Render service ID override.",
    )
    parser.add_argument(
        "limit",
        nargs="?",
        type=int,
        default=50,
        help="Number of recent log lines to fetch (default: 50).",
    )
    return parser.parse_args(argv)


def resolve_api_key(env: str = "prod", environ: dict = None) -> str:
    """Resolve the Render API key for the target environment, supporting separate Render accounts."""
    if environ is None:
        environ = os.environ
    env_key = normalize_env(env)
    if env_key == "dev":
        return (
            (environ.get("RENDER_API_KEY_DEV") or "").strip()
            or (environ.get("RENDER_API_KEY") or "").strip()
        )
    return (
        (environ.get("RENDER_API_KEY_PROD") or "").strip()
        or (environ.get("RENDER_API_KEY") or "").strip()
    )


def resolve_target_service(
    services: list[dict],
    env: str = "prod",
    explicit_service_id: str = None,
    environ: dict = None,
) -> dict:
    """Resolve the target Render service for the given environment without unsafe fallbacks."""
    if environ is None:
        environ = os.environ

    env_key = normalize_env(env)
    expected_name = CANONICAL_SERVICE_NAMES[env_key]

    target_id = (explicit_service_id or "").strip() or None
    if not target_id:
        if env_key == "dev":
            target_id = (environ.get("RENDER_SERVICE_ID_DEV") or "").strip() or None
        else:
            target_id = (
                (environ.get("RENDER_SERVICE_ID_PROD") or "").strip()
                or (environ.get("RENDER_SERVICE_ID") or "").strip()
                or None
            )

    if target_id:
        matched = next((s for s in services if s.get("id") == target_id), None)
        if not matched:
            key_hint = (
                " If your Dev service is in a separate Render account/workspace, also set RENDER_API_KEY_DEV=rnd_... in .env."
                if env_key == "dev" and not (environ.get("RENDER_API_KEY_DEV") or "").strip()
                else ""
            )
            raise LookupError(
                f"Render service ID '{target_id}' (for env='{env_key}') was not found in your Render account.{key_hint}"
            )
        return matched

    matched = next(
        (s for s in services if (s.get("name") or "").strip().lower() == expected_name),
        None,
    )
    if matched:
        return matched

    available = (
        ", ".join(f"{s.get('name', '<unnamed>')} ({s.get('id', '<no-id>')})" for s in services)
        or "none"
    )
    env_var_hint = "RENDER_SERVICE_ID_DEV" if env_key == "dev" else "RENDER_SERVICE_ID_PROD"
    raise LookupError(
        f"Could not find Render service '{expected_name}' for env='{env_key}'. "
        f"Available services: {available}. "
        f"Please set {env_var_hint} (or RENDER_SERVICE_ID_PROD / RENDER_SERVICE_ID_DEV) in .env."
    )


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
    args = parse_args()
    env_key = normalize_env(args.env)

    load_env_files()
    api_key = resolve_api_key(env_key, os.environ)
    if not api_key:
        print("ERROR: RENDER_API_KEY is not set.")
        print("Please add 'RENDER_API_KEY=rnd_...' (or RENDER_API_KEY_DEV / RENDER_API_KEY_PROD) to your .env file.")
        sys.exit(1)

    # Fetch services to get ownerId and confirm service_id
    services_data = make_render_request("services?limit=20", api_key)
    if not services_data:
        print("Failed to retrieve services from Render.")
        sys.exit(1)

    services = [s.get("service", s) for s in services_data]
    if not services:
        print("No services found on this Render account.")
        sys.exit(0)

    try:
        target_service = resolve_target_service(
            services=services,
            env=env_key,
            explicit_service_id=args.service_id,
            environ=os.environ,
        )
    except LookupError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    service_id = target_service.get("id")
    owner_id = target_service.get("ownerId")
    service_name = target_service.get("name")
    service_url = target_service.get("serviceDetails", {}).get("url", "")

    print("==================================================")
    print(f"Environment: {env_key.upper()}")
    print(f"Render Service: {service_name} ({service_id})")
    print(f"URL: {service_url}")
    print("==================================================")

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
    limit = args.limit

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
            try:
                print(f"[{ts}] [{level}] {msg}")
            except UnicodeEncodeError:
                safe_msg = msg.encode("ascii", errors="replace").decode("ascii")
                print(f"[{ts}] [{level}] {safe_msg}")


if __name__ == "__main__":
    main()
