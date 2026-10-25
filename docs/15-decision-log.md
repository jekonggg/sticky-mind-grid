**Status:** Verified | **Last scanned:** 2026-10-13 | **Audience:** Everyone

# 15 — Architectural & Engineering Decision Log (`15-decision-log.md`)

This document records the architectural and engineering decisions evident from the repository's source code, comments, database migrations (`backend/migrations/versions/*.py`), and Git commit history (`95d05da` through `aa07742`). Where a rationale or alternative is not explicitly stated in code comments, commit messages, or repository documentation, `"Reason not recorded"` or `"Not recorded"` is noted per project ground rules.

---

## 1. Architectural Evolution Overview

| Evolution Flow (Mermaid) | Text Version |
|---|---|
| ```mermaid
flowchart LR
    P1["Phase 1 (2025-01 – 2026-04)\n• React 18 + Vite + @dnd-kit SPA\n• Flask 3.0 + MySQL Backend\n• JSON Columns & Activity Table\n• JWT + Bcrypt Auth"]
    P2["Phase 2 (2026-08)\n• RBAC & Board Invitations\n• In-Memory SSE Broadcaster\n• Comments, @Mentions & Notes\n• Soft Delete Trash & CI Pipeline"]
    P3["Phase 3 (2026-09 – 2026-10)\n• 5-Tier RBAC + Board Invitations Table\n• Direct & Group Messaging\n• Account Deletion Succession\n• File Access Auth, Malware Scan & Quotas\n• 30-Day Board Trash & 409 Conflict Detection"]
    P1 --> P2 --> P3
``` | 1. **Phase 1 (`2025-01` – `2026-04`, commits `95d05da`–`72a8ae7`)**: Bootstrapped the React 18 + Vite + Tailwind + `@dnd-kit` frontend (`95d05da`, `e1f118d`), added the Flask 3.0 + SQLAlchemy + MySQL backend (`e7d28d2`), expanded hero/description fields to `LONGTEXT` (`0a01c5063dca`), added the `activities` table (`29673c8836d7`), and introduced JWT + Bcrypt authentication (`48b9709`, `0416cc5048fd`).<br>2. **Phase 2 (`2026-08`, commits `3a39f2b`–`bc9e2d0`)**: Added board membership RBAC (`7cfc178`), in-memory SSE broadcasting + float task ordering (`8fc1856`), comments and `@mentions` (`d57da0f`), Project Notes and multipart uploads (`eab9f82`), task soft-delete trash (`7af52a4`), security hardening (`9d5c837`, `6aa78e5`, `d849560`), and the 3-tier Vitest/Pytest/Playwright CI workflow (`340905d`, `71967df`).<br>3. **Phase 3 (`2026-09` – `2026-10`, commits `43d812a`–`aa07742`)**: Added real-time direct/group messaging (`43d812a`–`102e749`), 5-tier RBAC (`owner`, `admin`, `editor`, `commenter`, `viewer`) and `board_invitations` (`4c2f69d`, `7a8b9c0d1e2f`), account deletion owner succession (`d2362c4`), authenticated file downloads (`9ecbe12`), 30-day board soft-delete + `409 Conflict` detection (`3ef5408`), column WIP limits (`545ece1`), and upload malware/quota checks + immutable audit logs (`45e2a85`). |

---

## 2. Decision Summary Matrix

