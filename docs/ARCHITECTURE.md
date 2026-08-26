# Architecture

## System Overview

Sticky Mind Grid is a full-stack task management application modeled after Trello. It consists of a React SPA frontend communicating with a Flask REST API backend, backed by MySQL for persistence. Real-time multi-user synchronization is achieved via Server-Sent Events (SSE).

```
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Pages   │ │ Components│ │  Hooks   │ │    Services (API)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘  │
│                          │ SSE / fetch                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     Flask API                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Routes  │ │ Services │ │  Models  │ │  EventBroadcaster  │  │
│  │(Blueprints)│ │(Business│ │(SQLAlchemy)│ │  (In-Memory SSE)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘  │
│                          │                                       │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     MySQL Database                               │
│  users │ boards │ board_members │ tasks │ activities │ comments  │
│              notifications │ notes                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Entry & Routing

- **Entry:** `src/main.tsx` → `createRoot` → `<App />`
- **Router:** `src/App.tsx` defines routes via React Router v6

| Route | Component | Auth |
|-------|-----------|------|
| `/login` | `Login.tsx` | No |
| `/register` | `Register.tsx` | No |
| `/` | `BoardsOverview.tsx` | Yes (ProtectedRoute) |
| `/boards/:boardId` | `KanbanBoard.tsx` | Yes (ProtectedRoute) |
| `*` | `NotFound.tsx` | No |

- `ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`) wraps authenticated routes. Redirects to `/login` if no user in AuthContext.

### Provider Hierarchy

```
QueryClientProvider
  └─ TooltipProvider
      └─ BrowserRouter
          └─ AuthProvider
              └─ ActivityProvider
                  └─ Routes
