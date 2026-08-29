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

---

## Architecture & Conventions

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

- **API calls** go through `authenticatedFetch()` in `src/services/apiUtils.ts` which handles auth headers and 401 redirects.
- **Tasks and Boards** use custom hooks (`useTasks`, `useBoards`) with raw `useState` + polling — NOT React Query.
- **Comments, Members, Notes, Notifications, Trash** use React Query (`useQuery`/`useMutation` with `queryClient.invalidateQueries`).
- **Real-time** uses `useBoardRealtime` hook which opens an SSE `EventSource` to the backend.
- **Optimistic updates** are used in `useTasks` — local state is patched before the API call, rolled back on error.
- **Permissions** are derived client-side via `useBoardPermissions(board, members)` for UX purposes — but strictly enforced server-side independently.

### Backend Patterns

- **App factory** in `backend/app/__init__.py` — `create_app()` registers all extensions and blueprints.
- **Services** contain all business logic; routes are thin wrappers that parse requests and call services.
- **RBAC** is enforced via decorators: `@require_board_access('member')` or `@require_task_access('viewer')`.
- **Activity logging** is recorded inside the same transaction as the mutation, then broadcast via SSE after commit.
- **Soft delete** on Tasks only (`is_deleted` + `deleted_at`); all other entities use hard delete with cascading FKs.
- **Board columns** are stored as a JSON array on the Board model — not a separate table.
- **Task attachments** are stored as a JSON array on the Task model; uploaded files are stored in `backend/uploads/`.

### Database Conventions

- All primary keys are UUID strings (`String(36)`).
- Timestamps use `datetime.utcnow` (UTC without timezone).
- Relationships use SQLAlchemy `db.relationship` with `back_populates` or `backref`.
- Cascade deletes are configured at the FK level for BoardMember, Activity, Comment, Notification, Note.
- BoardMember enforces a `UniqueConstraint('board_id', 'user_id')`.

---

## 1. Development & Testing Lifecycle

Every feature, bug fix, refactor, or meaningful change must follow this structured lifecycle:

```text
Understand Requirements
        ↓
Inspect Existing Code & Patterns
        ↓
Define Acceptance Criteria
        ↓
Implement
        ↓
Targeted Testing
        ↓
Fix / Iterate
        ↓
Feature Substantially Complete
        ↓
READY FOR FULL VERIFICATION
        ↓
[Continue Related Work OR Start Verification]
        ↓
Full Verification Checkpoint
        ↓
Self-Audit
        ↓
Architecture / Code Review
        ↓
Documentation Sync
        ↓
COMPLETE
```

> [!IMPORTANT]
> `READY FOR FULL VERIFICATION` is a **state**, not an instruction to immediately execute the entire verification suite.
> The agent may continue with closely related work after reaching this state.

---

## 2. Requirements & Code Inspection

Before writing code:

1. **Understand the task:** Clarify the exact user requirements, intended behavior, constraints, and dependencies.
2. **Determine affected layers:**
   - Frontend (components, hooks, services, state)
   - Backend (routes, services, models)
   - Database (schema, relationships, indexes)
   - Authentication & Authorization (JWT, RBAC)
   - Real-time / SSE events
   - File storage
   - Documentation
3. **Inspect before creating:** Read existing components, services, and models. Always check:
   - `backend/app/models/`
   - `backend/app/services/`
   - `backend/app/utils/`
   - `src/components/`
   - `src/hooks/`
   - `src/services/`
   - `src/contexts/`
   - `src/test/`
   - `e2e/`
4. **Reuse existing patterns:** Prefer extending, composing, or refactoring existing patterns over introducing duplicate implementations.

---

## 3. Acceptance Criteria

Before implementation begins, establish explicit and testable acceptance criteria describing observable behavior.

### Example Acceptance Criteria Block:
```text
Acceptance Criteria

[ ] User can open the task detail view
[ ] Task title and description are rendered correctly
[ ] Task status, priority, and progress can be edited
[ ] Attachments remain accessible and downloadable
[ ] Existing board workflows continue to work without regression
[ ] Browser navigation works correctly (back/forward)
```

The agent must use these criteria during:
- Implementation
- Targeted testing
- Feature completion evaluation
- Full verification
- Self-audit

**Rule:** Do NOT declare a feature verification-ready if any acceptance criterion remains unsatisfied.

---

## 4. Implementation Rules

