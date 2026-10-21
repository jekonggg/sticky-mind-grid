import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  User01 as User,
  Palette,
  Bell01 as Bell,
  Sliders01 as Sliders,
  Globe01 as Globe,
  Shield01 as Shield,
  InfoCircle as Info,
  Settings01 as Settings,
  ArrowLeft,
  ChevronRight,
} from "@untitledui/icons";
import { SettingsTab, SettingsView } from "@/types/settings";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileTab } from "./tabs/ProfileTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { NotificationTab } from "./tabs/NotificationTab";
import { WorkflowTab } from "./tabs/WorkflowTab";
import { RegionTab } from "./tabs/RegionTab";
import { PrivacyTab } from "./tabs/PrivacyTab";
import { AboutTab } from "./tabs/AboutTab";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  /** Mobile only: start on the section index or directly on a section. */
  initialView?: SettingsView;
}

const TABS: {
  id: SettingsTab;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "profile",
    label: "Account Profile",
    description: "Name, avatar, email, and password",
    icon: User,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme, colorways, density, and motion",
    icon: Palette,
  },
  {
    id: "notifications",
    label: "Notifications & Sound",
    description: "Alerts, sound effects, and volume",
    icon: Bell,
  },
  {
    id: "workflow",
    label: "Task & Workflow",
    description: "Default board view, exports, and deletion",
    icon: Sliders,
  },
  {
    id: "region",
    label: "Language & Region",
    description: "Timezone, date format, and week start",
    icon: Globe,
  },
  {
    id: "privacy",
    label: "Privacy & Data",
    description: "Export data, sessions, and account deletion",
    icon: Shield,
  },
  {
    id: "about",
    label: "System & About",
    description: "Version, diagnostics, and developer tools",
    icon: Info,
  },
];

export function SettingsModal({
  open,
  onClose,
  initialTab = "profile",
  initialView = "list",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [mobileView, setMobileView] = useState<SettingsView>(initialView);
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset the requested pane before paint so opening a shortcut never flashes
  // the previously viewed mobile screen.
  useLayoutEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setMobileView(initialView);
    }
  }, [open, initialTab, initialView]);

  // Always start a newly selected section at the top of its scroll container.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab, mobileView]);

  // Global keybinding Ctrl+, or Cmd+, to toggle settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        if (open) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  const renderTabContent = () => (
    <>
      {activeTab === "profile" && <ProfileTab onClose={onClose} />}
      {activeTab === "appearance" && <AppearanceTab />}
      {activeTab === "notifications" && <NotificationTab />}
      {activeTab === "workflow" && <WorkflowTab />}
      {activeTab === "region" && <RegionTab />}
      {activeTab === "privacy" && <PrivacyTab />}
      {activeTab === "about" && <AboutTab />}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100%_-_1.5rem)] md:w-[95vw] h-[calc(100dvh_-_1.5rem)] md:h-[85vh] max-h-[calc(100dvh_-_1.5rem)] md:max-h-[720px] rounded-2xl p-0 gap-0 overflow-hidden flex bg-card border-border/80 shadow-2xl">
        <DialogTitle className="sr-only">Settings Dialog</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your system and user preferences
        </DialogDescription>

        {isMobile ? (
          mobileView === "list" ? (
            /* Mobile: settings section index */
            <div className="flex h-full min-h-0 w-full flex-col bg-card">
              <header className="flex shrink-0 items-center gap-2.5 border-b border-border/60 px-4 py-3 pr-12">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold leading-tight text-foreground">
                    Settings
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    Sticky Mind Grid
                  </p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 custom-scrollbar">
                <nav
                  aria-label="Settings sections"
                  className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card"
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileView("detail");
                        }}
                        className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-foreground">
                            {tab.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                            {tab.description}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          ) : (
            /* Mobile: selected section detail */
            <div className="flex h-full min-h-0 w-full flex-col bg-card">
              <header className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-3 py-2.5 pr-12">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to Settings"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold leading-tight text-foreground">
                    {activeTabMeta.label}
                  </h2>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {activeTabMeta.description}
                  </p>
                </div>
              </header>

              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto px-4 py-5 pb-8 custom-scrollbar bg-card"
              >
                {renderTabContent()}
              </div>
            </div>
          )
        ) : (
          <>
            {/* Desktop: persistent category sidebar */}
            <div className="w-60 shrink-0 bg-muted/30 border-r border-border/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Settings className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground leading-tight">Settings</h2>
                    <p className="text-[10px] text-muted-foreground">Sticky Mind Grid</p>
                  </div>
                </div>

                <nav aria-label="Settings sections" className="flex flex-col gap-1">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-left w-full ${
                          isActive
                            ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="px-3 py-2 text-[10px] text-muted-foreground/80 border-t border-border/40">
                <span>Press </span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">
                  Esc
                </kbd>
                <span> to close</span>
              </div>
            </div>

            {/* Desktop: section content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-card"
            >
              {renderTabContent()}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
