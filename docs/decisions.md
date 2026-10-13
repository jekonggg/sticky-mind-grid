Status: Verified | Last updated: 2026-10-13 | Audience: Product, Engineering, QA

# Architectural & Product Decisions Register

This register documents decisions agreed upon to resolve open questions, ambiguity items, and architectural trade-offs in Sticky Mind Grid.

---

## 1. Decisions Log

| ID | Decision | Owner | Date | Follow-up Tasks |
|---|---|---|---|---|
| **OQ-04** | **Strict Single-Owner Model (Option A):** When transferring ownership, `BoardService.transfer_ownership` sets the target member's role to `'owner'` and demotes the previous owner's `BoardMember.role` to `'admin'`. Update UI copy in `BoardMembers.tsx` from "Promote to Owner" to "Transfer Ownership" to reflect single-owner governance. | Product / RBAC Lead | 2026-10-13 | 1. Update `BoardService.transfer_ownership` to demote caller to `'admin'` in `board_members`.<br>2. Update `BoardMembers.tsx` menu copy and confirmation modal text.<br>3. Add API unit/integration tests for ownership transfer demotion. |
| **OQ-05** | **WIP Limits as Soft Visual Telemetry (Option A):** Column WIP limits remain informational visual guidelines for agile workflow tracking rather than hard operational constraints. Do not block card creation, drag-and-drop movement, or cross-board moves on the server when WIP limits are met or exceeded. | Product Management | 2026-10-13 | 1. Update `docs/02-business-rules.md` (BR-20) and `docs/open-questions.md` to document non-blocking behavior.<br>2. Ensure UI warning rings and badge telemetry in `KanbanColumn.tsx` remain responsive without introducing drag rejection. |
| **OQ-06** | **Adaptive Progress Snapping with Column-Aware UI:** Card progress automatically reverts to `0%` when dragged into the first workflow column (with visual feedback/warning if moving backward from an active state) and automatically snaps to `100%` when dragged into the last workflow column (marking the task complete). Cards in the first column (`0%`) and last column (`100%`) hide the progress bar UI to reduce visual clutter, displaying the progress bar exclusively on intermediate columns. | Product / Frontend Lead | 2026-10-13 | 1. Update `KanbanBoard.tsx` drag-end logic to auto-snap progress (0% on first column, 100% on last column).<br>2. Add backward-move warning/toast if moving a card with existing progress back to the first column.<br>3. Update `TaskCard.tsx` and `TaskListView.tsx` to conditionally hide the progress bar in the first and last workflow columns.<br>4. Preserve checklist-locked progress priority when checklist items are present. |
| **OQ-07** | **Server Name Confirmation for Permanent Delete (Option B):** Permanent board deletion (`DELETE /api/boards/<id>?soft=false`) requires a confirmation payload/parameter matching the board name (`confirm_name: "<board_name>"`), returning HTTP `400 Bad Request` on mismatch or omission. Soft deletion (`DELETE /api/boards/<id>?soft=true`) remains standard and frictionless with a 30-day grace period. | Backend Security Lead | 2026-10-13 | 1. Update `backend/app/routes/board_routes.py` (`delete_board`) to validate `confirm_name` when `soft=false`.<br>2. Update `src/pages/BoardsOverview.tsx` permanent delete dialog to send `confirm_name`.<br>3. Add API tests verifying rejection on missing/incorrect name and acceptance on matching name. |
| **OQ-08** | **Pending Invite Revocation Cleanup (Option C):** Update `BoardService.remove_member` so that revoking a member whose status is `'pending'` logs `"revoked invitation for <email>"` and suppresses the alarming `"Removed from Board"` notification. In addition, update `BoardMembers.tsx` pending rows to call the dedicated `revoke_invitation` endpoint (`boardApi.revokeBoardInvitation`). | Product / Backend Lead | 2026-10-13 | 1. Update `BoardService.remove_member` to check `membership.status == 'pending'`, log invite revocation, delete the original invite notification, and suppress `member_removed` notification.<br>2. Update `BoardMembers.tsx` Revoke button to call `revokeBoardInvitation`.<br>3. Add API tests for revoking registered pending invitees. |
| **OQ-09** | **Email Normalization & Validation (Option A):** Normalize emails (`strip().lower()`) on signup, login, invite, and invitation auto-linking. Validate email syntax with `email-validator`. Create an Alembic migration that inspects existing users for case-insensitive duplicates and aborts with an informative error if duplicates are found rather than silently merging them. | Backend Auth Lead | 2026-10-13 | 1. Add `email-validator` to dependencies.<br>2. Normalize and validate emails across auth and board services.<br>3. Add Alembic migration with duplicate conflict pre-check. |
| **OQ-11** | **Server Sync for Personal Scratchpad via `user_preferences` (Option B):** Personal scratchpad notes are synced to the backend database to persist across browsers, devices, and sessions. Notes are persisted in the `user_preferences` model/table and synchronized via `GET/PATCH /api/users/me/preferences`. | Product / Fullstack Lead | 2026-10-13 | 1. Add `scratchpad_notes` JSON column to `UserPreference` model (or utilize a dedicated preferences field) with Alembic migration.<br>2. Update `UserService` and `user_routes.py` to support scratchpad notes serialization.<br>3. Update `PersonalScratchpadModal.tsx` to use React Query and authenticated API with `localStorage` fallback. |
| **OQ-12** | **Gate Invite Buttons on Teams Page (Option A):** Hide member invitation buttons on `/teams` (`TeamsPage.tsx`) for roles that cannot invite members (`canInviteMembers` check for Owner/Admin only). Maintain strict backend `HTTP 403` rejection on `POST /api/boards/<id>/members` for non-admin callers. | Frontend Engineering | 2026-10-13 | 1. Wrap `/teams` invite buttons with `canInviteMembers` permission check.<br>2. Add component test verifying invite buttons are hidden for Editor, Commenter, and Viewer roles. |
| **OQ-13** | **Board Real-Time SSE Event Handling for All 21 Events (Option A):** Add missing event handlers and React Query cache invalidations in `useBoardRealtime.ts` for all backend SSE events. Explicitly catalog all 21 backend events, mapping each either to an active handler (including `comment:*`, `note:*`, `trash:emptied`, `member:invited`, `member:invite_resent`) or an explicit "intentionally ignored" comment. | Frontend Lead | 2026-10-13 | 1. Update `useBoardRealtime.ts` with handlers for missing events and documentation for all 21 events.<br>2. Add hook tests for real-time invalidations. |
| **OQ-14** | **Dual Concurrency Conflict Detection (Option B):** Support both content-based (`baseDescription`) and timestamp/ETag-based (`lastKnownUpdatedAt`) concurrency conflict detection in `TaskService.update_task`. When description edits are submitted without `baseDescription` and `lastKnownUpdatedAt`, check remote task modification state and return HTTP `409 Conflict` if the task was modified remotely (unless `forceOverwrite: true` is passed). | Backend Engineering | 2026-10-13 | 1. Update `TaskService.update_task` to check `lastKnownUpdatedAt` against `task.updated_at` alongside `baseDescription`.<br>2. Ensure `TaskDetailWorkspace.tsx` sends both tokens on description change.<br>3. Add API tests verifying HTTP 409 conflict on stale `lastKnownUpdatedAt`. |
| **OQ-18** | **Immutable Audit Log with 90-Day Lazy Purge and Code Cleanup (Option A):** Maintain strict security immutability on activity audit records (`PUT/PATCH/DELETE /api/activities` returns HTTP `403`). Physically purge records older than `ACTIVITY_RETENTION_DAYS` (90 days) lazily during activity query reads. Remove the dead `clearActivities()` method from `src/hooks/useActivity.tsx`. | Compliance / Backend Lead | 2026-10-13 | 1. Call `ActivityService.cleanup_expired_activities()` lazily within `ActivityService.get_activities` and `get_user_activities`.<br>2. Remove dead `clearActivities` function from `src/hooks/useActivity.tsx`.<br>3. Add API unit tests verifying physical cleanup of activities older than 90 days. |