1. **Frontend:**
   - Follow established conventions for custom hooks, React Query, API services, component composition, and state management.
   - Core board and task operations must use `useTasks.ts` and `useBoards.ts` with optimistic updates.
   - Secondary server state (comments, members, notes, notifications, trash) must use React Query.
   - All API calls must use `authenticatedFetch` from `src/services/apiUtils.ts`.
   - Never create duplicate state stores or API helpers without architectural justification.
2. **Backend:**
   - Keep Blueprint routes thin (parse request, dispatch to service, return response).
   - Place all business logic in `backend/app/services/`.
   - Authorization is strictly server-side via `@require_board_access` and `@require_task_access` decorators. Never rely on frontend checks alone.
   - Preserve camelCase JSON API responses (via model `to_dict()` methods) to match frontend TypeScript interfaces.
   - Preserve soft-delete conventions on Tasks (`is_deleted` + `deleted_at`).
   - Validate request inputs appropriately.
3. **Real-Time & Audit Logging:**
   - Record significant mutations in the `activities` table inside the same database transaction.
   - Broadcast SSE events via `broadcaster.broadcast(board_id, event_type, payload)` using `backend/app/utils/event_broadcaster.py`.
   - Do not introduce competing event mechanisms.

---

## 5. Automatic Targeted Testing During Development

Testing happens continuously during development, but the agent must **NOT** run the entire test suite after every small change or commit.

Always use the smallest appropriate test scope:

```text
Change  ──►  Relevant Fast Feedback  ──►  Continue Development
```

### Targeted Scopes:
- **Frontend (Vitest):** Run relevant Vitest test files for changes involving utilities, custom hooks, state transitions, components, or frontend business logic.
  ```bash
  npx vitest run src/test/path/to/TargetComponent.test.tsx
  ```
- **Backend (Pytest):** Run relevant pytest files/methods for changes involving services, routes, API contracts, RBAC, authentication, or soft deletion.
  ```bash
  cd backend
  pytest tests/test_target_service.py -k test_specific_behavior -v
  cd ..
  ```
- **TypeScript Typechecking (`tsc`):** Run `npx tsc --noEmit` when changes meaningfully affect TypeScript types, interfaces, or before an important development checkpoint.
- **ESLint:** Run ESLint for changed code files and as part of the full verification suite.

---

## 6. Playwright Testing Policy

Playwright testing is separated into **Targeted Playwright** and **Full Playwright E2E**.

### 1. Targeted Playwright (Automatic for Workflow Changes)
When a change directly introduces or modifies an important user-facing workflow, the agent should automatically create, update, and run the relevant Playwright test spec:
- Authentication flows (login, registration, logout, protected route redirect)
- Task CRUD, detail view, navigation, and editing
- Board creation, navigation, and settings
- Drag-and-drop column movements and reordering
- Role permissions and invite flows
- Critical persistence behavior

```bash
npx playwright test e2e/task-crud.spec.ts
```

> **Note:** Do not create shallow or meaningless E2E tests for minor style tweaks or internal helper changes if they do not alter user-facing workflows.

### 2. Full Playwright E2E Suite (Manually Triggered by User)
The **full Playwright E2E suite is manually triggered by the user.**
Do **NOT** automatically execute the complete Playwright suite after every feature, commit, or standard development prompt.

The user triggers the full E2E suite with explicit requests such as:
- *"Run the full E2E suite."*
- *"Run all Playwright tests."*
- *"Do a full browser E2E test."*

When full E2E is requested:
1. Run against the actual running application using the designated test database (`sticky_mind_grid_test`).
2. Execute the complete suite: `npm run test:e2e`.
3. Validate rendered UI, accessibility, navigation, interactions, and persistence.
4. Report pass/fail results clearly.
5. The reproducible test specs in `e2e/` remain the source of truth.

---

## 7. Real-Browser E2E Expectations

Full E2E tests must exercise the application from a real user's perspective across meaningful journeys:

```text
Open App ──► Log In ──► Open Board ──► Click Task ──► Edit Fields ──► Save ──► Navigate Away ──► Return ──► Verify Persistence
```

- **Avoid shallow checks:** A test is not complete merely by asserting `<div class="task-detail">` exists in the DOM.
- **Assert on observable behavior:** Visible content, accessible roles and labels, form submissions, state transitions, permissions, and data persistence across page reloads.
- **Use stable locators:** Prefer user-facing locators (`getByRole`, `getByText`, `getByLabel`) over brittle CSS/XPath selectors.

