# AI Agent Development Guide

## Project Overview

Sticky Mind Grid is a full-stack Trello-style task management application with a React/Vite frontend and a Flask/MySQL backend. It supports multiple boards, kanban drag-and-drop, real-time collaboration via SSE, role-based access control, file uploads, activity auditing, and comments with @mentions.

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite (SWC)
- **Styling:** TailwindCSS + shadcn/ui (Radix primitives)
- **State:** React Context (Auth, Activity) + custom hooks + React Query (partial)
- **Routing:** React Router v6
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod (installed, minimal usage)
- **Charts:** Recharts (installed, used in BoardOverview)
- **API base:** `http://127.0.0.1:5000/api` (configurable via `VITE_API_BASE_URL`)

### Backend
- **Framework:** Flask 3.0 + Python 3.10+
- **ORM:** SQLAlchemy via Flask-SQLAlchemy
- **Database:** MySQL via PyMySQL (SQLite for tests)
- **Auth:** Flask-JWT-Extended (24h tokens)
- **Password hashing:** Flask-Bcrypt
- **Migrations:** Flask-Migrate (Alembic)
- **CORS:** Flask-CORS (credentials-enabled)
- **Real-time:** In-memory SSE EventBroadcaster (threading-based)

## Architecture

See `docs/ARCHITECTURE.md` for the full architecture reference.

## Development Conventions

### Project Structure

```
src/
├── components/         # UI components organized by domain
│   ├── auth/           # Auth guards, profile
│   ├── board/          # Board members, invite
│   ├── boards/         # Board cards, modals, hero
│   ├── common/         # Shared utilities (EmojiSelector)
│   ├── documents/      # NoteModal
│   ├── kanban/         # Core board views (Kanban, List, Calendar, etc.)
│   ├── notifications/  # NotificationBell
│   └── ui/             # shadcn/ui primitives (DO NOT modify without reason)
├── config/             # API configuration (api.ts)
├── contexts/           # React contexts (AuthContext)
├── hooks/              # Custom hooks (useTasks, useBoards, useActivity, etc.)
├── pages/              # Route-level page components
├── services/           # API service functions (one per domain)
├── types/              # TypeScript interfaces (one per domain)
├── test/               # Test files mirror src/ structure
└── utils/              # Pure utility functions

backend/
├── app/
│   ├── __init__.py     # App factory (create_app)
│   ├── models/         # SQLAlchemy models (one per table)
│   ├── routes/         # Flask Blueprints (one per domain)
│   ├── services/       # Business logic layer (one per domain)
│   └── utils/          # Decorators (RBAC) and event broadcaster
├── migrations/         # Alembic migration versions
├── tests/              # pytest tests
├── uploads/            # File upload storage (gitignored)
├── config.py           # Flask configuration
├── run.py              # Dev server entry point
├── seed.py             # Database seeder
└── requirements.txt    # Python dependencies
```

### Naming Conventions

- **Files:** PascalCase for React components (`TaskCard.tsx`), camelCase for hooks/services/utils (`useTasks.ts`), snake_case for Python files (`board_service.py`)
- **Components:** Named exports for components (`export function TaskCard`), default exports for page components
- **API routes:** RESTful, prefixed with `/api/` in Flask Blueprints
- **Services:** Each service is a module with static-like functions (e.g., `BoardService.create_board`)
- **Models:** Singular PascalCase (`Board` not `Boards`), table names are plural snake_case (`boards`)
- **Types:** TypeScript interfaces in `src/types/`, one file per domain

### Frontend Patterns

- **API calls** go through `authenticatedFetch()` in `src/services/apiUtils.ts` which handles auth headers and 401 redirects
- **Tasks and Boards** use custom hooks (`useTasks`, `useBoards`) with raw `useState` + polling — NOT React Query
- **Comments, Members, Notes, Notifications, Trash** use React Query (`useQuery`/`useMutation` with `queryClient.invalidateQueries`)
- **Real-time** uses `useBoardRealtime` hook which opens an SSE `EventSource` to the backend
- **Optimistic updates** are used in `useTasks` — local state is patched before the API call, rolled back on error
- **Permissions** are derived client-side via `useBoardPermissions(board, members)` — but enforced server-side independently

### Backend Patterns

