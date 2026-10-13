**Status:** Verified | **Last scanned:** 2026-10-13 | **Audience:** Developers, QA

# 13 — Testing & Quality Assurance (`13-testing.md`)

This document describes the test suites, execution workflows, database isolation boundaries, business-rule test coverage matrix, and known testing gaps in **Sticky Mind Grid**.

---

## 1. Testing Architecture Overview

Sticky Mind Grid uses four verification tiers configured in `package.json` (`L10-L15`), `vitest.config.ts` (`L1-L17`), `backend/tests/conftest.py` (`L1-L95`), `playwright.config.ts` (`L1-L32`), and `.github/workflows/test.yml` (`L1-L168`).

| Verification Pipeline (Mermaid) | Text Version |
|---|---|
| ```mermaid
flowchart TD
    Dev["Code Change"] --> Static["Static Gates\n• npx tsc --noEmit\n• npm run lint"]
    Dev --> Unit["Frontend Unit & Component\n• Vitest + React Testing Library\n• 41 files (src/test/**)\n• JSDOM + fetch/useActivity mocks"]
    Dev --> Pytest["Backend Service & API\n• Pytest + Flask TestClient\n• 12 files (backend/tests/**)\n• SQLite in-memory (:memory:)"]
    Static & Unit & Pytest --> E2E["End-to-End Browser Suite\n• Playwright Chromium (e2e/*.spec.ts)\n• Orchestrator: e2e/run.mjs\n• MySQL: sticky_mind_grid_test"]
``` | 1. **Static Analysis Gates**: TypeScript typechecking (`npx tsc --noEmit` via `tsconfig.app.json:L1-L35`) and ESLint (`npm run lint` via `eslint.config.js:L1-L30`).<br>2. **Frontend Unit & Component Tests (`src/test/**`)**: 41 Vitest test files (`223` test cases) running in `jsdom` (`vitest.config.ts:L9`) with global polyfills and `fetch`/`useActivity` mocks (`src/test/setup.ts:L1-L99`).<br>3. **Backend Integration & Service Tests (`backend/tests/**`)**: 12 Pytest modules (`105` test functions) running against an ephemeral in-memory SQLite database (`sqlite:///:memory:`) recreated per test function (`backend/tests/conftest.py:L17-L32`).<br>4. **Browser End-to-End Tests (`e2e/*.spec.ts`)**: 12 Playwright spec files (`112` tests) orchestrated by `e2e/run.mjs` (`L1-L133`) against a dedicated MySQL test database (`sticky_mind_grid_test`). |

---

## 2. Test Types, Locations & Configurations

### 2.1 Frontend Unit & Component Tests (Vitest)
- **Configuration (`vitest.config.ts:L1-L17`)**:
  - Uses `@vitejs/plugin-react-swc` (`L2, L7`), `environment: "jsdom"` (`L9`), `globals: true` (`L10`), `setupFiles: ["./src/test/setup.ts"]` (`L11`), and `include: ["src/**/*.{test,spec}.{ts,tsx}"]` (`L12`).
- **Global Setup (`src/test/setup.ts:L1-L99`)**:
  - Polyfills `window.matchMedia` (`L4-L16`), `ResizeObserver` (`L18-L24`), `IntersectionObserver` (`L26-L32`), pointer capture, and `Element.prototype.scrollIntoView` (`L35-L38`).
  - Mocks `@/hooks/useActivity` (`L41-L50`) so component tests do not spawn background 5-second `/api/activities` polling timers.
  - Installs a baseline `global.fetch` mock (`L53-L98`) returning default `200 OK` JSON payloads for `/api/users/me/preferences`, `/comments`, `/notes`, and `/api/activities`.
