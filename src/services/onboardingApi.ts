import { authenticatedFetch } from "./apiUtils";
import {
  OnboardingState,
  RoleTipState,
  StarterTemplate,
} from "@/types/onboarding";

async function parseError(res: Response, fallback: string): Promise<Error> {
  const data = await res.json().catch(() => ({}));
  return new Error(data?.error || data?.message || fallback);
}

export const onboardingApi = {
  async getState(): Promise<OnboardingState> {
    const res = await authenticatedFetch("/users/me/onboarding");
    if (!res.ok) throw await parseError(res, "Failed to load onboarding");
    return res.json();
  },

  async start(
    template: StarterTemplate
  ): Promise<{ onboarding: OnboardingState; board: unknown }> {
    const res = await authenticatedFetch("/users/me/onboarding/start", {
      method: "POST",
      body: JSON.stringify({ template }),
    });
    if (!res.ok) throw await parseError(res, "Failed to start onboarding");
    return res.json();
  },

  async skip(reason: "question" | "checklist"): Promise<OnboardingState> {
    const res = await authenticatedFetch("/users/me/onboarding/skip", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw await parseError(res, "Failed to skip onboarding");
    const data = await res.json();
    return data.onboarding;
  },

  async markCoachMark(markId: string): Promise<OnboardingState> {
    const res = await authenticatedFetch(
      `/users/me/onboarding/coach-marks/${encodeURIComponent(markId)}/seen`,
      { method: "POST" }
    );
    if (!res.ok) throw await parseError(res, "Failed to save coach mark");
    const data = await res.json();
    return data.onboarding;
  },

  async markEducation(
    version: number,
    dismissBanner = false
  ): Promise<OnboardingState> {
    const res = await authenticatedFetch("/users/me/onboarding/education", {
      method: "POST",
      body: JSON.stringify({ version, dismissBanner }),
    });
    if (!res.ok) throw await parseError(res, "Failed to save education state");
    const data = await res.json();
    return data.onboarding;
  },

  async startReplay(): Promise<OnboardingState> {
    const res = await authenticatedFetch("/users/me/onboarding/replay", {
      method: "POST",
    });
    if (!res.ok) throw await parseError(res, "Failed to start tour");
    const data = await res.json();
    return data.onboarding;
  },

  async getRoleTip(boardId: string): Promise<RoleTipState | null> {
    const res = await authenticatedFetch(`/boards/${boardId}/role-tips`);
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw await parseError(res, "Failed to load role tip");
    return res.json();
  },

  async markRoleTipSeen(boardId: string): Promise<void> {
    const res = await authenticatedFetch(`/boards/${boardId}/role-tips/seen`, {
      method: "POST",
    });
    if (!res.ok) throw await parseError(res, "Failed to save role tip");
  },

  async markRoleChangeSeen(boardId: string): Promise<void> {
    const res = await authenticatedFetch(
      `/boards/${boardId}/role-tips/role-change/seen`,
      { method: "POST" }
    );
    if (!res.ok) throw await parseError(res, "Failed to save role change notice");
  },
};
