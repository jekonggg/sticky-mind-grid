Status: Verified | Last scanned: 2026-10-13 | Audience: Product, Engineering, QA

# Open Questions, Ambiguities & Edge-Case Findings

This document consolidates every unresolved question, UI-only business rule lacking server-side enforcement, unhandled real-time event, and explicitly absent capability (`"Not found in code"`) identified across all generated specifications and scans in Sticky Mind Grid.

---

## 1. Consolidated Summary Matrix

| Question | File or Area | Why It Matters | Suggested Owner | Source Agent |
|---|---|---|---|---|
| **OQ-01:** Should `Task.board_id` include `ondelete='CASCADE'` and board deletion clean up attachments before deleting tasks? | `backend/app/models/task.py:L14`, `backend/app/services/board_service.py:L16-L25, L318-L326, L359-L366` | Permanent deletion or 30-day lazy purge of boards with existing tasks crashes with `sqlalchemy.exc.IntegrityError` (HTTP 500 error). | Database / Backend Lead | Agent 1 / Agent 3 |
| **OQ-02:** Should `TaskService.update_task` prevent non-admin editors from deleting other users' attachments and clean up orphaned files from disk? | `src/components/task/TaskAttachments.tsx:L72-L79`, `backend/app/services/task_service.py:L266`, `backend/app/services/file_service.py:L330-L343` | Non-admin editors can bypass UI to delete others' attachments via API, and deleted files remain on disk in `backend/uploads/` counting against storage quotas. | Backend Security Lead | Agent 1 / Agent 4 |
| **OQ-03:** Should `TaskService.update_task` automatically compute task progress from checklists and reject manual progress overrides when checklist items exist? | `src/components/task/TaskProperties.tsx:L83, L361`, `backend/app/services/task_service.py:L262-L264` | API callers can desynchronize `progress` from `checklist` completion, causing inconsistent task progress states between UI and API. | Backend Engineering | Agent 1 / Agent 2 |
| **OQ-04:** Does board ownership transfer support multi-owner co-ownership, or should `BoardService.transfer_ownership` demote the former owner's `BoardMember.role` to `'admin'`? | `backend/app/services/board_service.py:L1056-L1101`, `src/components/board/BoardMembers.tsx:L429` | Ambiguity in ownership model: former owner remains an `owner` indefinitely in `board_members`, creating multiple simultaneous owners without explicit UI representation. | Product / RBAC Lead | Agent 1 / Agent 2 |
| **OQ-05:** Should column WIP limits ever hard-block card additions/moves, or remain purely informational visual telemetry? | `docs/02-business-rules.md:BR-20`, `src/components/kanban/KanbanColumn.tsx:L53-L56`, `backend/app/services/board_service.py:L166-L177` | Columns allow unlimited tasks beyond their configured `wipLimit`; WIP limits only display amber/rose warning rings without operational constraints. | Product Management | Agent 1 / Agent 2 |
| **OQ-06:** Should auto-progress snapping on column drag (`0%` → `30%` → `100%`) be enforced on the server or remain a purely client-side preference? | `docs/_scan-notes.md:L330`, `src/components/kanban/KanbanBoard.tsx:L454-L466`, `backend/app/services/task_service.py:L262` | Direct API updates or drag operations on alternative clients do not advance progress, leading to inconsistent task completion metrics across clients. | Product / Backend Lead | Agent 1 / Agent 2 |
| **OQ-07:** Should dangerous operations like permanent board deletion and ownership transfer require server-side confirmation tokens or name checks? | `src/pages/BoardsOverview.tsx:L787`, `src/components/board/BoardMembers.tsx:L465`, `backend/app/routes/board_routes.py:L149, L184` | Confirmation by typing board name is UI-only; raw API calls delete boards or promote owners without any safety gate. | Backend Security Lead | Agent 1 / Agent 2 |
| **OQ-08:** Should revoking a pending invitation for a registered user emit an invite revocation instead of logging "removed member" and sending a "Removed from Board" notification? | `src/components/board/BoardMembers.tsx:L378`, `backend/app/services/board_service.py:L752-L897` | Creates confusing audit trails and sends misleading notifications to invitees who never accepted or joined the board. | Product / UX Lead | Agent 2 |
| **OQ-09:** Should local registration lowercase user emails and board invitations validate email syntax before persisting records? | `backend/app/routes/auth_routes.py:L144-L150`, `backend/app/services/board_service.py:L388-L428` | Case-sensitive signup can cause duplicate accounts or failed invite auto-linking; invalid strings accepted as invite emails clutter the database. | Backend Auth Lead | Agent 2 / Agent 4 |
| **OQ-10:** Should the client lock mutations during SSE reconnection, and how should transient network disconnections be handled? | `src/hooks/useBoardRealtime.ts:L285-L298`, `src/components/kanban/KanbanBoard.tsx:L128` | UI locks editing while reconnecting, but standard REST endpoints accept requests; users on unstable connections experience flickering read-only states. | Frontend / Realtime Lead | Agent 2 / Agent 3 |
| **OQ-11:** Should the Personal Scratchpad remain local-only (`localStorage`) or sync with server-side user preferences? | `src/components/documents/PersonalScratchpadModal.tsx:L1-L165`, `docs/05-user-guide.md` | Data stored strictly in browser `localStorage` (`smg_personal_scratchpad_v1`) is lost upon cache clearing, browser change, or device migration. | Product Management | Agent 2 |
| **OQ-12:** Should `TeamsPage.tsx` gate member invitation buttons by `canInviteMembers` permission? | `src/pages/TeamsPage.tsx:L195, L402`, `backend/app/routes/board_routes.py:L206-L208` | Non-admin users see active invite buttons on `/teams` that trigger unexpected HTTP 403 error toasts upon submission. | Frontend Engineering | Agent 2 / Agent 1 |
| **OQ-13:** Should `useBoardRealtime.ts` implement event handlers and React Query cache invalidation for the 9 unhandled backend SSE event types? | `src/hooks/useBoardRealtime.ts:L182-L279`, `backend/app/services/*.py` | Comments, notes, trash emptying, and new invitations do not update in real time for other connected clients, requiring manual page refreshes. | Frontend Lead | Agent 3 |
| **OQ-14:** Should `TaskService.update_task` require `lastKnownUpdatedAt` on description edits to prevent silent overwrite of concurrent edits? | `backend/app/services/task_service.py:L205-L242`, `src/components/task/TaskDescription.tsx:L73-L111` | Conflict detection (`HTTP 409`) only triggers if `baseDescription` or `lastKnownUpdatedAt` is provided; omitting it blindly overwrites remote changes. | Backend Engineering | Agent 3 / Agent 4 |
| **OQ-15:** Does cross-board task move violate tenancy isolation by retaining comments and tags from the source board? | `backend/app/services/task_service.py:L313-L398`, `docs/02-business-rules.md:BR-28` | Comments authored by users who are not members of the target board, and tag strings outside the target board's schema, persist on moved tasks. | Backend Security Lead | Agent 3 / Agent 4 |
| **OQ-16:** How will real-time SSE streaming scale beyond a single worker process given `EventBroadcaster`'s in-memory thread lock architecture? | `backend/app/utils/event_broadcaster.py:L7-L20`, `docs/07-architecture.md:L174` | `EventBroadcaster` uses process-local memory queues; multi-process deployments (Gunicorn workers, multi-instance Render) lose events and cannot broadcast cross-instance without Redis Pub/Sub. | Backend / DevOps Lead | Agent 3 / Agent 5 |
| **OQ-17:** Should local user registration require an email verification token flow before auto-linking pending board invitations? | `backend/app/models/user.py:L11-L18`, `backend/app/routes/auth_routes.py:L12-L52, L137-L162` | Any user registering with an unverified email address immediately acquires pending board invitations addressed to that email without cryptographic proof of mailbox ownership. | Security Lead | Agent 4 / Agent 2 |
| **OQ-18:** Should activity logs enforce the 90-day retention cleanup (`ACTIVITY_RETENTION_DAYS`), or should activity records remain strictly permanent and immutable? | `backend/config.py:L59`, `backend/app/services/activity_service.py:L11-L26`, `backend/app/routes/activity_routes.py:L51-L55`, `src/hooks/useActivity.tsx:L103-L111` | Architectural contradiction between unused 90-day cleanup code and immutable HTTP 403 API policy, plus dead frontend `clearActivities` code. | Compliance / Backend Lead | Agent 4 / Agent 1 |
| **OQ-19:** Can board ownership transfers cause the new owner to silently exceed their 500 MB owner storage quota? | `backend/app/services/file_service.py:L177-L207`, `backend/app/services/board_service.py:L1056-L1101` | `transfer_ownership` does not calculate whether transferring all existing board attachments will push the new owner over `MAX_OWNER_STORAGE_BYTES` (500 MB). | Backend Security Lead | Agent 4 / Agent 5 |
| **OQ-20:** Should comment and note deletion handlers verify active board membership before permitting author deletions? | `backend/app/services/comment_service.py:L152-L158`, `backend/app/services/note_service.py:L109-L116` | Removed former team members retain API-level deletion capability on previously created comments and notes if they retain record UUIDs. | Backend Security Lead | Agent 4 / Agent 3 |
| **OQ-21:** Are critical database behaviors (cascades, JSON fields, transactions) adequately tested given the SQLite test vs MySQL production engine disparity? | `docs/13-testing.md:L58`, `backend/tests/conftest.py:L25-L32`, `backend/config.py:L18` | Pytest runs on in-memory SQLite which does not enforce strict MySQL foreign key locks or JSON indexing, risking undetected production MySQL failures. | QA / Testing Lead | Agent 4 |
| **OQ-22:** How should the absence of outbound SMTP email delivery, HTTP rate limiting, and background cron workers be addressed for production deployments? | `backend/requirements.txt:L1-L15`, `backend/app/__init__.py:L16-L99`, `backend/app/services/board_service.py:L388-L556` | Verified as "Not found in code"; board invitations rely solely on in-app alerts, APIs lack brute-force/DDoS rate limiting, and retention purges run lazily on user requests. | DevOps / Infrastructure Lead | Agent 5 |