- **Provider Test Wrapper (`src/test/test-utils.tsx:L1-L79`)**:
  - Exports `mockUser` (`id: "user-123"`, `email: "testuser@example.com"`, `L14-L20`) and `renderWithProviders(ui, options)` (`L27-L78`), wrapping components in `QueryClientProvider` (`retry: false, gcTime: 0`), `ThemeProvider`, `TooltipProvider`, `AuthContext.Provider`, `SettingsProvider`, `DevModeProvider`, `ActivityProvider`, `LayoutProvider`, and `BrowserRouter`.
- **Test File Inventory (`src/test/**` — 41 files, 223 tests)**:
  - **Hooks, Services & Utils (5 files)**:
    - `src/test/hooks/useBoardPermissions.test.tsx` (`L1-L393`, 8 tests) — 5-role permission flag matrix and multi-owner `canLeaveBoard`.
    - `src/test/services/apiUtils.test.ts` (`L1-L78`, 3 tests) — Bearer JWT injection, `FormData` header handling, and `401` redirect to `/login`.
    - `src/test/utils/authUtils.test.ts` (`L1-L48`, 6 tests) — `isJwtExpired` base64url decoding and clock skew handling.
    - `src/test/utils/geometryUtils.test.ts` (`L1-L74`, 7 tests) — Bounding-box and collision helpers.
    - `src/test/example.test.ts` (`L1-L8`, 1 test) — Smoke check.
  - **Pages (7 files)**:
    - `src/test/pages/BoardsOverview.test.tsx` (`L1-L424`, 9 tests) — Pending invite banner, redacted description, report/block inviter, board tabs, pin/unpin, type-to-confirm delete, 30-day Recently Deleted restore, and per-user `localStorage` isolation.
    - `src/test/pages/MessagesPage.test.tsx` (`L1-L364`, 10 tests) — Direct & group chat UI, New Chat modal, forward, unsend, single-emoji reaction, reply, and pin.
    - `src/test/pages/TaskDetailPage.test.tsx` (`L1-L131`, 5 tests), `src/test/pages/TasksPage.test.tsx` (`L1-L161`, 4 tests), `src/test/pages/DashboardPage.test.tsx` (`L1-L109`, 3 tests), `src/test/pages/TeamsPage.test.tsx` (`L1-L85`, 2 tests), `src/test/pages/CalendarPage.test.tsx` (`L1-L76`, 1 test).
  - **Components & Dev Suite (29 files)**:
    - `src/test/components/RealtimeCollaborationConflicts.test.tsx` (`L1-L354`, 6 tests) — Remote card move pulse, `409 Conflict` banner with Reload/Overwrite, live role downgrade UI lock, member removal redirect, and SSE reconnect sync.
    - `src/test/components/BoardMembers.test.tsx` (`L1-L292`, 7 tests), `src/test/components/BoardCard.test.tsx` (`L1-L283`, 9 tests), `src/test/components/BoardModal.test.tsx` (`L1-L256`, 8 tests), `src/test/components/BoardOverview.test.tsx` (`L1-L77`, 1 test).
    - `src/test/components/TaskCard.test.tsx` (`L1-L257`, 14 tests), `src/test/components/TaskModal.test.tsx` (`L1-L245`, 8 tests), `src/test/components/TaskDetailWorkspace.test.tsx` (`L1-L195`, 7 tests), `src/test/components/TaskHeader.test.tsx` (`L1-L154`, 3 tests), `src/test/components/TaskComments.test.tsx` (`L1-L126`, 3 tests), `src/test/components/TaskListView.test.tsx` (`L1-L120`, 3 tests), `src/test/components/TaskDescription.test.tsx` (`L1-L73`, 3 tests).
    - `src/test/components/KanbanBoardBackdrop.test.tsx` (`L1-L187`, 3 tests), `src/test/components/KanbanBoardTaskCreation.test.tsx` (`L1-L184`, 3 tests), `src/test/components/KanbanColumn.test.tsx` (`L1-L90`, 3 tests), `src/test/components/CalendarView.test.tsx` (`L1-L240`, 7 tests).
    - `src/test/components/AppSidebar.test.tsx` (`L1-L259`, 12 tests), `src/test/components/NotificationBell.test.tsx` (`L1-L121`, 3 tests), `src/test/components/SettingsModal.test.tsx` (`L1-L127`, 6 tests), `src/test/components/UIDensity.test.tsx` (`L1-L116`, 3 tests), `src/test/components/OAuthButtons.test.tsx` (`L1-L111`, 4 tests), `src/test/components/BottomNavBar.test.tsx` (`L1-L103`, 3 tests), `src/test/components/PillNavBar.test.tsx` (`L1-L71`, 3 tests), `src/test/components/CommandSearchDialog.test.tsx` (`L1-L57`, 1 test), `src/test/components/PersonalScratchpadModal.test.tsx` (`L1-L27`, 2 tests).
    - `src/test/dev/DevModeSuite.test.tsx` (`L1-L311`, 12 tests), `src/test/components/DevSuiteModal.test.tsx` (`L1-L109`, 4 tests), `src/test/components/skeletons/DevSkeletonToolbar.test.tsx` (`L1-L49`, 2 tests), `src/test/components/skeletons/SkeletonComponents.test.tsx` (`L1-L159`, 17 tests).

