**Status:** Verified | **Last scanned:** 2026-10-13 | **Audience:** DevOps, Admins

# 14 — Operations, Deployment & Incident Runbooks (`14-operations.md`)

This document covers deployment topology, environment variables, database initialization and pooling, lazy on-demand cleanup jobs (including the 30-day trash purge), storage and retention policies, health monitoring, and incident runbooks derived from the codebase.

---

## 1. Deployment Topology & Environments

| Deployment Topology (Mermaid) | Text Version |
|---|---|
| ```mermaid
flowchart LR
    Browser["User Browser"]
    subgraph Vercel["Vercel CDN (Frontend)"]
        SPA["Vite React SPA\n(vercel.json -> dist/)"]
    end
    subgraph Render["Render Web Service (Backend)"]
        Gunicorn["Gunicorn / Flask 3.0\n(backend/run.py -> create_app)"]
        SSE["In-Memory EventBroadcaster\n(event_broadcaster.py)"]
        Disk["Local File Storage\n(backend/uploads/)"]
    end
    subgraph DB["Supabase Postgres (pooler) / Local MySQL"]
        Postgres[("PostgreSQL\n(psycopg2, sslmode=verify-full)")]
    end

    Browser -- "HTTPS /*" --> SPA
    Browser -- "REST & SSE /api/*" --> Gunicorn
    Gunicorn --> SSE
    Gunicorn --> Disk
    Gunicorn -- "pool_pre_ping=True\npool_recycle=300s" --> Postgres
``` | 1. **Frontend (Vercel)**: Built via `npm run build` (`vite build`, `package.json:L7`) into `dist/` (`vercel.json:L2-L4`). All non-asset paths rewrite to `/index.html` (`vercel.json:L5-L10`), while `/assets/*` are cached for 1 year (`max-age=31536000, immutable`, `vercel.json:L11-L21`).<br>2. **Backend (Render)**: Runs Flask (`backend/run.py:L4`, `gunicorn>=21.2.0` in `backend/requirements.txt:L10`) on the native Python service `sticky-mind-grid-api` (rootDir `backend/`, runtime `python`, health check `/api/health`, auto-deploy from `main`). A `Procfile` exists at the repository root; `render.yaml` and `Dockerfile` do not. Render build/start settings are configured externally in the Render dashboard (`scripts/fetch_render_logs.py:L1-L137`).<br>3. **Database (PostgreSQL / MySQL / SQLite)**: Production uses Supabase Postgres through the shared pooler on port 6543 with `sslmode=verify-full` and the bundled Supabase root CA (`backend/config.py`, `backend/certs/supabase-prod-ca-2021.crt`); local dev defaults to MySQL `sticky_mind_grid`; Playwright E2E uses MySQL `sticky_mind_grid_test` (`e2e/run.mjs:L6`); Pytest uses `sqlite:///:memory:` (`backend/tests/conftest.py:L19`). |

### Environment Summary Matrix

| Environment | Frontend Origin | Backend URL | Database Target | Source Citations |
|---|---|---|---|---|
| **Local Dev** | `http://localhost:8080` (Vite proxy `/api` -> `127.0.0.1:5000`) | `http://127.0.0.1:5000` | `mysql+pymysql://root@localhost/sticky_mind_grid` | `vite.config.ts:L8-L18`, `backend/config.py:L33` |
| **Playwright E2E** | `http://localhost:5173` (or `127.0.0.1:5173` in CI) | `http://127.0.0.1:5000` | `mysql+pymysql://root@localhost/sticky_mind_grid_test` | `playwright.config.ts:L11, L26`, `e2e/run.mjs:L6-L10`, `.github/workflows/test.yml:L60-L134` |
| **Backend Pytest** | N/A (Flask test client) | In-process | `sqlite:///:memory:` | `backend/tests/conftest.py:L17-L36` |
| **Production** | `https://sticky-mind-grid.vercel.app` (`*.vercel.app`) | Render Web Service (`/api`) | Supabase Postgres (`*.pooler.supabase.com:6543` / `DATABASE_URL`) | `backend/config.py`, `backend/app/__init__.py:L29-L30` |

