import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Palette,
  Bell,
  Sliders,
  Globe,
  Shield,
  Info,
  Settings,
  LucideIcon,
} from "lucide-react";
import { SettingsTab } from "@/types/settings";
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
}

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Account Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications & Sound", icon: Bell },
  { id: "workflow", label: "Task & Workflow", icon: Sliders },
  { id: "region", label: "Language & Region", icon: Globe },
  { id: "privacy", label: "Privacy & Data", icon: Shield },
  { id: "about", label: "System & About", icon: Info },
];

export function SettingsModal({
  open,
  onClose,
  initialTab = "profile",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[720px] p-0 gap-0 overflow-hidden flex flex-col sm:flex-row bg-card border-border/80 shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Settings Dialog</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your system and user preferences
        </DialogDescription>
        {/* Left Navigation Sidebar */}
        <div className="w-full sm:w-60 shrink-0 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border/60 p-3 sm:p-4 flex flex-col justify-between">
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

            {/* Tab list */}
            <nav className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0 custom-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
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

          <div className="hidden sm:block px-3 py-2 text-[10px] text-muted-foreground/80 border-t border-border/40">
            <span>Press </span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">
              Esc
            </kbd>
            <span> to close</span>
          </div>
        </div>

        {/* Right Tab Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-card">
          {activeTab === "profile" && <ProfileTab onClose={onClose} />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "notifications" && <NotificationTab />}
          {activeTab === "workflow" && <WorkflowTab />}
          {activeTab === "region" && <RegionTab />}
          {activeTab === "privacy" && <PrivacyTab />}
          {activeTab === "about" && <AboutTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
