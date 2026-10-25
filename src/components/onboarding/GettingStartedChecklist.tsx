import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface GettingStartedChecklistProps {
  variant?: "card" | "floating";
  boardId?: string;
}

export function GettingStartedChecklist({
  variant = "card",
  boardId,
}: GettingStartedChecklistProps) {
  const { status, state, skip, checklistOpen, setChecklistOpen } = useOnboarding();
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("smg_onboarding_completed_dismissed") === "true";
  });

  if (!state?.enabled) return null;
  if (status !== "in_progress" && status !== "completed") return null;

  const steps = state.steps || [];
  const completed = steps.filter((step) => step.completed).length;
  const isAllDone = status === "completed" || (steps.length > 0 && completed === steps.length);

  if (isAllDone && dismissed) return null;

  const targetBoardId = boardId || state.starterBoardId;
  const isOpen = variant === "card" ? true : checklistOpen;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("smg_onboarding_completed_dismissed", "true");
    }
  };

  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    await skip("checklist");
    setSkipping(false);
  };

  const wrapperClass =
    variant === "floating"
      ? "fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-80 shadow-2xl"
      : "w-full";

  return (
    <section
      data-testid="getting-started-checklist"
      aria-label="Getting started checklist"
      className={`${wrapperClass} rounded-xl border border-primary/25 bg-card/95 backdrop-blur-md shadow-lg overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-border/50">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-black uppercase tracking-[0.16em] ${
              isAllDone ? "text-emerald-500" : "text-primary"
            }`}
          >
            {isAllDone ? "🎉 All Set!" : "Getting started"}
          </p>
          <p className="text-xs font-bold text-foreground">
            {isAllDone ? "Setup Complete (3/3)" : `${completed} of ${steps.length || 3} done`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAllDone ? (
            <button
              type="button"
              onClick={handleDismiss}
              data-testid="onboarding-dismiss-checklist"
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted/70 min-h-9"
            >
              Dismiss
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              data-testid="onboarding-skip-checklist"
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted/70 min-h-9 disabled:opacity-50"
            >
              {skipping ? "Skipping…" : "Skip"}
            </button>
          )}
          {variant === "floating" && (
            <button
              type="button"
              onClick={() => setChecklistOpen(!checklistOpen)}
              aria-expanded={checklistOpen}
              aria-label={checklistOpen ? "Collapse setup checklist" : "Expand setup checklist"}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 min-h-9 min-w-9 flex items-center justify-center"
            >
              {checklistOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <>
          <div
            className="h-1 bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length || 3}
            aria-valuenow={isAllDone ? (steps.length || 3) : completed}
            aria-label="Setup progress"
          >
            <div
              className={`h-full transition-all duration-300 motion-reduce:transition-none ${
                isAllDone ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{
                width: isAllDone
                  ? "100%"
                  : `${steps.length ? (completed / steps.length) * 100 : 0}%`,
              }}
            />
          </div>

          {isAllDone && (
            <div className="p-3 bg-emerald-500/10 border-b border-border/40 text-emerald-950 dark:text-emerald-100 flex items-start gap-2.5">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                <Check className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">You completed onboarding!</p>
                <p className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Great job! You've learned how to create boards, add tasks, and manage workflows.
                </p>
              </div>
            </div>
          )}

          <ol className="p-3 space-y-2">
            {steps.map((step, index) => {
              const stepCompleted = isAllDone || step.completed;
              const isCurrent =
                !stepCompleted && steps.findIndex((candidate) => !candidate.completed) === index;
              return (
                <li
                  key={step.key}
                  className={`flex items-start gap-2.5 rounded-lg px-2 py-2 ${
                    isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-black ${
                      stepCompleted
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {stepCompleted ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-bold ${
                        stepCompleted ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      {step.key === "task_completed"
                        ? "Only a card in your board's Done column counts."
                        : step.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {isAllDone ? (
            <div className="px-3 pb-3">
              <Button
                type="button"
                size="sm"
                className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleDismiss}
              >
                Done • Got it!
              </Button>
            </div>
          ) : targetBoardId ? (
            <div className="px-3 pb-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-9 text-xs font-bold"
                onClick={() => navigate(`/boards/${targetBoardId}`)}
              >
                Open starter board
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
