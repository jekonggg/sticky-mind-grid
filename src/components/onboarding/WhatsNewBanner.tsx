import { useState } from "react";
import { XClose } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import {
  WHATS_NEW_VERSION,
  useOnboarding,
} from "@/contexts/OnboardingContext";

export function WhatsNewBanner() {
  const { state, status, enabled, markEducation, openTour } = useOnboarding();
  const [busy, setBusy] = useState(false);

  if (!enabled || !state) return null;
  if (status === "not_started" || status === "in_progress") return null;
  if (state.tourBannerDismissed) return null;
  if ((state.whatsNewSeenVersion || 0) >= WHATS_NEW_VERSION) return null;

  const dismiss = async () => {
    setBusy(true);
    await markEducation(WHATS_NEW_VERSION, true);
    setBusy(false);
  };

  const takeTour = async () => {
    setBusy(true);
    await markEducation(WHATS_NEW_VERSION, false);
    setBusy(false);
    await openTour();
  };

  return (
    <section
      data-testid="whats-new-banner"
      aria-label="What's new"
      className="max-w-6xl mx-auto px-4 sm:px-6 w-full"
    >
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            What&apos;s new
          </p>
          <p className="text-sm font-bold">
            A guided setup that gets your first board moving
          </p>
          <p className="text-xs text-muted-foreground">
            Take a quick read-only tour. It never creates boards or tasks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            className="h-9 text-xs font-bold"
            disabled={busy}
            onClick={takeTour}
          >
            Take a quick tour
          </Button>
          <button
            type="button"
            aria-label="Dismiss what's new"
            disabled={busy}
            onClick={dismiss}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted min-h-9 min-w-9 flex items-center justify-center disabled:opacity-50"
          >
            <XClose className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
