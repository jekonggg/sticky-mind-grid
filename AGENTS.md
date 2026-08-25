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

## Testing Instructions

### Frontend Tests
```bash
npm run test          # Single run (vitest run)
npm run test:watch    # Watch mode
```
Tests are in `src/test/`. The setup file (`src/test/setup.ts`) mocks browser APIs and the ActivityContext. Custom `renderWithProviders` wrapper in `src/test/test-utils.tsx` provides QueryClient, AuthContext, and BrowserRouter.

### Backend Tests
```bash
cd backend
pip install pytest    # If not installed
pytest tests -v
```
Tests use SQLite in-memory database (`TestConfig` in `conftest.py`). Fixtures provide Flask client, auth headers, and factory functions for users/boards.

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### CI
GitHub Actions workflow (`.github/workflows/test.yml`) runs backend pytest and frontend typecheck + vitest on push/PR to `main` and `MultiUserCollab` branches.

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
