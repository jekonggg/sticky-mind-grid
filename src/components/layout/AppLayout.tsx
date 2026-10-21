import { useState, useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
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
        <Suspense fallback={<AppLayoutFallback />}>
          <Outlet />
        </Suspense>
      </main>

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
