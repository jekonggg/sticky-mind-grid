export type ThemeMode = "light" | "dark" | "system";
export type UIDensity = "comfortable" | "compact";
export type BoardViewMode = "board" | "list" | "calendar" | "documents" | "overview";
export type DateFormatOption = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

export interface LocalPreferences {
  theme: ThemeMode;
  uiDensity: UIDensity;
  soundEffectsEnabled: boolean;
  soundVolume: number; // 0 to 1
  reducedMotion: boolean;
  autoProgressSnapping: boolean;
  confirmOnDelete: boolean;
}

export interface UserSyncedPreferences {
  defaultBoardView: BoardViewMode;
  timezone: string;
  dateFormat: DateFormatOption;
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  notifyMentions: boolean;
  notifyAssignments: boolean;
  notifyInvites: boolean;
  notifyComments: boolean;
}

export interface FullSettings extends LocalPreferences, UserSyncedPreferences {}

export type SettingsTab = 
  | "profile" 
  | "appearance" 
  | "notifications" 
  | "workflow" 
  | "region" 
  | "privacy" 
  | "about";
