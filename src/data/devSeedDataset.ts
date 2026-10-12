import { SeedTakeoverPreset } from "@/types/devMode";

export interface SeedPresetMeta {
  id: SeedTakeoverPreset;
  name: string;
  shortBadge: string;
  description: string;
  statsLabel: string;
}

export const SEED_PRESET_OPTIONS: SeedPresetMeta[] = [
  {
    id: "none",
    name: "Off (Live Backend Data)",
    shortBadge: "Live",
    description: "Uses real backend API responses and database records.",
    statsLabel: "Real MySQL / SQLite Backend",
  },
  {
    id: "full_showcase",
    name: "Full System Showcase",
    shortBadge: "Showcase",
    description:
      "Populates 6 boards across all roles (Owner, Admin, Editor, Commenter, Viewer), 30 tasks with due dates & checklists, 2 pending invites, notes, comments, notifications, and team chats.",
    statsLabel: "6 Boards • 30 Tasks • 2 Invites • 3 Chats",
  },
  {
    id: "scale_stress",
    name: "High-Volume Scale (24 Boards)",
    shortBadge: "24 Boards",
    description:
      "Populates 24 personal, company, and client boards with 65+ tasks to test filter tabs (All / Owned / Shared), search, sorting, and dashboard charts at scale.",
    statsLabel: "24 Boards • 66 Tasks • 2 Invites • 3 Chats",
  },
  {
    id: "onboarding_invites",
    name: "Zero Boards + Pending Invites",
    shortBadge: "Onboarding",
    description:
      "Simulates a brand-new user with 0 boards and 3 pending invitations to preview the invitation banner above the empty state and bell badge.",
    statsLabel: "0 Boards • 0 Tasks • 3 Pending Invites",
  },
];

interface SeedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface SeedSandboxStore {
  preset: SeedTakeoverPreset;
  userId: string;
  boards: any[];
  tasks: any[];
  trashedTasks: any[];
  invitations: any[];
  membersByBoard: Record<string, any[]>;
  commentsByTask: Record<string, any[]>;
  notesByBoard: Record<string, any[]>;
  activities: any[];
  notifications: any[];
  conversations: any[];
  messagesByConversation: Record<string, any[]>;
}

let activeSandboxStore: SeedSandboxStore | null = null;

function getCurrentAuthUser(): SeedUser {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("auth_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          return {
            id: String(parsed.id),
            email: parsed.email || "alex.rivera@stickymind.dev",
            fullName: parsed.fullName || "Alex Rivera",
            avatarUrl: parsed.avatarUrl,
          };
        }
      }
    } catch {
      // Ignore parse error
    }
  }
  return {
    id: "seed-user-me",
    email: "alex.rivera@stickymind.dev",
    fullName: "Alex Rivera",
  };
}