| ID | Decision | Date / Commit | Stated Reason | Stated Alternatives | Primary Citations |
|---|---|---|---|---|---|
| **DEC-01** | React 18 + Vite (SWC) + Tailwind + shadcn/ui + `@dnd-kit` frontend | `2025-01-01` (`95d05da`), `2026-04-07` (`e1f118d`) | Reason not recorded (scaffolded from `vite_react_shadcn_ts_2026-03-20`) | Not recorded | `package.json:L17-L98`, `vite.config.ts:L1-L27` |
| **DEC-02** | Board as the strict multi-tenant isolation boundary | `2026-08-24` (`0f60c61`, `7cfc178`), `2026-09-13` (`1447a4c`) | Prevent cross-board data leakage; users only see boards, tasks, and teammates from accepted board memberships (`user_routes.py:L135`) | Global workspace directory (`workspace_id` column added in `8b9c0d1e2f3a` for future organization grouping) | `backend/app/utils/decorators.py:L19-L95`, `backend/app/routes/user_routes.py:L130-L136` |
| **DEC-03** | Embed board columns & task sub-entities (`tags`, `checklist`, `attachments`, `followers`) as JSON columns | `2026-04-08` (`e7d28d2`) | Avoid join tables for data always loaded and mutated with its parent Board or Task (`AGENTS.md:L97-L98`) | Separate relational tables (`AGENTS.md:L97`) | `backend/app/models/board.py:L19`, `backend/app/models/task.py:L25-L28` |
| **DEC-04** | Upgrade `boards.hero_image_url` and `tasks.description` to MySQL `LONGTEXT` | `2026-04-08` (`0a01c5063dca`) | Support large base64 hero banners and long Markdown descriptions exceeding 64 KB `TEXT` | Standard `db.Text()` (migrated away from in `0a01c5063dca`) | `backend/migrations/versions/0a01c5063dca_upgrade_text_columns_to_longtext_for_.py:L21-L31` |
| **DEC-05** | Stateless 24h JWT Bearer auth in `localStorage` + Bcrypt + OAuth account linking | `2026-04-13` (`48b9709`), `2026-08-25` (`616c6e6`), `2026-10-08` (`45f5893`) | Centralize token storage (`auth_token`) for REST, multipart upload, and SSE query-param auth across origins (`616c6e6`) | Hardcoded/inconsistent localStorage keys (fixed in `616c6e6`) | `backend/config.py:L39-L41`, `src/config/api.ts:L10-L15`, `backend/app/routes/auth_routes.py:L54-L115` |
| **DEC-06** | In-memory thread-safe SSE (`EventBroadcaster`) + DB connection release before streaming | `2026-08-24` (`8fc1856`) | Push real-time board and message events over HTTP without holding SQLAlchemy pool connections (`board_routes.py:L89-L90`) | Holding request DB sessions open or external message brokers | `backend/app/utils/event_broadcaster.py:L7-L120`, `backend/app/routes/board_routes.py:L70-L119` |
| **DEC-07** | Hybrid state management: raw `useState` + polling + optimistic updates for Boards/Tasks, React Query for secondary domains | `2026-08-24` (`8fc1856`, `d57da0f`) | Instantaneous optimistic UI updates with rollback on Kanban drag/edit (`AGENTS.md:L80-L85`), backed by polling if SSE drops | React Query everywhere | `src/hooks/useTasks.ts:L13-L192`, `src/hooks/useBoards.ts:L66-L347`, `AGENTS.md:L81-L85` |
| **DEC-08** | 5-tier RBAC hierarchy (`owner > admin > editor > commenter > viewer`) with `'member'` alias | `2026-09-08`–`2026-09-20` (`4c2f69d`, `edfa7aa`, `d9363d32af21`) | Separate comment-only (`commenter`) and read-only (`viewer`) access from task editing (`editor`), while keeping `'member': 3` for backwards compatibility (`decorators.py:L14`) | 3-tier (`admin`, `member`, `viewer`) used in early Phase 2 (`5ddaf99`) | `backend/app/utils/decorators.py:L10-L17`, `src/hooks/useBoardPermissions.ts:L53-L224` |
| **DEC-09** | Dedicated `board_invitations` table with 7-day expiry, 30/day rate limit, and unregistered email support | `2026-09-08` (`4c2f69d`), `2026-10-11` (`7a8b9c0d1e2f`), `2026-10-12` (`45e2a85`) | Allow inviting unregistered emails (attached on signup via `attach_pending_invitations`), expire stale invites after 7 days, and block invite spam (`board_service.py:L435-L470`) | Direct `BoardMember` insertion for registered users only (`135e98f`) | `backend/app/models/board_invitation.py:L6-L52`, `backend/app/services/board_service.py:L423-L508` |
| **DEC-10** | Account deletion ownership succession & `"Former member"` content preservation | `2026-09-16` (`d2362c4`), `2026-10-11` (`8b9c0d1e2f3a`, `d9363d32af21`) | Prevent shared boards and audit history from breaking when a user deletes their account (`user_service.py:L14-L86`) | Cascading hard-delete of user's boards and comments | `backend/app/services/user_service.py:L14-L86`, `backend/app/models/comment.py:L25-L39` |
| **DEC-11** | 30-day soft delete for both Tasks and Boards with lazy on-demand purge | `2026-08-25` (`7af52a4`), `2026-10-12` (`3ef5408`) | Provide a 30-day recovery grace period before permanent deletion (`board_routes.py:L157`, `task_service.py:L47-L64`) | Immediate hard delete (`DELETE /api/boards/<id>` without `?soft=true` retained for permanent deletion) | `backend/app/services/task_service.py:L47-L64`, `backend/app/services/board_service.py:L14-L25, L297-L356` |
| **DEC-12** | Optimistic concurrency (`409 Conflict`) for task descriptions + last-write-wins for card moves | `2026-10-12` (`3ef5408`) | Prevent silent overwrite of concurrent description edits (`expectedUpdatedAt` check) while keeping Kanban drag-and-drop non-blocking (`task_service.py:L261-L285`) | Unconditional last-write-wins on all fields | `backend/app/services/task_service.py:L261-L285`, `backend/app/routes/task_routes.py:L162-L167` |
| **DEC-13** | Authenticated file serving (`?token=`), pre-write malware signature scan, and board/owner storage quotas | `2026-09-22` (`9ecbe12`), `2026-09-23` (`34d197c`), `2026-10-12` (`45e2a85`) | Prevent unauthorized access to board/chat attachments (`verify_file_access`), block executable/script/EICAR uploads, and cap storage at 100 MB/board and 500 MB/owner (`file_service.py:L81-L207, L382-L460`) | Public unauthenticated `/api/files/<filename>` (still used only for user avatars, `34d197c`) | `backend/app/services/file_service.py:L81-L207, L382-L460`, `backend/app/routes/file_routes.py:L7-L60` |
| **DEC-14** | Append-only immutable activity audit log (`403` on `PUT`/`PATCH`/`DELETE`) & admin-only full board log | `2026-10-12` (`45e2a85`) | Preserve audit trail integrity (`activity_routes.py:L51-L55`) and restrict full board audit feeds to `admin`+ while allowing `viewer`+ to view card-level history (`L25-L29`) | Client-clearable activity log (`DELETE /api/activities` existed prior to `45e2a85`) | `backend/app/routes/activity_routes.py:L25-L55`, `src/hooks/useActivity.tsx:L105-L107` |
| **DEC-15** | Runtime `_auto_sync_schema()` on startup alongside Alembic migrations + Aiven SSL normalization | `2026-10-04` (`f34508a`), `2026-10-12` (`709b1d6`, `1a78758`) | Automatically add missing tables/columns on Render startup (`backend/app/__init__.py:L93-L172`) and strip `ssl-mode` query params for PyMySQL/Aiven compatibility (`config.py:L17-L29`) | Running manual `flask db upgrade` on every deploy | `backend/app/__init__.py:L88-L172`, `backend/config.py:L12-L29` |
| **DEC-16** | 3-Tier Database Isolation Policy (`sticky_mind_grid` vs. `sticky_mind_grid_test` vs. `sqlite:///:memory:`) | `2026-08-25` (`340905d`), `2026-08-26` (`b613f14`, `71967df`) | Guarantee automated Pytest and Playwright E2E suites never mutate or wipe the local development database (`AGENTS.md:L330-L342`) | Single shared local database | `backend/tests/conftest.py:L19`, `e2e/run.mjs:L6-L7`, `.github/workflows/test.yml:L60-L100` |

