import { useState } from "react";
import { userApi } from "@/services/userApi";
import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  Shield,
  Key,
  Smartphone,
  Loader2,
  FileJson,
  CheckCircle2,
} from "lucide-react";

export function PrivacyTab() {
  const { resetLocalSettings } = useSettings();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    try {
      setExporting(true);
      await userApi.exportUserData();
      toast.success("Account data exported successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to export data";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    resetLocalSettings();
    toast.success("Local preferences and application cache reset to default");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Privacy & Data Management</h3>
        <p className="text-xs text-muted-foreground">
          Download your personal workspace data and manage local client storage.
        </p>
      </div>

      {/* Export Data */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <FileJson className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-xs font-bold text-foreground">Export All User Data</h4>
            <p className="text-[11px] text-muted-foreground">
              Download a complete machine-readable JSON archive of all your owned boards, tasks, comments, notes, and activity history.
            </p>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
            className="h-8 text-xs font-bold gap-2"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download JSON Export
          </Button>
        </div>
      </div>

      {/* Security & Sessions Overview */}
      <div className="space-y-3 pt-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Account Security & Sessions
        </Label>

        <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Current Web Session
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                  Authenticated via JWT Token (24h validity)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active Now
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Two-Factor Authentication (2FA)
              </span>
              <span className="text-[11px] text-muted-foreground">
                TOTP Authenticator app integration planned for upcoming security release
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Local Storage & Cache Management */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground">
              Clear Client Storage
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Reset all local board view states, cached filters, and interface preferences.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Cache
          </Button>
        </div>
      </div>
    </div>
  );
}
