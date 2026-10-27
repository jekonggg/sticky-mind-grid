# Project Status

*Last updated: 2026-10-27*

## Application Overview

Sticky Mind Grid is a full-stack Trello-style task management application with a React/Vite frontend and Flask/MySQL backend. It supports multiple boards with customizable columns, kanban drag-and-drop, multiple views (kanban, list, calendar, documents, overview), real-time multi-user collaboration via SSE, role-based access control, file uploads, activity auditing, comments with @mentions, and project notes.

## Current Architecture

Full architecture documentation is in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

**Summary:** React 18 SPA → Flask 3.0 REST API → MySQL database. SSE for real-time sync. JWT for auth. In-memory event broadcasting.

---

## Implemented Features

### Public Landing Page
- **Responsive marketing page** at `/` for visitors, inspired by the Magic UI SaaS reference with original Sticky Mind Grid copy, branding, and product illustrations. Includes sample board/list/calendar views, real feature showcases, onboarding steps, mobile navigation, FAQs, and registration/sign-in links.
- **Preserved authenticated home** — signed-in users still see their boards at `/`; private routes retain their existing guards. Landing styles do not change saved appearance settings. Supports keyboard navigation, reduced motion, and browser zoom.
- Design rationale and verification details: [`LANDING_PAGE_DESIGN.md`](./LANDING_PAGE_DESIGN.md).

### Authentication & Account Identity
- **Registration & Verification Pending Journey** — Creating an account seamlessly navigates users to a dedicated Verification Pending screen (`/verify-email?pending=true`) that auto-polls verification status in real-time, transitions to a success state with "Continue to Sign In" upon verification, and offers resend cooldown capabilities without dumping users unverified into login error banners.
- **In-Modal Guided Login Errors & Input Guidance** — Contextual, field-level inline error guidance directly inside the login card/modal for missing inputs, invalid email syntax, non-existent accounts (with registration shortcut), incorrect passwords, and OAuth registered collisions (guiding users to sign in with their social provider), accompanied by real-time Caps Lock warnings and native Edge duplicate eye icon suppression.
- **Verified Badges on Avatar & Settings** — First-class verified identity system displaying scalloped verified badge overlays on user avatars (`AppSidebar`, `SettingsModal`, `ProfileModal`, `BoardMembers`) and verified badge status chips in settings and user profiles for accounts with verified email addresses. Unverified accounts receive clear inline status indicators and one-click access to link or verify contact emails.
- **OAuth 2.0 / Social Login** — Live Google Identity, GitHub OAuth, and Microsoft Graph / Entra ID Authorization Code flow with CSRF state protection, centered popup window handoff, full-page redirect fallback, zero-dependency standard library backend exchange, and seamless Developer Sandbox mode when credentials are unconfigured
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

### Task Management & Modal RBAC
- **Full CRUD** — create, read, update, soft-delete tasks
- **Task properties** — title, emoji, description, status, priority (low/medium/high/urgent), progress (0-100), due date, assignee, checklist, tags, attachments
- **Task Modal Granular RBAC & Rules Matrix**:
  - **Read-only, not hidden:** For Commenters and Viewers, all fields are read-only while action buttons (Move, Archive, Delete, Upload) are hidden.
  - **Status equals column:** Column is the single source of truth for both dropdown and dragging. Both write one unified log entry: `"Moved '{title}' from {old_col} to {new_col}"`.
  - **Assignee eligibility:** Only Editor, Admin, and Owner can be assigned. Removing a member from the board or demoting them below Editor automatically unassigns them from all tasks and logs an activity entry.
  - **Progress field calculation:** Auto-calculated from checklist completion (`Math.round(completed / total * 100)`) when checklist items exist; manual slider is locked. When checklist is empty, manual slider is editable.
  - **Concurrent description edits:** Conflict warning banner when remote description changes while user has unsaved dirty draft, offering "Load Remote" and "Overwrite With Mine".
  - **Cross-board move tenancy:** Requires Editor or above on both source and target boards. Automatically removes assignees who are not members/Editors of the target board. Target board activity logs `"Card '{title}' moved from another board"` without exposing the source board name.