---

## 2. Detailed Findings & Analysis

### OQ-01: Hard-Deleting or Auto-Purging a Board With Tasks Raises `IntegrityError`
- **Where in Code:**
  - `backend/app/models/task.py:L14`: `board_id = db.Column(db.String(36), db.ForeignKey('boards.id'), nullable=False, index=True)` — Unlike `BoardMember`, `BoardInvitation`, `Activity`, `Comment`, `Notification`, and `Note`, `Task.board_id` does **not** specify `ondelete='CASCADE'`.
  - `backend/app/models/board.py:L39`: `tasks = db.relationship('Task', backref='board', lazy='dynamic')` — Does **not** specify `cascade='all, delete-orphan'`.
  - `backend/app/services/board_service.py:L16-L25` (`get_user_boards`), `L318-L326` (`get_trashed_boards`), and `L359-L366` (`delete_board`): All three methods execute `db.session.delete(board)` directly without first deleting `Task` rows or cleaning up task attachment files on disk (compare with `UserService.delete_account` in `backend/app/services/user_service.py:L52-L54`, which explicitly runs `Task.query.filter_by(board_id=board.id).delete()` before deleting owned boards).
- **What Is Unclear / Broken:**
  - When a board containing one or more tasks (active or soft-deleted) is permanently deleted (`DELETE /api/boards/<board_id>`) or reaches its 30-day lazy purge expiry (`BOARD_TRASH_RETENTION_DAYS = 30`), SQLAlchemy attempts to set `tasks.board_id = NULL` and raises `sqlalchemy.exc.IntegrityError: NOT NULL constraint failed: tasks.board_id`.
