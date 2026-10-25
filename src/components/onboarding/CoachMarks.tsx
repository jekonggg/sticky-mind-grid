import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, XClose } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

interface CoachMarkDefinition {
  id: "board-columns" | "add-task" | "status-done";
  target: string;
  title: string;
  body: string;
}

const COACH_MARKS: CoachMarkDefinition[] = [
  {
    id: "board-columns",
    target: '[data-coach-target="board-columns"]',
    title: "Columns move your work forward",
    body: "Drag a card from one column to the next as work progresses.",
  },
  {
    id: "add-task",
    target: '[data-coach-target="add-task"]',
    title: "Add your first task",
    body: "Use Add Task to capture something you want to get done.",
  },
  {
    id: "status-done",
    target: '[data-coach-target="status-done"]',
    title: "Move work to Done",
    body: "Open a card and set Status to Done. Only the board's Done column completes a task.",
  },
];

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function findVisibleAnchor(selector: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return nodes.find(isVisible) || null;
}

export function CoachMarks() {
  const { state, status, markCoachMark, tourOpen } = useOnboarding();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 288, height: 168 });

  const activeMark = useMemo(() => {
    if (!state?.enabled || status !== "in_progress" || tourOpen) return null;
    const firstUnseen = (state.coachMarks || []).find((mark) => !mark.seen);
    if (!firstUnseen) return null;
    return COACH_MARKS.find((mark) => mark.id === firstUnseen.id) || null;
  }, [state?.enabled, state?.coachMarks, status, tourOpen]);

  const updatePosition = useCallback(() => {
    if (!activeMark) {
      setAnchor(null);
      setRect(null);
      return;
    }
    const nextAnchor = findVisibleAnchor(activeMark.target);
    setAnchor(nextAnchor);
    setRect(nextAnchor ? nextAnchor.getBoundingClientRect() : null);
  }, [activeMark]);

  useEffect(() => {
    updatePosition();
    if (!activeMark) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updatePosition();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const interval = window.setInterval(updatePosition, 800);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.clearInterval(interval);
    };
  }, [activeMark, updatePosition]);

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const measured = tooltipRef.current.getBoundingClientRect();
    if (measured.width && measured.height) {
      setTooltipSize((previous) =>
        Math.abs(previous.width - measured.width) > 2 ||
        Math.abs(previous.height - measured.height) > 2
          ? { width: measured.width, height: measured.height }
          : previous
      );
    }
  }, [activeMark?.id, rect]);

  useEffect(() => {
    if (!activeMark || !rect) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void markCoachMark(activeMark.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMark, rect, markCoachMark]);

  if (!activeMark || !rect || !anchor) return null;

  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(tooltipSize.width || 288, viewportWidth - margin * 2);
  const left = Math.max(
    margin,
    Math.min(rect.left + rect.width / 2 - width / 2, viewportWidth - width - margin)
  );
  const placeBelow = rect.bottom + margin + tooltipSize.height <= viewportHeight;
  const top = placeBelow
    ? rect.bottom + margin
    : Math.max(margin, rect.top - margin - tooltipSize.height);

  const dismiss = () => {
    void markCoachMark(activeMark.id);
  };

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="fixed z-[80] pointer-events-none rounded-xl border-2 border-primary ring-4 ring-primary/20 transition-all duration-200 motion-reduce:transition-none"
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-mark-title"
        className="fixed z-[81] rounded-xl border-2 border-border bg-popover text-popover-foreground shadow-2xl p-3.5"
        style={{ left, top, width }}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            id="coach-mark-title"
            className="text-sm font-extrabold leading-snug"
            aria-live="polite"
          >
            {activeMark.title}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss coach mark"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted min-h-8 min-w-8 flex items-center justify-center"
          >
            <XClose className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
          {activeMark.body}
        </p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={dismiss}
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs font-bold gap-1.5"
            onClick={dismiss}
            data-testid={`coach-mark-got-it-${activeMark.id}`}
          >
            <Check className="h-3.5 w-3.5" />
            Got it
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
