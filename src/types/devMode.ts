export type ChaosErrorMode = "none" | "500" | "403" | "401" | "network_error";

export type SimulatedRole = "none" | "owner" | "admin" | "editor" | "member" | "commenter" | "viewer";

export type SeedTakeoverPreset = "none" | "full_showcase" | "scale_stress" | "onboarding_invites";

export type DevFontFamily =
  | "helvetica"
  | "inter"
  | "montserrat"
  | "fraunces"
  | "sora"
  | "inter_tight"
  | "satoshi";

export type TaskModalLabelCase = "uppercase" | "capitalize";

export interface SseLogEntry {
  id: string;
  timestamp: string;
  event: string;
  payload: any;
}

export type { DevColumnColorStyle } from "@/constants/columnColors";

export interface DevSettings {
  simulateSkeletonLoading: boolean;
  networkLatencyMs: number;
  chaosErrorMode: ChaosErrorMode;
  simulateEmptyState: boolean;
  seedTakeoverPreset: SeedTakeoverPreset;
  simulatedRole: SimulatedRole;
  simulateSseDisconnect: boolean;
  forceReducedMotion: boolean;
  fontFamily: DevFontFamily;
  disableEmojiCustomization: boolean;
  customPadding?: number | null;
  customInnerRadius?: number | null;
  customOuterRadius?: number | null;
  columnColorStyle?: import("@/constants/columnColors").DevColumnColorStyle;
  taskModalHideLabelIcons?: boolean;
  taskModalLabelCase?: TaskModalLabelCase;
}
