# Project Status

*Last updated: 2026-08-25*

## Application Overview

Sticky Mind Grid is a full-stack Trello-style task management application with a React/Vite frontend and Flask/MySQL backend. It supports multiple boards with customizable columns, kanban drag-and-drop, multiple views (kanban, list, calendar, documents, overview), real-time multi-user collaboration via SSE, role-based access control, file uploads, activity auditing, comments with @mentions, and project notes.

## Current Architecture

Full architecture documentation is in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Summary:** React 18 SPA → Flask 3.0 REST API → MySQL database. SSE for real-time sync. JWT for auth. In-memory event broadcasting.

---

## Implemented Features

### Authentication
- **Registration** with email/password — fully connected (UI → API → backend → DB)
- **Login** with JWT tokens — 24h expiry, persisted in localStorage
- **Profile management** — update name and password (requires current password)
- **Protected routes** — frontend redirect via ProtectedRoute, backend enforcement via `@jwt_required()`
- **Auto-logout on 401** — `authenticatedFetch` clears token and redirects to login

### Board Management
- **Create boards** with name, emoji, description, color, hero image, and custom columns
- **Edit board settings** — name, emoji, description, columns, color, hero image
- **Delete boards** — hard delete with cascade (owner only)
- **Board grid view** — Cards with hero images, task counts, dropdown menus (BoardsOverview)
- **Search and sort** — client-side filtering by name/description, sort by updated/name/created
- **Board hero images** — upload (client-side resize to 1400x800), paste URL, or choose from Unsplash presets

### Kanban / Drag-and-Drop
- **Full drag-and-drop** — @dnd-kit with pointer sensor, sortable columns, drag overlay
- **Cross-column moves** — task status and position update on drop
- **Intra-column reorder** — position reordering within same column
- **Auto-progress snapping** — 0% first column, 30% intermediate, 100% last column
- **Inline column rename** — double-click to edit column titles

### Task Management
- **Full CRUD** — create, read, update, soft-delete tasks
- **Task properties** — title, emoji, description, status, priority (low/medium/high), progress (0-100), due date, assignee, checklist, tags, attachments
- **Optimistic updates** — local state patched before API confirmation, rolled back on error
- **4-second polling** — tasks auto-refresh when tab is visible
- **Position-based ordering** — float positions with 1000-based indices

### Multiple Views
- **Kanban Board** — drag-and-drop column view
- **Task List** — sortable table with name, status, assignee, progress, priority, due date
- **Calendar** — month/week/day views with task chips, sidebar for pending/completed tasks
- **Documents** — project notes (CRUD) + aggregated task attachments across all tasks
- **Overview** — stats cards, per-column task counts, overall progress bar

### Trash / Soft Delete
- **Soft delete** — tasks moved to trash (is_deleted + deleted_at)
- **Trash modal** — view trashed tasks, restore, permanent delete
- **Empty trash** — bulk permanent delete for a board

### Members & Roles
- **Role hierarchy** — owner > admin > member > viewer
- **Invite by email** — search registered users, send invitation
- **Accept/decline invitations** — invitation cards on dashboard
- **Role management** — admin/owner can change member roles
- **Remove members** — admin can remove; members can leave (sole-owner protection)
- **Pending invitations** — polling every 6s on dashboard

### Activity / Audit
- **Activity logging** — every mutation creates an Activity record with type, message, user, timestamp
- **Activity sidebar** — LatestChangesPanel shows activities with icons, avatars, relative timestamps
- **5-second polling** — activity feed auto-refreshes
- **Clear activities** — admin can clear board activity history

### Comments
- **Add comments** on tasks — Ctrl+Enter or Send button
- **Delete comments** — own comments only, or admin/owner
- **@mention system** — detect `@` in textarea, autocomplete against board members, create notifications for mentions
- **React Query** — comments fetched and cached via useQuery/useMutation

### Notifications
- **Notification bell** — unread count badge, popover with notification list
- **Notification types** — mention, assignment, task_comment, invite, board_invite, invite_accepted, invite_declined, member_left, member_removed, system
- **Mark read** — individual and mark-all-read
- **6-second polling** — notification list auto-refreshes

### Real-Time Collaboration
- **SSE connection** — per-board EventSource with JWT auth
- **Event broadcasting** — backend pushes task, member, activity, comment, note events
- **Auto-reconnect** — reconnects after 3s on connection loss
- **Live updates** — task changes, member changes, board updates reflected across clients

### File Uploads
- **Upload files** — multipart form, validated against extension whitelist
- **UUID filenames** — prevent collisions
- **Download** — blob fetch + programmatic click download
- **Documents view** — aggregated file browser across all tasks

### Project Notes
- **CRUD for notes** — title, content, color (6 preset colors)
- **Board-scoped** — notes belong to a board
- **Documents view** — note cards with edit/delete