---

## 8. Feature Completion Evaluation

After implementation and targeted tests pass, evaluate feature readiness:
- [ ] Are all acceptance criteria satisfied?
- [ ] Do targeted tests pass cleanly?
- [ ] Are there known bugs or regressions?
- [ ] Is the feature usable and functional in practice?
- [ ] Are existing workflows preserved?

If any answer is "No", iterate and fix before proceeding.
If all answers are "Yes", transition to `READY FOR FULL VERIFICATION`.

---

## 9. READY FOR FULL VERIFICATION State

When a feature is implementation-complete and targeted validation passes, report:

```text
## Verification Readiness

Implementation: COMPLETE
Acceptance Criteria: X/X satisfied
Targeted Tests: PASS
Known Issues: NONE
Status: READY FOR FULL VERIFICATION
```

This indicates the work is complete and ready for a full verification checkpoint. It does **not** force an immediate full-suite run if related work is in progress.

---

## 10. Verification Batching

Closely related features may be grouped into a verification batch to avoid redundant full-suite runs during active development:

```text
Feature A  ──►  Targeted Tests  ──►  READY FOR FULL VERIFICATION
Feature B  ──►  Targeted Tests  ──►  READY FOR FULL VERIFICATION
Feature C  ──►  Targeted Tests  ──►  READY FOR FULL VERIFICATION
                          │
                          ▼
            FULL VERIFICATION CHECKPOINT
```

### Batching Rules:
- **Encouraged for related work:** e.g., multiple related task management or board settings features.
- **Never hide bugs:** Do not carry known failures forward without resolution.
- **Track attribution:** Keep clear record of which changes belong to which ticket.
- **No unrelated batching:** Do not combine completely unrelated features simply to delay testing.

---

## 11. Full Verification Checkpoint

Full verification is the comprehensive regression gate executed at meaningful development boundaries:
- The user explicitly requests verification (`"Run full verification"`, `"Verify the project"`).
- A logical batch of related features is complete.
- The work is ready for handoff or PR/merge.
- No further related development is currently planned.

### Checkpoint Announcement:
```text
## Starting Full Verification

Verification Batch:
- Feature A
- Feature B

Acceptance Criteria: All satisfied
Targeted Tests: PASS
Known Blocking Issues: NONE

Starting full verification suite...
```

---

## 12. Full Verification Suite & Commands

At a full verification checkpoint, execute the automated verification suite:

```bash
# 1. Frontend Unit & Component Tests with Coverage
npm run test:coverage

# 2. Backend Pytest Suite with Coverage
cd backend
pytest --cov=app tests -v
cd ..

# 3. TypeScript Typechecking
npx tsc --noEmit

# 4. ESLint Quality Check
npm run lint
```

### Full Verification vs. Full E2E Distinction:
The full Playwright E2E suite is **NOT** automatically executed during standard full verification unless the user explicitly requested it.

| Request | Actions Executed |
|---|---|
| `"Run full verification"` | Vitest + Pytest + `tsc` + ESLint |
| `"Run full E2E"` | Complete Playwright test suite (`npm run test:e2e`) |
| `"Run full verification and full E2E"` | All automated checks + full Playwright suite |

Always report accurately:
```text
Automated Verification:
- Vitest: PASS
- Pytest: PASS
- TypeScript: PASS
- ESLint: PASS

Browser E2E:
- Full Playwright: RUN / NOT RUN
```

---

## 13. Database Isolation Policy

Strict separation between development and testing databases is mandatory:

| Environment | Database Target | Purpose |
|---|---|---|
| **Development** | MySQL (`sticky_mind_grid`) | Manual interactive development & local dev server |
| **Playwright E2E** | MySQL (`sticky_mind_grid_test`) / Ephemeral | Automated browser journeys (seeded fresh before runs) |
| **Pytest** | SQLite (`sqlite:///:memory:`) | In-memory ephemeral DB created and destroyed per test |

> [!CAUTION]
> Automated tests must NEVER execute against or mutate the primary development database (`sticky_mind_grid`).

---

## 14. Handling Verification Failures

When a test or verification check fails:

```text
Verification FAIL ──► Identify Failure ──► Determine Root Cause ──► Implement Fix ──► Run Targeted Test ──► Re-run Verification
```

1. **Classify the failure:**
   - Current-ticket regression
   - Pre-existing issue
   - Environmental / database setup issue
   - Flaky test
