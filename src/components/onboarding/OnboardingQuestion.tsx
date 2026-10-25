import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, XClose } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { StarterTemplate } from "@/types/onboarding";

interface StarterChoice {
  id: StarterTemplate;
  emoji: string;
  title: string;
  description: string;
}

const STARTER_CHOICES: StarterChoice[] = [
  {
    id: "personal",
    emoji: "📌",
    title: "Personal tasks",
    description: "Keep a simple list of things you want to get done.",
  },
  {
    id: "team",
    emoji: "👥",
    title: "Team project",
    description: "Coordinate work with other people on a shared board.",
  },
  {
    id: "product",
    emoji: "🚀",
    title: "Product sprint",
    description: "Plan, build, review, and ship a sprint.",
  },
  {
    id: "ideas",
    emoji: "💡",
    title: "Ideas",
    description: "Capture ideas and move the good ones forward.",
  },
];

export function OnboardingQuestion({ onSkip }: { onSkip: () => void }) {
  const { start, skip } = useOnboarding();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<StarterTemplate | null>(null);
  const [starting, setStarting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleChoose = async (template: StarterTemplate) => {
    if (starting || skipping) return;
    setSelected(template);
    setStarting(true);
    const boardId = await start(template);
    setStarting(false);
    if (boardId) {
      navigate(`/boards/${boardId}`);
    }
  };

  const handleSkip = async () => {
    if (skipping || starting) return;
    setSkipping(true);
    await skip("question");
    setSkipping(false);
    onSkip();
  };

  return (
    <section
      data-testid="onboarding-question"
      aria-labelledby="onboarding-question-title"
      className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10"
    >
      <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-xl p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              Welcome
            </p>
            <h2
              id="onboarding-question-title"
              className="mt-1 text-xl sm:text-2xl font-black tracking-tight"
            >
              What are you here to do?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pick one and we&apos;ll set up a starter board. You can change everything later.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping || starting}
            aria-label="Skip setup"
            className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
          >
            <XClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_CHOICES.map((choice) => {
            const isSelected = selected === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoose(choice.id)}
                disabled={starting || skipping}
                aria-pressed={isSelected}
                data-testid={`onboarding-choice-${choice.id}`}
                className={`min-h-[92px] text-left rounded-xl border p-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background/70 hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className="flex items-start gap-3">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {choice.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-extrabold">{choice.title}</span>
                      {isSelected && starting && (
                        <span className="text-[10px] font-bold text-primary">Setting up…</span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {choice.description}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            One board, no extra questions. You can invite people later.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={skipping || starting}
            data-testid="onboarding-skip-question"
            className="self-start sm:self-auto min-h-10"
          >
            {skipping ? "Skipping…" : "Skip for now"}
          </Button>
        </div>
      </div>
    </section>
  );
}