- **Recommendation:**
  - Migrate `Task.board_id` to include `ondelete='CASCADE'`, add `cascade='all, delete-orphan'` on `Board.tasks`, and update `BoardService.delete_board` to call `FileService.cleanup_task_attachments(task.attachments)` before purging tasks.

---

### OQ-02: Server-Side Enforcement Gap for Deleting Another User's Task Attachment & Orphaned Disk Files
- **Where in Code:**
  - **Frontend (`src/components/task/TaskAttachments.tsx:L72-L79`):** The trash button next to an attachment is rendered only if `canDeleteBoard` (`admin` or `owner`) **or** `(canEdit && att.uploaderId === currentUser.id)`.
  - **Backend (`backend/app/routes/task_routes.py:L120-L171`, `backend/app/services/task_service.py:L266`):** Removing an attachment sends `PATCH /api/tasks/<task_id>` with the updated `attachments` JSON array. `TaskService.update_task` (`task_service.py:L266`) executes `task.attachments = data['attachments']` for any user with `@require_task_access('editor')`.
- **What Is Unclear / Missing:**
  1. The server does **not** verify that an `editor` (who is not `admin`/`owner`) is only removing attachments where `uploaderId == current_user_id`.
  2. Removing an attachment from `task.attachments` via `PATCH /api/tasks/<task_id>` does **not** call `FileService.cleanup_task_attachments` (`backend/app/services/file_service.py:L330-L343`), leaving the removed file on disk in `backend/uploads/` until the entire task is permanently deleted (and continuing to count toward the 100 MB board / 500 MB owner quota if still matched or orphaned on disk).