- **App factory** in `backend/app/__init__.py` — `create_app()` registers all extensions and blueprints
- **Services** contain all business logic; routes are thin wrappers that parse requests and call services
- **RBAC** is enforced via decorators: `@require_board_access('member')` or `@require_task_access('viewer')`
- **Activity logging** is done inside the same transaction as the mutation, then broadcast via SSE after commit
- **Soft delete** on Tasks only (`is_deleted` + `deleted_at`); all other entities use hard delete with cascading FKs
- **Board columns** are stored as a JSON array on the Board model — not a separate table
- **Task attachments** are stored as a JSON array on the Task model; files themselves are saved to `backend/uploads/`

### Database Conventions

- All primary keys are UUID strings (String(36))
- Timestamps use `datetime.utcnow` (no timezone)
- Relationships use SQLAlchemy `db.relationship` with `back_populates` or `backref`
- Cascade deletes are configured at the FK level for BoardMember, Activity, Comment, Notification, Note
- BoardMember has a `UniqueConstraint('board_id', 'user_id')`

## Development Rules

1. **Inspect before creating.** Always read existing components, services, and models before writing new ones. Reuse what exists.
2. **Follow the existing architecture.** New features should follow the established patterns (service layer, Blueprint routes, hook patterns).
3. **Frontend-backend contract.** Keep API shapes synchronized. Backend `to_dict()` methods return camelCase to match frontend TypeScript types.
4. **Authorization is server-side.** Frontend permission checks via `useBoardPermissions` are for UX only — all real authorization is enforced in backend decorators. Never rely on frontend restrictions alone.
5. **Data isolation.** All queries must be scoped to the authenticated user's boards. Never expose cross-board data.
6. **SSE broadcasts.** When adding mutations that should sync in real-time, call `broadcaster.broadcast()` with the appropriate event type.
7. **Activity logging.** Record significant mutations in the Activity table within the same transaction.
8. **Soft delete.** Tasks use `is_deleted` + `deleted_at`. Do not hard-delete tasks from normal delete operations.
9. **Board columns.** Columns are a JSON array on Board. New columns must be inserted before the "archive" column if it exists.
10. **TypeScript strict mode is OFF.** The project uses `"strict": false` and `"noImplicitAny": false`. Be careful with implicit `any` types.
11. **No unused variable warnings.** ESLint has `no-unused-vars` turned off. Don't rely on the linter to catch dead code.
12. **Preserve existing behavior.** Unless explicitly asked to change behavior, maintain current functionality.

## Development & Testing Lifecycle

Every feature or ticket must follow this structured lifecycle to ensure code quality, regression prevention, and architectural consistency:

```
Feature / Ticket
       ↓
Understand Requirements (Inspect models, services, components)
       ↓
Implement (Follow existing conventions & architecture)
       ↓
Vitest Tests (Fast unit/component/hook coverage)
       ↓
Playwright Tests (E2E user journey & regression coverage)
       ↓
Run Full Test Suite (Vitest + Playwright + Pytest + Typecheck + Lint)
       ↓
Review (Self-audit against architecture & conventions)
       ↓
Complete (Definition of Done satisfied)
```

## Testing Strategy & Responsibilities

Testing is divided across three dedicated layers with distinct responsibilities:

### 1. Vitest (Frontend Unit & Component Testing)
Use for fast, isolated testing of:
- **Pure functions & utility functions:** `src/utils/` calculations, formatters, and helpers.
- **Custom hooks:** `useTasks`, `useBoards`, `useBoardPermissions`, `useBoardRealtime`, etc.
- **React components:** UI components, modals, dialogs, form inputs, and state rendering.
- **Services & API logic:** API utility wrappers, data transformation functions.
- **State management & contexts:** `AuthContext`, `ActivityContext`, query caching logic.
- **Error handling & edge cases:** Component fallback states, empty states, and validation errors.

### 2. Playwright (End-to-End Browser Testing)
Use for realistic, browser-based validation of complete user workflows:
- **Authentication workflows:** Register, login, logout, session persistence, route redirects.
- **Critical user journeys:** Multi-step board and task workflows across views.
- **CRUD workflows:** Creating, editing, archiving, restoring, and deleting boards/tasks/notes.
- **Complex UI interactions:** Drag-and-drop card movements between columns, reordering.
- **Forms & validation:** Submitting task details, board settings, invite dialogs.
- **File interactions:** Attachment uploads, download actions, preview rendering.
- **Role-based UI behavior:** Owner vs admin vs member vs viewer permissions and action availability.
- **Regression scenarios:** Verifying critical paths remain functional after major changes.

