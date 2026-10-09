import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { taskApi } from "@/services/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/useMessages", () => ({
  useUnreadMessageCount: () => ({ data: 4 }),
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
  },
}));

describe("BottomNavBar Component", () => {
  const mockTasks = [
    {
      id: "t1",
      boardId: "b1",
      title: "Active Task 1",
      status: "todo",
      priority: "high",
      progress: 0,
      isDeleted: false,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "t2",
      boardId: "b1",
      title: "Active Task 2",
      status: "in_progress",
      priority: "medium",
      progress: 50,
      isDeleted: false,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (taskApi.getTasks as any).mockResolvedValue(mockTasks);
  });

  it("renders the 5 navigation buttons with Tasks prominently in the middle", async () => {
    renderWithProviders(<BottomNavBar />);

    expect(screen.getByRole("navigation", { name: /Mobile Bottom Navigation/i })).toBeInTheDocument();

    // 5 navigation buttons
    expect(screen.getByRole("button", { name: "Boards" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tasks \(Most Used\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toBeInTheDocument();
  });

  it("navigates to corresponding paths when buttons are clicked", () => {
    renderWithProviders(<BottomNavBar />);

    fireEvent.click(screen.getByRole("button", { name: "Boards" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");

    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");

    fireEvent.click(screen.getByRole("button", { name: /Tasks \(Most Used\)/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/tasks");

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    expect(mockNavigate).toHaveBeenCalledWith("/messages");

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(mockNavigate).toHaveBeenCalledWith("/calendar");
  });

  it("displays task badge on center button and unread badge on chat button", async () => {
    renderWithProviders(<BottomNavBar />);

    // Chat unread count badge
    expect(screen.getByText("4")).toBeInTheDocument();

    // Tasks count badge after query resolves
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