---

## 3. Detailed Decision Records

### DEC-01: React 18 + Vite (SWC) + TailwindCSS + shadcn/ui + `@dnd-kit` Frontend Stack
- **Date / Commits**: `2025-01-01` (`95d05da`), `2026-04-07` (`e1f118d`, `23d95f4`)
- **Decision**: Build the frontend SPA with React 18, TypeScript, Vite (`@vitejs/plugin-react-swc`), TailwindCSS, Radix UI (`shadcn/ui`), and `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Reason**: Reason not recorded in commit `95d05da` (`template: vite_react_shadcn_ts_2026-03-20`).
- **Alternatives**: Not recorded.
- **Citations**: `package.json:L17-L98`, `vite.config.ts:L1-L27`, `src/components/kanban/KanbanBoard.tsx`.

### DEC-02: Board as the Strict Tenant Boundary
- **Date / Commits**: `2026-08-24` (`0f60c61`, `7cfc178`), `2026-09-13` (`1447a4c`), `2026-09-19` (`c58a0e3`)
- **Decision**: Scope all access control, tasks, notes, comments, `@mentions`, teammates, and SSE streams to an individual `Board`. Users have zero visibility into boards or teammates unless they hold a `BoardMember` row with `status == 'accepted'` (or are `board.owner_id`).
- **Reason**: Stated in `backend/app/routes/user_routes.py:L135` (`# Strict board isolation: No common boards means no visible teammates`) and `backend/app/utils/decorators.py:L25-L26` (`Only memberships with status == 'accepted' count; pending or declined invitees have no access`).
- **Alternatives**: Workspace-level tenancy (`boards.workspace_id` was added in migration `8b9c0d1e2f3a` for organizational grouping, but permissions remain strictly per-board).
- **Citations**: `backend/app/utils/decorators.py:L19-L95`, `backend/app/routes/user_routes.py:L125-L169`, `backend/app/services/comment_service.py:L31-L82`.