2. **Never ignore failures:** If an issue is pre-existing and cannot be addressed in the current task, document it explicitly. Never report a suite as green when failures remain.

---

## 15. Self-Audit Checklist

After verification passes, conduct a self-audit before finalizing:

- [ ] **Requirements:** Did the implementation fully satisfy the original user request?
- [ ] **Acceptance Criteria:** Is every defined acceptance criterion satisfied and verified?
- [ ] **Architecture:** Are established patterns, layering (Route → Service → Model), and custom hooks respected? No duplicate logic introduced?
- [ ] **Security:** Is authorization enforced server-side? Are input validation and RBAC decorators in place?
- [ ] **Data Integrity:** Are soft-delete conventions maintained? Are API JSON contracts preserved?
- [ ] **Regression:** Are existing board, task, and auth workflows completely intact?

---

## 16. Architecture & Code Review Gate

Perform a self-review of all changes as if reviewing a team pull request:
- **Cleanliness:** Remove unnecessary complexity, dead code, unused imports, and `console.log` statements.
- **Boundaries:** Ensure components are focused and services own business logic.
- **Type Safety:** Check for improper `any` casts or mismatched TypeScript interfaces.
- **Error Handling:** Verify appropriate error handling, fallback UI states, and toast notifications.
- **Performance:** Check for memory leaks, uncancelled subscriptions, or redundant re-renders.

---

## 17. Multi-Ticket / Concurrent Workstreams

When working across multiple tickets or concurrent workstreams:
- Maintain separate requirements, acceptance criteria, implementation status, and targeted tests per workstream.
- Do not mix context or dependencies between unrelated tickets.
- Related tickets may share a single verification batch checkpoint.
- If a verification failure occurs, identify which workstream introduced the regression.

---

## 18. Status Definitions & Final Reporting

Use these four standardized status definitions:

### 1. `IN DEVELOPMENT`
Implementation or targeted validation is active.
```text
## Status: IN DEVELOPMENT

Implementation: IN PROGRESS
Targeted Tests: PASS (or PENDING)
Remaining Tasks:
- Task 1
- Task 2
```

### 2. `READY FOR FULL VERIFICATION`
Acceptance criteria are satisfied and targeted tests pass. Ready for verification checkpoint or continuation of related work.
```text
## Status: READY FOR FULL VERIFICATION

Implementation: COMPLETE
Acceptance Criteria: 6/6 satisfied
Targeted Tests: PASS
Known Issues: NONE
```

### 3. `VERIFIED`
Applicable full verification checkpoint checks have passed.
```text
## Status: VERIFIED

Automated Verification:
- Vitest: PASS
- Pytest: PASS
- TypeScript: PASS
- ESLint: PASS

Browser E2E:
- Full Playwright: NOT RUN (or PASS)
```

### 4. `COMPLETE`
`COMPLETE` is strictly reserved for when:
1. Implementation is complete and meets specifications.
2. All acceptance criteria are satisfied.
3. Targeted tests pass.
4. Full verification suite has passed.
5. Required E2E coverage is executed (when requested).
6. Self-audit and architecture review gates pass.
7. Required documentation is synchronized.

```text
## Status: COMPLETE

Implementation: COMPLETE
Acceptance Criteria: 6/6 satisfied
Targeted Tests: PASS
Full Verification: PASS
Full Playwright E2E: PASS (or NOT RUN - User Triggered)
Self-Audit: PASS
Architecture Review: PASS
Documentation: SYNCED
```

---

## 19. Efficiency Principle

> **Test according to change scope, not commit frequency.**

- Fast development feedback via targeted Vitest/Pytest/`tsc` during development.
- Batch related work where appropriate.
- Comprehensive automated verification at deliberate checkpoints.
- Full Playwright E2E when intentionally requested by the user.

---

## 20. Documentation Maintenance

Update project documentation when:
- **`PROJECT_STATUS.md`** — When features change status (Implemented / Partially Implemented / Not Implemented), or security/testing status changes.
- **`ROADMAP.md`** — When phases or milestone tasks are completed or reorganized.
- **`ARCHITECTURE.md`** — When models, API contracts, services, or architectural patterns change.
- **`AGENTS.md`** — When development, testing, or agent workflow conventions are updated.

---

## Key Files Reference

| Purpose | Path |
|---|---|
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
| E2E test specs | `e2e/` |