### 2.2 Backend Integration & Service Tests (Pytest)
- **Configuration & Fixtures (`backend/tests/conftest.py:L1-L95`)**:
  - `TestConfig(Config)` (`L17-L23`): Sets `TESTING = True`, `SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'`, `SQLALCHEMY_ENGINE_OPTIONS = {}`, and a test `JWT_SECRET_KEY`.
  - Fixtures: `app` (`L25-L32`, creates app, calls `db.create_all()`, tears down with `db.session.remove()` and `db.drop_all()`), `client` (`L34-L36`), `make_auth_headers` & `auth_headers` (`L42-L51`), `create_test_user` (`L53-L61`), and `create_test_board` (`L63-L94`, creates a board with 4 columns `todo`, `in_progress`, `done`, `archive` and an accepted `owner` membership).
- **Test File Inventory (`backend/tests/test_*.py` — 12 files, 105 tests)**:
  1. `backend/tests/test_auth.py` (`L1-L229`, 15 tests) — Registration, duplicate email check, login, `/api/auth/me` profile, password change `currentPassword` verification (`L75-L133`), and OAuth (`google`, `github`, `microsoft`) signup/account linking (`L135-L227`).
  2. `backend/tests/test_boards.py` (`L1-L466`, 12 tests) — Board CRUD, cascade delete, minimum 1 column rule (`L118-L161`), banner URL/upload validation (`L164-L248`), task counts & member preview cues (`L251-L313`), 30-day board soft delete & restore (`L316-L373`), column WIP limits & non-empty column deletion block (`L376-L432`), and `_auto_sync_schema()` (`L435-L465`).
  3. `backend/tests/test_invitations.py` (`L1-L418`, 12 tests) — Invite lifecycle, accept/decline/leave, role restriction (`editor`/`commenter`/`viewer`), unregistered email invite auto-attach on signup (`L150-L205`), 7-day expiry, resend, revoke, email mismatch `403`, 30/day rate limit, redacted description, and report/block inviter (`L338-L415`).
  4. `backend/tests/test_messages.py` (`L1-L310`, 5 tests) — Direct & group conversations, single-reaction-per-user replacement/toggle, unsend, forward, pin/unpin, and outsider `403`.
  5. `backend/tests/test_notes.py` (`L1-L65`, 1 test) — Board note CRUD and activity audit logging.
  6. `backend/tests/test_privacy_and_tenancy.py` (`L1-L557`, 11 tests) — Teammate isolation, viewer/commenter email redaction, account deletion owner succession (`oldest admin -> oldest member -> delete solo board`, `L85-L148`), `"Former member"` attribution (`L150-L195, L523-L544`), authenticated `/api/files/<filename>` access (`L197-L248`), `@mentions` scoping, card followers & board mute (`L262-L377`), malware signature rejection & storage quotas (`L380-L477`), and immutable activity logs (`L480-L555`).
  7. `backend/tests/test_rbac.py` (`L1-L1072`, 33 tests) — Complete 5-role capability matrix, pending/declined invitee blocks across REST & SSE (`L139-L224`), admin restrictions, sole owner protection & ownership transfer, cross-board task move tenancy & assignee stripping (`L583-L629, L962-L1005`), assignee eligibility (`editor`+) & auto-unassign on demotion/removal (`L772-L861`), comment edit/delete rules, board vs. card activity visibility (`L1008-L1040`), and 30-day task trash auto-purge (`L1043-L1067`).
  8. `backend/tests/test_realtime_conflicts.py` (`L1-L356`, 5 tests) — Concurrent card drag last-write-wins & dual move audit logs, concurrent description edit `409 Conflict` & `forceOverwrite`, mid-session role downgrade, and member removal `force_disconnect` SSE event.
  9. `backend/tests/test_reorder_tasks.py` (`L1-L62`, 3 tests) — Batch task reorder, viewer `403`, and invalid payload `400`.
  10. `backend/tests/test_system.py` (`L1-L9`, 1 test) — `GET /api/health`.
  11. `backend/tests/test_tasks.py` (`L1-L71`, 1 test) — Task create, assignee notification, update, soft delete, restore, and permanent delete.
  12. `backend/tests/test_user_preferences.py` (`L1-L110`, 4 tests) — User preferences CRUD, notification suppression, and `/api/users/me/export`.