---

## 2. Configuration & Environment Variables

Never commit real secrets to `.env` or `backend/.env` (both are gitignored in `.gitignore:L28-L32`). Use placeholders when configuring environments.

| Variable | Layer | Default Value in Code | Citation | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend | `` `http://${window.location.hostname \|\| "127.0.0.1"}:5000/api` `` | `src/config/api.ts:L3-L6`, `.env.example:L3` | Base URL for all REST and SSE requests. |
| `DATABASE_URL` | Backend | `'mysql+pymysql://root@localhost/sticky_mind_grid'` | `backend/config.py` | SQLAlchemy URI. Normalizes `mysql://`/`postgres://` schemes. PostgreSQL TLS defaults to `require`; Supabase hosts auto-upgrade to `verify-full` with the bundled CA. MySQL Aiven URLs are converted to a verified TLS `connect_args` block. |
| `DB_SSL_MODE` | Backend | `require` (Postgres); `verify-full` for Supabase | `backend/config.py` | libpq SSL mode (`disable`, `allow`, `prefer`, `require`, `verify-ca`, `verify-full`). Production should use `verify-full`. |
| `DB_SSL_CA` | Backend | `backend/certs/supabase-prod-ca-2021.crt` for Postgres verify modes | `backend/config.py` | CA bundle path. For MySQL it is passed as the PyMySQL `ca` file. |
| `SECRET_KEY` | Backend | `'dev-secret-key'` | `backend/config.py:L32` | Flask secret key (`<PLACEHOLDER_SECRET_KEY>` in prod). |
| `JWT_SECRET_KEY` | Backend | `'super-secret-jwt-key-for-development-32-chars-long'` | `backend/config.py:L39` | Signing key for 24h JWT Bearer tokens (`JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)`, `L41`). |
| `CORS_ORIGINS` | Backend | `'http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,https://sticky-mind-grid.vercel.app'` | `backend/config.py:L44-L52`, `backend/app/__init__.py:L22-L33` | Comma-separated allowed origins, merged with `base_origins` and regex `r"https:\/\/.*\.vercel\.app"`. |
| `MAX_UPLOAD_MB` | Backend | `'25'` (25 MB) | `backend/config.py:L55` | Sets `MAX_CONTENT_LENGTH` (`26,214,400` bytes). *(Note: `backend/.env.example:L18` sets `10`).* |
| `MAX_BOARD_STORAGE_MB` | Backend | `'100'` (100 MB) | `backend/config.py:L56` | Sets `MAX_BOARD_STORAGE_BYTES` per board (`FileService.check_board_and_owner_quota`, `file_service.py:L196-L199`). |
| `MAX_OWNER_STORAGE_MB` | Backend | `'500'` (500 MB) | `backend/config.py:L57` | Sets `MAX_OWNER_STORAGE_BYTES` across all active boards owned by a user (`file_service.py:L201-L205`). |
| `ACTIVITY_RETENTION_DAYS` | Backend | `'0'` (`0` = keep forever) | `backend/config.py:L59` | Filters out activity log rows older than `N` days on read (`activity_service.py:L9-L16`). |
| `ALLOWED_UPLOAD_EXTENSIONS` | Backend | 37 file extensions (`png,jpg,...,flac`) | `backend/config.py:L60-L74` | Comma-separated upload extension allowlist. |
| `FLASK_DEBUG` | Backend | `'true'` | `backend/run.py:L7` | Enables Flask debug mode when running `python run.py`. Set to `"false"` in CI/production. |
| `FLASK_ENV` | Backend | `'development'` | `backend/app/routes/system_routes.py:L20` | Reported in `GET /api/health`. |
| `RENDER_API_KEY` | CLI Script | `None` | `scripts/fetch_render_logs.py:L47-L51` | Render API Bearer token (`<PLACEHOLDER_RENDER_API_KEY>`) for pulling live deploy/runtime logs. |
| `RENDER_SERVICE_ID` | CLI Script | Auto-detected | `scripts/fetch_render_logs.py:L53, L66-L71` | Optional Render service ID override. |

