import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, XClose } from "@untitledui/icons";

import { Button } from "@/components/ui/button";
import { onboardingApi } from "@/services/onboardingApi";

interface RoleTipBannerProps {
  boardId: string;
  isOwner: boolean;
}

export function RoleTipBanner({ boardId, isOwner }: RoleTipBannerProps) {
  const queryClient = useQueryClient();
  const queryKey = ["roleTip", boardId];

  const { data } = useQuery({
    queryKey,
    queryFn: () => onboardingApi.getRoleTip(boardId),
    enabled: Boolean(boardId) && !isOwner,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  const dismissMutation = useMutation({
    mutationFn: async (kind: "role-change" | "tip") => {
      if (kind === "role-change") {
        await onboardingApi.markRoleChangeSeen(boardId);
      } else {
        await onboardingApi.markRoleTipSeen(boardId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  if (isOwner || !data) return null;

  const notice = data.roleChange;
  const tip = data.tip;
  if (!notice && !tip) return null;

  const isNotice = Boolean(notice);
  const title = isNotice ? notice!.title : tip!.title;
  const body = isNotice ? notice!.message : tip!.body;

  return (
    <aside
      data-testid={isNotice ? "role-change-notice" : "role-tip-banner"}
      role="status"
      aria-live="polite"
      className="fixed z-30 left-3 right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:w-[22rem] md:top-20 md:bottom-auto rounded-xl border-2 border-border bg-popover text-popover-foreground shadow-2xl p-3.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            {isNotice ? "Role updated" : "Board access"}
          </p>
          <p className="mt-0.5 text-sm font-extrabold leading-snug">{title}</p>
        </div>
        <button
          type="button"
          aria-label={isNotice ? "Dismiss role change notice" : "Dismiss role tip"}
          onClick={() =>
            dismissMutation.mutate(isNotice ? "role-change" : "tip")
          }
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted min-h-8 min-w-8 flex items-center justify-center"
        >
          <XClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>

      {!isNotice && tip && (tip.can.length > 0 || tip.cannot.length > 0) && (
        <div className="mt-2.5 grid gap-1.5">
          {tip.can.length > 0 && (
            <ul className="space-y-1" aria-label="What you can do">
              {tip.can.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[11px] text-foreground">
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {tip.cannot.length > 0 && (
            <ul className="space-y-1" aria-label="What your role cannot do">
              {tip.cannot.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <XClose className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3 w-full h-8 text-xs font-bold"
        disabled={dismissMutation.isPending}
        onClick={() => dismissMutation.mutate(isNotice ? "role-change" : "tip")}
      >
        {dismissMutation.isPending ? "Saving…" : "Got it"}
      </Button>
    </aside>
  );
}