- **Recommendation:**
  - Update `TaskService.update_task` to diff old and new attachments, enforce that non-admins can only remove items where `uploaderId == current_user_id`, and immediately invoke `FileService.cleanup_task_attachments` on removed files.

---

### OQ-03: Server-Side Enforcement Gap for Checklist-Locked Task Progress
- **Where in Code:**
  - **Frontend (`src/components/task/TaskProperties.tsx:L83, L361`):** When `checklist.length > 0`, the progress slider is disabled (`checklistLocked = checklist.length > 0`) and progress is automatically calculated as `Math.round((completed / total) * 100)`.
  - **Backend (`backend/app/services/task_service.py:L262, L264`):** `TaskService.update_task` sets `task.progress = data['progress']` and `task.checklist = data['checklist']` independently without checking whether `checklist` is non-empty or recomputing `progress`.
- **Recommendation:**
  - Align backend validation in `TaskService.update_task` so that whenever `task.checklist` is populated with items, `task.progress` is automatically derived as `round((completed / total) * 100)`, rejecting manual `progress` payload overrides.

---

### OQ-04: Co-Ownership Behavior in `BoardService.transfer_ownership`
- **Where in Code:**
  - `backend/app/services/board_service.py:L1056-L1101`: `BoardService.transfer_ownership(board_id, new_owner_id, current_owner_id)` updates `board.owner_id = new_owner_id` and sets the target member's `BoardMember.role = 'owner'` (`L1072-L1073`), but does **not** change the calling owner's `BoardMember.role` (which remains `'owner'`).
  - `src/components/board/BoardMembers.tsx:L429`: The UI menu item is labeled **"Promote to Owner"**, whereas the confirmation modal (`L523`) asks *"Are you sure you want to transfer ownership to..."* and warns *"You will still remain an Owner, or share full ownership capabilities."*
- **Recommendation:**
  - Product leadership should confirm whether co-ownership is the permanent product design. If single-owner semantics are required, `transfer_ownership` must demote the former owner's `BoardMember.role` to `'admin'`.

---

### OQ-05: WIP Limit Exceeded Handling (Soft Warning Badge vs Hard Operational Block)
- **Where in Code:**
  - `backend/app/services/board_service.py:L166-L177` (`_validate_columns_wip_limits`): Validates that `wipLimit` is a positive integer if provided on a column.
  - `src/components/kanban/KanbanColumn.tsx:L53-L56, L160-L175`: Renders amber/rose warning rings and count badges when column tasks reach or exceed `wipLimit`.
  - Neither server (`task_service.py`) nor client drag-drop (`KanbanBoard.tsx`) prevents moving tasks into columns that exceed their WIP limit.
- **Recommendation:**
  - Clarify product requirements: should WIP limit remain a soft visual guide, or should a strict mode option exist to prevent column moves when limits are reached?

---

### OQ-06: Auto-Progress Snapping on Column Drag (UI-Only vs Server Automation)
- **Where in Code:**
  - `src/components/kanban/KanbanBoard.tsx:L454-L466`: When dragging cards into "To Do", "In Progress", or "Done" columns, the UI automatically snaps progress to `0%`, `30%`, or `100%` if `autoProgressSnapping` is enabled.
  - `backend/app/services/task_service.py:L262`: Backend has no concept of column-to-progress snapping; moving tasks via REST API does not adjust progress.
- **Recommendation:**
  - Document auto-progress snapping as an optional user-interface convenience feature, or formalize workflow stage triggers on the backend.

---