- **Folder-Tab Task Card Silhouette** — Redesigned card container featuring an integrated top-left priority tab with S-curve fillet transition, inline assignee and due date metadata row, cover image header support, 24-tick equalizer progress visualizer, three-dots quick actions menu, and files/tags footer.
- **Optimistic updates** — local state patched before API confirmation, rolled back on error
- **4-second polling** — tasks auto-refresh when tab is visible
- **Position-based ordering** — float positions with 1000-based indices

### Multiple Views
- **Kanban Board** — drag-and-drop column view
- **Task List** — sortable table with name, status, assignee, progress, priority, due date
- **Calendar** — month/week/day views with task chips, sidebar for pending/completed tasks
- **Documents** — project notes (CRUD) + aggregated task attachments across all tasks
- **Overview** — stats cards, per-column task counts, overall progress bar

### Trash / Soft Delete & 30-Day Purge
- **Soft delete** — tasks moved to trash (is_deleted + deleted_at); allowed for Owner, Admin, Editor; deletion is logged in activity feed.
- **Trash modal** — view trashed tasks and restore (logged in activity feed); allowed for Owner, Admin, Editor; blocked for Commenter and Viewer.
- **30-Day auto-purge** — soft-deleted tasks sit in trash for 30 days then are purged automatically upon trash query.
- **Permanent purge & Empty trash** — early permanent deletion strictly restricted to Owner and Admin.

### Members & Roles (5-Role System)
- **Role hierarchy** — owner > admin > editor > commenter > viewer (legacy `member` maps to `editor`)
- **Invite by email** — email-first inviting for registered & non-registered users (Admin & Owner)
- **Invite lifecycle** — 5-state machine (`pending`, `accepted`, `declined`, `expired`, `revoked`):
  - Declining an invite: invitee can decline; transitions to `declined`, notifies owner, and can be re-sent by Admin/Owner
  - Unregistered users: invite remains pending, auto-attaches upon signup with matching verified email
  - 7-Day expiration: automatically expires after 7 days; blocks acceptance until resent
  - Duplicate protection: re-inviting an email updates role and refreshes 7-day expiration
  - Security check: acceptance strictly requires authenticated email to match invite target (mismatch rejected with 403)
  - Admin controls: Admin/Owner can resend expired/pending invites (+7 days) or revoke pending invites
  - Spam rate limit: capped at 20 outgoing invitations per user per 24 hours
- **Accept/decline invitations** — invitation cards on Teams page & dashboard with expiration indicators
- **Role management** — admin can manage editor and below; owner manages any role except sole owner demotion/removal
- **Remove members** — admin can remove; members can leave (sole-owner protection)
- **Pending invitations** — polling every 6s on dashboard

### Activity / Audit
- **Activity logging** — every mutation creates an Activity record with type, message, user, timestamp
- **Activity sidebar** — LatestChangesPanel shows activities with icons, avatars, relative timestamps
- **Permissions matrix**:
  - Full board activity log (`/api/activities?boardId=...`): Owner and Admin (Yes); Editor, Commenter, Viewer (No - 403)
  - Card-specific history (`/api/activities?boardId=...&taskTitle=...`): Allowed for all 5 roles (Owner, Admin, Editor, Commenter, Viewer)
  - Immutability: System entries are immutable; edit and delete endpoints are blocked (403) for all 5 roles
- **5-second polling** — activity feed auto-refreshes

### Comments & Mentions
- **Add comment & @mention** — Owner, Admin, Editor, Commenter (Yes); Viewer (No)
- **Edit own comment** — author can edit inline; displays `(edited)` marker and preserves `original_content` in database
- **Delete comments** — author can delete own comment; Admin and Owner can delete anyone's comment; Editor/Commenter cannot delete others' comments
- **React Query** — comments fetched and cached via useQuery/useMutation