### DEC-03: JSON Columns for Board Columns and Task Sub-Entities
- **Date / Commit**: `2026-04-08` (`e7d28d2`)
- **Decision**: Store `Board.columns` and `Task.tags`, `Task.checklist`, `Task.attachments`, and `Task.followers` as SQLAlchemy `db.JSON` columns rather than separate tables.
- **Reason**: Documented in `AGENTS.md:L97-L98` — columns and task sub-arrays are always fetched and rendered with their parent entity.
- **Alternatives**: Separate relational tables for columns, checklist items, and attachments.
- **Citations**: `backend/app/models/board.py:L19`, `backend/app/models/task.py:L25-L28`.

### DEC-04: MySQL `LONGTEXT` for Hero Banners and Task Descriptions
- **Date / Migration**: `2026-04-08` (Migration `0a01c5063dca`)
- **Decision**: Upgrade `boards.hero_image_url` and `tasks.description` from `TEXT` to `LONGTEXT` on MySQL (`db.Text().with_variant(LONGTEXT, "mysql")`).
- **Reason**: Stated in `backend/migrations/versions/0a01c5063dca_upgrade_text_columns_to_longtext_for_.py:L1-L31` — standard 64 KB `TEXT` truncated base64 banner images and long task descriptions.
- **Alternatives**: Standard `db.Text()`.
- **Citations**: `backend/app/models/board.py:L18`, `backend/app/models/task.py:L17`, `backend/migrations/versions/0a01c5063dca_upgrade_text_columns_to_longtext_for_.py:L21-L31`.

### DEC-05: Centralized 24h JWT Bearer Auth & Password Verification on Change
- **Date / Commits**: `2026-04-13` (`48b9709`), `2026-08-25` (`616c6e6`, `2a2b028`), `2026-10-08` (`45f5893`)
- **Decision**: Use 24-hour JWT Bearer tokens (`JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)`) stored under `TOKEN_STORAGE_KEY = "auth_token"` (`src/config/api.ts:L10`), require `currentPassword` verification before changing a password (`2a2b028`), and support OAuth (`google`, `github`, `microsoft`) with automatic email linking (`45f5893`).
- **Reason**: Centralizing `TOKEN_STORAGE_KEY` fixed broken SSE and file upload authentication caused by mismatched `localStorage` keys (`616c6e6`); requiring `currentPassword` prevents unauthorized password takeovers from an unattended session (`2a2b028`).
- **Alternatives**: Separate token keys across modules (replaced in `616c6e6`).
- **Citations**: `src/config/api.ts:L10-L15`, `src/services/apiUtils.ts:L64-L104`, `backend/app/routes/auth_routes.py:L54-L230`.

