export type OnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped"
  | "not_applicable";

export type StarterTemplate = "personal" | "team" | "product" | "ideas";

export interface OnboardingStep {
  key: "board_created" | "task_created" | "task_completed";
  title: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
}

export interface OnboardingCoachMark {
  id: "board-columns" | "add-task" | "status-done";
  seen: boolean;
}

export interface OnboardingState {
  enabled: boolean;
  status: OnboardingStatus;
  template: StarterTemplate | null;
  starterBoardId: string | null;
  steps: OnboardingStep[];
  progress: number;
  coachMarks: OnboardingCoachMark[];
  whatsNewSeenVersion: number;
  tourBannerDismissed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  replayStartedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoleTip {
  role: "viewer" | "commenter" | "editor" | "admin" | "owner";
  title: string;
  body: string;
  can: string[];
  cannot: string[];
}

export interface RoleChangeNotice {
  fromRole: string;
  toRole: string;
  fromLabel: string;
  toLabel: string;
  title: string;
  message: string;
}

export interface RoleTipState {
  role: RoleTip["role"];
  roleLabel: string;
  tip: RoleTip | null;
  roleChange: RoleChangeNotice | null;
}
