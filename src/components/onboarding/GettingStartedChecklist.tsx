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

  if (!state?.enabled || status !== "in_progress") return null;

  const steps = state.steps || [];
  const completed = steps.filter((step) => step.completed).length;
  const targetBoardId = boardId || state.starterBoardId;
  const isOpen = variant === "card" ? true : checklistOpen;

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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            Getting started
          </p>
          <p className="text-xs font-bold text-foreground">
            {completed} of {steps.length || 3} done
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            data-testid="onboarding-skip-checklist"
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted/70 min-h-9 disabled:opacity-50"
          >
            {skipping ? "Skipping…" : "Skip"}
          </button>
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
            aria-valuenow={completed}
            aria-label="Setup progress"
          >
            <div
              className="h-full bg-primary transition-all duration-300 motion-reduce:transition-none"
              style={{
                width: `${steps.length ? (completed / steps.length) * 100 : 0}%`,
              }}
            />
          </div>

          <ol className="p-3 space-y-2">
            {steps.map((step, index) => {
              const isCurrent =
                !step.completed && steps.findIndex((candidate) => !candidate.completed) === index;
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
                      step.completed
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {step.completed ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-bold ${
                        step.completed ? "text-muted-foreground line-through" : "text-foreground"
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

          {targetBoardId && (
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
          )}
        </>
      )}
    </section>
  );
}