### 2.3 Browser End-to-End Tests (Playwright)
- **Configuration (`playwright.config.ts:L1-L32`)**:
  - `testDir: "./e2e"` (`L4`), `workers: 1` (`L8`, sequential execution to avoid shared MySQL state collisions), `baseURL: "http://localhost:5173"` (`L11`), Chromium `1281x720` (`L16-L20`).
- **Orchestrator & Helpers (`e2e/run.mjs:L1-L133`, `e2e/helpers.ts:L1-L88`)**:
  - `e2e/run.mjs` sets `DATABASE_URL=mysql+pymysql://root@localhost/sticky_mind_grid_test` (`L6-L7`), runs `python seed.py` (`L71-L86`), starts Flask on `127.0.0.1:5000` (`L89-L93`), polls `/api/health` (`L36-L65`), runs `npx playwright test` (`L105-L115`), and kills the backend process on exit (`L118-L125`).
- **Spec File Inventory (`e2e/*.spec.ts` — 12 files, 112 tests)**:
  - `e2e/auth.spec.ts` (`L1-L124`, 13 tests), `e2e/boards.spec.ts` (`L1-L148`, 15 tests), `e2e/kanban.spec.ts` (`L1-L164`, 17 tests), `e2e/members.spec.ts` (`L1-L120`, 10 tests), `e2e/settings.spec.ts` (`L1-L111`, 15 tests), `e2e/documents.spec.ts` (`L1-L51`, 8 tests), `e2e/filters.spec.ts` (`L1-L76`, 8 tests), `e2e/overview.spec.ts` (`L1-L51`, 7 tests), `e2e/trash.spec.ts` (`L1-L72`, 7 tests), `e2e/navigation.spec.ts` (`L1-L36`, 5 tests), `e2e/notifications.spec.ts` (`L1-L30`, 4 tests), `e2e/activity.spec.ts` (`L1-L37`, 3 tests).

---

## 3. How to Run Tests & Database Isolation

### 3.1 Command Reference (`package.json:L10-L15`, `AGENTS.md:L187-L315`)

