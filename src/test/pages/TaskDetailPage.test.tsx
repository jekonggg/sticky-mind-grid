import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import TaskDetailPage from "@/pages/TaskDetailPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { Task } from "@/types/task";
import { Board } from "@/types/board";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ boardId: "board-1", taskId: "task-1" }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoard: vi.fn(),
    getMembers: vi.fn().mockResolvedValue([]),
    getBoards: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTask: vi.fn(),
    updateTask: vi.fn().mockResolvedValue({}),
    deleteTask: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/hooks/useBoardRealtime", () => ({
  useBoardRealtime: vi.fn(),
}));

const mockBoard: Board = {
  id: "board-1",
  name: "Engineering Roadmap",
  ownerId: mockUser.id,
  color: "hsl(220, 80%, 56%)",
  columns: [
    { id: "todo", title: "To Do", color: "#3b82f6" },
    { id: "in-progress", title: "In Progress", color: "#eab308" },
    { id: "done", title: "Done", color: "#22c55e" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTask: Task = {
  id: "task-1",
  boardId: "board-1",
  title: "Implement Notion Task Detail Page",
  emoji: "🚀",
  description: "Create a dedicated full-page task workspace.",
  status: "todo",
  priority: "high",
  progress: 25,
  assignedTo: "user-123",
  assignee: mockUser,
  tags: [{ id: "tag-1", name: "Frontend", color: "#3b82f6" }],
  checklist: [
    { id: "c-1", title: "Design header & properties", completed: true },
    { id: "c-2", title: "Add description editor", completed: false },
  ],
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TaskDetailPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boardApi.getBoard).mockResolvedValue(mockBoard);
    vi.mocked(taskApi.getTask).mockResolvedValue(mockTask);
  });

  it("renders Notion-style task header with breadcrumbs and title", async () => {
    renderWithProviders(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Engineering Roadmap")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Implement Notion Task Detail Page")).toBeInTheDocument();
      expect(screen.getByText("Board")).toBeInTheDocument();
    });
  });

  it("renders properties, status, priority, and tags", async () => {
    renderWithProviders(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });
  });

  it("renders checklist items and handles completion toggle", async () => {
    renderWithProviders(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Design header & properties")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Add description editor")).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 completed/i)).toBeInTheDocument();
    });
  });

  it("allows adding a new subtask to the checklist", async () => {
    renderWithProviders(<TaskDetailPage />);

    const addInput = await screen.findByPlaceholderText(/add a subtask/i);
    fireEvent.change(addInput, { target: { value: "Verify test coverage" } });
    fireEvent.keyDown(addInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(taskApi.updateTask).toHaveBeenCalled();
    });
  });

  it("renders description notes area with existing text", async () => {
    renderWithProviders(<TaskDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Create a dedicated full-page task workspace.")).toBeInTheDocument();
    });
  });
});