```

### State Management

There is no single global store. State is managed through:

1. **AuthContext** (`src/contexts/AuthContext.tsx`) — `user`, `token`, `loading`. Persists to `localStorage`.
2. **ActivityContext** (`src/hooks/useActivity.tsx`) — `activities[]`, `currentBoardId`. Polls every 5s.
3. **React Query** (`@tanstack/react-query`) — Used for board members, notes, comments, notifications, trash, and invitations. NOT used for tasks or boards themselves.
4. **Custom hooks** — `useTasks` and `useBoards` use raw `useState` + polling intervals.
5. **Local component state** — Modals, search, filters, form inputs.

### Key Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `src/contexts/AuthContext.tsx` | Access auth state (user, token, login, logout) |
| `useActivity` | `src/hooks/useActivity.tsx` | Activity feed context (fetch, add, clear) |
| `useBoards` | `src/hooks/useBoards.ts` | Board CRUD + search/sort with optimistic updates |
| `useTasks` | `src/hooks/useTasks.ts` | Task CRUD + reorder/move + 4s polling + optimistic updates |
| `useBoardPermissions` | `src/hooks/useBoardPermissions.ts` | Derives `BoardPermissions` from board + members + user |
| `useBoardRealtime` | `src/hooks/useBoardRealtime.ts` | SSE `EventSource` connection for live board sync |
| `useIsMobile` | `src/hooks/use-mobile.tsx` | Media query for `<768px` breakpoint |

### API Communication

All API calls go through `authenticatedFetch()` (`src/services/apiUtils.ts`):
- Prepends `API_BASE` (from `VITE_API_BASE_URL` env var)
- Adds `Authorization: Bearer <token>` header
- Sets `Content-Type: application/json` (skipped for FormData)
- On 401: clears `localStorage`, redirects to `/login`

Service files (one per domain) wrap `authenticatedFetch`:
- `src/services/authApi.ts` — login, register, profile, user search
- `src/services/boardApi.ts` — board CRUD, members, invitations
- `src/services/api.ts` — task CRUD, reorder, trash
- `src/services/commentApi.ts` — comment CRUD
- `src/services/fileApi.ts` — file upload/download
- `src/services/noteApi.ts` — note CRUD
- `src/services/notificationApi.ts` — notification list, mark read

### UI Components

- **shadcn/ui** primitives in `src/components/ui/` — Radix-based accessible components (Dialog, DropdownMenu, Select, Tabs, etc.)
- **Domain components** organized by feature:
  - `src/components/kanban/` — KanbanBoard, KanbanColumn, TaskCard, TaskModal, TaskListView, CalendarView, DocumentsView, BoardOverview, TrashModal, BoardHeader, LatestChangesPanel, ActivityItem, TaskComments
  - `src/components/boards/` — BoardCard, BoardModal, BoardHeroImage, BoardsHeroBanner
  - `src/components/board/` — BoardMembers, InviteMemberDialog
  - `src/components/auth/` — ProtectedRoute, ProfileModal
  - `src/components/documents/` — NoteModal
  - `src/components/notifications/` — NotificationBell
  - `src/components/common/` — EmojiSelector

### Board Views

`KanbanBoard` (`src/components/kanban/KanbanBoard.tsx`) is the main board orchestrator. It renders view tabs and switches between:

| View | Component | Description |
|------|-----------|-------------|
| Overview | `BoardOverview` | Stats cards, progress bar, board metadata |
| Board | `KanbanBoard` (inline) | Drag-and-drop kanban columns |
| List | `TaskListView` | Sortable table with task columns |
| Calendar | `CalendarView` | Month/week/day views with task chips |
| Documents | `DocumentsView` | Project notes + aggregated task attachments |
| Members | `BoardMembers` + `InviteMemberDialog` | Member management |

### Drag & Drop

Uses `@dnd-kit/core` + `@dnd-kit/sortable`:
- `KanbanBoard` wraps content in `<DndContext>` with `PointerSensor` (5px activation distance)
- `KanbanColumn` is a `useDroppable` container with `SortableContext`
- `TaskCard` uses `useSortable` for visual reordering
- `DragOverlay` renders a ghost copy during drag
- On drop: determines target column, computes new positions (`(index+1)*1000`), auto-adjusts progress (0% first col, 30% in_progress, 100% last col)

---

## Backend Architecture

### App Factory

`backend/app/__init__.py` — `create_app(config_class=Config)`:
1. Creates Flask app with config
2. Initializes extensions: SQLAlchemy, Migrate, JWT, Bcrypt, CORS
3. Registers 8 Blueprints: `board_routes`, `task_routes`, `activity_routes`, `auth_routes`, `comment_routes`, `notification_routes`, `file_routes`, `note_routes`
4. Sets up global error handlers (Exception → 500, 413 → file too large)

### Blueprint / Route Structure

All routes are prefixed with `/api/`.

#### Auth Routes (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create user, return `{user, token}` |
| POST | `/login` | No | Validate credentials, return `{user, token}` |
| GET | `/me` | JWT | Get current user profile |
| PATCH | `/me` | JWT | Update profile (name/password) |
| GET | `/users/search?q=` | JWT | Search users by email/name |

#### Board Routes (`/api/boards`)
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/` | JWT | — | List user's boards |
| POST | `/` | JWT | — | Create board + owner membership |
| GET | `/<id>` | JWT | viewer | Get board |
| PATCH | `/<id>` | JWT | admin | Update board |
| DELETE | `/<id>` | JWT | owner | Delete board |
| GET | `/invitations` | JWT | — | List pending invitations |
| POST | `/<id>/invitations/accept` | JWT | — | Accept invitation |
| POST | `/<id>/invitations/decline` | JWT | — | Decline invitation |
| GET | `/<id>/events` | Token | viewer | SSE event stream |
| GET | `/<id>/members` | JWT | viewer | List members |
| POST | `/<id>/members` | JWT | admin | Invite member |
| DELETE | `/<id>/members/<uid>` | JWT | self/admin | Remove member |
| PATCH | `/<id>/members/<uid>` | JWT | admin | Update role |

#### Task Routes (`/api`)
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/tasks?boardId=` | JWT | viewer | List tasks |
| POST | `/tasks` | JWT | member | Create task |
| GET | `/tasks/<id>` | JWT | viewer | Get task |
| PATCH | `/tasks/<id>` | JWT | member | Update task |
| DELETE | `/tasks/<id>` | JWT | member | Soft-delete (trash) |
| PATCH | `/tasks/<id>/restore` | JWT | member | Restore from trash |
| DELETE | `/tasks/<id>/permanent` | JWT | admin | Hard delete |
| PATCH | `/tasks/reorder` | JWT | member | Batch reorder |
| GET | `/boards/<id>/trash` | JWT | viewer | List trashed tasks |
| DELETE | `/boards/<id>/trash` | JWT | admin | Empty trash |

#### Comment Routes (`/api`)
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/tasks/<id>/comments` | JWT | viewer | List comments |
| POST | `/tasks/<id>/comments` | JWT | viewer | Add comment (with @mentions) |
| DELETE | `/comments/<id>` | JWT | author/admin | Delete comment |