| Test Scope | Command | Notes |
|---|---|---|
| **All Frontend Unit Tests** | `npm test` (or `npx vitest run`) | Runs all 41 test files in `src/test/**` once (`package.json:L11`). |
| **Targeted Frontend Test** | `npx vitest run src/test/hooks/useBoardPermissions.test.tsx` | Fast feedback for a single component/hook (`AGENTS.md:L196`). |
| **Frontend Watch Mode** | `npm run test:watch` | Interactive Vitest watch mode (`package.json:L12`). |
| **Frontend Coverage** | `npm run test:coverage` | Runs `vitest run --coverage` using `@vitest/coverage-v8` (`package.json:L13`). |
| **All Backend Tests + Coverage** | `cd backend && pytest --cov=app tests -v && cd ..` | Runs all 12 Pytest files against `sqlite:///:memory:` (`AGENTS.md:L294-L296`). |
| **Targeted Backend Test** | `cd backend && pytest tests/test_rbac.py -k test_five_roles_setup_and_permissions -v && cd ..` | Runs a single Pytest module or test function (`AGENTS.md:L201-L203`). |
| **Full Playwright E2E Suite** | `npm run test:e2e` | Runs `node e2e/run.mjs` (seeds `sticky_mind_grid_test`, boots Flask & Vite, runs Playwright) (`package.json:L14`). |
| **Targeted Playwright Spec** | `node e2e/run.mjs e2e/boards.spec.ts` (or `npx playwright test e2e/boards.spec.ts` if servers are running) | Passes Playwright CLI args through `e2e/run.mjs` (`L106`). |
| **TypeScript Typecheck** | `npx tsc --noEmit` | Validates TypeScript types without emitting build files (`AGENTS.md:L299`). |
| **ESLint Check** | `npm run lint` | Runs ESLint 9 across `src/` and `e2e/` (`package.json:L10`). |

### 3.2 Mandatory Database Isolation (`AGENTS.md:L330-L342`)

| Environment | Database Target | Configured In | Lifecycle |
|---|---|---|---|
| **Development** | MySQL (`sticky_mind_grid`) | `backend/config.py:L33` | Persistent local dev database; **never** touched by automated tests. |
| **Playwright E2E** | MySQL (`sticky_mind_grid_test`) | `e2e/run.mjs:L6-L7`, `.github/workflows/test.yml:L63, L99` | Dropped and re-seeded via `backend/seed.py` before E2E runs. |
| **Backend Pytest** | SQLite (`sqlite:///:memory:`) | `backend/tests/conftest.py:L19` | Created (`db.create_all()`) and destroyed (`db.drop_all()`) per test function. |

---

## 4. Coverage by Business Rule Matrix

