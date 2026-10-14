import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { DocumentsView } from "@/components/kanban/DocumentsView";
import { Task } from "@/types/task";
import { fileApi } from "@/services/fileApi";

vi.mock("@/services/fileApi", () => ({
  fileApi: {
    downloadFile: vi.fn(),
  },
}));

vi.mock("@/services/noteApi", () => ({
  noteApi: {
    getNotes: vi.fn().mockResolvedValue([
      {
        id: "note-1",
        boardId: "board-1",
        title: "Sprint Documentation",
        content: "Important specs",
        color: "#fef3c7",
        updatedAt: new Date().toISOString(),
        user: { id: "u-1", fullName: "Author", email: "author@test.com" },
      },
    ]),
  },
}));

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getMembers: vi.fn().mockResolvedValue([]),
  },
}));

describe("DocumentsView Component", () => {
  const mockTasks: Task[] = [
    {
      id: "task-1",
      boardId: "board-1",
      title: "Design Frontend",
      status: "todo",
      priority: "high",
      progress: 0,
      attachments: [
        {
          id: "att-1",
          name: "wireframe.png",
          url: "/api/files/wireframe.png",
          type: "image/png",
          size: "45 KB",
        },
        {
          id: "att-2",
          name: "guidelines.pdf",
          url: "/api/files/guidelines.pdf",
          type: "application/pdf",
          size: "1.2 MB",
        },
      ],
    },
  ];

  it("renders both notes and task assets (images and PDFs)", async () => {
    const onTaskClick = vi.fn();
    renderWithProviders(
      <DocumentsView
        tasks={mockTasks}
        boardId="board-1"
        readOnly={false}
        onTaskClick={onTaskClick}
      />
    );

    // Verify Project Notes header and items
    expect(await screen.findByText(/Sprint Documentation/i)).toBeInTheDocument();

    // Verify Task Assets section
    expect(screen.getByText(/Task Assets & Files \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText("wireframe.png")).toBeInTheDocument();
    expect(screen.getByText("guidelines.pdf")).toBeInTheDocument();

    // Verify source task title
    expect(screen.getAllByText(/Design Frontend/i).length).toBeGreaterThanOrEqual(1);

    // Test download file button click
    const downloadBtns = screen.getAllByTitle("Download File");
    expect(downloadBtns.length).toBe(2);
    fireEvent.click(downloadBtns[0]);
    expect(fileApi.downloadFile).toHaveBeenCalledWith("/api/files/wireframe.png", "wireframe.png");
  });
});