const TEAMMATES: SeedUser[] = [
  {
    id: "seed-user-sarah",
    email: "sarah.chen@stickymind.dev",
    fullName: "Sarah Chen",
  },
  {
    id: "seed-user-marcus",
    email: "marcus.vance@acmecorp.io",
    fullName: "Marcus Vance",
  },
  {
    id: "seed-user-elena",
    email: "elena.rostova@secops.io",
    fullName: "Elena Rostova",
  },
  {
    id: "seed-user-david",
    email: "david.kim@stickymind.dev",
    fullName: "David Kim",
  },
];

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildSeedStore(preset: SeedTakeoverPreset, me: SeedUser): SeedSandboxStore {
  const sarah = TEAMMATES[0];
  const marcus = TEAMMATES[1];
  const elena = TEAMMATES[2];
  const david = TEAMMATES[3];

  const baseInvitations = [
    {
      id: "seed-invite-1",
      boardId: "board-invite-ai-lab",
      role: "editor",
      status: "pending",
      inviterId: sarah.id,
      inviterName: "Dr. Maya Lin",
      createdAt: daysFromNowIso(-4),
      expiresAt: daysFromNowIso(3),
      board: {
        id: "board-invite-ai-lab",
        name: "AI Copilot Research Lab",
        emoji: "🤖",
        color: "hsl(280, 60%, 55%)",
        ownerName: "Dr. Maya Lin",
      },
    },
    {
      id: "seed-invite-2",
      boardId: "board-invite-partners",
      role: "viewer",
      status: "pending",
      inviterId: marcus.id,
      inviterName: "Jordan Blake",
      createdAt: daysFromNowIso(-1),
      expiresAt: daysFromNowIso(6),
      board: {
        id: "board-invite-partners",
        name: "Partner Ecosystem Portal",
        emoji: "🤝",
        color: "hsl(190, 70%, 45%)",
        ownerName: "Jordan Blake",
      },
    },
  ];

  if (preset === "onboarding_invites") {
    const thirdInvite = {
      id: "seed-invite-3",
      boardId: "board-invite-design-ops",
      role: "admin",
      status: "pending",
      inviterId: elena.id,
      inviterName: "Sarah Chen",
      createdAt: daysFromNowIso(-6),
      expiresAt: daysFromNowIso(1),
      board: {
        id: "board-invite-design-ops",
        name: "DesignOps Component Guild",
        emoji: "🎨",
        color: "hsl(350, 70%, 55%)",
        ownerName: "Sarah Chen",
      },
    };

    return {
      preset,
      userId: me.id,
      boards: [],
      tasks: [],
      trashedTasks: [],
      invitations: [...baseInvitations, thirdInvite],
      membersByBoard: {},
      commentsByTask: {},
      notesByBoard: {},
      activities: [],
      notifications: [
        {
          id: "seed-notif-onboard-1",
          userId: me.id,
          type: "board_invite",
          title: "Board Invitation",
          message: "Dr. Maya Lin invited you to join AI Copilot Research Lab as Editor.",
          link: "/",
          isRead: false,
          createdAt: hoursAgoIso(2),
        },
        {
          id: "seed-notif-onboard-2",
          userId: me.id,
          type: "board_invite",
          title: "Board Invitation",
          message: "Jordan Blake invited you to join Partner Ecosystem Portal as Viewer.",
          link: "/",
          isRead: false,
          createdAt: hoursAgoIso(5),
        },
      ],
      conversations: [],
      messagesByConversation: {},
    };
  }

  // Core 6 Showcase Boards
  const showcaseBoards: any[] = [
    {
      id: "board-seed-platform",
      name: "Platform Engine — Q4 Roadmap",
      emoji: "🏗️",
      description:
        "Core infrastructure, zero-downtime database migrations, and real-time SSE telemetry.",
      color: "hsl(220, 80%, 56%)",
      heroImageUrl:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
      ownerId: me.id,
      role: "owner",
      ownerCount: 1,
      taskCount: 8,
      columns: [
        { id: "backlog", title: "Backlog", emoji: "📂" },
        { id: "design", title: "Architecture", emoji: "📐" },
        { id: "in_progress", title: "Implementation", emoji: "⚡" },
        { id: "qa", title: "QA / Verification", emoji: "🧪" },
        { id: "done", title: "Released", emoji: "🚀" },
      ],
      createdAt: daysFromNowIso(-30),
      updatedAt: hoursAgoIso(1),
    },
    {
      id: "board-seed-design",
      name: "Design System v3 — Neon & Concentric",
      emoji: "🎨",
      description:
        "Tokenized colorways, concentric border-radius specimens, and WCAG AA contrast audits.",
      color: "hsl(142, 60%, 45%)",
      heroImageUrl:
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
      ownerId: me.id,
      role: "owner",
      ownerCount: 2,
      taskCount: 6,
      columns: [
        { id: "todo", title: "To Do", emoji: "📝" },
        { id: "in_progress", title: "In Progress", emoji: "🎨" },
        { id: "review", title: "Design Critique", emoji: "👀" },
        { id: "done", title: "Shipped", emoji: "✅" },
      ],
      createdAt: daysFromNowIso(-24),
      updatedAt: hoursAgoIso(3),
    },
    {
      id: "board-seed-marketing",
      name: "Global Launch Campaign 2026",
      emoji: "📈",
      description:
        "Multi-channel product launch, customer case studies, and developer community events.",
      color: "hsl(350, 70%, 55%)",
      heroImageUrl:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
      ownerId: sarah.id,
      role: "admin",
      ownerCount: 1,
      taskCount: 5,
      columns: [
        { id: "todo", title: "Briefing", emoji: "📋" },
        { id: "in_progress", title: "Production", emoji: "🎬" },
        { id: "review", title: "Legal & Brand", emoji: "⚖️" },
        { id: "done", title: "Live", emoji: "🔥" },
      ],
      createdAt: daysFromNowIso(-18),
      updatedAt: hoursAgoIso(6),
    },
    {
      id: "board-seed-client-acme",
      name: "Client: Acme Corp Enterprise Migration",
      emoji: "🏢",
      description:
        "Dedicated delivery board for Acme Corp SSO integration, data import, and SLA onboarding.",
      color: "hsl(25, 90%, 55%)",
      ownerId: marcus.id,
      role: "editor",
      ownerCount: 1,
      taskCount: 5,
      columns: [
        { id: "todo", title: "To Do", emoji: "📥" },
        { id: "in_progress", title: "In Progress", emoji: "⚙️" },
        { id: "qa", title: "Client UAT", emoji: "🔍" },
        { id: "done", title: "Completed", emoji: "✅" },
      ],
      createdAt: daysFromNowIso(-15),
      updatedAt: hoursAgoIso(9),
    },
    {
      id: "board-seed-security",
      name: "SOC2 Type II Compliance Audit",
      emoji: "🛡️",
      description:
        "Continuous security controls, penetration testing evidence, and RBAC tenancy verification.",
      color: "hsl(280, 60%, 55%)",
      ownerId: elena.id,
      role: "commenter",
      ownerCount: 1,
      taskCount: 3,
      columns: [
        { id: "todo", title: "Pending Evidence", emoji: "📂" },
        { id: "in_progress", title: "Auditor Review", emoji: "🕵️" },
        { id: "done", title: "Verified", emoji: "🔒" },
      ],
      createdAt: daysFromNowIso(-12),
      updatedAt: hoursAgoIso(14),
    },
    {
      id: "board-seed-exec",
      name: "Executive OKRs & Quarterly Deck",
      emoji: "🧭",
      description:
        "Company-wide Q4 objectives, ARR milestones, and engineering velocity benchmarks.",
      color: "hsl(190, 70%, 45%)",
      ownerId: david.id,
      role: "viewer",
      ownerCount: 1,
      taskCount: 3,
      columns: [
        { id: "todo", title: "Planned", emoji: "🎯" },
        { id: "in_progress", title: "On Track", emoji: "📊" },
        { id: "done", title: "Achieved", emoji: "🏆" },
      ],
      createdAt: daysFromNowIso(-20),
      updatedAt: hoursAgoIso(20),
    },
  ];

  const showcaseTasks: any[] = [
    // Board 1: Platform Engine (8 tasks)
    {
      id: "seed-task-101",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Enforce strict pre-acceptance invitation tenancy redaction",
      emoji: "🔐",
      description:
        "Ensure pending board invitations only expose board name, role, and inviter before acceptance.",
      status: "done",
      priority: "urgent",
      assignedTo: me.id,
      createdBy: me.id,
      creator: me,
      assignee: me,
      dueDate: daysFromNowIso(-2),
      progress: 100,
      position: 1,
      checklist: [
        { id: "chk-1", title: "Redact description in BoardService", completed: true },
        { id: "chk-2", title: "Add spam report endpoint", completed: true },
        { id: "chk-3", title: "Verify with pytest suite", completed: true },
      ],
      tags: [
        { id: "tag-sec", name: "security", color: "#ef4444" },
        { id: "tag-rbac", name: "rbac", color: "#8b5cf6" },
      ],
      attachments: [],
      createdAt: daysFromNowIso(-7),
      updatedAt: hoursAgoIso(2),
    },
    {
      id: "seed-task-102",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Implement SSE connection multiplexer with exponential backoff",
      emoji: "📡",
      description:
        "Consolidate board activity and task mutation streams with automatic jittered reconnect.",
      status: "in_progress",
      priority: "high",
      assignedTo: me.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: me,
      dueDate: daysFromNowIso(0),
      progress: 75,
      position: 1,
      checklist: [
        { id: "chk-4", title: "Add heartbeat ping every 25s", completed: true },
        { id: "chk-5", title: "Handle tab visibility resume", completed: true },
        { id: "chk-6", title: "Load test 200 concurrent listeners", completed: false },
      ],
      tags: [
        { id: "tag-realtime", name: "realtime", color: "#3b82f6" },
        { id: "tag-infra", name: "infra", color: "#06b6d4" },
      ],
      attachments: [],
      createdAt: daysFromNowIso(-5),
      updatedAt: hoursAgoIso(1),
    },
    {
      id: "seed-task-103",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Optimize MySQL composite index on (board_id, status, position)",
      emoji: "⚡",
      description:
        "Reduce Kanban column reorder query latency from 42ms to under 4ms on 10k-task boards.",
      status: "qa",
      priority: "high",
      assignedTo: sarah.id,
      createdBy: me.id,
      creator: me,
      assignee: sarah,
      dueDate: daysFromNowIso(1),
      progress: 90,
      position: 1,
      checklist: [
        { id: "chk-7", title: "Write Alembic migration", completed: true },
        { id: "chk-8", title: "Verify EXPLAIN query plan", completed: true },
      ],
      tags: [{ id: "tag-db", name: "database", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-6),
      updatedAt: hoursAgoIso(4),
    },
    {
      id: "seed-task-104",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Design Redis-backed distributed rate limiter for public APIs",
      emoji: "📐",
      description: "Sliding-window rate limiter for auth and invitation endpoints.",
      status: "design",
      priority: "medium",
      assignedTo: marcus.id,
      createdBy: me.id,
      creator: me,
      assignee: marcus,
      dueDate: daysFromNowIso(3),
      progress: 40,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-arch", name: "architecture", color: "#f59e0b" }],
      attachments: [],
      createdAt: daysFromNowIso(-4),
      updatedAt: hoursAgoIso(5),
    },
    {
      id: "seed-task-105",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Audit JWT token rotation and idle session timeout edge cases",
      emoji: "🛡️",
      description: "Ensure expired tokens trigger clean local storage teardown.",
      status: "in_progress",
      priority: "urgent",
      assignedTo: me.id,
      createdBy: elena.id,
      creator: elena,
      assignee: me,
      dueDate: daysFromNowIso(-1),
      progress: 60,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-sec", name: "security", color: "#ef4444" }],
      attachments: [],
      createdAt: daysFromNowIso(-8),
      updatedAt: hoursAgoIso(3),
    },
    {
      id: "seed-task-106",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Add S3-compatible object storage adapter for task attachments",
      emoji: "☁️",
      description: "Support pre-signed upload URLs alongside local filesystem fallback.",
      status: "backlog",
      priority: "low",
      assignedTo: null,
      createdBy: me.id,
      creator: me,
      assignee: null,
      dueDate: daysFromNowIso(7),
      progress: 0,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-storage", name: "storage", color: "#6366f1" }],
      attachments: [],
      createdAt: daysFromNowIso(-3),
      updatedAt: hoursAgoIso(12),
    },
    {
      id: "seed-task-107",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Build in-memory Dev Suite Seed Takeover sandbox",
      emoji: "🌱",
      description:
        "Allow developers to preview the entire application with realistic seed data without mutating the database.",
      status: "qa",
      priority: "high",
      assignedTo: me.id,
      createdBy: me.id,
      creator: me,
      assignee: me,
      dueDate: daysFromNowIso(0),
      progress: 95,
      position: 2,
      checklist: [
        { id: "chk-9", title: "Intercept authenticatedFetch", completed: true },
        { id: "chk-10", title: "Support live sandbox mutations", completed: true },
      ],
      tags: [{ id: "tag-dx", name: "dev-experience", color: "#14b8a6" }],
      attachments: [],
      createdAt: daysFromNowIso(-1),
      updatedAt: hoursAgoIso(1),
    },
    {
      id: "seed-task-108",
      boardId: "board-seed-platform",
      boardName: "Platform Engine — Q4 Roadmap",
      boardEmoji: "🏗️",
      boardColor: "hsl(220, 80%, 56%)",
      title: "Automate nightly database backup verification script",
      emoji: "💾",
      description: "Verify point-in-time recovery snapshots in staging.",
      status: "backlog",
      priority: "medium",
      assignedTo: sarah.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: sarah,
      dueDate: daysFromNowIso(5),
      progress: 15,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-ops", name: "devops", color: "#3b82f6" }],
      attachments: [],
      createdAt: daysFromNowIso(-4),
      updatedAt: hoursAgoIso(8),
    },

    // Board 2: Design System v3 (6 tasks)
    {
      id: "seed-task-201",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Unify bottom navigation active pill with Neon Lime primary token",
      emoji: "✨",
      description:
        "Replace hardcoded violet active indicators with semantic bg-primary text-primary-foreground tokens.",
      status: "done",
      priority: "high",
      assignedTo: me.id,
      createdBy: me.id,
      creator: me,
      assignee: me,
      dueDate: daysFromNowIso(-1),
      progress: 100,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-ui", name: "design-tokens", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-3),
      updatedAt: hoursAgoIso(2),
    },
    {
      id: "seed-task-202",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Calibrate concentric inner/outer border radii for compact density",
      emoji: "📐",
      description: "Ensure R_inner = R_outer - Padding holds across Kanban pods.",
      status: "in_progress",
      priority: "medium",
      assignedTo: me.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: me,
      dueDate: daysFromNowIso(2),
      progress: 65,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-geom", name: "geometry", color: "#6366f1" }],
      attachments: [],
      createdAt: daysFromNowIso(-4),
      updatedAt: hoursAgoIso(3),
    },
    {
      id: "seed-task-203",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Design role access badges for Owner, Admin, Editor, Commenter, Viewer",
      emoji: "🏷️",
      description: "Surface access level at a glance on every board card.",
      status: "done",
      priority: "high",
      assignedTo: sarah.id,
      createdBy: me.id,
      creator: me,
      assignee: sarah,
      dueDate: daysFromNowIso(-1),
      progress: 100,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-ux", name: "ux", color: "#ec4899" }],
      attachments: [],
      createdAt: daysFromNowIso(-2),
      updatedAt: hoursAgoIso(4),
    },
    {
      id: "seed-task-204",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Create empty state illustrations for filter & search variants",
      emoji: "🖼️",
      description: "Distinguish no boards yet, no search results, and no filter matches.",
      status: "review",
      priority: "medium",
      assignedTo: sarah.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: sarah,
      dueDate: daysFromNowIso(1),
      progress: 85,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-ui", name: "design-tokens", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-3),
      updatedAt: hoursAgoIso(5),
    },
    {
      id: "seed-task-205",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Verify keyboard focus rings in dark mode across Radix dialogs",
      emoji: "⌨️",
      description: "Check focus trap and visible outline contrast ratios.",
      status: "todo",
      priority: "low",
      assignedTo: me.id,
      createdBy: me.id,
      creator: me,
      assignee: me,
      dueDate: daysFromNowIso(6),
      progress: 10,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-a11y", name: "a11y", color: "#f59e0b" }],
      attachments: [],
      createdAt: daysFromNowIso(-2),
      updatedAt: hoursAgoIso(7),
    },
    {
      id: "seed-task-206",
      boardId: "board-seed-design",
      boardName: "Design System v3 — Neon & Concentric",
      boardEmoji: "🎨",
      boardColor: "hsl(142, 60%, 45%)",
      title: "Benchmark Satoshi vs Inter Tight variable font metrics",
      emoji: "🔤",
      description: "Compare tabular numeral alignment in dashboard analytics cards.",
      status: "todo",
      priority: "low",
      assignedTo: null,
      createdBy: me.id,
      creator: me,
      assignee: null,
      dueDate: daysFromNowIso(8),
      progress: 0,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-type", name: "typography", color: "#8b5cf6" }],
      attachments: [],
      createdAt: daysFromNowIso(-1),
      updatedAt: hoursAgoIso(9),
    },

    // Board 3: Global Launch Campaign (5 tasks)
    {
      id: "seed-task-301",
      boardId: "board-seed-marketing",
      boardName: "Global Launch Campaign 2026",
      boardEmoji: "📈",
      boardColor: "hsl(350, 70%, 55%)",
      title: "Publish interactive product tour & live sandbox demo",
      emoji: "🎬",
      description: "Showcase real-time collaboration and instant role switching.",
      status: "in_progress",
      priority: "urgent",
      assignedTo: me.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: me,
      dueDate: daysFromNowIso(0),
      progress: 70,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-launch", name: "launch", color: "#ef4444" }],
      attachments: [],
      createdAt: daysFromNowIso(-5),
      updatedAt: hoursAgoIso(2),
    },
    {
      id: "seed-task-302",
      boardId: "board-seed-marketing",
      boardName: "Global Launch Campaign 2026",
      boardEmoji: "📈",
      boardColor: "hsl(350, 70%, 55%)",
      title: "Finalize enterprise security whitepaper with SOC2 summary",
      emoji: "📄",
      description: "Coordinate with Elena on RBAC and encryption-at-rest sections.",
      status: "review",
      priority: "high",
      assignedTo: elena.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: elena,
      dueDate: daysFromNowIso(2),
      progress: 80,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-content", name: "content", color: "#3b82f6" }],
      attachments: [],
      createdAt: daysFromNowIso(-6),
      updatedAt: hoursAgoIso(5),
    },
    {
      id: "seed-task-303",
      boardId: "board-seed-marketing",
      boardName: "Global Launch Campaign 2026",
      boardEmoji: "📈",
      boardColor: "hsl(350, 70%, 55%)",
      title: "Prepare Product Hunt launch assets and maker commentary",
      emoji: "🚀",
      description: "High-res dark/light screenshots and 60s walkthrough reel.",
      status: "todo",
      priority: "medium",
      assignedTo: sarah.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: sarah,
      dueDate: daysFromNowIso(4),
      progress: 25,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-social", name: "community", color: "#f59e0b" }],
      attachments: [],
      createdAt: daysFromNowIso(-4),
      updatedAt: hoursAgoIso(6),
    },
    {
      id: "seed-task-304",
      boardId: "board-seed-marketing",
      boardName: "Global Launch Campaign 2026",
      boardEmoji: "📈",
      boardColor: "hsl(350, 70%, 55%)",
      title: "Customer spotlight interview with Acme Corp engineering lead",
      emoji: "🎙️",
      description: "Highlight 40% faster sprint planning after migrating from legacy tools.",
      status: "done",
      priority: "medium",
      assignedTo: marcus.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: marcus,
      dueDate: daysFromNowIso(-3),
      progress: 100,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-case", name: "case-study", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-9),
      updatedAt: hoursAgoIso(15),
    },
    {
      id: "seed-task-305",
      boardId: "board-seed-marketing",
      boardName: "Global Launch Campaign 2026",
      boardEmoji: "📈",
      boardColor: "hsl(350, 70%, 55%)",
      title: "Configure UTM attribution pipeline for developer docs",
      emoji: "📊",
      description: "Track conversion from docs quickstart to workspace creation.",
      status: "in_progress",
      priority: "low",
      assignedTo: david.id,
      createdBy: sarah.id,
      creator: sarah,
      assignee: david,
      dueDate: daysFromNowIso(5),
      progress: 50,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-analytics", name: "analytics", color: "#8b5cf6" }],
      attachments: [],
      createdAt: daysFromNowIso(-3),
      updatedAt: hoursAgoIso(11),
    },

    // Board 4: Client Acme Corp (5 tasks)
    {
      id: "seed-task-401",
      boardId: "board-seed-client-acme",
      boardName: "Client: Acme Corp Enterprise Migration",
      boardEmoji: "🏢",
      boardColor: "hsl(25, 90%, 55%)",
      title: "Configure SAML 2.0 & Okta SCIM group provisioning",
      emoji: "🔑",
      description: "Map Okta engineering groups to Editor and Viewer board roles.",
      status: "in_progress",
      priority: "urgent",
      assignedTo: me.id,
      createdBy: marcus.id,
      creator: marcus,
      assignee: me,
      dueDate: daysFromNowIso(1),
      progress: 65,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-sso", name: "enterprise-sso", color: "#f97316" }],
      attachments: [],
      createdAt: daysFromNowIso(-5),
      updatedAt: hoursAgoIso(3),
    },
    {
      id: "seed-task-402",
      boardId: "board-seed-client-acme",
      boardName: "Client: Acme Corp Enterprise Migration",
      boardEmoji: "🏢",
      boardColor: "hsl(25, 90%, 55%)",
      title: "Dry-run import of 4,200 historical Jira tickets with attachments",
      emoji: "📦",
      description: "Validate custom status mapping and comment timestamp preservation.",
      status: "qa",
      priority: "high",
      assignedTo: marcus.id,
      createdBy: marcus.id,
      creator: marcus,
      assignee: marcus,
      dueDate: daysFromNowIso(2),
      progress: 85,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-mig", name: "migration", color: "#3b82f6" }],
      attachments: [],
      createdAt: daysFromNowIso(-6),
      updatedAt: hoursAgoIso(4),
    },
    {
      id: "seed-task-403",
      boardId: "board-seed-client-acme",
      boardName: "Client: Acme Corp Enterprise Migration",
      boardEmoji: "🏢",
      boardColor: "hsl(25, 90%, 55%)",
      title: "Deliver admin training workshop for 18 team leads",
      emoji: "🎓",
      description: "Walk through RBAC permissions, board pinning, and activity audit logs.",
      status: "todo",
      priority: "medium",
      assignedTo: me.id,
      createdBy: marcus.id,
      creator: marcus,
      assignee: me,
      dueDate: daysFromNowIso(4),
      progress: 20,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-onboarding", name: "enablement", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-3),
      updatedAt: hoursAgoIso(8),
    },
    {
      id: "seed-task-404",
      boardId: "board-seed-client-acme",
      boardName: "Client: Acme Corp Enterprise Migration",
      boardEmoji: "🏢",
      boardColor: "hsl(25, 90%, 55%)",
      title: "Sign off on dedicated VPC peering and allowlist CIDR blocks",
      emoji: "🌐",
      description: "Verified by Acme InfoSec and platform SRE team.",
      status: "done",
      priority: "high",
      assignedTo: elena.id,
      createdBy: marcus.id,
      creator: marcus,
      assignee: elena,
      dueDate: daysFromNowIso(-4),
      progress: 100,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-net", name: "networking", color: "#06b6d4" }],
      attachments: [],
      createdAt: daysFromNowIso(-10),
      updatedAt: hoursAgoIso(22),
    },
    {
      id: "seed-task-405",
      boardId: "board-seed-client-acme",
      boardName: "Client: Acme Corp Enterprise Migration",
      boardEmoji: "🏢",
      boardColor: "hsl(25, 90%, 55%)",
      title: "Set up automated weekly JSON export archive for compliance",
      emoji: "🗂️",
      description: "Uses /api/boards/:id/export endpoint.",
      status: "todo",
      priority: "low",
      assignedTo: marcus.id,
      createdBy: me.id,
      creator: me,
      assignee: marcus,
      dueDate: daysFromNowIso(9),
      progress: 0,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-compliance", name: "compliance", color: "#8b5cf6" }],
      attachments: [],
      createdAt: daysFromNowIso(-2),
      updatedAt: hoursAgoIso(10),
    },

    // Board 5: SOC2 Compliance (3 tasks)
    {
      id: "seed-task-501",
      boardId: "board-seed-security",
      boardName: "SOC2 Type II Compliance Audit",
      boardEmoji: "🛡️",
      boardColor: "hsl(280, 60%, 55%)",
      title: "Review Q3 third-party penetration test remediation report",
      emoji: "🕵️",
      description: "All high and medium findings closed and re-verified.",
      status: "in_progress",
      priority: "urgent",
      assignedTo: elena.id,
      createdBy: elena.id,
      creator: elena,
      assignee: elena,
      dueDate: daysFromNowIso(1),
      progress: 80,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-soc2", name: "soc2", color: "#8b5cf6" }],
      attachments: [],
      createdAt: daysFromNowIso(-7),
      updatedAt: hoursAgoIso(5),
    },
    {
      id: "seed-task-502",
      boardId: "board-seed-security",
      boardName: "SOC2 Type II Compliance Audit",
      boardEmoji: "🛡️",
      boardColor: "hsl(280, 60%, 55%)",
      title: "Export quarterly access control matrix across production boards",
      emoji: "📋",
      description: "Verify least-privilege role assignments.",
      status: "todo",
      priority: "medium",
      assignedTo: me.id,
      createdBy: elena.id,
      creator: elena,
      assignee: me,
      dueDate: daysFromNowIso(3),
      progress: 30,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-audit", name: "audit", color: "#ef4444" }],
      attachments: [],
      createdAt: daysFromNowIso(-4),
      updatedAt: hoursAgoIso(9),
    },
    {
      id: "seed-task-503",
      boardId: "board-seed-security",
      boardName: "SOC2 Type II Compliance Audit",
      boardEmoji: "🛡️",
      boardColor: "hsl(280, 60%, 55%)",
      title: "Verify automated Dependabot & container vulnerability scanning",
      emoji: "✅",
      description: "Zero critical CVEs across Python and Node dependencies.",
      status: "done",
      priority: "high",
      assignedTo: elena.id,
      createdBy: elena.id,
      creator: elena,
      assignee: elena,
      dueDate: daysFromNowIso(-5),
      progress: 100,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-sec", name: "security", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-11),
      updatedAt: hoursAgoIso(24),
    },

    // Board 6: Executive OKRs (3 tasks)
    {
      id: "seed-task-601",
      boardId: "board-seed-exec",
      boardName: "Executive OKRs & Quarterly Deck",
      boardEmoji: "🧭",
      boardColor: "hsl(190, 70%, 45%)",
      title: "Achieve 99.98% real-time collaboration uptime across regions",
      emoji: "🏆",
      description: "Tracked via synthetic Playwright & SSE probes.",
      status: "in_progress",
      priority: "high",
      assignedTo: david.id,
      createdBy: david.id,
      creator: david,
      assignee: david,
      dueDate: daysFromNowIso(6),
      progress: 92,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-okr", name: "okr", color: "#06b6d4" }],
      attachments: [],
      createdAt: daysFromNowIso(-14),
      updatedAt: hoursAgoIso(12),
    },
    {
      id: "seed-task-602",
      boardId: "board-seed-exec",
      boardName: "Executive OKRs & Quarterly Deck",
      boardEmoji: "🧭",
      boardColor: "hsl(190, 70%, 45%)",
      title: "Expand enterprise multi-board adoption to 150 active teams",
      emoji: "📈",
      description: "Driven by new role badges, filter tabs, and quick switcher pinning.",
      status: "in_progress",
      priority: "medium",
      assignedTo: sarah.id,
      createdBy: david.id,
      creator: david,
      assignee: sarah,
      dueDate: daysFromNowIso(10),
      progress: 78,
      position: 2,
      checklist: [],
      tags: [{ id: "tag-growth", name: "growth", color: "#10b981" }],
      attachments: [],
      createdAt: daysFromNowIso(-14),
      updatedAt: hoursAgoIso(16),
    },
    {
      id: "seed-task-603",
      boardId: "board-seed-exec",
      boardName: "Executive OKRs & Quarterly Deck",
      boardEmoji: "🧭",
      boardColor: "hsl(190, 70%, 45%)",
      title: "Close Series B data room metrics & financial model review",
      emoji: "💼",
      description: "Approved by board of directors.",
      status: "done",
      priority: "urgent",
      assignedTo: david.id,
      createdBy: david.id,
      creator: david,
      assignee: david,
      dueDate: daysFromNowIso(-6),
      progress: 100,
      position: 1,
      checklist: [],
      tags: [{ id: "tag-exec", name: "finance", color: "#f59e0b" }],
      attachments: [],
      createdAt: daysFromNowIso(-19),
      updatedAt: hoursAgoIso(30),
    },
  ];

  // If preset === "scale_stress", generate 18 additional boards + 36 additional tasks
  if (preset === "scale_stress") {
    const extraRoles: Array<"owner" | "admin" | "editor" | "commenter" | "viewer"> = [
      "owner",
      "editor",
      "admin",
      "viewer",
      "commenter",
      "owner",
    ];
    const extraColors = [
      "hsl(220, 80%, 56%)",
      "hsl(142, 60%, 45%)",
      "hsl(280, 60%, 55%)",
      "hsl(25, 90%, 55%)",
      "hsl(350, 70%, 55%)",
      "hsl(190, 70%, 45%)",
    ];
    const extraEmojis = ["⚡", "🛰️", "🧪", "📦", "🔮", "🛠️", "📱", "🌍", "🎯"];
    const contexts = [
      "Personal: Deep Work & Reading",
      "Client: Globex FinTech Redesign",
      "Company: Mobile iOS & Android Sprint",
      "Client: Initech Cloud Modernization",
      "Personal: Open Source Contributions",
      "Company: Customer Support Escalations",
      "Client: Soylent Supply Chain Portal",
      "Company: Data Warehouse & dbt Models",
      "Personal: Conference Talks 2026",
      "Client: Umbrella Biotech Lab Ops",
      "Company: Design Token Guild",
      "Client: Wayne Aerospace Telemetry",
      "Personal: Home Lab & Kubernetes",
      "Company: Developer Relations & Docs",
      "Client: Stark Energy Grid Dashboard",
      "Company: QA Automation & Playwright",
      "Personal: Side Project Incubator",
      "Client: Hooli Search Migration",
    ];

    contexts.forEach((title, idx) => {
      const role = extraRoles[idx % extraRoles.length];
      const isOwned = role === "owner";
      const owner = isOwned ? me : TEAMMATES[idx % TEAMMATES.length];
      const boardId = `board-seed-scale-${idx + 1}`;
      const boardColor = extraColors[idx % extraColors.length];
      const boardEmoji = extraEmojis[idx % extraEmojis.length];

      showcaseBoards.push({
        id: boardId,
        name: title,
        emoji: boardEmoji,
        description: `Scale-test workspace board #${idx + 7} (${role.toUpperCase()} access).`,
        color: boardColor,
        ownerId: owner.id,
        role,
        ownerCount: 1,
        taskCount: 2,
        columns: [
          { id: "todo", title: "To Do", emoji: "📝" },
          { id: "in_progress", title: "In Progress", emoji: "⚡" },
          { id: "done", title: "Done", emoji: "✅" },
        ],
        createdAt: daysFromNowIso(-(idx + 2)),
        updatedAt: hoursAgoIso(idx + 2),
      });

      showcaseTasks.push(
        {
          id: `seed-task-scale-${idx + 1}-a`,
          boardId,
          boardName: title,
          boardEmoji,
          boardColor,
          title: `Deliver milestone spec for ${title.split(":")[1]?.trim() || title}`,
          emoji: "📌",
          description: "Synthetic task generated by High-Volume Scale seed preset.",
          status: "in_progress",
          priority: idx % 3 === 0 ? "high" : "medium",
          assignedTo: me.id,
          createdBy: owner.id,
          creator: owner,
          assignee: me,
          dueDate: daysFromNowIso((idx % 7) - 1),
          progress: 50,
          position: 1,
          checklist: [],
          tags: [{ id: "tag-scale", name: "scale-seed", color: "#3b82f6" }],
          attachments: [],
          createdAt: daysFromNowIso(-3),
          updatedAt: hoursAgoIso(2),
        },
        {
          id: `seed-task-scale-${idx + 1}-b`,
          boardId,
          boardName: title,
          boardEmoji,
          boardColor,
          title: `Complete QA verification for ${title.split(":")[1]?.trim() || title}`,
          emoji: "✅",
          description: "Synthetic completed task for chart and velocity metrics.",
          status: "done",
          priority: "low",
          assignedTo: owner.id,
          createdBy: owner.id,
          creator: owner,
          assignee: owner,
          dueDate: daysFromNowIso(-2),
          progress: 100,
          position: 1,
          checklist: [],
          tags: [{ id: "tag-qa", name: "verified", color: "#10b981" }],
          attachments: [],
          createdAt: daysFromNowIso(-5),
          updatedAt: hoursAgoIso(5),
        }
      );
    });
  }

  // Trashed Tasks (for TrashDrawer preview)
  const trashedTasks: any[] = [
    {
      id: "seed-trash-1",
      boardId: "board-seed-platform",
      title: "Deprecated: Legacy polling fallback for board notifications",
      emoji: "🗑️",
      description: "Replaced by unified SSE broadcaster.",
      status: "backlog",
      priority: "low",
      progress: 0,
      attachments: [],
      isDeleted: true,
      deletedAt: hoursAgoIso(5),
      createdAt: daysFromNowIso(-12),
      updatedAt: hoursAgoIso(5),
    },
    {
      id: "seed-trash-2",
      boardId: "board-seed-design",
      title: "Old hardcoded purple bottom nav prototype",
      emoji: "🗑️",
      description: "Superseded by Neon Lime semantic theme token.",
      status: "todo",
      priority: "low",
      progress: 20,
      attachments: [],
      isDeleted: true,
      deletedAt: hoursAgoIso(12),
      createdAt: daysFromNowIso(-10),
      updatedAt: hoursAgoIso(12),
    },
  ];

  // Members per board
  const membersByBoard: Record<string, any[]> = {};
  showcaseBoards.forEach((b) => {
    membersByBoard[b.id] = [
      {
        id: `mem-${b.id}-me`,
        boardId: b.id,
        userId: me.id,
        role: b.role || "owner",
        status: "accepted",
        user: me,
        createdAt: b.createdAt,
      },
      {
        id: `mem-${b.id}-sarah`,
        boardId: b.id,
        userId: sarah.id,
        role: b.ownerId === sarah.id ? "owner" : "admin",
        status: "accepted",
        user: sarah,
        createdAt: b.createdAt,
      },
      {
        id: `mem-${b.id}-marcus`,
        boardId: b.id,
        userId: marcus.id,
        role: b.ownerId === marcus.id ? "owner" : "editor",
        status: "accepted",
        user: marcus,
        createdAt: b.createdAt,
      },
      {
        id: `mem-${b.id}-elena`,
        boardId: b.id,
        userId: elena.id,
        role: b.ownerId === elena.id ? "owner" : "commenter",
        status: "accepted",
        user: elena,
        createdAt: b.createdAt,
      },
    ];
  });

  // Comments by task
  const commentsByTask: Record<string, any[]> = {
    "seed-task-101": [
      {
        id: "seed-comment-1",
        taskId: "seed-task-101",
        userId: elena.id,
        user: elena,
        content:
          "Verified that `description` and `members` are completely omitted from `/api/boards/invitations` before acceptance. Great tenancy guard!",
        mentions: [],
        createdAt: hoursAgoIso(3),
      },
      {
        id: "seed-comment-2",
        taskId: "seed-task-101",
        userId: me.id,
        user: me,
        content:
          "Thanks @Elena Rostova! Also wired up the Report & Block Inviter flow so spam invites get declined in bulk.",
        mentions: [elena.id],
        createdAt: hoursAgoIso(2),
      },
    ],
    "seed-task-102": [
      {
        id: "seed-comment-3",
        taskId: "seed-task-102",
        userId: sarah.id,
        user: sarah,
        content:
          "Reconnect jitter looks super clean in the Dev Suite SSE telemetry log.",
        mentions: [],
        createdAt: hoursAgoIso(1),
      },
    ],
  };

  // Notes by board
  const notesByBoard: Record<string, any[]> = {
    "board-seed-platform": [
      {
        id: "seed-note-1",
        boardId: "board-seed-platform",
        userId: me.id,
        user: me,
        title: "Architecture Decision Record: In-Memory Seed Sandbox",
        content:
          "All frontend API calls pass through authenticatedFetch(). By intercepting requests when seedTakeoverPreset !== 'none', we can preview full multi-board datasets safely in memory without touching MySQL.",
        color: "#fef08a",
        createdAt: daysFromNowIso(-2),
        updatedAt: hoursAgoIso(2),
      },
      {
        id: "seed-note-2",
        boardId: "board-seed-platform",
        userId: sarah.id,
        user: sarah,
        title: "Q4 Release Checklist & SLA Targets",
        content:
          "1. Zero P0 regressions\n2. Sub-50ms p95 API response time\n3. 100% RBAC decorator coverage across routes",
        color: "#bbf7d0",
        createdAt: daysFromNowIso(-5),
        updatedAt: hoursAgoIso(6),
      },
    ],
    "board-seed-design": [
      {
        id: "seed-note-3",
        boardId: "board-seed-design",
        userId: me.id,
        user: me,
        title: "Colorway Token Spec — Neon Lime",
        content:
          "Primary accent uses high-visibility Neon Lime (--primary: 76 100% 50%) paired with deep zinc surfaces in dark mode.",
        color: "#e9d5ff",
        createdAt: daysFromNowIso(-4),
        updatedAt: hoursAgoIso(4),
      },
    ],
  };

  // Activities
  const activities: any[] = [
    {
      id: "seed-act-1",
      type: "update",
      taskTitle: "Implement SSE connection multiplexer with exponential backoff",
      message: 'Updated progress to 75% on "Implement SSE connection multiplexer"',
      timestamp: hoursAgoIso(1),
      userId: me.id,
      user: me,
    },
    {
      id: "seed-act-2",
      type: "move",
      taskTitle: "Enforce strict pre-acceptance invitation tenancy redaction",
      message: 'Moved "Enforce strict pre-acceptance invitation tenancy redaction" to Released',
      timestamp: hoursAgoIso(2),
      userId: me.id,
      user: me,
    },
    {
      id: "seed-act-3",
      type: "create",
      taskTitle: "Build in-memory Dev Suite Seed Takeover sandbox",
      message: 'Created task "Build in-memory Dev Suite Seed Takeover sandbox"',
      timestamp: hoursAgoIso(4),
      userId: sarah.id,
      user: sarah,
    },
    {
      id: "seed-act-4",
      type: "update",
      taskTitle: "Configure SAML 2.0 & Okta SCIM group provisioning",
      message: 'Assigned "Configure SAML 2.0 & Okta SCIM group provisioning" to Alex Rivera',
      timestamp: hoursAgoIso(6),
      userId: marcus.id,
      user: marcus,
    },
  ];

  // Notifications
  const notifications: any[] = [
    {
      id: "seed-notif-1",
      userId: me.id,
      type: "mention",
      title: "New Mention in Comment",
      message:
        'Elena Rostova mentioned you on "Enforce strict pre-acceptance invitation tenancy redaction"',
      link: "/boards/board-seed-platform/tasks/seed-task-101",
      isRead: false,
      createdAt: hoursAgoIso(1),
    },
    {
      id: "seed-notif-2",
      userId: me.id,
      type: "assignment",
      title: "Task Assigned to You",
      message:
        'Marcus Vance assigned you to "Configure SAML 2.0 & Okta SCIM group provisioning"',
      link: "/boards/board-seed-client-acme/tasks/seed-task-401",
      isRead: false,
      createdAt: hoursAgoIso(3),
    },
    {
      id: "seed-notif-3",
      userId: me.id,
      type: "invite_accepted",
      title: "Invitation Accepted",
      message: 'Sarah Chen accepted your invitation to "Design System v3 — Neon & Concentric"',
      link: "/boards/board-seed-design",
      isRead: true,
      createdAt: hoursAgoIso(12),
    },
  ];

  // Conversations & Messages
  const conversations: any[] = [
    {
      id: "seed-conv-1",
      title: "Core Platform & Design Guild",
      displayTitle: "Core Platform & Design Guild",
      type: "group",
      createdBy: me.id,
      otherUser: null,
      participants: [
        {
          id: "part-1",
          conversationId: "seed-conv-1",
          userId: me.id,
          user: me,
          role: "admin",
          joinedAt: daysFromNowIso(-10),
        },
        {
          id: "part-2",
          conversationId: "seed-conv-1",
          userId: sarah.id,
          user: sarah,
          role: "member",
          joinedAt: daysFromNowIso(-10),
        },
        {
          id: "part-3",
          conversationId: "seed-conv-1",
          userId: elena.id,
          user: elena,
          role: "member",
          joinedAt: daysFromNowIso(-9),
        },
      ],
      participantCount: 3,
      unreadCount: 2,
      lastMessageAt: hoursAgoIso(1),
      lastMessagePreview: "The new Neon Lime colorway and role badges look super sharp!",
      createdAt: daysFromNowIso(-10),
      updatedAt: hoursAgoIso(1),
    },
    {
      id: "seed-conv-2",
      title: null,
      displayTitle: sarah.fullName,
      type: "direct",
      createdBy: sarah.id,
      otherUser: sarah,
      participants: [
        {
          id: "part-4",
          conversationId: "seed-conv-2",
          userId: me.id,
          user: me,
          role: "member",
          joinedAt: daysFromNowIso(-7),
        },
        {
          id: "part-5",
          conversationId: "seed-conv-2",
          userId: sarah.id,
          user: sarah,
          role: "member",
          joinedAt: daysFromNowIso(-7),
        },
      ],
      participantCount: 2,
      unreadCount: 0,
      lastMessageAt: hoursAgoIso(4),
      lastMessagePreview: "Ready for the Q4 launch review at 3pm?",
      createdAt: daysFromNowIso(-7),
      updatedAt: hoursAgoIso(4),
    },
    {
      id: "seed-conv-3",
      title: null,
      displayTitle: marcus.fullName,
      type: "direct",
      createdBy: marcus.id,
      otherUser: marcus,
      participants: [
        {
          id: "part-6",
          conversationId: "seed-conv-3",
          userId: me.id,
          user: me,
          role: "member",
          joinedAt: daysFromNowIso(-5),
        },
        {
          id: "part-7",
          conversationId: "seed-conv-3",
          userId: marcus.id,
          user: marcus,
          role: "member",
          joinedAt: daysFromNowIso(-5),
        },
      ],
      participantCount: 2,
      unreadCount: 1,
      lastMessageAt: hoursAgoIso(2),
      lastMessagePreview: "Acme Corp SSO test passed in staging.",
      createdAt: daysFromNowIso(-5),
      updatedAt: hoursAgoIso(2),
    },
  ];

  const messagesByConversation: Record<string, any[]> = {
    "seed-conv-1": [
      {
        id: "seed-msg-1",
        conversationId: "seed-conv-1",
        senderId: sarah.id,
        sender: sarah,
        content: "Hey team! We just enabled the Predefined Seed Takeover in the Dev Suite.",
        attachments: [],
        reactions: { "🚀": [me.id, elena.id] },
        isPinned: true,
        isDeleted: false,
        createdAt: hoursAgoIso(3),
      },
      {
        id: "seed-msg-2",
        conversationId: "seed-conv-1",
        senderId: elena.id,
        sender: elena,
        content:
          "Awesome — it's completely isolated in memory so we can test all 6 roles and 24+ boards without touching the dev database.",
        attachments: [],
        reactions: { "💯": [me.id] },
        isPinned: false,
        isDeleted: false,
        createdAt: hoursAgoIso(2),
      },
      {
        id: "seed-msg-3",
        conversationId: "seed-conv-1",
        senderId: sarah.id,
        sender: sarah,
        content: "The new Neon Lime colorway and role badges look super sharp!",
        attachments: [],
        reactions: {},
        isPinned: false,
        isDeleted: false,
        createdAt: hoursAgoIso(1),
      },
    ],
    "seed-conv-2": [
      {
        id: "seed-msg-4",
        conversationId: "seed-conv-2",
        senderId: sarah.id,
        sender: sarah,
        content: "Ready for the Q4 launch review at 3pm?",
        attachments: [],
        reactions: { "👍": [me.id] },
        isPinned: false,
        isDeleted: false,
        createdAt: hoursAgoIso(4),
      },
    ],
    "seed-conv-3": [
      {
        id: "seed-msg-5",
        conversationId: "seed-conv-3",
        senderId: marcus.id,
        sender: marcus,
        content: "Acme Corp SSO test passed in staging.",
        attachments: [],
        reactions: {},
        isPinned: false,
        isDeleted: false,
        createdAt: hoursAgoIso(2),
      },
    ],
  };

  return {
    preset,
    userId: me.id,
    boards: showcaseBoards,
    tasks: showcaseTasks,
    trashedTasks,
    invitations: baseInvitations,
    membersByBoard,
    commentsByTask,
    notesByBoard,
    activities,
    notifications,
    conversations,
    messagesByConversation,
  };
}

function getOrInitStore(preset: SeedTakeoverPreset): SeedSandboxStore {
  const me = getCurrentAuthUser();
  if (
    !activeSandboxStore ||
    activeSandboxStore.preset !== preset ||
    activeSandboxStore.userId !== me.id
  ) {
    activeSandboxStore = buildSeedStore(preset, me);
  }
  return activeSandboxStore;
}

export function resetSeedSandboxStore(preset?: SeedTakeoverPreset): void {
  if (preset && preset !== "none") {
    activeSandboxStore = buildSeedStore(preset, getCurrentAuthUser());
  } else {
    activeSandboxStore = null;
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseBody(options: RequestInit): any {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
}

export function handleSeedTakeoverRequest(
  endpoint: string,
  options: RequestInit,
  preset: SeedTakeoverPreset
): Response | null {
  if (!preset || preset === "none") return null;

  const store = getOrInitStore(preset);
  const me = getCurrentAuthUser();
  const method = (options.method || "GET").toUpperCase();
  const [rawPath, queryString = ""] = endpoint.split("?");
  const params = new URLSearchParams(queryString);

  // 1. Pending Invitations: /boards/invitations
  if (rawPath === "/boards/invitations" && method === "GET") {
    return jsonResponse(store.invitations);
  }

  // Accept / Decline / Report Invitation: /boards/:boardId/invitations/:action
  const inviteActionMatch = rawPath.match(
    /^\/boards\/([^/]+)\/invitations\/(accept|decline|report)$/
  );
  if (inviteActionMatch && method === "POST") {
    const [, boardId, action] = inviteActionMatch;
    const inviteIdx = store.invitations.findIndex((i) => i.boardId === boardId);
    const invite = inviteIdx >= 0 ? store.invitations[inviteIdx] : null;

    if (action === "accept" && invite) {
      store.invitations.splice(inviteIdx, 1);
      const newBoard = {
        id: invite.board.id,
        name: invite.board.name,
        emoji: invite.board.emoji || "📋",
        description: "Joined via accepted invitation in Seed Sandbox.",
        color: invite.board.color || "hsl(220, 80%, 56%)",
        ownerId: invite.inviterId || "seed-user-sarah",
        role: invite.role || "editor",
        ownerCount: 1,
        taskCount: 0,
        columns: [
          { id: "todo", title: "To Do", emoji: "📝" },
          { id: "in_progress", title: "In Progress", emoji: "⚡" },
          { id: "done", title: "Done", emoji: "✅" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!store.boards.some((b) => b.id === newBoard.id)) {
        store.boards.unshift(newBoard);
      }
      return jsonResponse({
        id: `mem-${boardId}-${me.id}`,
        boardId,
        userId: me.id,
        role: invite.role,
        status: "accepted",
        createdAt: new Date().toISOString(),
      });
    }

    if (action === "decline" || action === "report") {
      if (invite) {
        if (action === "report" && invite.inviterId) {
          store.invitations = store.invitations.filter(
            (i) => i.inviterId !== invite.inviterId && i.boardId !== boardId
          );
        } else {
          store.invitations.splice(inviteIdx, 1);
        }
      }
      return jsonResponse({ message: `Invitation ${action}ed` });
    }
  }

  // 2. Boards list & create: /boards
  if (rawPath === "/boards") {
    if (method === "GET") {
      return jsonResponse(store.boards);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newBoard = {
        id: `board-seed-${Date.now()}`,
        name: body.name || "Untitled Board",
        emoji: body.emoji || "📋",
        description: body.description || "",
        color: body.color || "hsl(220, 80%, 56%)",
        heroImageUrl: body.heroImageUrl,
        ownerId: me.id,
        role: "owner",
        ownerCount: 1,
        taskCount: 0,
        columns: body.columns || [
          { id: "todo", title: "To Do", emoji: "📝" },
          { id: "in_progress", title: "In Progress", emoji: "⚡" },
          { id: "done", title: "Done", emoji: "✅" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.boards.unshift(newBoard);
      store.membersByBoard[newBoard.id] = [
        {
          id: `mem-${newBoard.id}-${me.id}`,
          boardId: newBoard.id,
          userId: me.id,
          role: "owner",
          status: "accepted",
          user: me,
          createdAt: newBoard.createdAt,
        },
      ];
      return jsonResponse(newBoard, 201);
    }
  }

  // 3. Single Board: /boards/:boardId
  const singleBoardMatch = rawPath.match(/^\/boards\/([^/]+)$/);
  if (singleBoardMatch && singleBoardMatch[1] !== "invitations") {
    const boardId = singleBoardMatch[1];
    const idx = store.boards.findIndex((b) => b.id === boardId);
    if (method === "GET") {
      if (idx === -1) return jsonResponse({ error: "Board not found" }, 404);
      return jsonResponse(store.boards[idx]);
    }
    if (method === "PATCH") {
      if (idx === -1) return jsonResponse({ error: "Board not found" }, 404);
      const body = parseBody(options);
      store.boards[idx] = {
        ...store.boards[idx],
        ...body,
        updatedAt: new Date().toISOString(),
      };
      return jsonResponse(store.boards[idx]);
    }
    if (method === "DELETE") {
      if (idx !== -1) {
        store.boards.splice(idx, 1);
        store.tasks = store.tasks.filter((t) => t.boardId !== boardId);
      }
      return jsonResponse({ message: "Deleted" });
    }
  }

  // 4. Board Members: /boards/:boardId/members
  const boardMembersMatch = rawPath.match(/^\/boards\/([^/]+)\/members$/);
  if (boardMembersMatch) {
    const boardId = boardMembersMatch[1];
    const list = store.membersByBoard[boardId] || [];
    if (method === "GET") {
      return jsonResponse(list);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newMem = {
        id: `mem-${Date.now()}`,
        boardId,
        userId: `user-${Date.now()}`,
        role: body.role || "editor",
        status: "pending",
        email: body.email,
        user: {
          id: `user-${Date.now()}`,
          email: body.email,
          fullName: body.email?.split("@")[0] || "Invited User",
        },
        createdAt: new Date().toISOString(),
        expiresAt: daysFromNowIso(7),
        isInvitation: true,
      };
      store.membersByBoard[boardId] = [...list, newMem];
      return jsonResponse(newMem, 201);
    }
  }

  // Member role update or remove: /boards/:boardId/members/:userId
  const singleMemberMatch = rawPath.match(/^\/boards\/([^/]+)\/members\/([^/]+)$/);
  if (singleMemberMatch) {
    const [, boardId, targetUserId] = singleMemberMatch;
    const list = store.membersByBoard[boardId] || [];
    if (method === "PATCH") {
      const body = parseBody(options);
      store.membersByBoard[boardId] = list.map((m) =>
        m.userId === targetUserId ? { ...m, role: body.role || m.role } : m
      );
      const updated = store.membersByBoard[boardId].find((m) => m.userId === targetUserId);
      return jsonResponse(updated || {});
    }
    if (method === "DELETE") {
      store.membersByBoard[boardId] = list.filter((m) => m.userId !== targetUserId);
      if (targetUserId === me.id) {
        store.boards = store.boards.filter((b) => b.id !== boardId);
      }
      return jsonResponse({ message: "Removed" });
    }
  }

  // 5. Board Trash: /boards/:boardId/trash
  const boardTrashMatch = rawPath.match(/^\/boards\/([^/]+)\/trash$/);
  if (boardTrashMatch) {
    const boardId = boardTrashMatch[1];
    if (method === "GET") {
      return jsonResponse(store.trashedTasks.filter((t) => t.boardId === boardId));
    }
    if (method === "DELETE") {
      store.trashedTasks = store.trashedTasks.filter((t) => t.boardId !== boardId);
      return jsonResponse({ message: "Trash emptied" });
    }
  }

  // 6. Board Notes: /boards/:boardId/notes and /notes/:noteId
  const boardNotesMatch = rawPath.match(/^\/boards\/([^/]+)\/notes$/);
  if (boardNotesMatch) {
    const boardId = boardNotesMatch[1];
    const list = store.notesByBoard[boardId] || [];
    if (method === "GET") {
      return jsonResponse(list);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newNote = {
        id: `seed-note-${Date.now()}`,
        boardId,
        userId: me.id,
        user: me,
        title: body.title || "Untitled Note",
        content: body.content || "",
        color: body.color || "#fef08a",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.notesByBoard[boardId] = [newNote, ...list];
      return jsonResponse(newNote, 201);
    }
  }

  const singleNoteMatch = rawPath.match(/^\/notes\/([^/]+)$/);
  if (singleNoteMatch) {
    const noteId = singleNoteMatch[1];
    for (const bId of Object.keys(store.notesByBoard)) {
      const list = store.notesByBoard[bId];
      const idx = list.findIndex((n) => n.id === noteId);
      if (idx !== -1) {
        if (method === "PATCH") {
          const body = parseBody(options);
          list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
          return jsonResponse(list[idx]);
        }
        if (method === "DELETE") {
          list.splice(idx, 1);
          return jsonResponse({ message: "Deleted" });
        }
      }
    }
    return jsonResponse({ error: "Note not found" }, 404);
  }

  // 7. Board Export: /boards/:boardId/export
  const boardExportMatch = rawPath.match(/^\/boards\/([^/]+)\/export$/);
  if (boardExportMatch && method === "GET") {
    const boardId = boardExportMatch[1];
    const board = store.boards.find((b) => b.id === boardId);
    const tasks = store.tasks.filter((t) => t.boardId === boardId);
    return jsonResponse({ board, tasks, exportedAt: new Date().toISOString() });
  }

  // 8. Tasks: /tasks, /tasks/reorder, /tasks/:id, /tasks/:id/restore, /tasks/:id/permanent
  if (rawPath === "/tasks") {
    if (method === "GET") {
      const boardId = params.get("boardId");
      const list = boardId
        ? store.tasks.filter((t) => t.boardId === boardId)
        : store.tasks;
      return jsonResponse(list);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const board = store.boards.find((b) => b.id === body.boardId);
      const newTask = {
        id: `seed-task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        boardId: body.boardId,
        boardName: board?.name,
        boardEmoji: board?.emoji,
        boardColor: board?.color,
        title: body.title || "Untitled Task",
        emoji: body.emoji || "📌",
        description: body.description || "",
        status: body.status || "todo",
        priority: body.priority || "medium",
        assignedTo: body.assignedTo ?? null,
        createdBy: me.id,
        creator: me,
        assignee: body.assignedTo === me.id ? me : null,
        dueDate: body.dueDate || null,
        progress: body.progress ?? 0,
        position: store.tasks.filter((t) => t.boardId === body.boardId).length + 1,
        checklist: body.checklist || [],
        tags: body.tags || [],
        attachments: body.attachments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.tasks.push(newTask);
      if (board) {
        board.taskCount = (board.taskCount || 0) + 1;
      }
      return jsonResponse(newTask, 201);
    }
  }

  if (rawPath === "/tasks/reorder" && method === "PATCH") {
    const body = parseBody(options);
    const items: Array<{ id: string; status?: string; position: number }> = body.items || [];
    const itemMap = new Map(items.map((i) => [i.id, i]));
    store.tasks = store.tasks.map((t) => {
      const match = itemMap.get(t.id);
      if (!match) return t;
      return {
        ...t,
        status: match.status || t.status,
        position: match.position,
        updatedAt: new Date().toISOString(),
      };
    });
    const boardTasks = store.tasks.filter((t) => t.boardId === body.boardId);
    return jsonResponse(boardTasks);
  }

  const taskRestoreMatch = rawPath.match(/^\/tasks\/([^/]+)\/restore$/);
  if (taskRestoreMatch && method === "PATCH") {
    const taskId = taskRestoreMatch[1];
    const idx = store.trashedTasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return jsonResponse({ error: "Task not found" }, 404);
    const [restored] = store.trashedTasks.splice(idx, 1);
    const activeTask = {
      ...restored,
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    store.tasks.push(activeTask);
    return jsonResponse(activeTask);
  }

  const taskPermanentMatch = rawPath.match(/^\/tasks\/([^/]+)\/permanent$/);
  if (taskPermanentMatch && method === "DELETE") {
    const taskId = taskPermanentMatch[1];
    store.trashedTasks = store.trashedTasks.filter((t) => t.id !== taskId);
    return jsonResponse({ message: "Permanently deleted" });
  }

  const taskCommentsMatch = rawPath.match(/^\/tasks\/([^/]+)\/comments$/);
  if (taskCommentsMatch) {
    const taskId = taskCommentsMatch[1];
    const list = store.commentsByTask[taskId] || [];
    if (method === "GET") {
      return jsonResponse(list);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newComment = {
        id: `seed-comment-${Date.now()}`,
        taskId,
        userId: me.id,
        user: me,
        content: body.content || "",
        mentions: [],
        createdAt: new Date().toISOString(),
      };
      store.commentsByTask[taskId] = [...list, newComment];
      return jsonResponse(newComment, 201);
    }
  }

  const singleCommentMatch = rawPath.match(/^\/comments\/([^/]+)$/);
  if (singleCommentMatch) {
    const commentId = singleCommentMatch[1];
    for (const tId of Object.keys(store.commentsByTask)) {
      const list = store.commentsByTask[tId];
      const idx = list.findIndex((c) => c.id === commentId);
      if (idx !== -1) {
        if (method === "PATCH") {
          const body = parseBody(options);
          list[idx] = {
            ...list[idx],
            content: body.content ?? list[idx].content,
            isEdited: true,
            updatedAt: new Date().toISOString(),
          };
          return jsonResponse(list[idx]);
        }
        if (method === "DELETE") {
          list.splice(idx, 1);
          return jsonResponse({ message: "Deleted" });
        }
      }
    }
    return jsonResponse({ error: "Comment not found" }, 404);
  }

  const singleTaskMatch = rawPath.match(/^\/tasks\/([^/]+)$/);
  if (singleTaskMatch) {
    const taskId = singleTaskMatch[1];
    const idx = store.tasks.findIndex((t) => t.id === taskId);
    if (method === "GET") {
      if (idx === -1) return jsonResponse({ error: "Task not found" }, 404);
      return jsonResponse(store.tasks[idx]);
    }
    if (method === "PATCH") {
      if (idx === -1) return jsonResponse({ error: "Task not found" }, 404);
      const body = parseBody(options);
      store.tasks[idx] = {
        ...store.tasks[idx],
        ...body,
        updatedAt: new Date().toISOString(),
      };
      return jsonResponse(store.tasks[idx]);
    }
    if (method === "DELETE") {
      if (idx !== -1) {
        const [removed] = store.tasks.splice(idx, 1);
        store.trashedTasks.unshift({
          ...removed,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
        });
        const board = store.boards.find((b) => b.id === removed.boardId);
        if (board && board.taskCount > 0) {
          board.taskCount -= 1;
        }
      }
      return jsonResponse({ message: "Task moved to trash" });
    }
  }

  // 9. Activities: /activities
  if (rawPath === "/activities") {
    if (method === "GET") {
      return jsonResponse(store.activities);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newAct = {
        id: `seed-act-${Date.now()}`,
        type: body.type || "update",
        taskTitle: body.taskTitle || "",
        message: body.message || "",
        timestamp: new Date().toISOString(),
        userId: me.id,
        user: me,
      };
      store.activities.unshift(newAct);
      return jsonResponse(newAct, 201);
    }
    if (method === "DELETE") {
      store.activities = [];
      return jsonResponse({ message: "Cleared" });
    }
  }

  // 10. Notifications: /notifications, /notifications/:id/read, /notifications/read-all
  if (rawPath === "/notifications" && method === "GET") {
    const unreadCount = store.notifications.filter((n) => !n.isRead).length;
    return jsonResponse({
      notifications: store.notifications,
      unreadCount,
    });
  }

  if (rawPath === "/notifications/read-all" && method === "PATCH") {
    store.notifications = store.notifications.map((n) => ({ ...n, isRead: true }));
    return jsonResponse({ message: "All marked as read" });
  }

  const notifReadMatch = rawPath.match(/^\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === "PATCH") {
    const notifId = notifReadMatch[1];
    store.notifications = store.notifications.map((n) =>
      n.id === notifId ? { ...n, isRead: true } : n
    );
    const target = store.notifications.find((n) => n.id === notifId);
    return jsonResponse(target || {});
  }

  // 11. Messages & Conversations
  if (rawPath === "/messages/unread-count" && method === "GET") {
    const unreadCount = store.conversations.reduce(
      (acc, c) => acc + (c.unreadCount || 0),
      0
    );
    return jsonResponse({ unreadCount });
  }

  if (rawPath === "/messages/conversations") {
    if (method === "GET") {
      return jsonResponse(store.conversations);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newConv = {
        id: `seed-conv-${Date.now()}`,
        title: body.title || null,
        displayTitle: body.title || "New Conversation",
        type: body.type || "group",
        createdBy: me.id,
        otherUser: null,
        participants: [
          {
            id: `part-${Date.now()}`,
            conversationId: `seed-conv-${Date.now()}`,
            userId: me.id,
            user: me,
            role: "admin",
            joinedAt: new Date().toISOString(),
          },
        ],
        participantCount: 1,
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: "Conversation started",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.conversations.unshift(newConv);
      store.messagesByConversation[newConv.id] = [];
      return jsonResponse(newConv, 201);
    }
  }

  const singleConvMatch = rawPath.match(/^\/messages\/conversations\/([^/]+)$/);
  if (singleConvMatch && method === "GET") {
    const convId = singleConvMatch[1];
    const conv = store.conversations.find((c) => c.id === convId);
    if (!conv) return jsonResponse({ error: "Conversation not found" }, 404);
    return jsonResponse(conv);
  }

  const convMessagesMatch = rawPath.match(/^\/messages\/conversations\/([^/]+)\/messages$/);
  if (convMessagesMatch) {
    const convId = convMessagesMatch[1];
    const list = store.messagesByConversation[convId] || [];
    if (method === "GET") {
      return jsonResponse(list);
    }
    if (method === "POST") {
      const body = parseBody(options);
      const newMsg = {
        id: `seed-msg-${Date.now()}`,
        conversationId: convId,
        senderId: me.id,
        sender: me,
        content: body.content || "",
        attachments: body.attachments || [],
        replyToId: body.replyToId || null,
        reactions: {},
        isPinned: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      store.messagesByConversation[convId] = [...list, newMsg];
      const conv = store.conversations.find((c) => c.id === convId);
      if (conv) {
        conv.lastMessageAt = newMsg.createdAt;
        conv.lastMessagePreview = newMsg.content;
      }
      return jsonResponse(newMsg, 201);
    }
  }

  const convReadMatch = rawPath.match(/^\/messages\/conversations\/([^/]+)\/read$/);
  if (convReadMatch && method === "POST") {
    const convId = convReadMatch[1];
    const conv = store.conversations.find((c) => c.id === convId);
    if (conv) conv.unreadCount = 0;
    return jsonResponse({ success: true, conversationId: convId });
  }

  return null;
}