| Business Rule / Feature | Server / Client Source | Backend Pytest (`backend/tests/`) | Frontend Vitest (`src/test/`) | Browser E2E (`e2e/`) |
|---|---|---|---|---|
| **BR-01: Board Tenant Isolation**<br>Only board owner or `accepted` members can access board REST/SSE endpoints; `pending`/`declined` invitees and outsiders get `403`. | `backend/app/utils/decorators.py:L19-L95`<br>`backend/app/routes/board_routes.py:L88-L93` | `test_rbac.py:L27-L224`<br>`test_privacy_and_tenancy.py:L15-L45` | `hooks/useBoardPermissions.test.tsx:L17-L392` | `auth.spec.ts:L65-L95` |
| **BR-02: 5-Role RBAC Hierarchy**<br>`owner (5) > admin (4) > editor/member (3) > commenter (2) > viewer (1)`. Admin cannot modify/grant `admin` or `owner`. | `backend/app/utils/decorators.py:L10-L17`<br>`backend/app/services/board_service.py:L959-L1095`<br>`src/hooks/useBoardPermissions.ts:L53-L224` | `test_rbac.py:L267-L435` | `hooks/useBoardPermissions.test.tsx:L17-L392`<br>`components/BoardMembers.test.tsx:L80-L291` | `members.spec.ts:L16-L119` |
| **BR-03: Sole Owner Protection & Account Deletion Succession**<br>Last owner cannot leave or be demoted. Deleting a user promotes oldest `admin` -> oldest member -> or deletes solo board, preserving content as `"Former member"`. | `backend/app/services/board_service.py:L985-L993, L1072-L1083`<br>`backend/app/services/user_service.py:L14-L86` | `test_rbac.py:L437-L469`<br>`test_privacy_and_tenancy.py:L85-L195, L523-L544` | `hooks/useBoardPermissions.test.tsx:L318-L392`<br>`components/BoardMembers.test.tsx:L140-L176` | `members.spec.ts:L79-L111` |
| **BR-04: Email Invitations & Anti-Spam**<br>Invites restricted to `editor`/`commenter`/`viewer`; 7-day expiry; unregistered email auto-attach on signup; 30/day rate limit; redacted description on pending invite; report/block inviter. | `backend/app/services/board_service.py:L423-L809`<br>`backend/app/routes/auth_routes.py:L12-L52` | `test_invitations.py:L7-L415` | `pages/BoardsOverview.test.tsx:L98-L184`<br>`components/BoardMembers.test.tsx:L178-L252` | `members.spec.ts:L39-L77` |
| **BR-05: Board Lifecycle, Columns & Banners**<br>Min 1 column; WIP limits; block deleting non-empty columns; 30-day board soft delete & restore; 5 MB raster magic-byte banner check. | `backend/app/services/board_service.py:L24-L421`<br>`backend/app/services/file_service.py:L63-L78, L254-L354` | `test_boards.py:L118-L432`<br>`test_rbac.py:L471-L524` | `pages/BoardsOverview.test.tsx:L186-L423`<br>`components/BoardModal.test.tsx:L31-L255`<br>`components/KanbanColumn.test.tsx:L16-L89` | `boards.spec.ts:L20-L138` |
| **BR-06: Task Modal, Assignee Rules & Cross-Board Move**<br>Only `editor`+ can edit tasks or be assigned tasks. Demotion/removal auto-unassigns tasks. Cross-board move requires `editor`+ on both boards, resets invalid status, and strips ineligible assignees. | `backend/app/routes/task_routes.py:L58-L171`<br>`backend/app/services/task_service.py:L121-L409`<br>`backend/app/services/board_service.py:L1022-L1065` | `test_tasks.py:L6-L70`<br>`test_rbac.py:L226-L265, L583-L861, L938-L1005`<br>`test_reorder_tasks.py:L6-L61` | `components/TaskCard.test.tsx:L18-L256`<br>`components/TaskModal.test.tsx:L33-L244`<br>`components/TaskDetailWorkspace.test.tsx:L36-L194`<br>`components/KanbanBoardTaskCreation.test.tsx:L80-L183` | `kanban.spec.ts:L17-L147` (*see Section 5.1*)<br>`filters.spec.ts:L17-L74` |
| **BR-07: Task Soft Delete, Trash & 30-Day Purge**<br>Soft delete & restore require `editor`+; permanent delete & empty trash require `admin`+; tasks in trash >30 days auto-purge with physical attachments on `GET /boards/<id>/trash`. | `backend/app/services/task_service.py:L47-L64, L411-L642`<br>`backend/app/routes/task_routes.py:L29-L47, L173-L216` | `test_rbac.py:L526-L581, L1043-L1067`<br>`test_privacy_and_tenancy.py:L433-L477` | `components/TaskDetailWorkspace.test.tsx:L171-L193` | `trash.spec.ts:L17-L70` |
| **BR-08: Comments, `@Mentions` & Card Followers**<br>`commenter`+ can post; only author can edit (stores `original_content`); author or `admin`+ can delete. `@mentions` resolve only accepted board members. Card followers & board mute respected. | `backend/app/services/comment_service.py:L14-L272`<br>`backend/app/services/notification_service.py:L19-L70` | `test_rbac.py:L864-L935`<br>`test_privacy_and_tenancy.py:L262-L377`<br>`test_user_preferences.py:L47-L82` | `components/TaskComments.test.tsx:L24-L125`<br>`components/NotificationBell.test.tsx:L20-L120` | `notifications.spec.ts:L9-L28` |
| **BR-09: File Upload Malware Scan, Quotas & Access Control**<br>Rejects EICAR, PE (`MZ`), ELF, Mach-O, `#!`, `<script>`/`javascript:`. Quotas: 25 MB/file, 100 MB/board, 500 MB/owner. `/api/files/<filename>` verifies board/chat access (avatars public). | `backend/app/services/file_service.py:L81-L207, L382-L460`<br>`backend/app/routes/file_routes.py:L26-L60` | `test_privacy_and_tenancy.py:L197-L248, L380-L431`<br>`test_boards.py:L195-L248` | *Not covered in Vitest* | *Not covered in E2E* |
| **BR-10: Real-Time SSE & Conflict Resolution**<br>Card moves use last-write-wins & log both moves; concurrent description edits with stale `expectedUpdatedAt` return `409 Conflict` (`forceOverwrite` bypasses); removal emits `force_disconnect`. | `backend/app/services/task_service.py:L261-L285`<br>`backend/app/utils/event_broadcaster.py:L7-L120`<br>`src/hooks/useBoardRealtime.ts:L29-L340` | `test_realtime_conflicts.py:L9-L355` | `components/RealtimeCollaborationConflicts.test.tsx:L56-L353`<br>`dev/DevModeSuite.test.tsx:L282-L309` | *Not covered in E2E* |
| **BR-11: Immutable Activity Audit Log & Visibility**<br>`PUT`/`PATCH`/`DELETE /api/activities` blocked with `403`. Full board activity log restricted to `admin`+; card history (`taskId`/`taskTitle`) open to `viewer`+. Optional `ACTIVITY_RETENTION_DAYS`. | `backend/app/routes/activity_routes.py:L8-L55`<br>`backend/app/services/activity_service.py:L9-L93` | `test_privacy_and_tenancy.py:L480-L555`<br>`test_rbac.py:L1008-L1040` | *Globally mocked in `src/test/setup.ts:L41-L50`* | `activity.spec.ts:L17-L35` (*see Section 5.1*) |
| **BR-12: Direct & Group Messaging**<br>Participant-only access (`403`), single emoji reaction per user per message, reply, forward, pin/unpin, sender or group-admin unsend. | `backend/app/services/message_service.py:L8-L396`<br>`backend/app/routes/message_routes.py:L9-L190` | `test_messages.py:L3-L308` | `pages/MessagesPage.test.tsx:L88-L363` | *Not covered in E2E* |
| **BR-13: Project Notes, User Preferences & Data Export**<br>Board notes CRUD (`member`+ create/edit, author or `admin`+ delete); user preferences (`GET`/`PATCH /api/users/me/preferences`); JSON exports (`/api/users/me/export`, `/api/boards/<id>/export`). | `backend/app/services/note_service.py:L9-L138`<br>`backend/app/routes/user_routes.py:L16-L123`<br>`backend/app/routes/board_routes.py:L174-L182` | `test_notes.py:L3-L64`<br>`test_user_preferences.py:L6-L109`<br>`test_rbac.py:L506-L524` | `components/SettingsModal.test.tsx:L23-L126`<br>`components/UIDensity.test.tsx:L18-L115` | `documents.spec.ts:L18-L49`<br>`settings.spec.ts:L15-L109` |

