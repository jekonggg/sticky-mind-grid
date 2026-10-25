# 17. First-Run Onboarding & Role Tips Specification

## Overview

Sticky Mind Grid implements a streamlined, low-friction onboarding flow designed to get new users to active collaboration in under 60 seconds:
1. **One Starter-Board Question:** exactly 4 choices (Personal tasks, Team project, Product sprint, Ideas). No role, workspace, or board-name wizard.
2. **Auto-Created Starter Board:** Idempotent, server-backed, and atomic. Double-submit or opening in two tabs yields exactly one starter board.
3. **3-Step Latched Checklist:**
   - Step 1: "Create your first board" (auto-checked upon starter-board creation)
   - Step 2: "Add your first task" (latches when first task is created on starter board)
   - Step 3: "Complete your first task" (latches strictly when card is moved into the board's explicit Done column)
4. **Deterministic Latching:** Completed steps latch with UTC timestamps and never regress after task delete, archive, restore, or loss of board access.
5. **Strict Done Semantics:** Only the explicit `isDone` column flag represents task completion. `progress === 100` outside of the Done column does not count as done. Manual progress overrides are removed.
6. **Invited User Isolation:** Pending invitations do not disqualify onboarding. Invited users onboard first to own their starter space; upon completion or skip, pending invitations are revealed. If an invitation URL is accessed mid-onboarding, an interstitial offers "Skip setup and view invitation" or "Finish setup first."
7. **Role-Aware Tips:** Server-checked board access tips rendered once per user per board, clearly delineating permissions and capabilities without focus traps or blocking modals.
8. **Navigation Architecture:** The 5-button bottom navigation bar has been permanently retired from the application in favor of the responsive AppSidebar drawer with hamburger button (DEC-17).

---

## API Endpoints

### `/api/users/me/onboarding`
- `GET`: Returns the current user's onboarding state, latched checklist timestamps, and coach mark states.
- `POST /start`: Starts onboarding with `{ "template": "personal" | "team" | "product" | "ideas" }`. Creates deterministic starter board.
- `POST /skip`: Skips onboarding with `{ "reason": "question" | "checklist" }`.
- `POST /coach-marks/<mark_id>/seen`: Marks one of the 3 coach marks as seen.
- `POST /education`: Records "What's new" tips version and tour banner dismissal.
- `POST /replay`: Initiates read-only tour replay.

### `/api/boards/<board_id>/role-tips`
- `GET`: Returns current role tips and pending role-change notices.
- `POST /seen`: Marks the board role tip as seen for the user.
- `POST /role-change/seen`: Acknowledges role change notice.

---

## Appendix A: Manual QA Checklist

### Pre-Test Data Setup Guide

> [!CAUTION]
> **Credential & Environment Security:**
> Test passwords like `Password123!` are restricted strictly to ephemeral local development and testing environments. Never reuse or store test credentials in shared, staging, or production environments.

| Entity | Purpose | Setup Instructions |
|---|---|---|
| **Account A (Board Owner)** | Owns test boards and sends invitations | Register `owner@example.com` via `/register` (local test password). |
| **QA Team Board** | Board used for MT-04, MT-09, MT-10, MT-12–MT-14, MT-23 | In Account A, create a board named `"QA Team Board"` with columns `To Do`, `In Progress`, `Done`. |
| **Account B (`qa-invitee@example.com`)** | Tests invited user flow and role tips | **DO NOT pre-register Account B.** Account B must be invited *before* registration and registered only during MT-09. |
| **Account C (`qa-mid-invite@example.com`)** | Tests mid-onboarding invite link interstitial (MT-10) | Register Account C fresh (onboarding status `not_started`). |
| **Invitation for Account C** | Direct invite link for MT-10 | In Account A, invite `qa-mid-invite@example.com` to `"QA Team Board"`. Query `invitation.id` from `board_invitations` table or network response. |

---

## 🔴 Priority 0: Critical Path & Core Business Logic

### [ ] MT-01: Single-Question Display & Choice Options (P0)
- **Goal:** Verify that a new account sees only the single starter question without any wizard, workspace naming, or role selection.
- **Precondition:** Brand new user account with zero boards.
- **Steps:**
  1. Go to `/register` and register `qa-test-01@example.com`.
  2. Log in with the new credentials.
- **Expected Results:**
  - [ ] You are redirected to `/` and greeted with: *"What are you here to do?"*.
  - [ ] Exactly 4 choices are displayed:
    - 📌 **Personal tasks**
    - 👥 **Team project**
    - 🚀 **Product sprint**
    - 💡 **Ideas**
  - [ ] There is **no** role picker, team size selector, workspace name wizard, or board title input.
  - [ ] A *"Skip for now"* button is visible in the card footer and an `X` in the upper right.

---

### [ ] MT-02: Idempotent Starter Board Creation & Step 1 Auto-Check (P0)
- **Goal:** Verify selecting a template creates exactly one starter board with owner rights and marks Step 1 complete.
- **Note on Column Minimums:**
  - In `BoardModal.tsx` and `board_service.py`, the technical minimum for any board is **1 workflow column** (`MIN_COLUMNS = 1`, `BR-17`).
  - The 3-column configuration is merely the UI default when creating a board manually.
  - The *Personal tasks* template uses 2 workflow columns (`To Do`, `Done`), which is intentionally chosen and fully compliant with `BR-17`.
- **Steps:**
  1. On the question screen, click **Personal tasks** (or double-click quickly).
- **Expected Results:**
  - [ ] Redirection lands on the starter board at `/boards/<board_id>`.
  - [ ] Board is named *"My Tasks"* with columns `To Do` and `Done`.
  - [ ] The **Getting Started** checklist widget is visible showing:
    - [ ] Status: **1 of 3 done**
    - [ ] ✅ Step 1: *"Create your first board"* is checked.
    - [ ] ⬜ Step 2: *"Add your first task"* is unchecked.
    - [ ] ⬜ Step 3: *"Complete your first task"* is unchecked.
  - [ ] Refresh the page (`F5`) or open `/` in another tab: verify only **1** board was created.

---

### [ ] MT-03: Step 2 Latching — Task Creation (P0)
- **Goal:** Verify Step 2 latches when a task is created on the starter board.
- **Precondition:** MT-02 passed; user is on starter board with Step 1 completed.
- **Steps:**
  1. On the starter board, click **Add Task** (floating button or inside the `To Do` column).
  2. Type `My Test Task` and press Create.
- **Expected Results:**
  - [ ] The card appears in the `To Do` column.
  - [ ] The **Getting Started** checklist updates to **2 of 3 done**.
  - [ ] ✅ Step 2: *"Add your first task"* is now checked with a green checkmark.

---

### [ ] MT-04: Step 3 Latching — Explicit Done Column Only (P0)
- **Goal:** Verify Step 3 latches *strictly* when moving into the explicit Done column, and that 100% progress elsewhere does not count.
- **Template to Use:** Use the **Team project** template (which contains `To Do`, `In Progress`, `Done`).
- **Steps:**
  1. Register a new user (`qa-team-test@example.com`) and select **Team project**.
  2. Create a task `Sprint Task`.
  3. Move `Sprint Task` to **In Progress**:
     - Verify Step 3 is **NOT** checked.
  4. Drag `Sprint Task` into **Done**.
- **Expected Results:**
  - [ ] Step 3 latches: checklist advances to **3 of 3 done** (Completed).
  - [ ] Card displays `isDone = true` / 100% progress.

---

### [ ] MT-05: Non-Regression & Timestamp Latching (P0)
- **Goal:** Ensure completed checklist steps never un-latch when tasks/boards are deleted.
- **Precondition:** **All 3 steps must be fully completed** (`3 of 3 done`, status = `completed`).
- **Steps:**
  1. With all 3 steps completed, delete the task that was in `Done` (open drawer → Delete task).
  2. Return to the dashboard `/` or reload the board.
  3. Delete the starter board entirely (Boards overview → 3 dots → Delete Board).
  4. Re-check onboarding state via DevTools or API (`GET /api/users/me/onboarding`).
- **Expected Results:**
  - [ ] The checklist does **NOT** regress to 0 or 1.
  - [ ] Status remains `completed` with all 3 timestamps intact.
  - [ ] The onboarding question does **NOT** reappear.

---

### [ ] MT-06: Skip on Question Path (P0)
- **Goal:** Verify skipping the question creates no board and allows normal board creation.
- **Steps:**
  1. Register a new user (`qa-skip@example.com`) and log in.
  2. On the question screen, click **Skip for now** (or the `X` button).
- **Expected Results:**
  - [ ] The question dismisses.
  - [ ] User lands on the standard empty dashboard ("No boards yet").
  - [ ] Zero boards exist in the database for this user.
  - [ ] Clicking **Create Board** works normally without blocking.

---

### [ ] MT-08: Progress Derivation — Manual Override Removed (P0)
- **Goal:** Verify that manual progress overrides are eliminated and progress strictly derives from checklist or column.
- **Steps:**
  1. Create a task in `To Do`.
  2. Open task detail drawer: verify there is **no** manual slider to force progress to 100%.
  3. Add **2 checklist items** in the drawer:
     - Check **1 item** (leave the 2nd unchecked).
- **Expected Results:**
  - [ ] Progress displays exactly **50%** (1 of 2 items checked).
  - [ ] Task card does **NOT** count as Done because it is still in `To Do`.
  - [ ] Move task to `Done`: progress becomes **100%** and `isDone` is true.

---

### [ ] MT-09: Invited Users Onboard First & Invitations Gated (P0)
- **Goal:** Verify an invited user goes through onboarding first, owns their starter space, and only sees pending invitations afterward.
- **Precondition:** In Account A (`owner@example.com`), invite `qa-invitee@example.com` to `"QA Team Board"`.
- **Steps:**
  1. Register as `qa-invitee@example.com` and log in.
- **Expected Results:**
  - [ ] Onboarding question is shown first.
  - [ ] The **Pending Board Invitations** banner is **hidden** while onboarding is in progress.
  - [ ] Notification bell badge still shows the pending invite count (`1`).
  - [ ] Choose a template or click "Skip for now".
  - [ ] After completing or skipping, the **Pending Board Invitations** banner immediately appears on `/`.

---

### [ ] MT-18: Analytics Privacy Verification (P0)
- **Goal:** Ensure no sensitive user text (board names or task titles) is logged in analytics.
- **Steps:**
  1. In your database console, run: `SELECT * FROM onboarding_events;`.
- **Expected Results:**
  - [ ] Entries contain only event names (e.g., `started`, `step_completed`, `coach_mark_seen`) and template keys (`personal`, `product`, etc.).
  - [ ] **No** board titles, descriptions, or task card titles appear in the table.

---

## 🟡 Priority 1: Workflows, Polish & Edge Cases

### [ ] MT-07: Skip Inside Checklist Path (P1)
- **Goal:** Verify skipping inside the checklist keeps the starter board intact.
- **Steps:**
  1. Register a new user, pick **Team project**.
  2. Inside the starter board, locate the floating **Getting Started** widget and click **Skip**.
- **Expected Results:**
  - [ ] The checklist widget disappears.
  - [ ] The starter board remains intact and fully functional.
  - [ ] Navigating back to `/` shows the starter board in "My Boards".

---

### [ ] MT-10: Mid-Onboarding Direct Invite Link Interstitial (P1)
- **Goal:** Verify clicking a direct invite link mid-onboarding offers the interstitial choice.
- **Precondition:** Use Account C (`qa-mid-invite@example.com`), who has onboarding pending (`not_started`). Obtain the invitation ID from the database (`SELECT id FROM board_invitations WHERE invited_email = 'qa-mid-invite@example.com'`) or Account A's invitation network response.
- **Steps:**
  1. Log in as Account C.
  2. Navigate directly to `/invite/<invitation_id>` in the browser URL bar.
- **Expected Results:**
  - [ ] An interstitial card appears: *"Board Invitation Waiting"*.
  - [ ] Displays two buttons:
    - **Skip setup and view invitation**
    - **Finish setup first**
  - [ ] Clicking *"Finish setup first"* redirects back to `/` to resume onboarding.
  - [ ] Clicking *"Skip setup and view invitation"* marks onboarding skipped and immediately renders the Accept/Decline card.

---

### [ ] MT-11: Three Coach Marks Sequence & Esc Dismiss (P1)
- **Goal:** Verify exactly 3 coach marks appear in sequence and dismiss via Esc or "Got it".
- **Steps:**
  1. Open the starter board as a new user.
  2. Observe Coach Mark 1: Points to **Board columns** (*"Columns move your work forward"*).
  3. Press `Escape` key (or click "Got it").
  4. Observe Coach Mark 2: Points to **Add Task** button.
  5. Click "Got it".
  6. Open a card drawer. Observe Coach Mark 3: Points to **Status** selector (*"Move work to Done"*).
  7. Click "Got it".
- **Expected Results:**
  - [ ] Exactly 3 coach marks display; never more than one at a time.
  - [ ] Non-modal (background clickable, no focus trap).
  - [ ] Reloading the page does **not** re-trigger dismissed marks.

---

> [!IMPORTANT]
> **Sequential Dependency Warning for MT-09 through MT-14:**
> MT-09, MT-12, MT-13, and MT-14 form a strict sequential test chain for Account B (`qa-invitee@example.com`):
> `MT-09 (Register & complete onboarding)` → `MT-12 (Accept Viewer invite & see tip)` → `MT-13 (Owner promotes to Editor & see notice)` → `MT-14 (Owner removes member & verify access cut)`.
> Execute them in exact order using the same board and user.

### [ ] MT-12: Role-Aware Tips on Invited Boards — Viewer (P1)
- **Goal:** Verify invited members see their server-checked role tip once, tailored to their role limitations.
- **Precondition:** MT-09 completed. Logged in as `qa-invitee@example.com`. Accept the invitation to `"QA Team Board"` as a **Viewer**.
- **Steps:**
  1. Open `"QA Team Board"`.
- **Expected Results:**
  - [ ] A banner appears: *"You have Viewer access"*.
  - [ ] Explains what you CAN do (read cards, open details) and CANNOT do (edit cards, move cards, comment).
  - [ ] Click **Got it**. Refresh the page.
  - [ ] The tip does **not** appear again.

---

### [ ] MT-13: Role-Change Notice (P1)
- **Goal:** Verify a member receives a one-time role-change notification when promoted or demoted.
- **Precondition:** MT-12 passed and role tip was dismissed.
- **Steps:**
  1. Keep Account B logged in.
  2. In another browser session as Account A (Board Owner), change Account B's role from **Viewer** to **Editor**.
  3. In Account B's browser, refresh or revisit `"QA Team Board"`.
- **Expected Results:**
  - [ ] A banner appears: *"Your board role changed"*.
  - [ ] Message states: *"Your role on this board changed from Viewer to Editor."*
  - [ ] Dismissing it with "Got it" clears the notice permanently.

---

### [ ] MT-14: Removed User Access Safety (P1)
- **Goal:** Verify a user who is removed from a board does not see role tips or leaked board content.
- **Precondition:** MT-13 passed.
- **Steps:**
  1. Account A (Board Owner) removes Account B from the board completely (Board Members → Remove).
  2. Account B attempts to visit `/boards/<board_id>`.
- **Expected Results:**
  - [ ] Account B receives a 403 / redirect away.
  - [ ] No role tip, task content, or board metadata is rendered.

---

### [ ] MT-19: Mobile Responsive & Navigation Verification (P1)
- **Goal:** Verify mobile layout, bottom navigation absence, and thumb accessibility.
- **Precondition:** Viewport set to mobile (e.g., Chrome DevTools iPhone 14, 390px width).
- **Context:** *The 5-button bottom navigation is permanently removed by design across the entire application in favor of the mobile drawer (DEC-17).*
- **Steps:**
  1. Open `/` and any board view in mobile viewport.
  2. Inspect the bottom of the screen and the top header.
- **Expected Results:**
  - [ ] The 5-button bottom navigation bar is **permanently absent** (not rendered).
  - [ ] The mobile hamburger icon in the header opens the mobile Sheet navigation drawer.
  - [ ] Floating action buttons (e.g., Add Task, Dev Mode) sit cleanly above the mobile safe-area insets (`env(safe-area-inset-bottom)`) without colliding.
  - [ ] Touch targets meet at least 44px height.

---

## 🟢 Priority 2: Recovery, Education & Sync

### [ ] MT-15: "Getting Started" Tour Replay in User Menu (P2)
- **Goal:** Verify any user can replay the 3-step tour from the sidebar.
- **Steps:**
  1. Click your user avatar / profile in the bottom-left sidebar.
  2. In the dropdown menu, click **Getting started** (sparkles icon).
- **Expected Results:**
  - [ ] A dialog opens: *"Getting started tour"*.
  - [ ] Read-only 3-step walkthrough with "Next", "Back", and "Done" buttons.
  - [ ] Advancing through the tour does **not** mutate existing boards or create new tasks.

---

### [ ] MT-16: "What's New" Banner (P2)
- **Goal:** Verify existing users see the versioned "What's new" banner with an option to take a quick tour.
- **Precondition:** Log in with an account having `status = 'not_applicable'`.
- **Steps:**
  1. Look at the top of `/` (Boards Overview).
- **Expected Results:**
  - [ ] Banner is displayed: *"What's new: A guided setup that gets your first board moving"*.
  - [ ] Clicking *"Take a quick tour"* launches the read-only tour.
  - [ ] Clicking the `X` dismisses the banner and saves the dismissal to the server (does not re-appear on reload).

---

### [ ] MT-17: Cross-Tab Real-Time Sync (P2)
- **Goal:** Verify that completing onboarding actions in one tab syncs across open tabs without manual reload.
- **Steps:**
  1. Open `/` in **Tab A** and **Tab B** simultaneously for a new user.
  2. In Tab A, choose **Product sprint**.
- **Expected Results:**
  - [ ] Tab A transitions to the starter board.
  - [ ] Tab B automatically updates via BroadcastChannel and shows the in-progress setup checklist without requiring a manual refresh.

---

## 🔵 Gap Tests (MT-20 to MT-28)

### [ ] MT-20: Client Cannot Tamper Step Completion (P0)
- **Goal:** Verify that a malicious client cannot directly write or spoof step completion timestamps.
- **Steps:**
  1. Log in as a user in onboarding.
  2. In browser DevTools Console, issue:
     ```javascript
     fetch('/api/users/me/onboarding/start', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
       body: JSON.stringify({ template: 'personal', step_task_completed_at: '2026-01-01T00:00:00Z' })
     });
     ```
  3. Query `GET /api/users/me/onboarding`.
- **Expected Results:**
  - [ ] `steps[2].completed` remains `false`. The server ignores client-supplied timestamps and step flags.

---

### [ ] MT-21: Migration Backfill — Existing Users Are Not Applicable (P0)
- **Goal:** Verify existing accounts in the database never get forced into first-run onboarding.
- **Precondition:** Use the seeded account `test@example.com` or any account registered prior to migration `d8e9f0a1b2c3`.
- **Steps:**
  1. Log in as `test@example.com`.
  2. Inspect `/` (Boards Overview).
- **Expected Results:**
  - [ ] Onboarding question is **NOT** displayed.
  - [ ] User immediately sees their standard dashboard.
  - [ ] Deleting all boards later still does **not** trigger the onboarding question.

---

### [ ] MT-22: Accepting Invitation Mid-Onboarding Does Not Reset Progress (P0)
- **Goal:** Verify that accepting an invitation during or after onboarding does not wipe latched steps.
- **Steps:**
  1. Start onboarding, choose **Personal tasks**, and create 1 task (Checklist: 2 of 3 done).
  2. Open an invite link `/invite/<id>` and click *"Skip setup and view invitation"*, then accept the invite.
  3. Inspect `GET /api/users/me/onboarding`.
- **Expected Results:**
  - [ ] Step 1 (`board_created`) and Step 2 (`task_created`) remain marked completed with their original timestamps.

---

### [ ] MT-23: Commenter, Editor, and Admin/Owner Role Tips (P1)
- **Goal:** Verify role tips render accurate permission cues across all remaining roles.
- **Steps:**
  1. In Account A, invite `user-commenter@example.com` as **Commenter**, `user-editor@example.com` as **Editor**, and `user-admin@example.com` as **Admin**.
  2. Log in as each user and open `"QA Team Board"`.
- **Expected Results:**
  - [ ] **Commenter:** Tip states you can comment and @mention, but cannot edit or move cards.
  - [ ] **Editor:** Tip states you can create, edit, and drag cards, but cannot invite members or manage columns.
  - [ ] **Admin:** Tip states you can invite members and manage columns.

---

### [ ] MT-24: Invitation 7-Day Expiry During Onboarding (P1)
- **Goal:** Verify an invitation maintains its 7-day TTL and expiry behavior while a user is in onboarding.
- **Steps:**
  1. Invite `qa-expire-test@example.com`.
  2. In database, set the invitation's `created_at = NOW() - INTERVAL 8 DAY`.
  3. Register as `qa-expire-test@example.com` and complete onboarding.
- **Expected Results:**
  - [ ] After onboarding, the pending invitation banner shows "Invitation Expired" or is excluded.
  - [ ] Opening `/invite/<id>` directly renders the expired card.

---

### [ ] MT-25: Role Change During Active Onboarding Tour (P1)
- **Goal:** Verify that receiving a role change event does not crash or break the Getting Started tour dialog.
- **Steps:**
  1. Open the "Getting started" tour dialog (`AppSidebar` → `Getting started`).
  2. In another tab, have a board owner change your role on a shared board.
- **Expected Results:**
  - [ ] The tour dialog remains open, interactive, and progresses smoothly without crashing.

---

### [ ] MT-26: Predictable Skip Placement (P1)
- **Goal:** Verify skip controls remain in predictable locations across all steps.
- **Steps:**
  1. Inspect the **Question screen**: Skip button is in the top-right (`X`) and bottom-right ("Skip for now").
  2. Inspect the **Floating Checklist**: Skip button is in the top-right header ("Skip").
  3. Inspect **Coach Marks**: Skip button is in the bottom-left of the tooltip.
- **Expected Results:**
  - [ ] Skip is always accessible in standard, predictable corners without shifting position during interaction.

---

### [ ] MT-27: Cross-Device / Cross-Browser Progress Resume (P1)
- **Goal:** Verify a user who starts onboarding on Device A resumes at the exact same step on Device B.
- **Steps:**
  1. On Browser A (e.g. Chrome), start onboarding and create a task (2 of 3 done).
  2. Log in with the same account on Browser B (e.g. Firefox or Incognito).
- **Expected Results:**
  - [ ] Browser B immediately shows the floating checklist at **2 of 3 done** with Step 1 and 2 completed.

---

### [ ] MT-28: Keyboard, Accessibility, Reduced Motion & Contrast (P1)
- **Goal:** Verify accessibility compliance across coach marks, checklists, and question card.
- **Steps:**
  1. Navigate the starter question using only `Tab` and `Enter` / `Space`.
  2. When a coach mark appears, press `Escape`.
  3. Enable system **Reduced Motion** (`prefers-reduced-motion: reduce`) in OS or Chrome Rendering tab.
  4. Test in both **Light** and **Dark** themes.
- **Expected Results:**
  - [ ] All interactive elements are reachable via keyboard with clear focus rings.
  - [ ] `Escape` dismisses the active coach mark.
  - [ ] Reduced motion disables pulse and slide animations.
  - [ ] High contrast: text meets WCAG AA contrast against card backgrounds in both themes.

---

### QA Sign-Off

| Checkpoint | Status | Date | Tester | Notes |
|---|---|---|---|---|
| **P0 Critical Paths** (MT-01, 02, 03, 04, 05, 06, 08, 09, 18, 20, 21, 22) | [ ] PASS | | | |
| **P1 Workflows & Polish** (MT-07, 10, 11, 12, 13, 14, 19, 23, 24, 25, 26, 27, 28) | [ ] PASS | | | |
| **P2 Recovery & Sync** (MT-15, 16, 17) | [ ] PASS | | | |