### Attachments
- **View & download attachments** — allowed for all 5 roles
- **Upload attachment** — allowed for Owner, Admin, Editor; blocked for Commenter and Viewer
- **Remove attachment** — author can remove own attachment; Admin and Owner can remove anyone's attachment; Editor cannot remove others' attachments

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
- **CRUD for notes** — title, rich-text content, color (6 preset colors)
- **Board-scoped** — notes belong to a board
- **Rich-text formatting** — shares the Scratchpad text formatter (FormattingToolbar, NoteContentEditor, useRichTextFormatter) supporting bold, italic, underline, strikethrough, bulleted/numbered/checklists, text color, font size, and text alignment with sanitized HTML persistence
- **Documents view** — note cards with plain-text preview (htmlToPlainText), plain-text search, and edit/delete modals

### In-App Messaging & Team Chat
- **Sidebar Integration** — "Messages" entry in sidebar with dynamic unread count badge & collapsed rail tooltip; Boards entry with consistent right-aligned count badge and slide-in Add Board button on click
- **Direct Messages (1-on-1)** — start direct conversations with any registered teammate, idempotent conversation reuse
- **Group Chats** — create named group conversations with multi-member selection
- **Real-Time Delivery** — user-scoped SSE event stream (`/api/messages/stream`) for instant message synchronization
- **Rich Message Timeline** — bottom-anchored conversation flow, date separators, incoming/outgoing bubbles, hover timestamps, and sender avatars
- **Attachments & Media** — send images (with lightbox preview), video files (inline player with download), and documents (downloadable) with 25MB file size limits
- **Scoped Hover Action Toolbar** — react button with multi-emoji picker, quick reply button, and 3-dot dropdown with Pin, Forward, and Unsend
- **Pin & Reply Functionality** — pin/unpin messages with top pinned banner and jump-to highlights; quoted reply preview with composer banner and jump-to scroll
- **Forward & Soft Unsend** — multi-chat message forwarding with preview; soft unsend with persistent unsent audit trail
- **Presence Indicators** — heartbeat-based online/offline status for direct conversations, shown as green/gray avatar badges in the conversation list and chat header

### Global Workspace Hub & Navigation
- **Workspace Dashboard (`/dashboard`)** — Welcome hero header, real-time KPI metric cards (Total Boards, Active Tasks, Completed Tasks, Overdue/Urgent Count), assigned priority tasks with quick completion checkboxes, upcoming deadlines agenda, and live workspace activity stream.
- **Global Tasks Manager (`/tasks`)** — Unified cross-board and board-scoped task list with URL query scoping (`/tasks?boardId=...`), board navigation breadcrumb, filter tabs ("All", "Assigned to Me", "Created by Me", "Completed", "Overdue"), board dropdown filter, priority filter, multi-criteria sorting (due date, priority, title, created), search query, list/grid switchable views, and one-click Export to Excel (.csv) with UTF-8 BOM encoding. Consolidates both sidebar tasks and board-level list views into a single source of truth.
- **Global Workspace Calendar (`/calendar`)** — 7-day month matrix displaying scheduled task deadlines across all boards with day inspection, timezone-safe date matching, day agenda sidebar, overdue tasks list, and direct task scheduling modal.
- **Teams & Collaborators Directory (`/teams`)** — Workspace collaborator directory across shared boards, pending invitation cards with 1-click Accept/Decline, board roles & permissions overview, and direct message shortcuts.
- **Scratchpad (`PersonalScratchpadModal`)** — User-scoped private notes with color presets (amber, emerald, blue, purple, rose), pinned notes, instant persistence, and rich-text formatting (bold, italic, underline, strikethrough, bulleted/numbered/checklists, font size, text color, and alignment). Content persists as sanitized HTML with automatic migration of legacy plain-text notes. Desktop keeps formatting controls beside the note colors; mobile uses separate note-list and note-editor pages with a bottom formatting toolbar.
- **Quick Search Command Palette (`CommandSearchDialog`)** — Global `⌘K` / `Ctrl+K` command dialog searching boards, tasks, teammates, and system actions with keyboard navigation.
- **Unified App Layout & Sidebar (`AppSidebar`, `AppLayout`)** — Consistent layout wrapping all authenticated routes with responsive collapsed icon rail, active route indicators, tooltips, notification counters, and modal triggers.

