import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { BottomNavBar } from "./BottomNavBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CommandSearchDialog } from "@/components/search/CommandSearchDialog";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";

function AppLayoutInner() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024 && window.innerWidth >= 768; // Default collapse on tablet
  });
  const { isMobileOpen, setIsMobileOpen } = useLayout();
  const [isCommandSearchOpen, setIsCommandSearchOpen] = useState(false);

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
        <SheetContent side="left" className="p-0 w-64 border-r border-border/60">
          <AppSidebar
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileOpen(false)}
            onOpenSearch={() => {
              setIsMobileOpen(false);
              setIsCommandSearchOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Mobile Bottom 5-Button Navigation Bar */}
      <BottomNavBar />

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