---

## 3. Database Operations, Connection Pooling & Schema Sync

1. **Connection Pool Tuning (`backend/config.py:L6-L10, L36`)**:
   - `pool_pre_ping: True` verifies MySQL socket liveness before each checkout.
   - `pool_recycle: 280` recycles connections every 280 seconds before 300-second cloud firewall idle drops.
   - `pool_timeout: 20` bounds pool checkout waits to 20 seconds.
2. **SSE Database Session Release (`backend/app/routes/board_routes.py:L85, L90`, `message_routes.py:L166`)**:
   - Long-lived SSE endpoints call `db.session.remove()` immediately after checking authentication and board access so open streams do not hold SQLAlchemy pool connections.
3. **Startup Schema Auto-Sync (`backend/app/__init__.py:L88-L172`)**:
   - On `create_app()` startup (when `not app.config.get("TESTING")`), `_auto_sync_schema(app)` runs `db.create_all()` (`L99`) and inspects existing tables (`sa_inspect(db.engine)`, `L101`) to issue idempotent `ALTER TABLE <table_name> ADD COLUMN ...` statements for columns added across releases (`L103-L168`).
   - All exceptions inside `_auto_sync_schema` are silently swallowed (`except Exception: pass`, `L170-L172`).
4. **Database Utility Scripts**:
   - **Non-destructive init**: `python backend/init_db.py` (`backend/init_db.py:L1-L32`) runs `create_app()` / `_auto_sync_schema()` and lists tables.
   - **Destructive seed (DEV/TEST ONLY)**: `python backend/seed.py` (`backend/seed.py:L23-L24`) calls `db.drop_all()` and `db.create_all()`, wiping all data before seeding demo records.

---

## 4. Background Jobs & Lazy On-Demand Cleanup

> **Not found in code**: There is **no** background job runner, cron daemon, Celery worker, or APScheduler thread in the repository. All trash purges and invitation expirations run **lazily inside HTTP request handlers**.

| Trash Purge Lifecycle (Mermaid) | Text Version |
|---|---|
| ```mermaid
sequenceDiagram
    participant Client as Editor / Owner Browser
    participant API as Flask Route (task_routes / board_routes)
    participant Svc as TaskService / BoardService
    participant Disk as FileService (backend/uploads/)
    participant DB as MySQL Database

    Client->>API: GET /api/boards/:boardId/trash
    API->>Svc: TaskService.get_deleted_tasks(boardId)
    Svc->>Svc: purge_expired_deleted_tasks(boardId, days=30)
    Svc->>DB: SELECT tasks WHERE is_deleted=True AND deleted_at < now - 30d
    loop Each expired task
        Svc->>Disk: FileService.cleanup_task_attachments(task)
        Svc->>DB: db.session.delete(task)
    end
    Svc->>DB: db.session.commit()
    Svc->>DB: SELECT remaining trashed tasks
    API-->>Client: 200 OK [remaining trashed tasks]
``` | 1. **Task Trash Purge (`backend/app/services/task_service.py:L47-L64, L66-L70`)**: Only runs when an `editor`+ user calls `GET /api/boards/<board_id>/trash` (`backend/app/routes/task_routes.py:L29-L37`). `TaskService.purge_expired_deleted_tasks()` queries tasks on that board with `is_deleted == True` and `deleted_at < utcnow() - 30 days`, deletes their physical files via `FileService.cleanup_task_attachments()`, and hard-deletes the rows.<br>2. **Board Trash Purge (`backend/app/services/board_service.py:L14-L25, L316-L327`)**: Runs whenever any user calls `GET /api/boards` or `GET /api/boards/trash`. Queries all boards globally where `is_deleted == True` and `deleted_at < utcnow() - 30 days` and hard-deletes them.<br>3. **Invitation Expiry (`backend/app/services/board_service.py:L50-L56, L514-L517`)**: Pending `BoardInvitation` rows (`expires_at = created_at + 7 days`, `L466`) are marked `status = 'expired'` lazily when invitations are listed or accepted. |