### System Theme & Colorway Customization
- **Dual-Mode System Themes** — 7 cohesive designer colorways (`indigo`, `mast`, `neon`, `emerald`, `sunset`, `rose`, `ocean`) providing tailored HSL tokens for both Light Mode and Dark Mode.
- **Light & Dark Mode Parity** — Full colorway customization across all display modes (Light, Dark, and System Auto).
- **Settings Appearance Tab** — Interactive dual-mode split swatches (Day/Night previews), live mini-task board preview mockup, and theme preference selection.
- **Advanced Custom Primary Accent** — Native color picker and HEX input allowing users to override the primary accent across buttons, badges, rings, and active indicators.
- **Backward-Compatible Persistence** — Client-side `LocalPreferences` with automatic migration for legacy `darkColorway` storage keys and clean reset defaults.

---

## Partially Implemented Features

### Task Tags
- **Backend:** `tags` JSON column exists on Task model, stored/persisted correctly
- **Frontend:** Tag type defined (`{id, name, color}`), TaskCard renders tags, TaskModal has tag input area
- **Gap:** Tag creation UI exists but the tag management is basic — no tag palette, no global tag list, tags are per-task with no deduplication

### Task Checklist
- **Backend:** `checklist` JSON column exists, persisted correctly. Server auto-derives `task.progress` when checklist items are present (`round((completed/total)*100)`).
- **Frontend:** ChecklistItem type defined (`{id, title, completed}`), TaskModal renders checklist with add/toggle/delete, disables manual progress slider when checklist exists.
- **Gap:** Checklist items are per-task; no templates or sub-item nesting.

### Board Hero Images
- **Frontend:** Upload (canvas resize to 1400x800), URL paste, Unsplash presets all work
- **Backend:** Stored as `hero_image_url` (Text/LONGTEXT) on Board model
- **Gap:** Large base64 images stored in MySQL — performance concern at scale

### SSE Real-Time
- **Backend:** EventBroadcaster with in-memory pub/sub, broadcasts 22 event types; pinned to single Gunicorn process with threads (`workers = 1`).
- **Frontend:** useBoardRealtime hook handles all 22 event types, reconnects on error with 4-second debounced lock.
- **Gap:** Single-process deployment constraint. Horizontal multi-worker scaling requires transitioning to Redis Pub/Sub.

---

## Not Implemented Features

### Recurring Tasks
- No mechanism for creating recurring/scheduled tasks

### Task Dependencies
- No concept of blocking/blocked-by relationships between tasks

### Time Tracking
- No time logging or estimation features

### Multi-Language (i18n)
- No internationalization
- UI is English-only

### Board Import
- Data export (JSON) is implemented for boards and users; board import from JSON/CSV remains unimplemented.

---

## Technical Debt

### Hardcoded Development Secrets
**File:** `backend/config.py`
`SECRET_KEY` and `JWT_SECRET_KEY` have hardcoded fallback values (`'dev-secret-key'`, `'super-secret-jwt-key-for-development-32-chars-long'`). These are fine for development but dangerous if env vars are not set in production.

### Dead Code
- `src/services/api.ts` — contains `USE_MOCK = false` with mock code branches in every function. The mock code is unreachable.