### DEC-06: In-Memory Thread-Safe SSE Broadcaster with Immediate DB Pool Release
- **Date / Commit**: `2026-08-24` (`8fc1856`)
- **Decision**: Implement real-time collaboration via Server-Sent Events (`EventBroadcaster` in `backend/app/utils/event_broadcaster.py:L7-L120`) using bounded queues (`maxsize=100`), 25-second `: ping` heartbeats, and immediate `db.session.remove()` before entering the SSE generator loop.
- **Reason**: Stated in `backend/app/routes/board_routes.py:L89-L90` (`# Release database connection back to the pool immediately so the long-lived SSE stream does not hold it`).
- **Alternatives**: WebSockets or external pub/sub brokers (not used; single-process threading assumed).
- **Citations**: `backend/app/utils/event_broadcaster.py:L7-L120`, `backend/app/routes/board_routes.py:L70-L119`, `backend/app/routes/message_routes.py:L152-L190`.

### DEC-07: Hybrid Client State (`useState` + Optimistic Polling vs. React Query)
- **Date / Commits**: `2026-08-24` (`8fc1856`, `d57da0f`)
- **Decision**: Use custom hooks with raw `useState`, optimistic state patching/rollback, and background polling for core Boards (`useBoards.ts`) and Tasks (`useTasks.ts`), while using `@tanstack/react-query` (`useQuery`/`useMutation`) for Comments, Notes, Notifications, Trash, and Messages.
- **Reason**: Documented in `AGENTS.md:L81-L85` — Kanban drag-and-drop and card edits require synchronous optimistic local mutations with rollback on error, whereas secondary modal/drawer resources fit standard cache invalidation.
- **Alternatives**: Using React Query for all state.
- **Citations**: `src/hooks/useTasks.ts:L13-L192`, `src/hooks/useBoards.ts:L66-L347`, `src/hooks/useMessages.ts:L1-L273`.

### DEC-08: 5-Tier RBAC Hierarchy with Backwards-Compatible `'member'` Alias
- **Date / Commits**: `2026-09-08` (`4c2f69d`), `2026-09-20` (`edfa7aa`), `2026-09-24` (`1d39bb9`)
- **Decision**: Expand the original 3-role model (`admin`, `member`, `viewer`) into a 5-role hierarchy: `owner (5) > admin (4) > editor (3) > commenter (2) > viewer (1)`, retaining `'member': 3` as an alias for `'editor'`. Additionally, restrict task assignment to `editor`+ (`task_routes.py:L74-L76`) and block deleting non-empty columns (`1d39bb9`).
- **Reason**: Stated in `backend/app/utils/decorators.py:L14` (`'member': 3, # backwards-compatibility alias for editor`) and commit `1d39bb9` (`restrict board edits to admins and block deleting populated columns`).
- **Alternatives**: 3-tier role system (`admin`, `member`, `viewer`).
- **Citations**: `backend/app/utils/decorators.py:L10-L17`, `backend/app/services/board_service.py:L170-L185, L959-L1095`, `src/hooks/useBoardPermissions.ts:L53-L224`.

### DEC-09: Dedicated `board_invitations` Table, 7-Day Expiry, Rate Limiting & Inviter Blocking
- **Date / Commits / Migration**: `2026-09-08` (`4c2f69d`), `2026-10-11` (Migration `7a8b9c0d1e2f`), `2026-10-12` (`45e2a85`)
- **Decision**: Store email invitations in `board_invitations` with a 7-day expiration (`expires_at`), cap invitations at 30/day per inviter, redact board descriptions on pending invites, allow invitees to report/block inviters, and automatically attach pending invitations when an unregistered email registers (`attach_pending_invitations`).
- **Reason**: Allow inviting users by email before they have created an account and prevent invitation spam/harassment (`board_service.py:L435-L470, L783-L809`).
- **Alternatives**: Requiring invitees to already exist in `users` before inviting (used prior to `7a8b9c0d1e2f`).
- **Citations**: `backend/app/models/board_invitation.py:L6-L52`, `backend/app/services/board_service.py:L423-L809`, `backend/app/routes/auth_routes.py:L12-L52`.