---

## 2. Sequenced Implementation Plan

Following the agreed-upon decisions, implementation will proceed one item at a time adhering to strict TDD, server authority, and migration safety:

1. **Step 1: OQ-04 — Single-Owner Transfer Demotion**
   - Files: `backend/app/services/board_service.py`, `src/components/board/BoardMembers.tsx`
   - Test: `backend/tests/test_oq_resolutions.py`
   - Commit: `fix(OQ-04): demote previous owner to admin on ownership transfer`

2. **Step 2: OQ-08 — Pending Invite Revocation Notification Suppression**
   - Files: `backend/app/services/board_service.py`, `src/components/board/BoardMembers.tsx`
   - Test: `backend/tests/test_oq_resolutions.py`
   - Commit: `fix(OQ-08): suppress member removed notification when revoking pending invite`

3. **Step 3: OQ-07 — Server Confirmation for Permanent Board Deletion**
   - Files: `backend/app/routes/board_routes.py`, `src/pages/BoardsOverview.tsx`
   - Test: `backend/tests/test_oq_resolutions.py`
   - Commit: `fix(OQ-07): require confirm_name for permanent board deletion`

4. **Step 4: OQ-14 — Timestamp-Based (`lastKnownUpdatedAt`) Concurrency Token**
   - Files: `backend/app/services/task_service.py`, `src/components/task/TaskDetailWorkspace.tsx`
   - Test: `backend/tests/test_oq_resolutions.py`
   - Commit: `fix(OQ-14): support lastKnownUpdatedAt concurrency conflict detection`

5. **Step 5: OQ-18 — Activity Log 90-Day Lazy Retention Purge & Hook Cleanup**
   - Files: `backend/app/services/activity_service.py`, `src/hooks/useActivity.tsx`
   - Test: `backend/tests/test_oq_resolutions.py`
   - Commit: `fix(OQ-18): purge expired activities lazily and remove dead clearActivities hook`

6. **Step 6: OQ-05 — Formalize WIP Limits Documentation**
   - Files: `docs/02-business-rules.md`, `docs/open-questions.md`
   - Test: Verification that existing WIP limit badge unit tests pass
   - Commit: `docs(OQ-05): document WIP limits as non-blocking visual telemetry`

7. **Step 7: OQ-06 — Adaptive Progress Snapping & Column-Aware Card UI**
   - Files: `src/components/kanban/KanbanBoard.tsx`, `src/components/kanban/TaskCard.tsx`, `src/components/kanban/TaskListView.tsx`
   - Test: `src/test/components/TaskCard.test.tsx`, `src/test/components/KanbanBoard.test.tsx`
   - Commit: `feat(OQ-06): adaptive progress snapping and column-aware progress bar UI`

8. **Step 8: OQ-11 — Personal Scratchpad Server Sync via `user_preferences`**
   - Files: `backend/app/models/user_preference.py`, Alembic migration, `backend/app/services/user_service.py`, `backend/app/routes/user_routes.py`, `src/components/documents/PersonalScratchpadModal.tsx`
   - Test: `backend/tests/test_user_preferences.py`, `src/test/components/PersonalScratchpadModal.test.tsx`
   - Commit: `feat(OQ-11): sync personal scratchpad notes to user preferences`