### OQ-07: Type-to-Confirm Safeguards Enforced Only in UI
- **Where in Code:**
  - `src/pages/BoardsOverview.tsx:L787-L791`: Deleting a board requires typing the exact board name to enable the confirm button.
  - `src/components/board/BoardMembers.tsx:L465-L470`: Promoting a user to Owner requires typing the board name.
  - `backend/app/routes/board_routes.py:L149-L161, L253-L267`: Server endpoints accept direct deletion and role elevation requests without requiring confirmation payload tokens.
- **Recommendation:**
  - Consider adding optional confirmation validation on the server for destructive endpoints to protect against accidental automated script calls.

---

### OQ-08: Inconsistent Revoke Side Effects Between Unregistered and Registered Pending Invitees
- **Where in Code:**
  - `src/components/board/BoardMembers.tsx:L378`: Clicking Revoke (`X`) on a row in "Pending Invitations" calls `removeMember({ boardId, userId: member.id })`.
  - `backend/app/services/board_service.py:L752-L897`:
    - For **unregistered** invitees, delegates to `revoke_invitation`, sets `status = 'revoked'`, logs `"revoked invitation"`, and sends no notification.
    - For **registered** invitees, deletes `BoardMember(status='pending')`, logs `"<actor> removed member <name>"`, and sends an alarming `'Removed from Board'` notification to a user who never accepted the invite.
- **Recommendation:**
  - When `remove_member` is called on a member with `status == 'pending'`, log `"revoked invitation"` and suppress the `'member_removed'` notification.

---

### OQ-09: Email Case Normalization & Syntax Validation on Local Registration and Invitations
- **Where in Code:**
  - `backend/app/routes/auth_routes.py:L144-L150`: Local registration stores `email=data['email']` without `.strip().lower()`.
  - `backend/app/services/board_service.py:L388-L428`: Board invitations strip and lowercase emails, but do not validate email format against standard regex.
- **Recommendation:**
  - Normalize emails to `.strip().lower()` across all authentication and user creation paths, and add regex validation to `BoardService.add_member`.

---

### OQ-10: Client Read-Only State During SSE Reconnection
- **Where in Code:**
  - `src/hooks/useBoardRealtime.ts:L285-L298`: Sets `isReconnecting = true` whenever `EventSource` encounters an error.
  - `src/components/kanban/KanbanBoard.tsx:L128`: Calculates `effectiveReadOnly = isReadOnly || isReconnecting`, locking drag-drop, editing, and commenting until reconnecting resolves.
- **Recommendation:**
  - Document that the read-only lock during SSE reconnection is an intentional UI-only safeguard designed to prevent concurrent edit conflicts during network drops.

---

### OQ-11: Personal Scratchpad Storage Persistence
- **Where in Code:**
  - `src/components/documents/PersonalScratchpadModal.tsx:L1-L165`: Personal scratchpad contents are persisted purely in `window.localStorage` under key `smg_personal_scratchpad_v1`.
- **Recommendation:**
  - Document that personal scratchpad notes are browser-local and not backed up to the database, or evaluate syncing scratchpads with `user_preferences`.

---

### OQ-12: Teams Page Member Invitation Buttons for Non-Admins
- **Where in Code:**
  - `src/pages/TeamsPage.tsx:L195, L402`: Renders "Invite Teammate" and "+ Invite" buttons across team boards without checking `permissions.canInviteMembers`.
  - `backend/app/routes/board_routes.py:L206-L208`: Rejects non-admin invitation requests with `HTTP 403`.
- **Recommendation:**
  - Wrap invite buttons on `TeamsPage.tsx` with `canInviteMembers` checks to prevent 403 error toasts for non-admin users.

---

### OQ-13: Unhandled SSE Events on the Board Stream
- **Where in Code:**
  - Backend emits 21 distinct event types, but `src/hooks/useBoardRealtime.ts:L182-L279` only handles 12 events.
  - Missing handlers: `comment:created`, `comment:updated`, `comment:deleted`, `note:created`, `note:updated`, `note:deleted`, `trash:emptied`, `member:invited`, and `member:invite_resent`.
- **Recommendation:**
  - Add switch cases in `useBoardRealtime.ts` to invalidate React Query caches for `["taskComments"]`, `["boardNotes"]`, `["boardTrash"]`, and `["boardMembers"]`.

---