#### Activity Routes (`/api/activities`)
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/` | JWT | viewer | List activities for board |
| POST | `/` | JWT | viewer | Create activity |
| DELETE | `/` | JWT | admin | Clear activities |

#### Notification Routes (`/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List user notifications + unreadCount |
| PATCH | `/<id>/read` | JWT | Mark single notification read |
| PATCH | `/read-all` | JWT | Mark all notifications read |

#### File Routes (`/api/files`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | JWT | Upload file (multipart) |
| GET | `/\<filename\>` | No | Serve file inline |
| GET | `/\<filename\>/download` | No | Serve as attachment |

#### Note Routes (`/api`)
| Method | Path | Auth | RBAC | Description |
|--------|------|------|------|-------------|
| GET | `/boards/<id>/notes` | JWT | viewer | List notes |
| POST | `/boards/<id>/notes` | JWT | member | Create note |
| PATCH | `/notes/<id>` | JWT | member | Update note |
| DELETE | `/notes/<id>` | JWT | author/admin | Delete note |

### Service Layer

Services contain all business logic. Routes parse requests, call services, and format responses.

| Service | File | Responsibilities |
|---------|------|-----------------|
| `BoardService` | `backend/app/services/board_service.py` | Board CRUD, member management, invitations, role changes |
| `TaskService` | `backend/app/services/task_service.py` | Task CRUD, reorder, trash/restore, assignment notifications |
| `ActivityService` | `backend/app/services/activity_service.py` | Activity CRUD, board-scoped queries |
| `CommentService` | `backend/app/services/comment_service.py` | Comment CRUD, @mention detection and notification |
| `FileService` | `backend/app/services/file_service.py` | File validation, storage, retrieval |
| `NoteService` | `backend/app/services/note_service.py` | Board note CRUD |

Notifications are created inline within BoardService, TaskService, and CommentService — there is no standalone notification service.

---

## Database Architecture

### Tables

```
users
├── id (String(36), PK)
├── email (String(255), UNIQUE, NOT NULL)
├── password_hash (String(255), NOT NULL)
├── full_name (String(255), nullable)
└── created_at (DateTime)

boards
├── id (String(36), PK)
├── name (String(255), NOT NULL)
├── emoji (String(50), nullable)
├── description (Text, nullable)
├── color (String(50), NOT NULL, default HSL)
├── hero_image_url (Text/LONGTEXT, nullable)
├── columns (JSON, default [])
├── owner_id (String(36), FK→users.id, nullable)
├── created_at (DateTime)
└── updated_at (DateTime)

board_members
├── id (String(36), PK)
├── board_id (String(36), FK→boards.id, CASCADE, NOT NULL)
├── user_id (String(36), FK→users.id, CASCADE, NOT NULL)
├── role (String(20), NOT NULL, default 'member') — owner|admin|member|viewer
├── status (String(20), NOT NULL, default 'accepted') — pending|accepted|declined
├── created_at (DateTime)
└── UNIQUE(board_id, user_id)

tasks
├── id (String(36), PK)
├── board_id (String(36), FK→boards.id, NOT NULL)
├── title (String(255), NOT NULL)
├── emoji (String(50), nullable)
├── description (Text/LONGTEXT, nullable)
├── status (String(50), default 'todo')
├── priority (String(50), default 'medium')
├── progress (Integer, default 0)
├── due_date (DateTime, nullable)
├── assigned_to (String(36), FK→users.id, nullable)
├── created_by (String(36), FK→users.id, nullable)
├── position (Float, NOT NULL, default 0.0)
├── checklist (JSON, default [])
├── tags (JSON, default [])
├── attachments (JSON, default [])
├── is_deleted (Boolean, NOT NULL, default False)
├── deleted_at (DateTime, nullable)
├── created_at (DateTime)
└── updated_at (DateTime)

activities
├── id (String(36), PK)
├── board_id (String(36), FK→boards.id, CASCADE, nullable)
├── type (String(50), NOT NULL) — create|move|update|delete
├── task_title (String(255), NOT NULL)
├── message (Text, NOT NULL)
├── user_id (String(36), FK→users.id, nullable)
└── timestamp (DateTime)

comments
├── id (String(36), PK)
├── task_id (String(36), FK→tasks.id, CASCADE, NOT NULL)
├── user_id (String(36), FK→users.id, CASCADE, NOT NULL)
├── content (Text, NOT NULL)
├── mentions (JSON, default [])
├── created_at (DateTime)
└── updated_at (DateTime)

notifications
├── id (String(36), PK)
├── user_id (String(36), FK→users.id, CASCADE, NOT NULL)
├── type (String(50), NOT NULL) — mention|assignment|invite|system|board_invite|...
├── title (String(255), NOT NULL)
├── message (Text, NOT NULL)
├── link (String(255), nullable)
├── is_read (Boolean, NOT NULL, default False)
└── created_at (DateTime)

notes
├── id (String(36), PK)
├── board_id (String(36), FK→boards.id, CASCADE, NOT NULL)
├── user_id (String(36), FK→users.id, CASCADE, NOT NULL)
├── title (String(255), NOT NULL)
├── content (Text, nullable, default '')
├── color (String(50), NOT NULL, default '#fef3c7')
├── created_at (DateTime)
└── updated_at (DateTime)
```

