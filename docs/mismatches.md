Status: Verified | Last scanned: 2026-10-13 | Audience: Engineering, Technical Writers, Maintainers

# Code vs. Existing Documentation Mismatches

Per **Ground Rule 4**, wherever the live codebase and pre-existing repository documentation (`docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, `AGENTS.md`) disagree, the documentation suite (`docs/00-index.md`, `docs/_scan-notes.md`, `docs/04-invite-lifecycle.md`, `docs/05-user-guide.md`, `docs/06-functional-spec.md`) follows the **code**. Every factual discrepancy discovered during the repository scan is recorded below.

---

## 1. Summary Matrix

### 1.1 Cross-Document Specification Contradictions

These contradictions were identified during the consistency audit across the primary specification documents (`02-business-rules.md`, `03-roles-and-permissions.md`, `04-invite-lifecycle.md`, `06-functional-spec.md`, and `09-api-reference.md`). Per Ground Rule 4 and instruction 5, they are documented here without being unilaterally resolved.

| Mismatch / Contradiction | File or Area | Why It Matters | Suggested Owner | Source Agent |
|---|---|---|---|---|
| **CD-01 [CLOSED]:** Attachment Deletion Authorization — `03-roles-and-permissions.md` and `06-functional-spec.md` hide attachment delete buttons from `Editor` unless they uploaded the file, but `09-api-reference.md` and `TaskService.update_task` allow any `Editor` to delete any attachment via `PATCH /api/tasks/<id>`. | `docs/03-roles-and-permissions.md:L160, L184`, `docs/06-functional-spec.md:L168`, `docs/09-api-reference.md:L388`, `backend/app/services/task_service.py:L266` | **CLOSED:** Server enforces author or admin/owner deletion rule (returns HTTP 403 otherwise), deletes physical file on removal, and includes cleanup script. | Backend Security Lead | Agent 1 / Agent 3 |
| **CD-02 [CLOSED]:** Checklist-Derived Progress Synchronization — `02-business-rules.md:BR-23` and `06-functional-spec.md` specify that the progress slider is locked when checklists exist (`progress = completed/total*100`), but `09-api-reference.md` and `TaskService.update_task` accepted arbitrary manual `progress` integers. | `docs/02-business-rules.md:BR-23`, `docs/06-functional-spec.md:L161`, `docs/09-api-reference.md:L388`, `backend/app/services/task_service.py:L138-L144, L301-L308` | **CLOSED:** Server auto-derives progress from checklist items during creation and update, ignoring manual `progress` overrides when checklist is non-empty. | Backend Engineering | Agent 1 / Agent 2 |
| **CD-03 [CLOSED]:** Board Permanent Deletion Integrity Error — `02-business-rules.md:BR-35` states board deletion purges all resources, and `09-api-reference.md` lists `DELETE /api/boards/<id>` as permanently deleting the board, but `08-data-model.md` notes `Task.board_id` lacks `ondelete='CASCADE'`, causing permanent deletion of boards with tasks to crash with HTTP 500 `IntegrityError`. | `docs/02-business-rules.md:BR-35`, `docs/08-data-model.md:L103`, `docs/09-api-reference.md:L236`, `backend/app/services/board_service.py:L359-L366` | **CLOSED:** Resolved by adding `ondelete='CASCADE'` to `Task.board_id`, migration `e1a2b3c4d5e6`, and attachment cleanup in `BoardService.delete_board` and lazy purge. | Database / Backend Lead | Agent 1 / Agent 3 |
| **CD-04:** Ownership Semantics on Transfer — `03-roles-and-permissions.md:L16` and `04-invite-lifecycle.md:L132` document that `transfer_ownership` promotes the target to `owner` while leaving the former owner's `BoardMember.role` as `'owner'` (multi-owner co-ownership), whereas `06-functional-spec.md:L78` frames ownership transfer as transferring sole ownership. | `docs/03-roles-and-permissions.md:L16`, `docs/04-invite-lifecycle.md:L132`, `docs/06-functional-spec.md:L78`, `backend/app/services/board_service.py:L1072-L1073` | Architectural ambiguity: unclear whether the system officially supports multiple simultaneous board owners or if previous owners should automatically be demoted to `admin`. | Product Management | Agent 1 / Agent 2 |
| **CD-05 [CLOSED]:** Former Member Author Deletions — `03-roles-and-permissions.md` states removed members lose board access (`HTTP 403`), but `09-api-reference.md`, `CommentService.delete_comment`, and `NoteService.delete_note` only check `user_id == author_id`, allowing removed members to delete their authored items via API. | `docs/03-roles-and-permissions.md:L148, L174`, `docs/09-api-reference.md:L553, L663`, `backend/app/services/comment_service.py:L152-L158`, `backend/app/services/note_service.py:L109-L116` | **CLOSED:** Updated `delete_comment` and `delete_note` to require active board access, returning HTTP 403 to former members. | Backend Security Lead | Agent 1 / Agent 3 |
| **CD-06 [CLOSED]:** Note Deletion Authorization UI vs Server — `03-roles-and-permissions.md:L174` and `06-functional-spec.md:L132` note that `DocumentsView.tsx` renders a Delete button on all notes for any `Editor` (`!readOnly`), but `09-api-reference.md:L663` and `NoteService.delete_note` reject non-author editors with HTTP 403 (`is_author or is_admin_or_owner`). | `docs/03-roles-and-permissions.md:L174`, `docs/06-functional-spec.md:L132`, `docs/09-api-reference.md:L663`, `backend/app/services/note_service.py:L109-L116`, `src/components/kanban/DocumentsView.tsx:L280-L290` | **CLOSED:** Server enforces author or admin/owner deletion in `note_service`, and `DocumentsView.tsx` gates note deletion controls with `canDeleteNote` check. | Frontend Engineering | Agent 2 / Agent 3 |
| **CD-07:** Global Pages Task Editing UI vs Server RBAC — `03-roles-and-permissions.md:L135, L186` and `05-user-guide.md:L142` document that global pages (`/dashboard`, `/tasks`, `/calendar`) hardcode `readOnly={false}` on `<TaskDetailWorkspace>`, but `06-functional-spec.md` and `09-api-reference.md` document that `Commenter` and `Viewer` mutations fail on the server with HTTP 403. | `docs/03-roles-and-permissions.md:L135, L186`, `docs/05-user-guide.md:L142`, `docs/06-functional-spec.md:L142`, `docs/09-api-reference.md:L348`, `src/pages/DashboardPage.tsx:L729` | Client-server mismatch: read-only users see editable forms on global dashboard views that trigger unhandled 403 error toasts upon saving. | Frontend Engineering | Agent 1 / Agent 2 |
| **CD-08:** Teams Page Member Invite Button Visibility — `03-roles-and-permissions.md:L79, L187` and `06-functional-spec.md:L125` restrict invite controls to `Owner` and `Admin`, but `TeamsPage.tsx` renders invite buttons to all roles (`Editor`, `Commenter`, `Viewer`), while `09-api-reference.md:L245` confirms the backend rejects non-admin invitations with HTTP 403. | `docs/03-roles-and-permissions.md:L79, L187`, `docs/06-functional-spec.md:L125`, `docs/09-api-reference.md:L245`, `backend/app/routes/board_routes.py:L206-L208`, `src/pages/TeamsPage.tsx:L195, L402` | Client-server mismatch: non-admin team members on `/teams` see active invite buttons that fail with HTTP 403 when used. | Frontend Engineering | Agent 1 / Agent 2 |

---

### 1.2 Code vs. Legacy Documentation Mismatches

| Mismatch / Contradiction | File or Area | Why It Matters | Suggested Owner | Source Agent |
|---|---|---|---|---|
| **MM-01:** File Serving Authentication — `docs/ARCHITECTURE.md:L220-L221, L688` claims `GET /api/files/<filename>` requires no auth (`"Public"`), but code requires JWT (`Bearer` or `?token=`) and `viewer`+ board access (`401`/`403`) for task/chat files (only avatars are public). | `docs/ARCHITECTURE.md:L220-L221, L688`, `backend/app/routes/file_routes.py:L45-L60`, `backend/app/services/file_service.py:L382-L460` | Misleads developers into believing uploaded file assets are unauthenticated public URLs when strict tenancy is enforced. | Technical Documentation Lead | Agent 3 / Agent 4 |
| **MM-02:** Malware Scanning, Magic Bytes & Quotas — `docs/ARCHITECTURE.md:L682`, `PROJECT_STATUS.md:L252`, and `ROADMAP.md:L19` claim uploads have no scanning, no magic bytes, and no size quotas beyond upload size; code enforces magic-byte validation, malware signature scanning, and 100 MB board / 500 MB owner quotas. | `docs/ARCHITECTURE.md:L682`, `docs/PROJECT_STATUS.md:L252`, `backend/app/services/file_service.py:L63-L109, L177-L207`, `backend/config.py:L55-L57` | Severely understates application security posture and misrepresents production storage management. | Technical Documentation Lead | Agent 4 / Agent 5 |
| **MM-03:** Soft Delete Scope Beyond Tasks — `AGENTS.md:L100`, `ARCHITECTURE.md:L360`, and `PROJECT_STATUS.md:L30` claim soft delete exists only on `Task`; code implements 30-day soft delete on `Board`, soft unsend on `Message`, and soft status retention on `BoardInvitation` and `BoardMember`. | `AGENTS.md:L100`, `docs/ARCHITECTURE.md:L360-L368`, `backend/app/models/board.py:L32-L33`, `backend/app/services/board_service.py:L297-L356` | Developers relying on legacy docs might assume board deletions are immediate hard deletes and fail to account for 30-day board trash lifecycle. | Technical Documentation Lead | Agent 1 / Agent 3 |
| **MM-04:** Blueprints, Services & DB Tables Count — `docs/ARCHITECTURE.md:L27-L30, L148, L235-L339` lists 8 Blueprints, 6 services, and 8 DB tables; code registers 11 Blueprints, 9 services (including `NotificationService`, `UserService`, `MessageService`), and 13 DB tables. | `docs/ARCHITECTURE.md:L27-L30, L148, L235-L339`, `backend/app/__init__.py:L63-L85`, `backend/app/services/*.py`, `backend/app/models/*.py` | Outdated architecture documentation conceals messaging, preferences, and standalone notification services. | Technical Documentation Lead | Agent 3 |
| **MM-05:** Frontend Routes & Context Providers Hierarchy — `docs/ARCHITECTURE.md:L42-L64` lists only 5 routes and 4 context providers; code defines 9 routes (adding `/dashboard`, `/tasks`, `/calendar`, `/teams`) and 7 providers (`SettingsProvider`, `DevModeProvider`, etc.). | `docs/ARCHITECTURE.md:L42-L64`, `src/App.tsx:L31-L69`, `src/components/layout/AppLayout.tsx:L97` | Incomplete developer onboarding reference; developers miss global productivity views and developer tooling modes. | Technical Documentation Lead | Agent 2 / Agent 3 |
| **MM-06:** API Route Permissions & Immutability — `docs/ARCHITECTURE.md:L181-L208` claims `DELETE /api/activities` clears activities for `admin` (code returns HTTP 403 immutable for all), and misstates roles for trash (`editor`, not `viewer`), comments (`commenter`, not `viewer`), and board activities (`admin`, not `viewer`). | `docs/ARCHITECTURE.md:L181-L208`, `backend/app/routes/activity_routes.py:L27-L28, L51-L55`, `backend/app/routes/task_routes.py:L33-L34`, `backend/app/routes/comment_routes.py:L17` | Critical inaccuracy in API security documentation; leads to improper frontend integration assumptions. | Technical Documentation Lead | Agent 1 / Agent 3 |
| **MM-07:** Outdated "Not Implemented" Claims — `docs/PROJECT_STATUS.md:L151-L260` and `ROADMAP.md` list Assignee Validation, Task Search/Filter, Overdue Indicators, Dark Mode, Data Export, Avatars, Templates, Conflict Detection, and `/api/health` as unimplemented; all are implemented in code. | `docs/PROJECT_STATUS.md:L151-L260`, `docs/ROADMAP.md:L14-L161`, multiple backend & frontend source files | Obsolete project tracking documents obscure production-ready capabilities. | Product Management / Tech Lead | Agent 1 / Agent 2 |
| **MM-08:** Duplicate CORS Initialization Claim — `docs/PROJECT_STATUS.md:L224` and `ROADMAP.md:L55` claim `CORS()` is called twice in `backend/app/__init__.py`; code initializes `CORS` only once (`L35-L42`). | `docs/PROJECT_STATUS.md:L224-L226`, `docs/ROADMAP.md:L55`, `backend/app/__init__.py:L35-L42` | Phantom bug claim in roadmap; creates unnecessary remediation work. | Technical Documentation Lead | Agent 3 |
| **MM-09:** Playwright E2E Port Number — `docs/ARCHITECTURE.md:L739` states Playwright runs against port `5173`; code configures Playwright against `http://localhost:8085` (and Vite dev server on port `8080`). | `docs/ARCHITECTURE.md:L739`, `playwright.config.ts:L16, L24`, `e2e/run.mjs:L17` | Misleading test documentation; causes local test runs to fail if wrong ports are targeted. | QA / Testing Lead | Agent 4 |
| **MM-10:** SSE Event Matrix Discrepancy — `docs/ARCHITECTURE.md:L637, L643-L663` lists only 12 SSE events, omitting 9 events emitted by backend services (`comment:*`, `note:*`, `trash:emptied`, `member:invited`, `member:invite_resent`). | `docs/ARCHITECTURE.md:L637, L643-L663`, `src/hooks/useBoardRealtime.ts:L182-L279`, `backend/app/services/*.py` | Architectural documentation fails to specify full real-time event surface and event handling gaps. | Real-Time / Backend Lead | Agent 3 |

---

## 2. Detailed Findings & Cross-Document Contradictions

### CD-01 through CD-08: Cross-Document Specification Contradictions Analysis

#### CD-01 [CLOSED]: Task Attachment Deletion Authorization Gap
- **Status:** CLOSED / RESOLVED.
- **Resolution:** Updated `TaskService.update_task` to enforce that only the attachment uploader (`att.uploaderId == user_id`) or an Admin/Owner may delete attachments, raising `PermissionError` (HTTP 403) on violation. Updated `FileService.delete_attachment_file` to remove deleted attachment files from disk. Created `scripts/find_orphaned_attachments.py` for audit and cleanup.
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L160, L184` & `docs/06-functional-spec.md:L168` vs. `docs/09-api-reference.md:L388` & `backend/app/services/task_service.py:L266`.
- **Conflict Details:** The UI spec and RBAC permission matrix specify that an `Editor` can only delete attachments they personally uploaded (`att.uploaderId === currentUser.id`), reserving deletion of other users' attachments to `Admin` and `Owner`. However, the API reference and backend service allow any user with `editor` board access to submit `PATCH /api/tasks/<task_id>` with an updated `attachments` array, deleting any attachment regardless of uploader identity. Furthermore, removing an attachment from the task array does not invoke `FileService.cleanup_task_attachments`, leaving orphaned files on the disk storage.
- **Recommended Action:** Engineering must decide whether to enforce uploader ownership on the backend or align the UI to permit team-wide attachment management by all editors.

#### CD-02 [CLOSED]: Checklist Progress Synchronization vs. Manual Override
- **Status:** CLOSED / RESOLVED.
- **Resolution:** Updated `TaskService.create_task` and `TaskService.update_task` in `backend/app/services/task_service.py` to automatically derive `task.progress` from checklist items (`round((completed / total) * 100)`) whenever `checklist` contains items, ignoring manual `progress` payload overrides. When `checklist` is empty, manual `progress` values are preserved.
- **Documents in Conflict:** `docs/02-business-rules.md:BR-23` & `docs/06-functional-spec.md:L161` vs. `docs/09-api-reference.md:L388` & `backend/app/services/task_service.py:L262-L264`.
- **Conflict Details:** The business rules and functional specification dictate that whenever a task has checklist subtasks, the progress slider is locked and progress is strictly derived as `Math.round((completed / total) * 100)`. Previously, `PATCH /api/tasks/<id>` and `POST /api/tasks` accepted independent `progress` values without recalculating progress on the server when `checklist` items existed.

#### CD-03 [CLOSED]: Board Hard-Delete FK Cascade Failure
- **Status:** CLOSED / RESOLVED.
- **Resolution:** Added `ondelete='CASCADE'` to `Task.board_id` (`backend/app/models/task.py`), migration `e1a2b3c4d5e6`, and attachment cleanup in `BoardService.delete_board` and lazy purge methods.
- **Documents in Conflict:** `docs/02-business-rules.md:BR-35` & `docs/08-data-model.md:L103` vs. `docs/09-api-reference.md:L236` & `backend/app/services/board_service.py:L359-L366`.
- **Conflict Details:** `02-business-rules.md` and `09-api-reference.md` state that permanently deleting a board removes the board and its resources. However, `Task.board_id` is defined without `ondelete='CASCADE'`, and `Board.tasks` lacks `cascade='all, delete-orphan'`. Consequently, calling `DELETE /api/boards/<id>` on a board containing tasks triggers `sqlalchemy.exc.IntegrityError: NOT NULL constraint failed: tasks.board_id`, returning HTTP 500.
- **Recommended Action:** Add `ondelete='CASCADE'` to `Task.board_id` and ensure `FileService.cleanup_task_attachments` runs during board deletion.

#### CD-04: Multi-Owner Co-Ownership vs. Singular Ownership Transfer
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L16` & `docs/04-invite-lifecycle.md:L132` vs. `docs/06-functional-spec.md:L78` & `backend/app/services/board_service.py:L1072`.
- **Conflict Details:** `04-invite-lifecycle.md` and `03-roles-and-permissions.md` verify that `BoardService.transfer_ownership` sets the new owner's role to `'owner'` but leaves the previous owner's `BoardMember.role` as `'owner'`, establishing multi-owner co-ownership. In contrast, `06-functional-spec.md` describes the flow as transferring sole ownership.
- **Recommended Action:** Product management must clarify whether boards support multi-owner co-ownership or if former owners should automatically be demoted to `admin`.

#### CD-05 [CLOSED]: Former Member Author Deletions on Comments and Notes
- **Status:** CLOSED / RESOLVED.
- **Resolution:** Updated `CommentService.delete_comment` (`backend/app/services/comment_service.py`) and `NoteService.delete_note` (`backend/app/services/note_service.py`) to verify active board membership, returning HTTP 403 to former members who are no longer active members of the board.
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L148, L174` vs. `docs/09-api-reference.md:L553, L663` & `backend/app/services/comment_service.py:L152-L158`, `backend/app/services/note_service.py:L109-L116`.
- **Conflict Details:** `03-roles-and-permissions.md` defines that members who leave or are removed from a board have level `0` access and cannot mutate board content. In contrast, `CommentService.delete_comment` and `NoteService.delete_note` verify only `is_author = str(item.user_id) == str(user_id)` without validating current board membership or role, permitting former members to delete comments or notes via direct API calls.
- **Recommended Action:** Update comment and note deletion handlers to verify active board membership (`get_effective_role(board_id, user_id) >= commenter`) before honoring author deletions.

#### CD-06 [CLOSED]: Note Deletion Button Visibility in UI vs Server Enforcement
- **Status:** CLOSED / RESOLVED.
- **Resolution:** Updated `NoteService.delete_note` (`backend/app/services/note_service.py`) to enforce active board membership and author/admin/owner permissions on the server (HTTP 403 on violation). Updated `DocumentsView.tsx` (`src/components/kanban/DocumentsView.tsx`) to evaluate `canDeleteNote` based on current user membership and role, hiding the Delete button and disabling modal deletion for non-author editors.
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L174` & `docs/06-functional-spec.md:L132` vs. `docs/09-api-reference.md:L663` & `backend/app/services/note_service.py:L109-L116`.
- **Conflict Details:** In `DocumentsView.tsx:L394-L408`, the Delete button on note cards was previously rendered for any user where `!readOnly` (which evaluated to true for any `Editor`). However, `NoteService.delete_note` strictly enforces that non-author editors cannot delete notes created by other users (`HTTP 403`).

#### CD-07: Global Dashboard Task Workspace Editability vs. Server RBAC
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L135, L186` & `docs/05-user-guide.md:L142` vs. `docs/06-functional-spec.md:L142` & `docs/09-api-reference.md:L348`.
- **Conflict Details:** On `/dashboard`, `/tasks`, and `/calendar`, `<TaskDetailWorkspace>` is instantiated with hardcoded `readOnly={false}` without checking the user's role on the selected task's board. However, `TaskService.update_task` strictly enforces `editor`+ access on the server (`HTTP 403`), causing save attempts by Viewers/Commenters to fail with network error toasts.
- **Recommended Action:** Wrap global page task detail views with `useBoardPermissions` for the specific task's board and pass the derived `isReadOnly` flag.

#### CD-08: Teams Page Member Invitation Buttons for Non-Admins
- **Documents in Conflict:** `docs/03-roles-and-permissions.md:L79, L187` & `docs/06-functional-spec.md:L125` vs. `docs/09-api-reference.md:L245` & `backend/app/routes/board_routes.py:L206-L208`.
- **Conflict Details:** `BoardMembers.tsx` and the board header correctly hide invite buttons from non-admins, but `TeamsPage.tsx:L195, L402` renders "Invite Teammate" and board-level "+ Invite" buttons to all users. The backend strictly requires `admin`+ access, resulting in HTTP 403 errors when non-admins attempt to invite teammates from `/teams`.
- **Recommended Action:** Gate invite buttons on `TeamsPage.tsx` with `canInviteMembers` permission checks.

---

### MM-01 through MM-10: Code vs. Legacy Documentation Mismatches Analysis

### MM-01: File Serving Authentication (`GET /api/files/<filename>`)
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L220-L221`: Lists `GET /api/files/<filename>` with Auth = `"Public"` and Purpose = `"Serve uploaded file"`.
  - `docs/ARCHITECTURE.md:L688`: States *"Serving: `GET /api/files/<filename>` serves files directly from `uploads/` via `send_from_directory`. **No auth required for file retrieval** — anyone with the URL can access."* (Note: this also contradicts `docs/ARCHITECTURE.md:L588-L591` inside the same file.)
- **What the Code Actually Does:**
  - `backend/app/routes/file_routes.py:L45-L60` and `backend/app/services/file_service.py:L382-L460` (`FileService.verify_file_access`):
    - Only user avatar files (`User.avatar_url.like(f'%/api/files/{filename}')`, `file_service.py:L395-L398`) are served publicly without a JWT.
    - For all other files, `file_routes.py:L49-L53` requires a valid JWT either in the `Authorization: Bearer <token>` header or the `?token=<jwt>` query parameter (`verify_jwt_in_request()`), returning `401 {"error": "Authentication required to access this file"}` if missing or invalid.
    - `FileService.verify_file_access` (`file_service.py:L400-L460`) then checks that the caller is an accepted board member (`viewer`+ via `check_board_access(task.board_id, user_id, 'viewer')`) for task attachments or a conversation participant for chat attachments, returning `403` otherwise.

---

### MM-02: Malware Scanning, Magic-Byte Validation & Storage Quotas
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L682`: *"Validation: Filename presence, extension whitelist, size limit (16MB via Flask `MAX_CONTENT_LENGTH`). No virus scanning, no size-based access control beyond upload limit."*
  - `docs/PROJECT_STATUS.md:L252-L253`: *"No file scanning — Uploaded files are stored without virus scanning or content validation beyond extension checking."*
  - `docs/ROADMAP.md:L19`: *"Add magic-byte validation on file uploads"* listed as an open `P0` task.
- **What the Code Actually Does:**
  - `backend/config.py:L55-L57`: Sets `MAX_CONTENT_LENGTH = 25 * 1024 * 1024` (25 MB per file), `MAX_BOARD_STORAGE_BYTES = 100 * 1024 * 1024` (100 MB per board), and `MAX_OWNER_STORAGE_BYTES = 500 * 1024 * 1024` (500 MB per board owner).
  - `backend/app/services/file_service.py:L63-L78` (`FileService.is_valid_image_bytes`): Validates magic bytes for `.png`, `.jpg`/`.jpeg`, `.gif`, and `.webp`.
  - `backend/app/services/file_service.py:L81-L109` (`FileService.scan_bytes_for_malware`): Scans uploaded file bytes for the EICAR test signature, Windows PE (`MZ`) headers, Linux `ELF` headers, macOS `Mach-O` headers (`\xfe\xed\xfa\xce`, `\xfe\xed\xfa\xcf`, `\xcf\xfa\xed\xfe`, `\xce\xfa\xed\xfe`), shell shebangs (`#!`), and embedded `<script` or `javascript:` payloads in images/text/JSON.
  - `backend/app/services/file_service.py:L177-L207` (`FileService.check_board_and_owner_quota`): Enforces the 100 MB board quota and 500 MB owner quota (`413 Payload Too Large`) prior to saving task attachments.

---

### MM-03: Soft Delete Scope Beyond Tasks
- **What Existing Docs Claim:**
  - `AGENTS.md:L100`: *"Soft delete on Tasks only (`is_deleted` + `deleted_at`); all other entities use hard delete with cascading FKs."*
  - `docs/ARCHITECTURE.md:L362`: *"Only Tasks use soft delete (`is_deleted = True` + `deleted_at = datetime.utcnow()`). All other entities use hard delete with database-level cascade."*
  - `docs/PROJECT_STATUS.md:L30`: *"Delete boards — hard delete with cascade to all child entities."*
  - `docs/ROADMAP.md:L87`: *"Add board-level soft delete (archive)"* listed as unimplemented.
- **What the Code Actually Does:**
  1. **Boards (`backend/app/models/board.py:L32-L33`, `backend/app/routes/board_routes.py:L17-L22, L149-L171`, `backend/app/services/board_service.py:L14-L43, L297-L356`):** `Board` has `is_deleted` and `deleted_at` columns, a 30-day lazy purge (`BOARD_TRASH_RETENTION_DAYS = 30`), `DELETE /api/boards/<board_id>?soft=true` (used by the UI in `src/pages/BoardsOverview.tsx:L245` and `src/pages/Index.tsx:L318`), `GET /api/boards/trash`, and `POST /api/boards/<board_id>/restore`.
  2. **Direct Messages (`backend/app/models/message.py:L157`, `backend/app/services/message_service.py:L217-L246`):** `Message` uses `is_deleted = True` (`DELETE /api/messages/<message_id>`) to soft-unsend messages (`"[Message unsent]"`).
  3. **Invitations & Memberships (`backend/app/models/board_invitation.py:L15`, `backend/app/models/board_member.py:L15`, `backend/app/services/board_service.py:L582-L616, L779-L780`):** Declining, expiring, or revoking an invitation sets `status` to `'declined'`, `'expired'`, or `'revoked'` rather than hard-deleting the `BoardInvitation` (or declined `BoardMember`) row.

---

### MM-04: Blueprint, Service & Database Table Counts
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L148`: *"`create_app` registers 8 Flask Blueprints."*
  - `docs/ARCHITECTURE.md:L244`: *"Note: There is no standalone notification service — notifications are created inline within `board_service.py` and `comment_service.py`, and managed directly in `notification_routes.py`."*
  - `docs/ARCHITECTURE.md:L252-L339`: Documents only **8 database tables** (`users`, `boards`, `board_members`, `tasks`, `comments`, `activities`, `notifications`, `notes`).
- **What the Code Actually Does:**
  - **11 Blueprints (`backend/app/__init__.py:L63-L85`):** Registers `auth_bp`, `board_bp`, `member_bp`, `task_bp`, `activity_bp`, `comment_bp`, `notification_bp`, `file_bp`, `note_bp`, `system_bp`, `user_bp`, and `message_bp` (12 Blueprint variables across 11 route modules in `backend/app/routes/`).
  - **9 Services (`backend/app/services/*.py`):** Includes standalone `notification_service.py` (`NotificationService`, `backend/app/services/notification_service.py:L10-L157`), `user_service.py` (`UserService`, `backend/app/services/user_service.py:L14-L180`), and `message_service.py` (`MessageService`, `backend/app/services/message_service.py:L14-L280`), in addition to `auth_service.py`, `board_service.py`, `task_service.py`, `comment_service.py`, `activity_service.py`, and `file_service.py` + `note_service.py` (10 service files total).
  - **13 Database Tables (`backend/app/models/*.py`):** Adds 5 tables omitted from `ARCHITECTURE.md`:
    1. `board_invitations` (`backend/app/models/board_invitation.py:L8-L55`)
    2. `user_preferences` (`backend/app/models/user_preference.py:L7-L38`)
    3. `conversations` (`backend/app/models/message.py:L9-L83`)
    4. `conversation_participants` (`backend/app/models/message.py:L86-L139`)
    5. `messages` (`backend/app/models/message.py:L142-L214`)

---

### MM-05: Frontend Routes & Context Provider Hierarchy
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L42-L51`: Lists only `/`, `/boards/:boardId`, `/login`, `/register`, and `*`.
  - `docs/ARCHITECTURE.md:L57-L64`: Shows provider nesting as `QueryClientProvider -> AuthProvider -> ActivityProvider -> TooltipProvider -> BrowserRouter`.
- **What the Code Actually Does:**
  - **Routes (`src/App.tsx:L45-L64`):** Defines 9 routes, adding `/dashboard` (`DashboardPage`), `/tasks` (`TasksPage`), `/calendar` (`CalendarPage`), and `/teams` (`TeamsPage`) inside `ProtectedRoute` + `AppLayout`.
  - **Providers (`src/App.tsx:L31-L69`, `src/components/layout/AppLayout.tsx:L97`):** Wraps the app in `QueryClientProvider -> SettingsProvider -> AuthProvider -> DevModeProvider -> ActivityProvider -> TooltipProvider -> BrowserRouter`, with `LayoutProvider` inside `AppLayout`.

---

### MM-06: API Route Permission & Method Discrepancies
- **What Existing Docs Claim (`docs/ARCHITECTURE.md:L181-L208`):**
  1. `DELETE /api/activities` (`L207`): Listed as Min Role = `admin`, Purpose = `"Clear activities (board-scoped or global)"`.
  2. `GET /api/boards/<id>/trash` (`L192`): Listed as Min Role = `viewer`.
  3. `POST /api/tasks/<id>/comments` (`L199`): Listed as Min Role = `viewer`.
  4. `GET /api/activities` (`L205`): Listed as Min Role = `viewer`.
- **What the Code Actually Does:**
  1. `DELETE /api/activities`, `PUT /api/activities`, `PATCH /api/activities` (`backend/app/routes/activity_routes.py:L51-L55`): Explicitly blocked for **all** users with HTTP `403 {"error": "Activity log entries are immutable and cannot be edited or deleted"}`.
  2. `GET /api/boards/<board_id>/trash` (`backend/app/routes/task_routes.py:L33-L34`): Enforces `check_board_access(board_id, current_user_id, 'editor')` (`403` for `viewer` and `commenter`).
  3. `POST /api/tasks/<task_id>/comments` (`backend/app/routes/comment_routes.py:L17`): Decorated with `@require_task_access('commenter')` (`403` for `viewer`).
  4. `GET /api/activities` (`backend/app/routes/activity_routes.py:L24-L32`): Requires `admin` role for board-wide activity queries (`check_board_access(board_id, current_user_id, 'admin')`), and only permits `viewer` when `taskId` or `taskTitle` is specified.

---

### MM-07: Features Listed as "Not Implemented" or "Partially Implemented" in `PROJECT_STATUS.md` & `ROADMAP.md`
- **What Existing Docs Claim:**
  - `docs/PROJECT_STATUS.md:L156`: *"No validation prevents assigning non-members."*
  - `docs/PROJECT_STATUS.md:L182-L215` & `docs/ROADMAP.md:L14, L42, L80-L89, L109, L135-L136, L161`: List Task Search/Filtering, Due Date Overdue Indicators, Dark Mode, Board/User Data Export, User Avatar Upload, Board Templates, Description Conflict Resolution, and `GET /api/health` under `"Partially Implemented"` or `"Not Implemented"` (contradicting `docs/PROJECT_STATUS.md:L20-L148` in the same file!).
- **What the Code Actually Does:**
  - **Assignee Role Validation:** `backend/app/routes/task_routes.py:L72-L76, L148-L156` rejects any assignee without `editor`+ board membership (`400 {"error": "Users without editing permissions cannot be assigned to tasks"}`).
  - **Task Search & Filter:** Implemented in `src/pages/Index.tsx:L122-L162` (board search, priority filter, assignee filter) and `src/pages/TasksPage.tsx:L35-L85`.
  - **Overdue Indicators:** Implemented in `src/components/kanban/TaskCard.tsx:L59`, `src/components/kanban/TaskListView.tsx:L48`, and `src/components/task/TaskProperties.tsx:L80`.
  - **Dark Mode:** Implemented in `src/contexts/SettingsContext.tsx:L68-L82` (`light`, `dark`, `system` themes toggled via `.dark` on `document.documentElement`).
  - **Data Export:** Implemented at `GET /api/boards/<board_id>/export` (`backend/app/routes/board_routes.py:L187-L194`) and `GET /api/users/me/export` (`backend/app/routes/user_routes.py:L55-L60`).
  - **User Avatar Upload:** Implemented at `POST /api/files/avatar` (`backend/app/routes/file_routes.py:L30-L42`, `backend/app/services/file_service.py:L210-L249`).
  - **Board Templates:** 4 templates (`Blank Board`, `Kanban Default`, `Sprint Planning`, `Content Calendar`) in `src/components/boards/BoardModal.tsx:L41-L97`.
  - **Optimistic Concurrency on Descriptions:** `lastKnownUpdatedAt` conflict check returns `409 Conflict` in `backend/app/services/task_service.py:L205-L218`.
  - **Health Check Endpoint:** `GET /api/health` in `backend/app/routes/system_routes.py:L9-L17`.

---

### MM-08: Duplicate CORS Initialization Claim
- **What Existing Docs Claim:**
  - `docs/PROJECT_STATUS.md:L224-L226`: *"Duplicate CORS initialization — `backend/app/__init__.py` calls `CORS()` twice (lines 22-35 and 40-53) with identical arguments."*
  - `docs/ROADMAP.md:L55`: Lists *"Remove duplicate `CORS()` call in `backend/app/__init__.py`"* as open work.
- **What the Code Actually Does:**
  - `backend/app/__init__.py:L35-L42`: `CORS(app, resources={r"/api/*": {...}}, supports_credentials=True)` is called **once**.

---

### MM-09: Playwright E2E Port Number
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L739`: *"Runs against live frontend (`localhost:5173`) + backend (`localhost:5000`)."*
- **What the Code Actually Does:**
  - `playwright.config.ts:L16, L24` and `e2e/run.mjs:L17`: Playwright E2E runs against `http://localhost:8085` (while `vite.config.ts:L10` configures the standard Vite dev server on port `8080`).

---

### MM-10: SSE Event Matrix Discrepancies
- **What Existing Docs Claim:**
  - `docs/ARCHITECTURE.md:L637` and `L643-L663`: Lists 12 SSE events in the architecture diagram/table, omitting 9 events emitted by backend services, and implies `member:updated` and `member:removed` are handled solely by `refetchMembers()`.
- **What the Code Actually Does:**
  - Backend services emit **21 board SSE event types** (adding `comment:created`, `comment:updated`, `comment:deleted`, `note:created`, `note:updated`, `note:deleted`, `trash:emptied`, `member:invited`, and `member:invite_resent`).
  - In `src/hooks/useBoardRealtime.ts:L247-L273`, `member:updated` and `member:removed` also inspect whether the affected user is the current user (`data.userId === currentUserId`) to show a role-change toast (`"Your role was updated to <role>"`) or redirect a removed user to `/` (`navigate("/")`). Meanwhile, the 9 newer events (`comment:*`, `note:*`, `trash:emptied`, `member:invited`, `member:invite_resent`) have no `case` handlers in `useBoardRealtime.ts:L182-L279`.