### OQ-14: Blind Overwrite Risk on Task Description Updates
- **Where in Code:**
  - `backend/app/services/task_service.py:L205-L242`: Concurrency conflict checks (`HTTP 409`) only trigger if `baseDescription` or `lastKnownUpdatedAt` is sent in payload.
  - If a client sends `{"description": "new"}` without concurrency tokens, the server blindly overwrites the field.
- **Recommendation:**
  - Enforce `lastKnownUpdatedAt` validation on all description updates or document optimistic overwrite semantics.

---

### OQ-15: Cross-Board Move Tenancy & Data Portability
- **Where in Code:**
  - `backend/app/services/task_service.py:L313-L398`: Cross-board moves clear invalid assignees and remap columns, but leave existing comments and tags intact.
  - Comments written by source-board members remain visible on the destination board even if those users are not members of the target board.
- **Recommendation:**
  - Review security policies to determine whether task comments and activity history should be archived or cleansed when moved between distinct tenant boards.

---

### OQ-16: Single-Process In-Memory SSE Scalability
- **Where in Code:**
  - `backend/app/utils/event_broadcaster.py:L7-L20`: SSE queues use Python `threading.Lock()` and memory queues.
  - In a multi-worker WSGI deployment (Gunicorn `-w 4`) or multi-instance container setup, broadcast events only reach clients connected to the same worker process.
- **Recommendation:**
  - Plan roadmap migration to Redis Pub/Sub for multi-worker production scalability.

---

### OQ-17: Absence of Email Verification Token Flow on Local Registration
- **Where in Code:**
  - `backend/app/models/user.py:L11-L18` & `backend/app/routes/auth_routes.py:L137-L162`: Local signup issues immediate JWT tokens and calls `attach_pending_invitations(user)` without sending a verification link.
- **Recommendation:**
  - Add email verification token flow to ensure users prove mailbox ownership before accessing boards they were invited to.

---

### OQ-18: Unused Activity Retention Config vs. Immutable Activity Log Policy
- **Where in Code:**
  - `backend/config.py:L59`: `ACTIVITY_RETENTION_DAYS = 90`.
  - `backend/app/services/activity_service.py:L11-L26`: `cleanup_expired_activities` is never called.
  - `backend/app/routes/activity_routes.py:L51-L55`: Blocks mutations with HTTP 403 ("Activity log entries are immutable").
- **Recommendation:**
  - Clarify whether audit activities are permanent compliance records (remove 90-day retention code) or subject to lazy expiration.

---

### OQ-19: Storage Quota Attribution on Board Ownership Transfer
- **Where in Code:**
  - `backend/app/services/file_service.py:L177-L207` & `backend/app/services/board_service.py:L1056-L1101`: Board owners have a 500 MB quota across owned boards.
  - `transfer_ownership` does not check if the new owner has sufficient available storage quota to accept the board's existing files.
- **Recommendation:**
  - Enforce quota verification in `BoardService.transfer_ownership` before executing ownership reassignment.

---

### OQ-20: Former Member Author Deletions on Comments and Notes
- **Where in Code:**
  - `backend/app/services/comment_service.py:L152-L158` & `backend/app/services/note_service.py:L109-L116`: Deletion checks verify `user_id == author_id` without confirming active board membership.
- **Recommendation:**
  - Require active board membership (`get_effective_role(board_id, user_id) >= commenter`) before honoring author deletion requests.

---

### OQ-21: Test Isolation and Database Engine Disparity (SQLite vs MySQL)
- **Where in Code:**
  - `backend/tests/conftest.py:L25-L32`: Pytest runs against in-memory SQLite (`sqlite:///:memory:`).
  - SQLite does not enforce certain MySQL foreign key constraints or transaction isolation semantics.
- **Recommendation:**
  - Maintain MySQL-backed integration test suites in CI to prevent database dialect-specific regressions.

---

### OQ-22: Capabilities Confirmed as "Not Found in Code"
Per Ground Rule 3, the following capabilities are confirmed as **not implemented in the codebase**:
1. **Outbound SMTP / Email Provider:** Invitations and mentions rely solely on in-app notifications.
2. **Global HTTP API Rate Limiter:** No rate-limiting middleware (e.g., Flask-Limiter) is installed.
3. **Background Job Queue / Cron Worker Daemon:** Retention purges execute lazily on user read calls.
4. **Automated Database & File Disk Backup Routines:** No backup scripts or cloud storage snapshot syncs exist.