---

## 5. Notable Testing Gaps & Fragilities

### 5.1 Stale Playwright E2E Assertions Out of Sync with Current Code
1. **Stale "Clear activity log" E2E Test (`e2e/activity.spec.ts:L29-L35`)**:
   - `e2e/activity.spec.ts:L32` attempts to click `button[title="Clear activity log"]` and expects `"No recent activity to show"` (`L34`).
   - However, activity logs were made append-only and immutable (`backend/app/routes/activity_routes.py:L51-L55` returns `403`, `src/hooks/useActivity.tsx:L105-L107` turned `clearActivities` into a no-op, and `src/components/kanban/LatestChangesPanel.tsx:L13-L18` removed the clear button).
2. **Task Creation Selector Mismatch in E2E Helpers (`e2e/helpers.ts:L40-L66`, `e2e/kanban.spec.ts:L65-L147`)**:
   - `e2e/helpers.ts:L46-L65` clicks `button[title="Create New Task"]` and waits for `#title` and `button[title="Close workspace"]` (assuming the right-hand `TaskDetailWorkspace` drawer opens for new tasks).
   - In `src/components/kanban/KanbanBoard.tsx:L580-L585`, clicking `button[title="Create New Task"]` now opens `<TaskModal mode="create" />` (a centered Radix dialog with a `"Task Title"` input and `"Create Task"` submit button, verified in `src/test/components/KanbanBoardTaskCreation.test.tsx:L80-L183`).

