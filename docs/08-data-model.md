> **Status:** Verified | **Last scanned:** 2026-10-13 | **Audience:** Developers

# 08 — Data Model & Database Schema

Sticky Mind Grid defines **13 SQLAlchemy ORM models** across 11 model files exported in `backend/app/models/__init__.py:L1-L18`. All primary keys are UUIDv4 strings (`db.String(36)`, default `str(uuid.uuid4())`). All timestamps use naive UTC `datetime.utcnow` and are serialized as ISO-8601 strings with a trailing `'Z'` (`to_dict()`).

---

## 1. Entity-Relationship (ER) Diagram

### 1.1 ER Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o| user_preferences : "1:1 preferences (CASCADE)"
    users ||--o{ boards : "owns (owner_id)"
    users ||--o{ board_members : "memberships (CASCADE)"
    users ||--o{ board_invitations : "invites sent (CASCADE)"
    users ||--o{ tasks : "creates (created_by)"
    users ||--o{ tasks : "assigned (assigned_to)"
    users ||--o{ comments : "authors (SET NULL)"
    users ||--o{ activities : "actors (SET NULL)"
    users ||--o{ notifications : "receives (CASCADE)"
    users ||--o{ notes : "authors (CASCADE)"
    users ||--o{ conversation_participants : "participates (CASCADE)"
    users ||--o{ messages : "sends (CASCADE)"

    boards ||--o{ board_members : "members (CASCADE)"
    boards ||--o{ board_invitations : "invitations (CASCADE)"
    boards ||--o{ tasks : "contains (ORM cascade)"
    boards ||--o{ activities : "audit log (CASCADE)"
    boards ||--o{ notes : "project notes (CASCADE)"

    tasks ||--o{ comments : "has comments (CASCADE)"

    conversations ||--o{ conversation_participants : "participants (CASCADE)"
    conversations ||--o{ messages : "messages (CASCADE)"
    messages ||--o{ messages : "replies (reply_to_id SET NULL)"

    users {
        string_36 id PK
        string_255 email UK
        string_255 password_hash
        string_255 full_name
        string_500 avatar_url
        string_50 auth_provider
        string_255 auth_provider_id
        datetime created_at
    }

    user_preferences {
        string_36 id PK
        string_36 user_id FK,UK
        string_50 default_board_view
        string_100 timezone
        string_50 date_format
        int first_day_of_week
        boolean notify_mentions
        boolean notify_assignments
        boolean notify_invites
        boolean notify_comments
        datetime updated_at
    }

    boards {
        string_36 id PK
        string_255 name
        string_50 emoji
        text description
        string_50 color
        longtext hero_image_url
        json columns
        string_36 owner_id FK
        string_36 workspace_id IX
        boolean is_deleted
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    board_members {
        string_36 id PK
        string_36 board_id FK,UK
        string_36 user_id FK,UK
        string_20 role
        string_20 status
        boolean is_muted
        datetime created_at
    }

    board_invitations {
        string_36 id PK
        string_36 board_id FK,IX
        string_255 email IX
        string_20 role
        string_20 status
        string_36 inviter_id FK
        datetime created_at
        datetime expires_at
        datetime accepted_at
        datetime revoked_at
    }

    tasks {
        string_36 id PK
        string_36 board_id FK
        string_255 title
        string_50 emoji
        longtext description
        string_50 status
        string_50 priority
        int progress
        datetime due_date
        string_36 assigned_to FK
        string_36 created_by FK
        float position
        json checklist
        json tags
        json attachments
        json followers
        boolean is_deleted
        datetime deleted_at
        datetime created_at
        datetime updated_at
    }

    comments {
        string_36 id PK
        string_36 task_id FK
        string_36 user_id FK
        text content
        json mentions
        boolean is_edited
        text original_content
        datetime created_at
        datetime updated_at
    }

    activities {
        string_36 id PK
        string_36 board_id FK
        string_50 type
        string_255 task_title
        string_50 target_type
        string_36 target_id
        text before_value
        text after_value
        text message
        string_36 user_id FK
        datetime timestamp
    }

    notifications {
        string_36 id PK
        string_36 user_id FK
        string_50 type
        string_255 title
        text message
        string_255 link
        boolean is_read
        datetime created_at
    }

    notes {
        string_36 id PK
        string_36 board_id FK
        string_36 user_id FK
        string_255 title
        text content
        string_50 color
        datetime created_at
        datetime updated_at
    }

    conversations {
        string_36 id PK
        string_255 title
        string_32 type
        string_36 created_by FK
        datetime created_at
        datetime updated_at
        datetime last_message_at
        text last_message_preview
    }

    conversation_participants {
        string_36 id PK
        string_36 conversation_id FK,UK
        string_36 user_id FK,UK
        string_32 role
        datetime joined_at
        datetime last_read_at
    }

    messages {
        string_36 id PK
        string_36 conversation_id FK
        string_36 sender_id FK
        text content
        json attachments
        string_36 reply_to_id FK
        json reactions
        boolean is_forwarded
        boolean is_pinned
        boolean is_deleted
        datetime created_at
        datetime updated_at
    }
```

### 1.2 ER Diagram (Text Version)

```text
GLOBAL / USER ROOT
  users (id PK, email UK)
    ├── 1:1 ──> user_preferences (user_id FK -> users.id ON DELETE CASCADE, UNIQUE)
    ├── 1:N ──> notifications    (user_id FK -> users.id ON DELETE CASCADE)
    │
    ├── BOARD TENANT HIERARCHY
    ├── 1:N ──> boards           (owner_id FK -> users.id)
    │             ├── 1:N ──> board_members     (board_id FK -> boards.id ON DELETE CASCADE,
    │             │                              user_id FK -> users.id ON DELETE CASCADE,
    │             │                              UNIQUE(board_id, user_id))
    │             ├── 1:N ──> board_invitations (board_id FK -> boards.id ON DELETE CASCADE,
    │             │                              inviter_id FK -> users.id ON DELETE CASCADE)
    │             ├── 1:N ──> tasks             (board_id FK -> boards.id ON DELETE CASCADE,
    │             │             │                assigned_to FK -> users.id,
    │             │             │                created_by FK -> users.id)
    │             │             └── 1:N ──> comments (task_id FK -> tasks.id ON DELETE CASCADE,
    │             │                                   user_id FK -> users.id ON DELETE SET NULL)
    │             ├── 1:N ──> activities        (board_id FK -> boards.id ON DELETE CASCADE,
    │             │                              user_id FK -> users.id ON DELETE SET NULL)
    │             └── 1:N ──> notes             (board_id FK -> boards.id ON DELETE CASCADE,
    │                                            user_id FK -> users.id ON DELETE CASCADE)
    │
    └── MESSAGING HIERARCHY (Cross-Board / User-Scoped)
        └── 1:N ──> conversations (created_by FK -> users.id ON DELETE SET NULL)
                      ├── 1:N ──> conversation_participants (conversation_id FK -> conversations.id ON DELETE CASCADE,
                      │                                      user_id FK -> users.id ON DELETE CASCADE,
                      │                                      UNIQUE(conversation_id, user_id))
                      └── 1:N ──> messages                  (conversation_id FK -> conversations.id ON DELETE CASCADE,
                                                             sender_id FK -> users.id ON DELETE CASCADE,
                                                             reply_to_id FK -> messages.id ON DELETE SET NULL)
```

---

## 2. Entity & Column Specifications

### 2.1 `User` (`users`)
- **Source:** `backend/app/models/user.py:L8-L55`
- **Relationships:** `owned_boards`, `created_tasks`, `assigned_tasks`, `activities`, `board_memberships` (`cascade="all, delete-orphan"`), `comments`, `notifications` (`cascade="all, delete-orphan"`), `preferences` (`uselist=False, cascade="all, delete-orphan"`), `conversation_participations` (`cascade="all, delete-orphan"`), `sent_messages` (`cascade="all, delete-orphan"`), plus backrefs `sent_invitations` (`board_invitation.py:L23`) and `notes` (`note.py:L21`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `email` | `String(255)` | `False` | — | `UNIQUE` | `L12` |
| `password_hash` | `String(255)` | `False` | — | Bcrypt hash (`set_password` / `check_password`, `L40-L44`) | `L13` |
| `full_name` | `String(255)` | `True` | `""` (`__init__`) | — | `L14,L32` |
| `avatar_url` | `String(500)` | `True` | `None` | — | `L15` |
| `auth_provider` | `String(50)` | `True` | `'local'` | `'local' \| 'google' \| 'github' \| 'microsoft'` | `L16` |
| `auth_provider_id` | `String(255)` | `True` | `None` | — | `L17` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L18` |

---

### 2.2 `UserPreference` (`user_preferences`)
- **Source:** `backend/app/models/user_preference.py:L8-L41`
- **Relationships:** `user` (`back_populates='preferences'`, `L23`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `user_id` | `String(36)` | `False` | — | `UNIQUE`, `FK -> users.id (ON DELETE CASCADE)` | `L12` |
| `default_board_view` | `String(50)` | `False` | `'board'` | `'board' \| 'list' \| 'calendar' \| 'documents' \| 'overview'` | `L13` |
| `timezone` | `String(100)` | `False` | `'UTC'` | — | `L14` |
| `date_format` | `String(50)` | `False` | `'MM/DD/YYYY'` | `'MM/DD/YYYY' \| 'DD/MM/YYYY' \| 'YYYY-MM-DD'` | `L15` |
| `first_day_of_week` | `Integer` | `False` | `0` | `0` (Sunday) or `1` (Monday) | `L16` |
| `notify_mentions` | `Boolean` | `False` | `True` | — | `L17` |
| `notify_assignments` | `Boolean` | `False` | `True` | — | `L18` |
| `notify_invites` | `Boolean` | `False` | `True` | — | `L19` |
| `notify_comments` | `Boolean` | `False` | `True` | — | `L20` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L21` |

---

### 2.3 `Board` (`boards`)
- **Source:** `backend/app/models/board.py:L10-L146`
- **Relationships:** `owner` (`User`, `L27`), `tasks` (`Task`, `cascade="all, delete-orphan"`, `L28`), `memberships` (`BoardMember`, `cascade="all, delete-orphan"`, `L29`), plus backrefs `invitations` (`BoardInvitation`, `L22`) and `notes` (`Note`, `L20`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L13` |
| `name` | `String(255)` | `False` | — | — | `L14` |
| `emoji` | `String(50)` | `True` | `None` | — | `L15` |
| `description` | `Text` | `True` | `None` | — | `L16` |
| `color` | `String(50)` | `False` | `'hsl(220, 80%, 56%)'` | Normalized to `'hsl(...)'` in `to_dict()` (`L49`) | `L17` |
| `hero_image_url` | `Text` / `LONGTEXT` (MySQL) | `True` | `None` | — | `L18` |
| `columns` | `JSON` | `True` | `list` (`[]`) | Array of `{id, title, emoji?, color?, wipLimit?}` | `L19` |
| `owner_id` | `String(36)` | `True` | `None` | `FK -> users.id` (no DB `ondelete`) | `L20` |
| `workspace_id` | `String(36)` | `True` | `None` | `INDEX (ix_boards_workspace_id)` (no FK target table) | `L21` |
| `is_deleted` | `Boolean` | `False` | `False` | Soft-delete flag | `L22` |
| `deleted_at` | `DateTime` | `True` | `None` | Soft-delete UTC timestamp (30-day trash TTL) | `L23` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L24` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L25` |

- **`Board.columns` JSON Structure (`backend/app/services/board_service.py:L166-L193,L255-L275`):**
  - Default columns on board creation: `todo` (`"To Do"`), `in_progress` (`"In Progress"`), `done` (`"Done"`), `archive` (`"Archive"`).
  - Each column object contains `{"id": string, "title": string, "emoji"?: string, "color"?: string, "wipLimit"?: int | null}`.
  - Every board must retain at least 1 workflow column with `id != 'archive'` (`L190-L191`). `wipLimit` must be a positive integer (`>= 1`) when set (`L166-L178`). Columns containing active (`is_deleted=False`) tasks cannot be removed (`L268-L274`).

---

### 2.4 `BoardMember` (`board_members`)
- **Source:** `backend/app/models/board_member.py:L8-L57`
- **Table Constraints:** `db.UniqueConstraint('board_id', 'user_id', name='uq_board_user')` (`L22-L24`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `board_id` | `String(36)` | `False` | — | `FK -> boards.id (ON DELETE CASCADE)`, `uq_board_user` | `L12` |
| `user_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)`, `uq_board_user` | `L13` |
| `role` | `String(20)` | `False` | `'member'` | `'owner' \| 'admin' \| 'editor' \| 'member' \| 'commenter' \| 'viewer'` | `L14` |
| `status` | `String(20)` | `False` | `'accepted'` | `'pending' \| 'accepted' \| 'declined' \| 'expired'` | `L15` |
| `is_muted` | `Boolean` | `False` | `False` | Suppresses board notifications in `NotificationService` | `L16` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L17` |

---

### 2.5 `BoardInvitation` (`board_invitations`)
- **Source:** `backend/app/models/board_invitation.py:L8-L80`
- **Indexes in Migration `7a8b9c0d1e2f` (`backend/migrations/versions/7a8b9c0d1e2f_add_board_invitations_table.py:L34-L35`):** `ix_board_invitations_board_email` on `(board_id, email)` and `ix_board_invitations_email` on `(email)`.

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `board_id` | `String(36)` | `False` | — | `FK -> boards.id (ON DELETE CASCADE)` | `L12` |
| `email` | `String(255)` | `False` | Lowercased in `__init__` | Target invitee email (`L28`) | `L13` |
| `role` | `String(20)` | `False` | `'editor'` | `'admin' \| 'editor' \| 'commenter' \| 'viewer' \| 'member'` | `L14` |
| `status` | `String(20)` | `False` | `'pending'` | `'pending' \| 'accepted' \| 'expired' \| 'revoked' \| 'declined'` | `L15` |
| `inviter_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)` | `L16` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L17` |
| `expires_at` | `DateTime` | `False` | `utcnow() + 7 days` | Computed in `__init__` (`L32-L33`) | `L18` |
| `accepted_at` | `DateTime` | `True` | `None` | — | `L19` |
| `revoked_at` | `DateTime` | `True` | `None` | — | `L20` |

---

### 2.6 `Task` (`tasks`)
- **Source:** `backend/app/models/task.py:L10-L117`
- **Relationships:** `board` (`Board`, `L34`), `creator` (`User` via `created_by`, `L35`), `assignee` (`User` via `assigned_to`, `L36`), `comments` (backref from `Comment.task` with `cascade='all, delete-orphan'`, `comment.py:L21`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L13` |
| `board_id` | `String(36)` | `False` | — | `FK -> boards.id ON DELETE CASCADE` (ORM `delete-orphan` on `Board.tasks`) | `L14` |
| `title` | `String(255)` | `False` | — | — | `L15` |
| `emoji` | `String(50)` | `True` | `None` | — | `L16` |
| `description` | `Text` / `LONGTEXT` (MySQL) | `True` | `None` | Supports optimistic concurrency check via `baseDescription` | `L17` |
| `status` | `String(50)` | `True` | `'todo'` | Matches a `Column.id` in `Board.columns` | `L18` |
| `priority` | `String(50)` | `True` | `'medium'` | `'low' \| 'medium' \| 'high' \| 'urgent'` | `L19` |
| `progress` | `Integer` | `True` | `0` | `0` to `100` | `L20` |
| `due_date` | `DateTime` | `True` | `None` | — | `L21` |
| `assigned_to` | `String(36)` | `True` | `None` | `FK -> users.id` (single scalar assignee; must have `editor`+ role) | `L22` |
| `created_by` | `String(36)` | `True` | `None` | `FK -> users.id` | `L23` |
| `position` | `Float` | `False` | `0.0` | Fractional ordering index (step `1000.0`) | `L24` |
| `checklist` | `JSON` | `True` | `list` (`[]`) | `[{id: string, title: string, completed: boolean}]` | `L25` |
| `tags` | `JSON` | `True` | `list` (`[]`) | `[{id: string, name: string, color: string}]` | `L26` |
| `attachments` | `JSON` | `True` | `list` (`[]`) | `[{id, name, storedName, url, type, size, sizeBytes}]` | `L27` |
| `followers` | `JSON` | `True` | `list` (`[]`) | `string[]` of user UUIDs (auto-seeded with `[created_by, assigned_to]`, `L57-L62`) | `L28` |
| `is_deleted` | `Boolean` | `False` | `False` | Soft-delete flag | `L29` |
| `deleted_at` | `DateTime` | `True` | `None` | Soft-delete UTC timestamp (30-day trash TTL) | `L30` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L31` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L32` |

---

### 2.7 `Comment` (`comments`)
- **Source:** `backend/app/models/comment.py:L8-L71`
- **Relationships:** `task` (`Task`, backref `comments` with `cascade='all, delete-orphan'`, `L21`), `user` (`User`, `L22`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `task_id` | `String(36)` | `False` | — | `FK -> tasks.id (ON DELETE CASCADE)` | `L12` |
| `user_id` | `String(36)` | `True` | `None` | `FK -> users.id (ON DELETE SET NULL)` | `L13` |
| `content` | `Text` | `False` | `""` (`__init__`) | Comment body | `L14` |
| `mentions` | `JSON` | `True` | `list` (`[]`) | `string[]` of mentioned board member user UUIDs | `L15` |
| `is_edited` | `Boolean` | `False` | `False` | Set `True` on `CommentService.update_comment()` (`comment_service.py:L219`) | `L16` |
| `original_content` | `Text` | `True` | `None` | Snapshot of initial content before first edit (`comment_service.py:L217-L218`) | `L17` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L18` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L19` |

---

### 2.8 `Activity` (`activities`)
- **Source:** `backend/app/models/activity.py:L8-L88`
- **Relationships:** `user` (`User`, `back_populates='activities'`, `L23`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `board_id` | `String(36)` | `True` | `None` | `FK -> boards.id (ON DELETE CASCADE)` | `L12` |
| `type` | `String(50)` | `False` | — | `'create' \| 'move' \| 'update' \| 'delete'` | `L13` |
| `task_title` | `String(255)` | `False` | — | Subject title (card title, board name, member name, or `'Trash Bin'`) | `L14` |
| `target_type` | `String(50)` | `True` | `'task'` | `'task' \| 'comment' \| 'board' \| 'member'` | `L15` |
| `target_id` | `String(36)` | `True` | `None` | UUID of affected entity | `L16` |
| `before_value` | `Text` | `True` | `None` | Previous state snapshot | `L17` |
| `after_value` | `Text` | `True` | `None` | New state snapshot | `L18` |
| `message` | `Text` | `False` | — | Human-readable audit description | `L19` |
| `user_id` | `String(36)` | `True` | `None` | `FK -> users.id (ON DELETE SET NULL)` | `L20` |
| `timestamp` | `DateTime` | `True` | `datetime.utcnow` | — | `L21` |

---

### 2.9 `Notification` (`notifications`)
- **Source:** `backend/app/models/notification.py:L8-L42`
- **Relationships:** `user` (`User`, `back_populates='notifications'`, `L20`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `user_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)` | `L12` |
| `type` | `String(50)` | `False` | — | `'mention' \| 'assignment' \| 'task_move' \| 'task_comment' \| 'board_invite' \| 'invite_accepted' \| 'invite_declined' \| 'member_left' \| 'member_removed'` | `L13` |
| `title` | `String(255)` | `False` | — | — | `L14` |
| `message` | `Text` | `False` | — | — | `L15` |
| `link` | `String(255)` | `True` | `None` | Target SPA path (e.g., `"/boards/<board_id>"`) | `L16` |
| `is_read` | `Boolean` | `False` | `False` | — | `L17` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L18` |

---

### 2.10 `Note` (`notes`)
- **Source:** `backend/app/models/note.py:L8-L44`
- **Relationships:** `board` (`Board`, backref `notes` with `cascade='all, delete-orphan'`, `L20`), `user` (`User`, backref `notes` with `cascade='all, delete-orphan'`, `L21`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `board_id` | `String(36)` | `False` | — | `FK -> boards.id (ON DELETE CASCADE)` | `L12` |
| `user_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)` | `L13` |
| `title` | `String(255)` | `False` | — | — | `L14` |
| `content` | `Text` | `True` | `''` | HTML / rich text body | `L15` |
| `color` | `String(50)` | `False` | `'#fef3c7'` | Sticky note hex color | `L16` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L17` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L18` |

---

### 2.11 `Conversation`, `ConversationParticipant`, and `Message` (`conversations`, `conversation_participants`, `messages`)
- **Source:** `backend/app/models/message.py:L8-L198`

#### `Conversation` (`conversations`, `message.py:L8-L97`)
| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L11` |
| `title` | `String(255)` | `True` | `None` | Optional group chat title | `L12` |
| `type` | `String(32)` | `False` | `'direct'` | `'direct' \| 'group'` | `L13` |
| `created_by` | `String(36)` | `True` | `None` | `FK -> users.id (ON DELETE SET NULL)` | `L14` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L15` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L16` |
| `last_message_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L17` |
| `last_message_preview` | `Text` | `True` | `None` | — | `L18` |

#### `ConversationParticipant` (`conversation_participants`, `message.py:L100-L134`)
- **Table Constraints:** `db.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user')` (`L102-L104`).

| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L106` |
| `conversation_id` | `String(36)` | `False` | — | `FK -> conversations.id (ON DELETE CASCADE)`, `uq_conversation_user` | `L107` |
| `user_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)`, `uq_conversation_user` | `L108` |
| `role` | `String(32)` | `False` | `'member'` | `'admin' \| 'member'` | `L109` |
| `joined_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L110` |
| `last_read_at` | `DateTime` | `True` | `datetime.utcnow` | Used to compute `unreadCount` in `Conversation.to_dict()` (`L68-L78`) | `L111` |

#### `Message` (`messages`, `message.py:L137-L198`)
| Column | Type | Nullable | Default | Constraints / FKs | Line |
|---|---|---|---|---|---|
| `id` | `String(36)` | `False` | `generate_uuid` | `PRIMARY KEY` | `L140` |
| `conversation_id` | `String(36)` | `False` | — | `FK -> conversations.id (ON DELETE CASCADE)` | `L141` |
| `sender_id` | `String(36)` | `False` | — | `FK -> users.id (ON DELETE CASCADE)` | `L142` |
| `content` | `Text` | `True` | `''` (`__init__`) | Masked as `"This message was unsent"` when `is_deleted=True` (`L187`) | `L143` |
| `attachments` | `JSON` | `True` | `list` (`[]`) | `[{name, url, size?, mimeType?}]` (cleared to `[]` in `to_dict()` if `is_deleted`) | `L144` |
| `reply_to_id` | `String(36)` | `True` | `None` | `FK -> messages.id (ON DELETE SET NULL)` | `L145` |
| `reactions` | `JSON` | `True` | `dict` (`{}`) | `Record<emoji, userId[]>` (max 1 reaction per user, `message_service.py:L290-L302`) | `L146` |
| `is_forwarded` | `Boolean` | `False` | `False` | — | `L147` |
| `is_pinned` | `Boolean` | `False` | `False` | — | `L148` |
| `is_deleted` | `Boolean` | `False` | `False` | Unsend tombstone flag | `L149` |
| `created_at` | `DateTime` | `True` | `datetime.utcnow` | — | `L150` |
| `updated_at` | `DateTime` | `True` | `datetime.utcnow` | `onupdate=datetime.utcnow` | `L151` |

---

## 3. Soft-Delete Fields & 30-Day Trash Retention

Soft deletion is implemented on **three** models (`Task`, `Board`, and `Message`), while all other models use hard deletion (`db.session.delete`):

| Model | Soft-Delete Fields | Retention & Purge Behavior | Source Citation |
|---|---|---|---|
| **`Task`** (`tasks`) | `is_deleted` (`Boolean`, default `False`), `deleted_at` (`DateTime`, nullable) | **30-Day Lazy Auto-Purge:** When `TaskService.get_deleted_tasks(board_id)` is called (`GET /api/boards/<board_id>/trash`), tasks with `is_deleted == True` and `deleted_at < utcnow() - timedelta(days=30)` have their physical files removed via `FileService.cleanup_task_attachments(t)` and are hard-deleted from `tasks`. Admins can also permanently delete single tasks (`DELETE /api/tasks/<id>/permanent`) or empty trash (`DELETE /api/boards/<id>/trash`). | `backend/app/models/task.py:L29-L30`, `backend/app/services/task_service.py:L47-L64,L510-L648` |
| **`Board`** (`boards`) | `is_deleted` (`Boolean`, default `False`), `deleted_at` (`DateTime`, nullable) | **30-Day Lazy Auto-Purge:** `DELETE /api/boards/<board_id>?soft=true` sets `is_deleted = True` and `deleted_at = utcnow()`. Whenever `BoardService.get_user_boards()` or `BoardService.get_trashed_boards()` runs, boards with `deleted_at < utcnow() - timedelta(days=30)` are hard-deleted via `db.session.delete(b)`. (`DELETE /api/boards/<board_id>` without `?soft=true` performs an immediate hard delete.) | `backend/app/models/board.py:L22-L23`, `backend/app/services/board_service.py:L15-L24,L297-L366` |
| **`Message`** (`messages`) | `is_deleted` (`Boolean`, default `False`) (no `deleted_at`) | **Permanent Tombstone:** `DELETE /api/messages/<message_id>` sets `message.is_deleted = True` and `message.reactions = {}`. The row is never purged so `Message.to_dict()` can render `"This message was unsent"` in conversation history. | `backend/app/models/message.py:L149,L187-L194`, `backend/app/services/message_service.py:L311-L334` |

---

## 4. Audit Log Structure (`Activity`) & Immutability

- **Schema Structure (`backend/app/models/activity.py:L11-L21`):**
  - Every audit event records `board_id`, `user_id`, `type` (`'create' | 'move' | 'update' | 'delete'`), `target_type` (`'task' | 'comment' | 'board' | 'member'`), `target_id`, `task_title`, `before_value`, `after_value`, `message`, and `timestamp`.
- **Immutability Enforcement (`backend/app/routes/activity_routes.py:L51-L55`):**
  - There are **no** SQLAlchemy `before_update` or `before_delete` event listeners on the `Activity` model.
  - Instead, immutability is enforced at the API route layer: `PUT`, `PATCH`, and `DELETE` on `/api/activities` and `/api/activities/<activity_id>` are bound to `block_activity_mutations()`, which unconditionally returns HTTP `403 Forbidden` with `{"error": "Activity log entries are immutable and cannot be edited or deleted"}`.
- **Retention Window (`backend/config.py:L59`, `backend/app/services/activity_service.py:L9-L16`):**
  - Controlled by `ACTIVITY_RETENTION_DAYS` (default `0`, meaning retain indefinitely). When set to a positive integer, `ActivityService._get_retention_cutoff()` filters queries by `Activity.timestamp >= cutoff` without deleting database rows.
- **Account Deletion & Former Member Anonymization (`backend/app/services/user_service.py:L75-L78`, `backend/app/models/activity.py:L50-L73`):**
  - When a user deletes their account, `UserService.delete_account()` sets `a.user_id = None` on all their `Activity` rows (`user_service.py:L76-L78`).
  - When `Activity.to_dict()` runs, if `user_id` is `None` or the user is no longer an active (`status='accepted'`) member of `board_id`, the `user` object is serialized as `{"id": self.user_id, "fullName": "Former member", "email": "", "avatarUrl": None}`.

---

## 5. How `board_id` Isolates Tenant Data Across Tables

| Isolation Category | Tables | Isolation Mechanism & Source Citation |
|---|---|---|
| **Direct `board_id` Tenant Tables** | `boards`, `board_members`, `board_invitations`, `tasks`, `notes`, `activities` | Scoped directly by `board_id` (`boards.id` for `Board`). Queries filter by `board_id` after verifying `get_effective_role(board_id, user_id)` (`backend/app/utils/decorators.py:L19-L67`). Note: `activities.board_id` is nullable (`activity.py:L12`), and `tasks.board_id` can be updated during a cross-board move (`task_service.py:L301-L327`). |
| **Transitive `board_id` Tenant Table** | `comments` | Contains `task_id` (`FK -> tasks.id ON DELETE CASCADE`, `comment.py:L12`). `@require_task_access` resolves `task.board_id` and enforces board role checks before reading or mutating comments (`decorators.py:L69-L94`). |
| **User-Scoped Tables** | `user_preferences`, `notifications` | Scoped by `user_id` (`FK -> users.id ON DELETE CASCADE`). `Notification` does not have a `board_id` column, but `NotificationService._extract_board_id()` parses `/boards/<board_id>` from `Notification.link` to enforce board membership and `BoardMember.is_muted` suppression before creating notifications (`notification_service.py:L9-L48`). |
| **Conversation-Scoped Tables** | `conversations`, `conversation_participants`, `messages` | Scoped by `ConversationParticipant(conversation_id, user_id)` (`message_service.py:L108-L160`). Independent of `board_id`. |
| **Global Table** | `users` | Platform-wide identity table (`backend/app/models/user.py:L8-L55`). |