---

## 5. File Storage, Backups & Retention

### 5.1 Local Upload Storage & Quotas (`backend/app/services/file_service.py`)
- **Storage Path**: `backend/uploads/` (`file_service.py:L8`), with uploader ownership tracked in `backend/uploads/.uploaders.json` (`L9-L11, L55-L60`).
- **Validation & Quotas**:
  - Malware/script scan on first 2 MB (`scan_bytes_for_malware`, `L81-L109`): blocks EICAR test string, Windows PE (`MZ`), ELF (`\x7fELF`), Mach-O, `#!`, `<script`, and `javascript:`.
  - Size & Quota limits: 25 MB max per file (`config.py:L55`), 5 MB max + raster magic-byte check for board banners (`file_service.py:L12, L63-L78`), 100 MB max per board (`MAX_BOARD_STORAGE_BYTES`, `L196-L199`), and 500 MB max per board owner (`MAX_OWNER_STORAGE_BYTES`, `L201-L205`).
- **Physical File Deletion (`FileService.cleanup_task_attachments`, `L210-L252`)**:
  - Triggered on permanent task deletion (`task_service.py:L594`), empty board trash (`L627`), and 30-day task trash auto-purge (`L61`).
  - **Known Orphan File Gaps**: Removing an attachment from an active task (`task_service.py:L266`) or hard-deleting a board (`board_service.py:L21-L24, L359-L366`) does **not** invoke `FileService.cleanup_task_attachments()`, leaving orphaned files in `backend/uploads/`.

### 5.2 Backups & Data Export
- **Automated Database / Disk Backups**: **Not found in code** (no backup scripts or object-storage sync exist in the repository).
- **Application JSON Exports**:
  - **Board Export**: `GET /api/boards/<board_id>/export` (`backend/app/routes/board_routes.py:L174-L182`, `admin`+) exports board metadata, columns, active tasks, and members.
  - **User Data Export**: `GET /api/users/me/export` (`backend/app/routes/user_routes.py:L83-L123`) downloads `sticky_mind_grid_export_<user_prefix>.json` containing the user's profile, preferences, boards, active tasks, and notes.
- **Activity Retention**: Controlled by `ACTIVITY_RETENTION_DAYS` (`backend/config.py:L59`, default `0` = unlimited). When `> 0`, `ActivityService._get_retention_cutoff()` (`backend/app/services/activity_service.py:L9-L16`) filters out older rows on `GET /api/activities` without deleting them from MySQL.

---

## 6. Monitoring, Health Checks & Diagnostics

1. **Health Endpoint (`GET /api/health`, `backend/app/routes/system_routes.py:L8-L22`)**:
   - Executes `SELECT 1` (`L12`). Returns `200 OK` (`{"status": "healthy", "database": "connected", "version": "1.2.0", ...}`) or `503 Service Unavailable` (`{"status": "degraded", "database": "disconnected"}`).
   - Rendered in the UI under **Settings → About** (`src/components/settings/tabs/AboutTab.tsx:L29-L49`).
2. **Render Log Fetcher (`scripts/fetch_render_logs.py:L1-L134`)**:
   - Run `python scripts/fetch_render_logs.py [limit]` (requires `RENDER_API_KEY` in `.env` or `backend/.env`).
   - Prints the 3 latest Render deployments (`L85-L92`) and tails the last `N` log lines (`L95-L130`), flagging lines containing `error`, `exception`, `traceback`, `500`, `critical`, or `fatal` with `!` (`L125-L128`).
3. **Client Polling & Reconnection Fallbacks**:
   - Board SSE (`src/hooks/useBoardRealtime.ts:L294-L298`) retries `EventSource` connections every `3000ms` and places the board UI into `"Read-only • Reconnecting..."` mode while disconnected.
   - HTTP polling fallbacks remain active while the browser tab is visible: Tasks (`4000ms`, `src/hooks/useTasks.ts:L51-L55`), Activities (`5000ms`, `src/hooks/useActivity.tsx:L46-L50`), Notifications (`6000ms`, `src/components/notifications/NotificationBell.tsx:L38, L54`), Boards (`8000ms`, `src/hooks/useBoards.ts:L154-L167`), and Messages (`10000ms`/`15000ms`, `src/hooks/useMessages.ts:L25, L48, L62`).

