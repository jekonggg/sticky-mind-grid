import { useEffect, useState } from "react";
import { Check } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnboarding } from "@/contexts/OnboardingContext";

export function OnboardingTourDialog() {
  const { tourOpen, closeTour, state } = useOnboarding();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (tourOpen) setIndex(0);
  }, [tourOpen]);

  if (!state || !tourOpen) return null;

  const steps = state.steps || [];
  const step = steps[index];

  return (
    <Dialog open={tourOpen} onOpenChange={(open) => !open && closeTour()}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Getting started tour</DialogTitle>
          <DialogDescription>
            A quick read-only tour. It never creates boards or tasks.
          </DialogDescription>
        </DialogHeader>

        {step && (
          <div className="py-2" aria-live="polite">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-black ${
                  step.completed
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-primary text-primary"
                }`}
              >
                {step.completed ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <p className="text-sm font-extrabold">{step.title}</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {step.key === "task_completed"
                ? "Move a card into your board's explicit Done column. Reaching 100% progress somewhere else does not count as done."
                : step.description}
            </p>
            <div className="mt-4 flex items-center gap-1.5" aria-label="Tour progress">
              {steps.map((candidate, stepIndex) => (
                <span
                  key={candidate.key}
                  className={`h-1.5 flex-1 rounded-full ${
                    stepIndex === index
                      ? "bg-primary"
                      : candidate.completed
                        ? "bg-emerald-500"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (index === 0 ? closeTour() : setIndex(index - 1))}
          >
            {index === 0 ? "Close" : "Back"}
          </Button>
          {index < steps.length - 1 ? (
            <Button type="button" onClick={() => setIndex(index + 1)}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={closeTour}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
