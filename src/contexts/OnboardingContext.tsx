import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { onboardingApi } from "@/services/onboardingApi";
import {
  OnboardingState,
  StarterTemplate,
} from "@/types/onboarding";

export const WHATS_NEW_VERSION = 1;

interface OnboardingContextValue {
  state: OnboardingState | null;
  loading: boolean;
  error: Error | null;
  enabled: boolean;
  status: OnboardingState["status"] | null;
  refresh: () => Promise<unknown>;
  start: (template: StarterTemplate) => Promise<string | null>;
  skip: (reason: "question" | "checklist") => Promise<void>;
  markCoachMark: (markId: string) => Promise<void>;
  markEducation: (version: number, dismissBanner?: boolean) => Promise<void>;
  openTour: () => Promise<void>;
  closeTour: () => void;
  tourOpen: boolean;
  checklistOpen: boolean;
  setChecklistOpen: (open: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const defaultOnboardingValue: OnboardingContextValue = {
  state: null,
  loading: false,
  error: null,
  enabled: false,
  status: "not_applicable",
  refresh: async () => {},
  start: async () => null,
  skip: async () => {},
  markCoachMark: async () => {},
  markEducation: async () => {},
  openTour: async () => {},
  closeTour: () => {},
  tourOpen: false,
  checklistOpen: false,
  setChecklistOpen: () => {},
};

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  return context ?? defaultOnboardingValue;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const queryKey = useMemo(() => ["onboarding", user?.id], [user?.id]);

  const query = useQuery<OnboardingState>({
    queryKey,
    queryFn: () => onboardingApi.getState(),
    enabled: Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (current) => {
      const status = current.state.data?.status;
      return status === "in_progress" ? 15_000 : 60_000;
    },
  });

  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    };
    window.addEventListener("onboarding:invalidate", handleInvalidate);
    return () => window.removeEventListener("onboarding:invalidate", handleInvalidate);
  }, [queryClient]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("smg-onboarding");
    channelRef.current = channel;
    channel.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [queryClient]);

  const broadcastChange = useCallback(() => {
    channelRef.current?.postMessage({ type: "onboarding-updated" });
  }, []);

  const applyState = useCallback(
    (next: OnboardingState | undefined) => {
      if (!next) return;
      queryClient.setQueryData(queryKey, next);
      broadcastChange();
    },
    [broadcastChange, queryClient, queryKey]
  );

  const startMutation = useMutation({
    mutationFn: (template: StarterTemplate) => onboardingApi.start(template),
    onSuccess: (data) => {
      applyState(data.onboarding);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: (reason: "question" | "checklist") => onboardingApi.skip(reason),
    onSuccess: (next) => {
      applyState(next);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const coachMarkMutation = useMutation({
    mutationFn: (markId: string) => onboardingApi.markCoachMark(markId),
    onSuccess: (next) => applyState(next),
  });

  const educationMutation = useMutation({
    mutationFn: ({
      version,
      dismissBanner,
    }: {
      version: number;
      dismissBanner: boolean;
    }) => onboardingApi.markEducation(version, dismissBanner),
    onSuccess: (next) => applyState(next),
  });

  const replayMutation = useMutation({
    mutationFn: () => onboardingApi.startReplay(),
    onSuccess: (next) => applyState(next),
  });

  const start = useCallback(
    async (template: StarterTemplate) => {
      try {
        const data = await startMutation.mutateAsync(template);
        const board = data.board as { id?: string } | null;
        return board?.id || data.onboarding.starterBoardId || null;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start setup");
        return null;
      }
    },
    [startMutation]
  );

  const skip = useCallback(
    async (reason: "question" | "checklist") => {
      try {
        await skipMutation.mutateAsync(reason);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not skip setup");
      }
    },
    [skipMutation]
  );

  const markCoachMark = useCallback(
    async (markId: string) => {
      const previous = queryClient.getQueryData<OnboardingState>(queryKey);
      if (previous) {
        applyState({
          ...previous,
          coachMarks: previous.coachMarks.map((mark) =>
            mark.id === markId ? { ...mark, seen: true } : mark
          ),
        });
      }
      try {
        await coachMarkMutation.mutateAsync(markId);
      } catch {
        // Non-critical: refetch to reconcile if the write failed.
        queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      }
    },
    [applyState, coachMarkMutation, queryClient, queryKey]
  );

  const markEducation = useCallback(
    async (version: number, dismissBanner = false) => {
      try {
        await educationMutation.mutateAsync({ version, dismissBanner });
      } catch {
        // Education state must never block the app.
      }
    },
    [educationMutation]
  );

  const openTour = useCallback(async () => {
    if (query.data?.status === "in_progress") {
      setChecklistOpen(true);
      navigate("/");
      return;
    }
    setTourOpen(true);
    try {
      await replayMutation.mutateAsync();
    } catch {
      // The read-only tour still works if analytics/replay persistence fails.
    }
  }, [navigate, query.data?.status, replayMutation]);

  const closeTour = useCallback(() => setTourOpen(false), []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state: query.data ?? null,
      loading: query.isLoading,
      error: (query.error as Error | null) ?? null,
      enabled: Boolean(query.data?.enabled),
      status: query.data?.status ?? null,
      refresh: query.refetch,
      start,
      skip,
      markCoachMark,
      markEducation,
      openTour,
      closeTour,
      tourOpen,
      checklistOpen,
      setChecklistOpen,
    }),
    [
      query.data,
      query.isLoading,
      query.error,
      query.refetch,
      start,
      skip,
      markCoachMark,
      markEducation,
      openTour,
      closeTour,
      tourOpen,
      checklistOpen,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
