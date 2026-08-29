import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskComments } from "@/components/kanban/TaskComments";
import { renderWithProviders } from "@/test/test-utils";
import { BoardMember } from "@/types/board";
import { commentApi } from "@/services/commentApi";

vi.mock("@/services/commentApi", () => ({
  commentApi: {
    getComments: vi.fn().mockResolvedValue([
      {
        id: "comm-1",
        taskId: "task-1",
        userId: "user-2",
        content: "Hey @John Doe please review the PR @sarah@example.com",
        mentions: ["user-1"],
        createdAt: new Date().toISOString(),
        user: {
          id: "user-2",
          email: "alex@example.com",
          fullName: "Alex Rivera",
        },
      },
    ]),
    addComment: vi.fn().mockResolvedValue({ id: "comm-2" }),
    deleteComment: vi.fn().mockResolvedValue(true),
  },
}));

const mockMembers: BoardMember[] = [
  {
    id: "bm-1",
    boardId: "board-1",
    userId: "user-1",
    role: "member",
    status: "accepted",
    createdAt: new Date().toISOString(),
    user: {
      id: "user-1",
      email: "john@example.com",
      fullName: "John Doe",
    },
  },
  {
    id: "bm-2",
    boardId: "board-1",
    userId: "user-3",
    role: "member",
    status: "accepted",
    createdAt: new Date().toISOString(),
    user: {
      id: "user-3",
      email: "sarah@example.com",
      fullName: "Sarah Connor",
    },
  },
];

describe("TaskComments Component", () => {
  it("renders full-name @mention as a complete badge rather than truncating to first name", async () => {
    renderWithProviders(
      <TaskComments taskId="task-1" boardMembers={mockMembers} />
    );

    // Verify @John Doe is rendered in full within mention badge
    await waitFor(() => {
      expect(screen.getByText("@John Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("@sarah@example.com")).toBeInTheDocument();
  });

  it("suggests members when typing @ in comment box and inserts full name", async () => {
    renderWithProviders(
      <TaskComments taskId="task-1" boardMembers={mockMembers} />
    );

    const textarea = screen.getByPlaceholderText(/Write a comment/i);
    fireEvent.change(textarea, { target: { value: "Hello @" } });

    // Autocomplete popover opens
    await waitFor(() => {
      expect(screen.getByText("Mention Team Member")).toBeInTheDocument();
    });

    const memberBtn = screen.getByText("John Doe");
    fireEvent.click(memberBtn);

    // Textarea receives full name
    expect(textarea).toHaveValue("Hello @John Doe ");
  });
});
