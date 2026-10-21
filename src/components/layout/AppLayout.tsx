import { useState, useEffect, useMemo, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LinkEmailModal } from "@/components/auth/LinkEmailModal";
import { AlertTriangle, XClose } from "@untitledui/icons";
import { AppSidebar } from "./AppSidebar";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CommandSearchDialog } from "@/components/search/CommandSearchDialog";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { BoardsOverviewSkeleton, BoardViewSkeleton } from "@/components/skeletons";

function AppLayoutFallback() {
  const location = useLocation();
  const isBoardRoute = location.pathname.startsWith("/boards/") && location.pathname !== "/boards";
  if (isBoardRoute) {
    return <BoardViewSkeleton />;
  }
  return <BoardsOverviewSkeleton />;
}

function AppLayoutInner() {
  const location = useLocation();
  const { user } = useAuth();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsBannerDismissed(sessionStorage.getItem(`dismiss_legacy_banner_${user.id}`) === "true");
    } else {
      setIsBannerDismissed(false);
    }
  }, [user?.id]);

  const deadlineInfo = useMemo(() => {
    // Only display for unverified accounts
    if (!user || user.emailVerified) return null;

    let deadline: Date;
    if (user.legacyDeadline) {
      deadline = new Date(user.legacyDeadline);
    } else {
      deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
    }

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const formattedDate = deadline.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    let urgency: "default" | "warning" | "high" | "critical" = "default";
    let bgClasses = "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200";
    let badgeClasses = "bg-amber-500/20 text-amber-700 dark:text-amber-300";

    if (diffDays <= 1) {
      urgency = "critical";
      bgClasses = "bg-destructive/15 border-destructive/40 text-destructive animate-pulse";
      badgeClasses = "bg-destructive text-destructive-foreground font-bold";
    } else if (diffDays <= 3) {
      urgency = "critical";
      bgClasses = "bg-red-500/15 border-red-500/30 text-red-900 dark:text-red-200";
      badgeClasses = "bg-red-500 text-white font-bold";
    } else if (diffDays <= 7) {
      urgency = "high";
      bgClasses = "bg-orange-500/15 border-orange-500/30 text-orange-900 dark:text-orange-200";
      badgeClasses = "bg-orange-500/20 text-orange-800 dark:text-orange-200 font-semibold";
    } else if (diffDays <= 14) {
      urgency = "warning";
      bgClasses = "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200";
      badgeClasses = "bg-amber-500/20 text-amber-800 dark:text-amber-200";
    }

    return {
      diffDays,
      formattedDate,
      urgency,
      bgClasses,
      badgeClasses,
    };
  }, [user]);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024 && window.innerWidth >= 768; // Default collapse on tablet
  });
  const { isMobileOpen, setIsMobileOpen } = useLayout();
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);

  // Close mobile navigation drawer automatically on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Responsive auto-collapse based on window size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        // Mobile: sidebar is handled by Sheet, no need to touch isCollapsed
      } else if (width >= 768 && width < 1024) {
        // Tablet: auto collapse if not explicitly set
        if (localStorage.getItem("sidebar_collapsed") === null) {
          setIsCollapsed(true);
        }
      } else {
        // Desktop: auto expand if not explicitly set
        if (localStorage.getItem("sidebar_collapsed") === null) {
          setIsCollapsed(false);
        }
      }
    };
    
    // Run once on mount to ensure correct initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcuts:
  // Ctrl+B / Cmd+B to toggle sidebar
  // Ctrl+K / Cmd+K to open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onOpenSearch={() => setIsCommandSearchOpen(true)}
        />
      </div>

      {/* Mobile Slide-Over Drawer */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" hideClose className="p-0 w-64 border-r border-border/60">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Workspace navigation drawer</SheetDescription>
          <AppSidebar
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileOpen(false)}
            onOpenSearch={() => {
              setIsMobileOpen(false);
              setIsCommandSearchOpen(true);
            }}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {user && !user.emailVerified && !isBannerDismissed && deadlineInfo && (
          <div
            className={`w-full px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm z-30 transition-colors ${deadlineInfo.bgClasses}`}
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Please link a verified email to keep your account secure.</strong>{" "}
                {deadlineInfo.diffDays > 0 ? (
                  <>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono mr-1 ${deadlineInfo.badgeClasses}`}>
                      {deadlineInfo.diffDays} {deadlineInfo.diffDays === 1 ? "day" : "days"} left
                    </span>
                    (Deadline: {deadlineInfo.formattedDate})
                  </>
                ) : (
                  <span className="font-bold underline text-destructive">Deadline expired</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs font-semibold px-2.5"
                onClick={() => setIsLinkModalOpen(true)}
              >
                Link Verified Email
              </Button>
              <button
                type="button"
                onClick={() => {
                  if (user?.id) {
                    sessionStorage.setItem(`dismiss_legacy_banner_${user.id}`, "true");
                  }
                  setIsBannerDismissed(true);
                }}
                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                title="Dismiss for this session"
                aria-label="Dismiss banner"
              >
                <XClose className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <Suspense fallback={<AppLayoutFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Legacy Link Email Dialog */}
      {user && (
        <LinkEmailModal
          open={isLinkModalOpen}
          onOpenChange={setIsLinkModalOpen}
          currentEmail={user.email}
        />
      )}

      {/* Global Command Palette */}
      <CommandSearchDialog
        open={isCommandSearchOpen}
        onOpenChange={setIsCommandSearchOpen}
      />
    </div>
  );
}

export function AppLayout() {
  return (
    <LayoutProvider>
      <AppLayoutInner />
    </LayoutProvider>
  );
}
