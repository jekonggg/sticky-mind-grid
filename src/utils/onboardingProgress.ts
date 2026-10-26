import { OnboardingState, OnboardingStep } from "@/types/onboarding";

export function optimisticallyCompleteOnboardingSteps(
  state: OnboardingState,
  stepKeys: OnboardingStep["key"][],
  completedAt = new Date().toISOString()
): OnboardingState {
  if (state.status !== "in_progress") return state;

  const completedKeys = new Set(stepKeys);
  const steps = state.steps.map((step) =>
    completedKeys.has(step.key)
      ? { ...step, completed: true, completedAt: step.completedAt || completedAt }
      : step
  );
  const progress = steps.length
    ? Math.round((steps.filter((step) => step.completed).length / steps.length) * 100)
    : state.progress;
  const isComplete = steps.length > 0 && steps.every((step) => step.completed);

  return {
    ...state,
    steps,
    progress,
    status: isComplete ? "completed" : state.status,
    completedAt: isComplete ? state.completedAt || completedAt : state.completedAt,
  };
}