---

## 7. Incident Runbooks (Code-Evident Failure Modes)

### Runbook 1: Mass `401 Unauthorized` & Forced Logout After Deploy or Key Change
- **Root Cause in Code**: `backend/config.py:L39` falls back to a default `JWT_SECRET_KEY` if unset in the environment. If `JWT_SECRET_KEY` is changed, rotated, or omitted across workers, `decode_token` / `@jwt_required()` returns HTTP `401`. On any `401` response, `src/services/apiUtils.ts:L94-L101` clears `localStorage` (`auth_token`) and redirects the browser to `/login`.
- **Resolution**:
  1. Verify `JWT_SECRET_KEY` and `SECRET_KEY` are explicitly configured in Render environment variables (`backend/config.py:L32, L39`).
  2. Have affected users log in again to receive a newly signed 24-hour JWT (`JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)`, `config.py:L41`).

### Runbook 2: Browser CORS Preflight Failures (`TypeError: Failed to fetch`)
- **Root Cause in Code**: `backend/app/__init__.py:L22-L42` restricts `/api/*` requests to origins in `CORS_ORIGINS` (`backend/config.py:L44-L52`), `https://sticky-mind-grid.vercel.app`, and `r"https:\/\/.*\.vercel\.app"`.
- **Resolution**:
  1. Check the browser's `Origin` header against `CORS_ORIGINS` (`backend/config.py:L44-L52`).
  2. Add any new custom domain or dev port to the comma-separated `CORS_ORIGINS` environment variable (without trailing slashes) and restart the backend.

### Runbook 3: Database `503 Degraded` or `500 Internal Server Error` on Cloud MySQL
- **Root Cause in Code**: `GET /api/health` (`system_routes.py:L10-L22`) returns `503` when `SELECT 1` fails, and unhandled SQLAlchemy errors trigger `@app.errorhandler(500)` (`backend/app/__init__.py:L52-L56`). Cloud MySQL providers (such as Aiven) require SSL and drop idle connections.
- **Resolution**:
  1. Run `python scripts/fetch_render_logs.py 150` to inspect the SQLAlchemy traceback.
  2. For MySQL deployments, ensure `DATABASE_URL` contains `ssl-mode=REQUIRED` or `aivencloud.com` so `backend/config.py` enables TLS. For PostgreSQL/Supabase, confirm `DB_SSL_MODE=verify-full` and the bundled CA are in use.
  3. Confirm Gunicorn worker count does not exceed your database instance's `max_connections` limit.

### Runbook 4: Real-Time SSE Events Not Delivering Across Clients
- **Root Cause in Code**: `EventBroadcaster` (`backend/app/utils/event_broadcaster.py:L7-L120`) stores subscriber queues (`queue.Queue(maxsize=100)`) in **process-local memory**.
  - If Gunicorn runs with multiple worker processes (`--workers > 1`), mutations handled by Worker A only broadcast to SSE clients connected to Worker A.
  - If a slow client's queue reaches 100 items, `q.put_nowait()` raises `queue.Full` and silently drops events (`event_broadcaster.py:L51-L53, L79-L80`).
- **Resolution**:
  1. Configure Gunicorn to run a **single worker process with multiple threads** (e.g., `gunicorn run:app --workers 1 --threads 8`) so all requests share the singleton `broadcaster` instance.
  2. Affected clients will automatically resynchronize via the 4s–15s HTTP polling hooks (`useTasks.ts:L52`, `useBoards.ts:L161`).