### DEC-10: Account Deletion Ownership Succession & `"Former member"` Attribution
- **Date / Commits / Migrations**: `2026-09-16` (`d2362c4`), `2026-10-11` (Migrations `8b9c0d1e2f3a`, `d9363d32af21`)
- **Decision**: When a user deletes their account (`DELETE /api/users/me`), transfer ownership of shared boards to the earliest-joined `admin` (or earliest-joined accepted member if no admin exists), hard-delete solo boards, and nullify `user_id` on surviving tasks, comments, and activities so they render as `"Former member"`.
- **Reason**: Stated in commit `d2362c4` (`implement account deletion with automatic owner promotion and content detachment`) to preserve collaborative work on shared boards while honoring account deletion.
- **Alternatives**: Blocking account deletion while owning boards, or cascading deletion of all owned boards regardless of other members.
- **Citations**: `backend/app/services/user_service.py:L14-L86`, `backend/app/models/task.py:L66-L78`, `backend/app/models/comment.py:L25-L39`, `backend/app/models/activity.py:L30-L46`.

### DEC-11: 30-Day Soft Delete for Tasks and Boards with On-Demand Purge
- **Date / Commits**: `2026-08-25` (`7af52a4`), `2026-10-12` (`3ef5408`)
- **Decision**: Soft-delete tasks (`DELETE /api/tasks/<id>`) and boards (`DELETE /api/boards/<id>?soft=true`) by setting `is_deleted = True` and `deleted_at = datetime.utcnow()`, and purge expired items (>30 days) lazily when `GET /api/boards/<id>/trash` or `GET /api/boards` is called.
- **Reason**: Stated in commit `3ef5408` (`add 30-day trash recovery`) to protect against accidental task or board deletion without requiring an external cron worker.
- **Alternatives**: Immediate hard deletion or background cron worker.
- **Citations**: `backend/app/services/task_service.py:L47-L64, L411-L642`, `backend/app/services/board_service.py:L14-L25, L297-L356`.

### DEC-12: Optimistic Concurrency (`409 Conflict`) for Task Descriptions vs. Last-Write-Wins for Card Moves
- **Date / Commit**: `2026-10-12` (`3ef5408`)
- **Decision**: Require `expectedUpdatedAt` conflict checking when updating `task.description` (returning HTTP `409 Conflict` with `currentTask` unless `forceOverwrite: true` is passed), while using last-write-wins and logging both moves when two users concurrently drag the same card.
- **Reason**: Prevent silent loss of long-form text edits during concurrent editing while keeping Kanban drag-and-drop fluid (`backend/app/services/task_service.py:L261-L285`, `backend/tests/test_realtime_conflicts.py:L9-L206`).
- **Alternatives**: Unconditional last-write-wins for descriptions, or pessimistic locking.
- **Citations**: `backend/app/services/task_service.py:L261-L285`, `backend/app/routes/task_routes.py:L162-L167`, `src/test/components/RealtimeCollaborationConflicts.test.tsx:L117-L202`.

### DEC-13: Permission-Checked File Downloads, Malware Scanning & Storage Quotas
- **Date / Commits**: `2026-09-22` (`9ecbe12`), `2026-09-23` (`34d197c`), `2026-10-12` (`45e2a85`)
- **Decision**: Authenticate `/api/files/<filename>` via Bearer header or `?token=<jwt>` query parameter (`verify_file_access`, keeping only user avatars public), scan the first 2 MB of uploads for EICAR/PE/ELF/Mach-O/script signatures, validate raster image magic bytes for banners, and enforce 100 MB per-board and 500 MB per-owner quotas.
- **Reason**: Stated in commits `9ecbe12` (`implement query token authentication for file endpoints`), `34d197c` (`permit unauthenticated access to public user avatar assets`), and `45e2a85` (`upload malware/quota checks`).
- **Alternatives**: Unauthenticated static file serving (replaced in `9ecbe12`).
- **Citations**: `backend/app/services/file_service.py:L63-L207, L382-L460`, `backend/app/routes/file_routes.py:L7-L60`, `src/services/apiUtils.ts:L106-L125`.