### TypeScript Strict Mode Off
**File:** `tsconfig.app.json`
`"strict": false` and `"noImplicitAny": false` reduce type safety. Many implicit `any` types throughout the codebase.

### ActivityContext Mock in Tests
**File:** `src/test/setup.ts`
The ActivityContext is globally mocked in test setup. This could mask issues in components that depend on activity state.

### Seed Script Drops All Tables
**File:** `backend/seed.py`
`seed.py` drops and recreates all tables. There is no safe migration-based seeding for development data.

### Global Page Task Editing RBAC Discrepancy (CD-07)
**Files:** `src/pages/DashboardPage.tsx`, `src/pages/TasksPage.tsx`, `src/pages/CalendarPage.tsx`
Global views instantiate `<TaskDetailWorkspace>` with hardcoded `readOnly={false}` without evaluating the user's role on the selected task's board, while the backend strictly returns HTTP 403 on mutation for Viewers/Commenters.

---

## Security Posture & Safeguards

### File Security & Storage Quotas (Implemented)
- Uploaded files are scanned for malware signatures (EICAR, Windows PE `MZ`, Linux `ELF`, macOS `Mach-O`, shell scripts `#!`, `<script>`).
- Image magic bytes validated for `.png`, `.jpg`/`.jpeg`, `.gif`, `.webp`.
- Quotas enforced: 25 MB per file, 100 MB per board, 500 MB per board owner.
- File serving requires JWT authentication and active board membership / conversation participation; user avatars are public.

### Rate Limiting (Implemented)
- `Flask-Limiter` integrated in `backend/app/__init__.py`.
- Strict limits enforced on auth (`10 per minute`), invitations (`20 per minute`), and verification resends.

### Email Normalization & Validation (Implemented)
- Emails are normalized with `.strip().lower()` and validated with `email-validator` across registration, login, and board invitations.

---

## Security Concerns

### Hardcoded JWT Secret Fallback
**Severity:** Medium
`JWT_SECRET_KEY` defaults to a hardcoded string. If `JWT_SECRET_KEY` env var is not set in production, all tokens use the same known secret.

### File Serving Security (Resolved)
**Status:** Secured
`GET /api/files/<filename>` and `/api/files/<filename>/download` are strictly permission-checked. Requests require JWT authentication and verify that the user holds active membership on the board containing the file's task or message. Unauthorized or removed members receive HTTP 403 Forbidden.

### No Rate Limiting
**Severity:** Low
Global endpoint rate limiting is pending, but outgoing invitations are protected with a 20 invites/day rate limit per user.

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

### Cloud Infrastructure & Decoupled Maintenance (Phases 1-4)
- **Supabase Cloud Storage (Phase 1):** Avatars (public bucket with instant CDN resolution) and Task/Message Attachments (private bucket with 15-minute signed URL tokens). Built-in fallback to local disk storage for local offline development.
- **Supabase Managed PostgreSQL Migration (Phase 2):** Migrated from MySQL to high-availability Supabase PostgreSQL with pooler port `6543` (Supavisor transaction mode) and direct port `5432` for migrations. Fully cross-compatible JSON/JSONB schemas across 14 tables. PostgREST RLS locked down (HTTP 401 for anon queries).
- **Decoupled Background Purge & Webhook (Phase 3):** Background maintenance decoupled from in-process Flask/APScheduler (`SCHEDULER_ENABLED=false` on web instances). Dedicated maintenance endpoint `POST /api/internal/jobs/purge` secured via `X-Internal-Secret` and `hmac.compare_digest`. Cleans up boards and tasks soft-deleted > 30 days ago and deletes associated attachment files from storage.
- **External Keep-Alive & Daily Cron Monitor:** Setup via free external monitoring (cron-job.org / UptimeRobot) pinging `GET /api/health` every 10 minutes on **Production** (`sticky-mind-grid-api`) to keep it open 24/7 (~744h/month on Render Free tier), and triggering `POST /api/internal/jobs/purge` daily at midnight UTC.
- **Isolated Deployed Dev (Staging) Environment (Phase 4):** Dedicated staging topology auto-deployed from the `develop` branch across a separate Vercel project (`sticky-mind-grid-dev`), a separate Render service (`sticky-mind-grid-api-dev` hosted in a dedicated Render workspace with 24/7 keep-alive pinger), and a separate Supabase project (`sticky-mind-grid-dev`). Includes a non-dismissable frontend `EnvironmentBanner` (`DEV ENVIRONMENT` + `[DEV]` title prefix), `APP_ENV` reporting on `GET /api/health`, `[DEV]` EmailJS subject prefixing (`EMAIL_SUBJECT_PREFIX`), `OAUTH_ENABLED=false` / `VITE_OAUTH_ENABLED=false` on Dev, a project-scoped Vercel CORS regex (`r"https:\/\/sticky-mind-grid(-[a-z0-9-]+)?\.vercel\.app"`), a destructive-op guard in `backend/seed.py`, and `--env dev|prod` targeting in `scripts/fetch_render_logs.py`.

