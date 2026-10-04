import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { CommandSearchDialog } from "@/components/search/CommandSearchDialog";
import { renderWithProviders } from "@/test/test-utils";
import { boardApi } from "@/services/boardApi";
import { taskApi } from "@/services/api";
import { userApi } from "@/services/userApi";

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getBoards: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  taskApi: {
    getTasks: vi.fn(),
  },
}));

vi.mock("@/services/userApi", () => ({
  userApi: {
    getTeammates: vi.fn(),
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({}),
  },
}));

describe("CommandSearchDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (boardApi.getBoards as any).mockResolvedValue([
      { id: "b1", name: "Engineering Sprint", emoji: "🚀" },
    ]);
    (taskApi.getTasks as any).mockResolvedValue([
      { id: "t1", title: "Write Playwright Tests", boardId: "b1", emoji: "🧪" },
    ]);
    (userApi.getTeammates as any).mockResolvedValue([]);
  });

  it("renders search input and commands when open", async () => {
    renderWithProviders(
      <CommandSearchDialog open={true} onOpenChange={vi.fn()} />
    );

    expect(
      screen.getByPlaceholderText(/search boards, tasks, teammates/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Engineering Sprint")).toBeInTheDocument();
      expect(screen.getByText("Write Playwright Tests")).toBeInTheDocument();
      expect(screen.getByText("Dashboard & Analytics")).toBeInTheDocument();
    });
  });
});