### DEC-14: Append-Only Immutable Activity Audit Log & Role-Scoped Visibility
- **Date / Commit**: `2026-10-12` (`45e2a85`)
- **Decision**: Block all `PUT`, `PATCH`, and `DELETE` requests to `/api/activities` with `403 Forbidden`, restrict the full board activity log (`GET /api/activities?boardId=X`) to `admin` and `owner`, and allow `viewer`+ to query card-specific history (`taskId` or `taskTitle`).
- **Reason**: Stated in `backend/app/routes/activity_routes.py:L25-L26, L55` (`Activity log entries are immutable and cannot be edited or deleted`) and `src/hooks/useActivity.tsx:L106` (`// Activity logs are append-only and immutable; manual clearing is prohibited.`).
- **Alternatives**: Allowing board members to clear the activity log (removed in `45e2a85`).
- **Citations**: `backend/app/routes/activity_routes.py:L25-L55`, `src/hooks/useActivity.tsx:L105-L107`.

### DEC-15: Startup `_auto_sync_schema()` & Aiven MySQL SSL Normalization
- **Date / Commits**: `2026-10-04` (`f34508a`), `2026-10-12` (`709b1d6`, `1a78758`)
- **Decision**: Execute `_auto_sync_schema(app)` during `create_app()` to run `db.create_all()` and `ALTER TABLE ... ADD COLUMN` for any missing columns, and normalize `aivencloud.com` / `ssl-mode` database URLs into PyMySQL `connect_args={"ssl": {"check_hostname": False}}`.
- **Reason**: Stated in commits `f34508a` (`Configure Aiven MySQL, Gunicorn, and Vercel routing`) and `709b1d6` (`schema changes to fix deployment issues`) so Render deployments self-heal schema drift without manual shell access.
- **Alternatives**: Relying exclusively on manual `flask db upgrade` commands during deployment.
- **Citations**: `backend/app/__init__.py:L88-L172`, `backend/config.py:L12-L29`.

### DEC-16: Strict 3-Environment Database Isolation (`dev` vs. `e2e` vs. `pytest`)
- **Date / Commits**: `2026-08-25` (`340905d`), `2026-08-26` (`b613f14`, `71967df`)
- **Decision**: Isolate Pytest onto `sqlite:///:memory:` (`backend/tests/conftest.py:L19`), Playwright E2E onto `mysql+pymysql://root@localhost/sticky_mind_grid_test` (`e2e/run.mjs:L6`), and local development onto `mysql+pymysql://root@localhost/sticky_mind_grid` (`backend/config.py:L33`).
- **Reason**: Prevent destructive test seeding (`backend/seed.py:L23` `db.drop_all()`) from wiping the developer's interactive database (`AGENTS.md:L330-L342`).
- **Alternatives**: Running E2E or integration tests against the default development database.
- **Citations**: `backend/tests/conftest.py:L17-L23`, `e2e/run.mjs:L5-L8`, `AGENTS.md:L330-L342`.

### DEC-17: First-Run Onboarding Lifecycle, Deterministic Starter Board & Explicit isDone Column
- **Context:** New accounts required guidance to reach core value (creating a board, adding a task, completing a task). At the same time, the legacy 5-button BottomNavBar caused mobile crowding and accessibility issues, and task progress overrides allowed marking tasks 100% complete outside of the workflow's Done column.
- **Decision:**
  1. Implement a single-question starter flow (4 template presets: Personal tasks, Team project, Product sprint, Ideas) creating an idempotent starter board via deterministic UUID namespaces (uuid.uuid5).
  2. Latch 3 checklist steps with server timestamps that never regress upon task or board deletion.
  3. Retire manual progress overrides; derive task completion strictly from the explicit isDone column flag.
  4. Isolate invited users so they onboard into their own space first; gate pending invitations until onboarding completion/skip, with an interstitial offered if an invitation URL is accessed mid-onboarding.
  5. Provide server-checked role-aware tips on invited boards and one-time role-change notices.
  6. Permanently retire the 5-button BottomNavBar in favor of the unified responsive sidebar with mobile Sheet drawer.
- **Alternatives Considered:** Multi-step wizard asking for role/team size/workspace name, client-writable checklist steps, retaining the bottom navigation bar on mobile.
- **Citations:** docs/17-onboarding.md, backend/app/services/onboarding_service.py:L1-L300, src/components/onboarding/OnboardingQuestion.tsx, src/components/layout/AppSidebar.tsx:L301-L329.
