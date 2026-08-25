# Roadmap

*Based on actual codebase state as of 2026-08-25*

---

## Phase 1: Security & Data Integrity

**Objective:** Address security vulnerabilities and data protection issues.

### Tasks

- [ ] **Add rate limiting to API endpoints** — Use `flask-limiter` on login, registration, file upload, and general API routes
- [ ] **Require authentication for file serving** — `GET /api/files/<filename>` and `/download` should require JWT or signed URL
- [ ] **Remove hardcoded secret fallbacks** — `config.py` should raise an error (not use defaults) when `SECRET_KEY` and `JWT_SECRET_KEY` env vars are missing in production
- [ ] **Add Content-Security-Policy headers** — Configure CSP on the Flask app
- [ ] **Add request validation** — Use marshmallow or pydantic for input validation on all routes (currently manual validation)
- [ ] **Restrict CORS origins** — Ensure production `CORS_ORIGINS` only includes the actual frontend domain
- [ ] **Sanitize file upload content** — Add basic content-type validation beyond extension checking

### Dependencies
None — these are independent security improvements.

### Completion Criteria
- Rate limiting active on all public endpoints
- File serving requires authentication
- No hardcoded secrets in any configuration
- CSP headers present on all responses
- Input validation on all write endpoints

---

## Phase 2: Testing & Type Safety

**Objective:** Improve code quality through comprehensive testing and type safety.

### Tasks

- [ ] **Enable TypeScript strict mode** — Set `"strict": true` in `tsconfig.app.json` and fix resulting type errors
- [ ] **Enable ESLint unused variable detection** — Re-enable `no-unused-vars` and remove dead imports/code
- [ ] **Remove dead code** — Delete `src/pages/Index.tsx`, remove `USE_MOCK` branches from `src/services/api.ts`
- [ ] **Fix CORS duplication** — Remove duplicate CORS initialization in `backend/app/__init__.py`
- [ ] **Add pytest to requirements.txt** — Backend tests depend on pytest but it's not declared as a dependency
- [ ] **Expand backend tests:** (currently 34: auth=9, tasks=1, RBAC=19, invitations=5)
  - [ ] Board CRUD endpoints (create, update, list, delete)
  - [ ] Board member management (remove, update role)
  - [ ] Trash/restore flow (create → soft-delete → list trash → restore → verify)
  - [ ] File upload/download flow
  - [ ] Notes API (CRUD)
  - [ ] Notifications API (list, mark read, mark all read)
  - [ ] Activities API (list, create, clear)
- [ ] **Expand frontend tests:** (currently 9 real + 1 placeholder)
  - [ ] `useTasks` hook (create, update, delete, reorder, move)
  - [ ] `useBoards` hook (create, update, delete, search, sort)
  - [ ] `useBoardPermissions` hook (role derivation)
  - [ ] `AuthContext` (login, logout, token persistence)
  - [ ] `Login` and `Register` page forms
  - [ ] `TaskModal` form interactions
  - [ ] `KanbanBoard` drag-and-drop behavior
- [ ] **Write Playwright E2E tests** — At minimum: login flow, board creation, task creation and move, member invite

### Dependencies
Phase 1 should be completed first (rate limiting, validation changes may affect test setup).

### Completion Criteria
- `npx tsc --noEmit` passes with strict mode
- No unused variable warnings from ESLint
- Backend test count: 60+ (from current 34)
- Frontend test count: 30+ (from current 9 real tests)
- At least 3 Playwright E2E scenarios passing

---

## Phase 3: Core Product Improvements

**Objective:** Fill gaps in existing features and improve UX.

### Tasks

- [ ] **Add task search/filter on kanban board** — Filter by assignee, priority, date range, text search
- [ ] **Add due date indicators** — Show overdue tasks with visual indicators (red border, badge)
- [ ] **Add dark mode toggle** — Wire up `next-themes` or add manual class toggle to the UI
- [ ] **Add user avatar upload** — Profile picture upload with crop/resize
- [ ] **Improve tag management** — Global tag palette, tag autocomplete, tag filtering
- [ ] **Add task description markdown support** — Render markdown in task descriptions
- [ ] **Improve column management** — Drag-to-reorder columns, delete columns (move tasks to another column first)
- [ ] **Add board archiving** — Archive boards instead of only hard delete
- [ ] **Add activity export** — Export activity history as CSV/JSON

### Dependencies
Phase 2 should be completed first to ensure changes are tested.

### Completion Criteria
- Task filtering works on kanban board
- Overdue tasks are visually distinct
- Dark mode toggle available and functional
- Users can upload profile pictures
- Tags have a management UI

---

## Phase 4: Real-Time & Collaboration

**Objective:** Improve multi-user collaboration experience.

### Tasks

- [ ] **Add user presence indicators** — Show who is currently viewing a board (via SSE heartbeat)
- [ ] **Add task locking** — Prevent concurrent edits on the same task (optimistic lock with version field)
- [ ] **Persist SSE events** — Store events in a message queue (Redis) so events survive server restarts
- [ ] **Add email notifications** — Send emails for assignments, mentions, and invitations (using Celery or similar)
- [ ] **Add due date reminders** — Background job to check approaching deadlines and create notifications
- [ ] **Improve optimistic concurrency** — Add version fields to prevent lost updates

### Dependencies
Phase 3 for UX improvements; potentially requires infrastructure changes (Redis, Celery).

### Completion Criteria
- Users see who else is on the board
- Concurrent task edits don't cause data loss
- SSE events survive server restarts
- Email notifications work for key events

---

## Phase 5: Advanced Features

**Objective:** Add significant new capabilities.

### Tasks

- [ ] **Task dependencies** — Block/blocked-by relationships between tasks
- [ ] **Recurring tasks** — Schedule tasks to repeat on intervals
- [ ] **Time tracking** — Log time spent on tasks, estimate vs actual
- [ ] **Board templates** — Pre-defined column structures and sample tasks
- [ ] **Board export/import** — Export board as JSON, import from JSON
- [ ] **Custom fields** — User-defined fields on tasks (beyond the current fixed schema)
- [ ] **Bulk operations** — Select multiple tasks and move/delete/reassign
- [ ] **Subtasks** — Nested task hierarchy (tasks within tasks)

### Dependencies
Phase 4 for collaboration features; some features may require database schema changes.

### Completion Criteria
- Task dependencies visualized and enforced
- Recurring tasks create new instances on schedule
- Time tracking provides useful metrics
- Board export/import works reliably

---

## Phase 6: Production Readiness

**Objective:** Prepare for production deployment.

### Tasks

- [ ] **Add deployment configuration** — Dockerfile, docker-compose, or similar
- [ ] **Add database migration for production** — Review and finalize Alembic migrations
- [ ] **Add monitoring/logging** — Structured logging, error tracking (Sentry or similar)
- [ ] **Add health check endpoint** — `GET /api/health` for load balancer
- [ ] **Optimize database queries** — Add indexes for frequently queried columns (board_id on tasks, user_id on notifications)
- [ ] **Move file storage to object storage** — Migrate from local filesystem to S3/compatible storage
- [ ] **Add CI/CD pipeline** — Automated deployment on merge to main
- [ ] **Performance testing** — Load test with concurrent users
- [ ] **Security audit** — Review OWASP Top 10 compliance

### Dependencies
All previous phases.

### Completion Criteria
- Application deployable via single command
- All migrations up to date
- Health check endpoint responds
- File storage is external
- CI/CD pipeline deploys on merge
- Load test passes with 100+ concurrent users