### 5.2 Frontend Hook & Component Unit Test Gaps
1. **No Direct Unit Tests for `useTasks` (`src/hooks/useTasks.ts:L1-L193`) or `useBoards` (`src/hooks/useBoards.ts:L1-L349`)**:
   - Component tests mock `@/hooks/useTasks` or `@/services/boardApi`. The 4-second polling loop (`useTasks.ts:L51-L55`), optimistic rollback on API error (`L74-L156`), and `addColumn` insertion before `"archive"` (`L158-L171`) are not unit-tested in isolation.
2. **Global Mock Masks `useActivity` (`src/hooks/useActivity.tsx:L1-L131`)**:
   - Because `src/test/setup.ts:L41-L50` globally mocks `@/hooks/useActivity`, `ActivityProvider` has 0% direct Vitest unit coverage.
3. **Components Without Dedicated Vitest Files**:
   - `src/components/kanban/TrashModal.tsx`, `src/components/kanban/DocumentsView.tsx`, `src/components/documents/NoteModal.tsx`, `src/components/board/InviteMemberDialog.tsx`, `src/components/kanban/BoardHeader.tsx`, `src/components/kanban/LatestChangesPanel.tsx`, `src/components/auth/ProtectedRoute.tsx`, and `src/components/auth/ProfileModal.tsx`.

### 5.3 Backend & Static Analysis Gaps
1. **SQLite Foreign Key Pragmas Not Enabled in `conftest.py` (`backend/tests/conftest.py:L19`)**:
   - Pytest runs on `sqlite:///:memory:` without a `PRAGMA foreign_keys=ON` listener. While SQLAlchemy ORM `cascade="all, delete-orphan"` handles parent deletes in Python, DB-level `ON DELETE CASCADE` / `ON DELETE SET NULL` constraints are only exercised in MySQL E2E runs.
2. **Note RBAC Not Tested in `backend/tests/test_notes.py` (`L1-L65`)**:
   - `test_notes.py` tests note CRUD only as the board owner; it does not test `NoteService.update_note` (`backend/app/services/note_service.py:L67-L72`, blocking `viewer`/`commenter`) or `NoteService.delete_note` (`L109-L116`, restricting deletion to the note author or `admin`+).
3. **Notification Mark-Read Routes Untested in Pytest (`backend/app/routes/notification_routes.py:L22-L40`)**:
   - Neither `PATCH /api/notifications/<notification_id>/read` (`L22-L32`) nor `PATCH /api/notifications/read-all` (`L34-L40`) is called in `backend/tests/`.
4. **Global User Search Endpoint Untested (`backend/app/routes/auth_routes.py:L232-L244`)**:
   - `GET /api/auth/users/search?q=...` has no test in `backend/tests/` and queries `User.query` globally without board-membership scoping.
5. **Relaxed TypeScript & ESLint Strictness (`tsconfig.app.json:L17-L22`, `eslint.config.js:L23-L26`)**:
   - `tsconfig.app.json` sets `"strict": false`, `"noImplicitAny": false`, and `"strictNullChecks": false`.
   - `eslint.config.js` disables `@typescript-eslint/no-unused-vars` and `@typescript-eslint/no-explicit-any` (`"off"`), and `.github/workflows/test.yml` (`L34-L55`) does not run `npm run lint` in CI.