### Key Relationships

- Board → User (owner): `boards.owner_id` → `users.id`
- Board → Tasks: One-to-many, cascade delete
- Board → BoardMembers: One-to-many, cascade delete
- Board → Activities: One-to-many (via `board_id`), cascade delete
- Board → Notes: One-to-many, cascade delete
- Task → Board: Many-to-one
- Task → User (creator): via `created_by`
- Task → User (assignee): via `assigned_to`
- Task → Comments: One-to-many, cascade delete
- BoardMember → Board: Many-to-one, cascade delete
- BoardMember → User: Many-to-one, cascade delete
- Comment → Task: Many-to-one, cascade delete
- Comment → User: Many-to-one
- Notification → User: Many-to-one, cascade delete
- Note → Board: Many-to-one, cascade delete
- Note → User: Many-to-one

### Soft Delete Pattern

Only Tasks use soft delete:
- `is_deleted = True` + `deleted_at = datetime.utcnow()` on delete
- Regular queries filter `is_deleted=False`
- Trash queries filter `is_deleted=True`
- `restore` reverses: `is_deleted=False, deleted_at=None`
- `permanent` does a hard SQL DELETE

---

## Authentication

- **Flask-JWT-Extended** with `create_access_token(identity=user.id)`
- Identity is the user's UUID string
- Token expiry: 24 hours (`JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)`)
- Client sends `Authorization: Bearer <token>` header
- `@jwt_required()` on all protected routes
- SSE endpoint manually extracts token from query param (`?token=`) since EventSource can't set custom headers
- Passwords hashed with Flask-Bcrypt
- Login/register return `{user: {...}, token: "..."}`

---

## Authorization / RBAC

### Role Hierarchy

```
owner = 4
admin = 3
member = 2
viewer = 1
none = 0
```

### Role Resolution

`get_effective_role(board_id, user_id)` in `backend/app/utils/decorators.py`:
1. If user is `board.owner_id` → returns `owner` (4) regardless of membership row
2. Looks up `BoardMember` with `status='accepted'` → returns role level
3. No membership → returns 0

### Enforcement

Two decorators enforce access:
- `@require_board_access(minimum_role)` — For board-scoped routes
- `@require_task_access(minimum_role)` — For task-scoped routes (resolves board via task.board_id)

### Frontend Permissions

`useBoardPermissions(board, members)` derives a `BoardPermissions` object for UI decisions:
- `isReadOnly` for viewers
- `canCreateTask`, `canEditTask`, `canDeleteTask` for members+
- `canEditBoard`, `canManageMembers` for admins+
- `canDeleteBoard` for owners only

**Critical:** Frontend permissions are UX-only. All real authorization is enforced server-side.

---

## Board Architecture

- Boards have a `columns` JSON array defining kanban columns (e.g., `[{id: "todo", title: "To Do"}, ...]`)
- Default columns on creation: To Do, In Progress, Done, Archive
- Column IDs are slugified strings (e.g., `in_progress`)
- Board metadata: name, emoji, description, color (HSL), hero_image_url
- Hero images can be: uploaded file, pasted URL, or one of 6 Unsplash presets (client-side resize to 1400x800)

---

## Task Architecture

- Tasks belong to a board via `board_id`
- Status matches a column ID from the board's `columns` array
- Position is a Float; tasks are ordered by position then created_at
- Priority: `low`, `medium`, `high`
- Progress: 0-100 integer; auto-snapped on column move (0% first, 30% in_progress, 100% last)
- Checklist, tags, and attachments stored as JSON arrays
- Tags: `[{id, name, color}]`
- Checklist: `[{id, title, completed}]`
- Attachments: `[{id, name, url, type, size}]` — file upload system exists but attachments are stored inline

---

## Real-Time Architecture

### Backend (EventBroadcaster)