### In-App Messaging & Team Chat
- **Sidebar Integration** — "Messages" entry in sidebar with dynamic unread count badge & collapsed rail tooltip
- **Direct Messages (1-on-1)** — start direct conversations with any registered teammate, idempotent conversation reuse
- **Group Chats** — create named group conversations with multi-member selection
- **Real-Time Delivery** — user-scoped SSE event stream (`/api/messages/stream`) for instant message synchronization
- **Rich Message Timeline** — date separators, incoming/outgoing bubbles, sender avatars, and timestamps
- **Attachments & Media** — send images (with lightbox preview) and documents (downloadable)
- **Reply Threads & Emoji Reactions** — reply to specific messages with preview banner, toggle emoji reactions on any message

---

## Partially Implemented Features

### Task Assignee Display
- **Backend:** `assigned_to` FK exists, `assignee` relationship loads user data, `to_dict()` includes `assignee` object
- **Frontend:** Task type includes `assignee?` field, TaskModal has assignee selector, TaskCard shows assignee avatar
- **Gap:** Assignment only works if the assigned user is a board member. No validation prevents assigning non-members.

### Task Tags
- **Backend:** `tags` JSON column exists on Task model, stored/persisted correctly
- **Frontend:** Tag type defined (`{id, name, color}`), TaskCard renders tags, TaskModal has tag input area
- **Gap:** Tag creation UI exists but the tag management is basic — no tag palette, no global tag list, tags are per-task with no deduplication

### Task Checklist
- **Backend:** `checklist` JSON column exists, persisted correctly
- **Frontend:** ChecklistItem type defined (`{id, title, completed}`), TaskModal renders checklist with add/toggle/delete
- **Gap:** Functional but no persistence of partial completion state during drag operations

### Board Hero Images
- **Frontend:** Upload (canvas resize to 1400x800), URL paste, Unsplash presets all work
- **Backend:** Stored as `hero_image_url` (Text/LONGTEXT) on Board model
- **Gap:** Large base64 images stored in MySQL — performance concern at scale

### SSE Real-Time
- **Backend:** EventBroadcaster with in-memory pub/sub, broadcasts all event types
- **Frontend:** useBoardRealtime hook handles all event types, reconnects on error
- **Gap:** In-memory broadcaster loses events on server restart; no message queue; single-server only

---

## Not Implemented Features

### Search/Filter on Tasks
- No global task search across boards
- No advanced filtering (by assignee, priority, date range) on the kanban board
- TaskListView has no search input

### Due Date Notifications
- Tasks have `due_date` field but no automated reminders or overdue indicators
- No background job to check approaching deadlines

### Recurring Tasks
- No mechanism for creating recurring/scheduled tasks

### Task Dependencies
- No concept of blocking/blocked-by relationships between tasks

### Time Tracking
- No time logging or estimation features

### Dark Mode
- TailwindCSS dark mode class strategy is configured but no theme toggle exists in the UI
- `next-themes` is installed but not wired into the app

### Export/Import
- No board export (JSON, CSV, etc.)
- No board import functionality

### Email Notifications
- All notifications are in-app only
- No email sending for assignments, mentions, or invitations

### User Avatar Upload
- Users have no profile picture
- Initials are used everywhere (avatar fallback)

### Multi-Language (i18n)
- No internationalization
- UI is English-only

---

## Technical Debt

### CORS Initialization Duplication
**File:** `backend/app/__init__.py`
CORS is initialized twice (lines 22-35 and 40-53) with identical configuration. Harmless but redundant.

### Hardcoded Development Secrets
**File:** `backend/config.py`
`SECRET_KEY` and `JWT_SECRET_KEY` have hardcoded fallback values (`'dev-secret-key'`, `'super-secret-jwt-key-for-development-32-chars-long'`). These are fine for development but dangerous if env vars are not set in production.

### Dead Code
- `src/pages/Index.tsx` — wraps `<KanbanBoard />` but is not referenced in any route. Dead file.
- `src/services/api.ts` — contains `USE_MOCK = false` with mock code branches in every function. The mock code is unreachable.

### TypeScript Strict Mode Off
**File:** `tsconfig.app.json`
`"strict": false` and `"noImplicitAny": false` reduce type safety. Many implicit `any` types throughout the codebase.

### No ESLint Unused Variable Detection
**File:** `eslint.config.js`
`no-unused-vars` is turned off. Dead imports and variables go undetected.

### ActivityContext Mock in Tests
**File:** `src/test/setup.ts`
The ActivityContext is globally mocked in test setup. This could mask issues in components that depend on activity state.

### Seed Script Drops All Tables
**File:** `backend/seed.py`
`seed.py` drops and recreates all tables. There is no safe migration-based seeding for development data.

### File Uploads Not Scanned
Uploaded files are stored without virus scanning or content validation beyond extension checking.

### No Rate Limiting
No rate limiting on any API endpoints (login, registration, file upload, etc.).

### No Input Validation Library
Backend routes do manual validation. No use of marshmallow, pydantic, or similar validation libraries.

