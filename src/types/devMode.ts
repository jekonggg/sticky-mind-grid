export type ChaosErrorMode = "none" | "500" | "403" | "401" | "network_error";

export type SimulatedRole = "none" | "owner" | "admin" | "member" | "viewer";

export type DevFontFamily =
  | "helvetica"
  | "inter"
  | "montserrat"
  | "fraunces"
  | "sora"
  | "inter_tight"
  | "satoshi";

export interface SseLogEntry {
  id: string;
  timestamp: string;
  event: string;
  payload: any;
}

export interface DevSettings {
  simulateSkeletonLoading: boolean;
  networkLatencyMs: number;
  chaosErrorMode: ChaosErrorMode;
  simulateEmptyState: boolean;
  simulatedRole: SimulatedRole;
  simulateSseDisconnect: boolean;
  forceReducedMotion: boolean;
  fontFamily: DevFontFamily;
}