### Runbook 5: File Upload Quota Errors (`400`) or Missing Attachments After Redeploy (`404`)
- **Root Cause in Code**:
  - **Quota count includes Trash**: `FileService.get_board_storage_usage()` (`backend/app/services/file_service.py:L145`) sums attachments across **all** `Task` rows on the board without filtering `Task.is_deleted == False`. Soft-deleted tasks in the Trash Bin continue consuming the 100 MB board / 500 MB owner quota until permanently purged.
  - **Ephemeral disk**: Uploads and `.uploaders.json` are stored on the local filesystem at `backend/uploads/` (`file_service.py:L8-L10`). Container restarts on ephemeral hosting wipe `backend/uploads/`, causing `GET /api/files/<filename>` to return `404 File not found` (`file_service.py:L464-L465`).
- **Resolution**:
  1. If a board hits the 100 MB quota (`Board storage quota (100 MB) exceeded`), have a board `admin` or `owner` empty the board's Trash Bin (`DELETE /api/boards/<board_id>/trash`, `task_routes.py:L39-L47`) to purge soft-deleted task files.
  2. Mount a persistent volume at `backend/uploads/` in production so uploaded files and `.uploaders.json` survive container restarts.

### Runbook 6: Runtime & Certificate Security Patching (October 2026 Advisory)

**Trigger:** Render advisory covering the eMudhra intermediate-CA compromise, the October 2026 Node.js security release, and PHP2Shell.

**Applicability (verified 2026-10-24):**
- **eMudhra CA — applies.** The native Python backend makes outbound HTTPS requests to EmailJS, Google/GitHub/Microsoft OAuth, Supabase, and remote attachment/avatar URLs through `urllib`, which uses the system CA store. Rebuilding the Render service refreshes that store.
- **Node.js — build-time only.** No Node.js process runs in production: the Render service runtime is `python` and the frontend is static on Vercel. CI is pinned to **24.22.1** through `.nvmrc`; `package.json` requires Node **24.x**. Update Vercel's Node.js version to 24.x as well.
- **PHP2Shell — not applicable.** No PHP runtime or Docker image is deployed. The only PHP file is vendored under `node_modules/` and is never executed.

**Procedure:**
1. Confirm the backend is the native Python service `sticky-mind-grid-api` (rootDir `backend/`, runtime `python`). Do not use a Docker rebuild path.
2. In Render, choose **Clear build cache & deploy**. This refreshes system packages and the system certificate store.
3. Confirm the deploy reaches `live` and `GET /api/health` returns `200`.
4. Smoke-test outbound HTTPS: OAuth start for each configured provider, invitation email, Supabase upload/avatar, and external image attachment.
5. Confirm CI used Node **24.22.1** from `.nvmrc`, and that Vercel built with Node 24.x.
6. Record the deploy ID, date, and verification result below.

**Production database TLS:**
- Supabase Postgres is reached through the shared pooler on port 6543.
- `DATABASE_URL` has no `sslmode`; `backend/config.py` auto-selects `verify-full` for Supabase hosts and uses `backend/certs/supabase-prod-ca-2021.crt`.
- Root CA SHA-256: `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa` (Supabase Root 2021 CA, valid to 2031-04-26).
- `psycopg2`/libpq verification was validated against the live pooler on 2026-10-24. Note: Supabase's shared-pooler intermediate CA lacks a Key Usage extension, which fails Python 3.13 native `ssl` strict verification; re-test if the driver changes from psycopg2.

**Verification log:**
- 2026-10-24: Pre-redeploy health check `200` on commit `c8b552c`.
- 2026-10-24: Clear-build-cache deploy `dep-dbe2epk0a7sc7398u6v0` for commit `d6b2f11` reached `live`; `GET /api/health` returned `200` with `database: connected` under PostgreSQL `sslmode=verify-full`. The last 100 Render log lines contained no errors.
- 2026-10-24: Follow-up deploy `dep-dbe2qlrrjlhs738rfkbg` for commit `f8dd1e4` reached `live`; `GET /api/health` verified `200` with `commit: f8dd1e4` and `database: connected`. Render logs confirmed clean operations.
- 2026-10-24: Vercel served the updated frontend (`200`, new `/assets/index-*.js` bundle). CI is pinned to Node `24.22.1` from `.nvmrc`.
