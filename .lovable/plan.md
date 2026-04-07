

## Boards View — Implementation Plan

### Overview
Add a multi-board system where `/` shows a board gallery and `/boards/:boardId` loads the existing Kanban view scoped to that board.

### New Types (`src/types/board.ts`)
- `Board` interface: `id`, `name`, `description?`, `color`, `createdAt`, `updatedAt`
- `CreateBoardData`, `UpdateBoardData`

### New Mock API (`src/services/boardApi.ts`)
- CRUD operations with mock data and delays, same pattern as `taskApi`
- Pre-seed 2-3 sample boards

### Update Task Data Model
- Add `boardId` field to `Task` type and mock tasks
- Filter tasks by `boardId` in `useTasks` hook (pass `boardId` as parameter)

### New Hook (`src/hooks/useBoards.ts`)
- Manages board CRUD state, search/filter, sorting (name, updated, created)
- Immediate UI updates on create/edit/delete

### New Components

**`src/pages/BoardsOverview.tsx`** — Main page at `/`
- Search input + sort dropdown in header
- Responsive grid of board cards (3-col desktop, 1-col mobile)
- Empty state with CTA when no boards exist
- "Create Board" button

**`src/components/boards/BoardCard.tsx`** — Card in the grid
- Shows name, description, task count, last updated, color indicator
- Click navigates to `/boards/:boardId`
- Dropdown menu: Edit, Delete (with confirmation dialog)

**`src/components/boards/BoardModal.tsx`** — Create/Edit modal
- Fields: name (required), description (optional), color picker (6 preset colors)
- Reused for both create and edit

### Routing Changes (`src/App.tsx`)
- `/` → `BoardsOverview`
- `/boards/:boardId` → `KanbanBoard` (receives `boardId` from URL params)

### KanbanBoard Updates
- Read `boardId` from `useParams()`
- Pass `boardId` to `useTasks` to scope tasks
- Add back-navigation link to boards overview in `BoardHeader`
- Show board name in header

### Key Details
- All state is local/mock (matches current approach)
- Uses existing shadcn/ui components (Dialog, DropdownMenu, AlertDialog, Input, Button, Card)
- Toast notifications for CRUD success via sonner
- Loading skeletons while fetching boards
- Delete confirmation via AlertDialog