- In-memory pub/sub using `threading.Lock` + `queue.Queue` per subscriber
- `subscribe(board_id)` → returns a Queue
- `broadcast(board_id, event_type, payload)` → pushes SSE-formatted JSON to all subscribers
- Queue maxsize=100; stale messages discarded silently
- Keep-alive ping every 25 seconds

### Frontend (useBoardRealtime)

- Opens `EventSource` to `/api/boards/{id}/events?token={jwt}`
- Handles events: `task:created`, `task:updated`, `task:moved`, `task:deleted`, `tasks:reordered`, `activity:new`, `member:joined`, `member:removed`, `member:role_updated`, `board:updated`
- Auto-reconnects on error after 3 seconds
- Callbacks are stored in refs to avoid reconnection loops

### Event Types

| Event | Triggered By |
|-------|-------------|
| `task:created` | Task creation, task restore |
| `task:updated` | Task field changes |
| `task:moved` | Task status/column change |
| `task:deleted` | Task soft-delete, permanent delete |
| `tasks:reordered` | Batch position update |
| `trash:emptied` | Board trash emptied |
| `board:updated` | Board settings changed |
| `member:invited` | New member invited |
| `member:joined` | Invitation accepted |
| `member:removed` | Member removed or left |
| `member:role_updated` | Member role changed |
| `comment:created` | New comment on task |
| `comment:deleted` | Comment deleted |
| `note:created` | New board note |
| `note:updated` | Board note edited |
| `note:deleted` | Board note deleted |
| `activity:new` | Any activity logged |
| `connected` | SSE connection established |

---

## File/Attachment Architecture

### Upload Flow

1. Frontend creates `FormData` with file
2. `POST /api/files/upload` with JWT auth
3. Backend validates extension against whitelist
4. Backend saves file to `backend/uploads/` with UUID filename
5. Returns `{id, name, storedName, url, type, size, sizeBytes}`
6. Frontend stores metadata in task's `attachments` JSON array

### Storage

- Files stored on disk at `backend/uploads/`
- Filenames are UUIDs to prevent collisions
- Original filenames preserved in metadata
- No virus scanning, no size-based access control beyond upload limit

### Serving

- `GET /api/files/<filename>` — serves inline
- `GET /api/files/<filename>/download?name=...` — serves as attachment
- **No auth required for file retrieval** — anyone with the URL can access

---

## Activity/Audit System

- Every significant mutation creates an `Activity` record
- Types: `create`, `move`, `update`, `delete`
- Contains: `task_title`, human-readable `message`, `board_id`, `user_id`, `timestamp`
- Created inside the same DB transaction as the mutation
- Broadcast via SSE as `activity:new` after commit
- Frontend polls every 5 seconds (when document is visible)
- Displayed in `LatestChangesPanel` sidebar with icons, user avatars, and relative timestamps

---

## Testing Architecture

### Frontend Unit & Component Testing
- **Framework:** Vitest + React Testing Library + jsdom
- **Setup:** `src/test/setup.ts` mocks browser APIs and ActivityContext
- **Utilities:** `src/test/test-utils.tsx` provides `renderWithProviders()` with QueryClient, AuthContext, BrowserRouter
- **Scope:** Fast, isolated testing of pure functions, utility helpers, custom hooks, React UI components, API services, and contexts

### Backend Testing
- **Framework:** pytest
- **Setup:** `backend/tests/conftest.py` provides Flask test client, auth headers, factory functions
- **Database:** SQLite in-memory for test isolation
- **Scope:** REST API endpoints, RBAC permissions, service business logic, cascading deletes, and database models

### End-to-End (E2E) Testing
- **Framework:** Playwright (`@playwright/test`)
- **Configuration:** `playwright.config.ts` (manages test directory `./e2e`, local webServer, trace capture, and reporters)
- **Scope:** Real browser-based automation covering full user journeys, authentication lifecycle, board CRUD, kanban drag-and-drop, permissions, notifications, activity feeds, documents, settings, and regression prevention
- **Test Specs:** Located in `e2e/` (e.g., `auth.spec.ts`, `boards.spec.ts`, `kanban.spec.ts`, `members.spec.ts`, `activity.spec.ts`, `notifications.spec.ts`, etc.)

### CI / Automation
- GitHub Actions workflow at `.github/workflows/test.yml`
- Runs three parallel/staged jobs on push/PR to `main` and `MultiUserCollab`:
  1. `backend-tests`: Installs dependencies and runs `pytest tests -v`
  2. `frontend-tests`: Runs `npx tsc --noEmit` and `npm run test` (Vitest)
  3. `e2e-tests`: Installs browser binaries and runs `npx playwright test` with artifact reporting