> **Rule on E2E scope:** Do not require every small code change (e.g., minor style tweak or pure helper fix) to have a new Playwright test if the change does not introduce or modify a user-facing workflow. Focus Playwright on user-facing journeys and workflow regressions.

### 3. Pytest (Backend API & Service Testing)
Use for server-side validation against in-memory SQLite:
- **API routes & endpoints:** Request parsing, status codes, response payloads.
- **Service layer:** Business logic in `BoardService`, `TaskService`, `CommentService`, etc.
- **RBAC decorators:** Role verification (`owner`, `admin`, `member`, `viewer`).
- **Database transactions & cascading:** Integrity of foreign keys, soft delete vs hard delete.

---

## Testing Instructions

### Frontend Unit & Component Tests (Vitest)
```bash
npm run test          # Single run (vitest run)
npm run test:watch    # Watch mode
```
Tests are in `src/test/` (or co-located `*.test.tsx`). The setup file (`src/test/setup.ts`) mocks browser APIs and the ActivityContext. Custom `renderWithProviders` wrapper in `src/test/test-utils.tsx` provides QueryClient, AuthContext, and BrowserRouter.

### End-to-End Tests (Playwright)
```bash
npm run test:e2e          # Run all E2E tests headless
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:report   # View last test run report
```
E2E tests reside in `e2e/`. They run against the active application to validate full browser flows, drag-and-drop, authentication, and board views.

### Backend Tests (Pytest)
```bash
cd backend
pip install pytest    # If not installed
pytest tests -v
```
Tests use SQLite in-memory database (`TestConfig` in `conftest.py`). Fixtures provide Flask client, auth headers, and factory functions for users/boards.

### Type Checking & Linting
```bash
npx tsc --noEmit      # TypeScript check
npm run lint          # ESLint check
```

### Full Verification Command Checklist
Before concluding work on a feature, run:
1. `npm run test` (Vitest suite)
2. `npm run test:e2e` (Playwright E2E suite)
3. `pytest tests -v` (Backend Pytest suite, from `backend/`)
4. `npx tsc --noEmit` (TypeScript typecheck)
5. `npm run lint` (ESLint)

### CI
GitHub Actions workflow (`.github/workflows/test.yml`) runs backend pytest, frontend typecheck + vitest, and Playwright E2E tests on push/PR to `main` and `MultiUserCollab` branches.

## Definition of Done

A feature, ticket, or bug fix is strictly considered **Complete** only when all of the following criteria are met:

1. **Implementation Complete:** Code meets feature specifications and complies with project architecture and coding conventions.
2. **Vitest Tests:** Appropriate unit, hook, or component tests exist or have been updated for new logic.
3. **Playwright Tests:** Appropriate E2E tests exist or have been updated whenever a user workflow or interactive flow is added or modified.
4. **Backend Tests:** Backend API endpoints, RBAC rules, and service logic are validated with pytest.
5. **Full Suite Green:** All test suites (Vitest, Playwright, Pytest), TypeScript typecheck, and ESLint pass without failures.
6. **No Regressions:** No unrelated functionality or existing test suites are broken.
7. **Documentation Updated:** Documentation is updated when the workflow, API contract, models, or architectural behavior changes (see Documentation Maintenance below).

## Documentation Maintenance

Update documentation files when:

- **PROJECT_STATUS.md** — When features move between Implemented/Partially Implemented/Not Implemented, or when security/technical debt items change.
- **ROADMAP.md** — When phases are completed or when new priorities emerge from the codebase state.
- **ARCHITECTURE.md** — When new models, routes, services, or significant architectural patterns are added or changed.

Do NOT update documentation for minor bug fixes or UI tweaks.

## Key Files Reference

| Purpose | Path |
|---------|------|
| API base config | `src/config/api.ts` |
| Auth fetch wrapper | `src/services/apiUtils.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Board CRUD hook | `src/hooks/useBoards.ts` |
| Task CRUD hook | `src/hooks/useTasks.ts` |
| Activity context | `src/hooks/useActivity.tsx` |
| Real-time hook | `src/hooks/useBoardRealtime.ts` |
| Permissions hook | `src/hooks/useBoardPermissions.ts` |
| RBAC decorators | `backend/app/utils/decorators.py` |
| Event broadcaster | `backend/app/utils/event_broadcaster.py` |
| Flask app factory | `backend/app/__init__.py` |
| Flask config | `backend/config.py` |
| Database seeder | `backend/seed.py` |