---

## Testing Status

### Framework & Workflow
- **Strategy:** Tiered testing with fast targeted tests during development, automated full verification checkpoints, and user-triggered Playwright E2E suite (see [`AGENTS.md`](../AGENTS.md)).
- **Frontend:** Vitest 3.2.4 + React Testing Library 16 + jsdom + `@vitest/coverage-v8` (320 passed tests across 57 test files)
- **Backend:** pytest + `pytest-cov` (configured with SQLite in-memory and PostgreSQL test database, 152 passed tests, 80%+ coverage)
- **E2E:** Playwright 1.57.0 (12 spec suites covering 117 tests, isolated against `sticky_mind_grid_test`)
- **CI:** GitHub Actions runs backend pytest + coverage, backend PostgreSQL container service tests, frontend typecheck + vitest coverage, and full-stack Playwright E2E

### Existing Tests

| Area | Framework | Tests / Suites | Coverage |
|------|-----------|----------------|----------|
| Auth (register/login/profile) | pytest | 9 tests | Good — happy + error paths |
| Tasks (CRUD lifecycle) | pytest | 1 test | Single integration test |
| Boards (CRUD lifecycle & cascade) | pytest | 5 tests | Good — create, get, list, update, cascade delete |
| Notes (CRUD lifecycle) | pytest | 1 test | Good — create, list, update, delete |
| RBAC (role matrix) | pytest | 33 tests | Excellent — 5-role hierarchy + column deletion, member redaction, last owner guard, data export, task modal permissions |
| Invitations (lifecycle, expiration, resend, revoke, rate limit, mismatch) | pytest | 11 tests | Excellent — 4-state lifecycle, 7-day expiration, signup auto-attachment, email security guard, duplicate updates, rate limiting |
| Privacy & Tenancy (isolation, profile redaction, ownership auto-promote, former member, file auth, workspace) | pytest | 8 tests | Excellent — guest visibility, profile redaction, account deletion auto-promotion, former member attribution, attachment 403, workspace schema |
| Messages & Conversations | pytest | 9 tests | Good — direct, group, reactions, forwarding, pin/unpin, presence |
| System & User Preferences | pytest | 15 tests | Good — health check, preferences, export |
| BoardCard component | Vitest | 3 tests | Partial — renders, owner vs non-owner menu |
| BoardMembers component | Vitest | 3 tests | Good — renders members, leave action, pending badge |
| NotificationBell component | Vitest | 2 tests | Partial — badge, mark all read |
| BoardsOverview invitations | Vitest | 2 tests | Partial — banner, accept invitation |
| SettingsModal component & tabs | Vitest | 6 tests | Good — rendering, tabs, theme, data export |
| useBoardPermissions hook | Vitest | 9 tests | Excellent — full 5-role capability matrix + last owner safety |
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