---

## Security Concerns

### Hardcoded JWT Secret Fallback
**Severity:** Medium
`JWT_SECRET_KEY` defaults to a hardcoded string. If `JWT_SECRET_KEY` env var is not set in production, all tokens use the same known secret.

### File Serving Without Auth
**Severity:** Medium
`GET /api/files/<filename>` and download endpoint require no authentication. Anyone with a file URL can access uploaded files.

### No Rate Limiting
**Severity:** Medium
Login, registration, and API endpoints have no rate limiting, making them vulnerable to brute-force attacks.

### No CSRF Protection
**Severity:** Low
JWT tokens in Authorization headers are not vulnerable to CSRF, but the pattern of storing tokens in localStorage is susceptible to XSS attacks.

### SSE Token in Query String
**Severity:** Low
JWT token passed as `?token=` query parameter for SSE connections may appear in server logs and browser history.

### No Content-Security-Policy
**Severity:** Low
No CSP headers configured on the Flask app.

### CORS Allows Multiple Origins
**Severity:** Low
CORS_ORIGINS includes multiple localhost variants. Acceptable for development but must be restricted in production.

### Base64 Hero Images in MySQL
**Severity:** Low (performance)
Large base64 strings stored in LONGTEXT columns can cause database bloat and slow queries.

---

## Testing Status

### Framework & Workflow
- **Strategy:** Tiered testing with fast targeted tests during development, automated full verification checkpoints, and user-triggered Playwright E2E suite (see [`AGENTS.md`](../AGENTS.md)).
- **Frontend:** Vitest 3.2.4 + React Testing Library 16 + jsdom + `@vitest/coverage-v8`
- **Backend:** pytest + `pytest-cov` (configured with SQLite in-memory test database, 73% coverage)
- **E2E:** Playwright 1.57.0 (12 spec suites covering 117 tests, isolated against `sticky_mind_grid_test`)
- **CI:** GitHub Actions runs backend pytest + coverage, frontend typecheck + vitest coverage, and full-stack Playwright E2E

### Existing Tests

| Area | Framework | Tests / Suites | Coverage |
|------|-----------|----------------|----------|
| Auth (register/login/profile) | pytest | 9 tests | Good — happy + error paths |
| Tasks (CRUD lifecycle) | pytest | 1 test | Single integration test |
| Boards (CRUD lifecycle & cascade) | pytest | 5 tests | Good — create, get, list, update, cascade delete |
| Notes (CRUD lifecycle) | pytest | 1 test | Good — create, list, update, delete |
| RBAC (role matrix) | pytest | 19 tests | Excellent — full matrix + edge cases |
| Invitations (invite/accept/decline) | pytest | 5 tests | Good — lifecycle + notifications |
| System & User Preferences | pytest | 5 tests | Good — health check, preferences, export |
| BoardCard component | Vitest | 3 tests | Partial — renders, owner vs non-owner menu |
| BoardMembers component | Vitest | 2 tests | Partial — renders members, leave action |
| NotificationBell component | Vitest | 2 tests | Partial — badge, mark all read |
| BoardsOverview invitations | Vitest | 2 tests | Partial — banner, accept invitation |
| SettingsModal component & tabs | Vitest | 6 tests | Good — rendering, tabs, theme, data export |
| useBoardPermissions hook | Vitest | 6 tests | Excellent — full role matrix derivation |
| apiUtils service helper | Vitest | 3 tests | Good — token injection, FormData, 401 redirect |
| E2E User Journeys & Workflows | Playwright | 12 spec files (117 tests) | Broad — auth, boards, kanban, members, activity, notifications, documents, filters, navigation, overview, settings, trash |

### Missing Test Areas

**Frontend Unit/Component:**
- Remaining custom hooks (`useTasks`, `useBoards`, `useActivity`, `useBoardRealtime`)
- Specialized API service wrappers (`boardApi`, `taskApi`, etc.)
- Task creation/editing modal form interactions

**Backend:**
- Activities API (clear history)
- File upload extension & size validation
- SSE/events endpoint concurrency

---

## Current Development Priority

Based on the repository state, the recommended priority order is:

1. **Security hardening** — Add rate limiting, require auth for file serving, remove hardcoded secrets, add CSP headers
2. **Test coverage** — Expand backend tests for untested endpoints (board CRUD, files, notes, notifications, trash flow); add frontend tests for hooks and critical components
3. **TypeScript strictness** — Enable strict mode and fix resulting type errors
4. **Dead code cleanup** — Remove `Index.tsx`, clean up `USE_MOCK` branches in `api.ts`
5. **CORS cleanup** — Remove duplicate CORS initialization
6. **Activity logging consistency** — Ensure all mutations log activities (some edge cases may be missing)
7. **Dark mode toggle** — Wire up next-themes or add a manual class toggle
8. **Input validation** — Add proper request validation on backend routes
