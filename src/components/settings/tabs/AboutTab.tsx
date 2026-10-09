import { useState, useEffect } from "react";
import { userApi, SystemHealth } from "@/services/userApi";
import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useDevMode } from "@/contexts/DevModeContext";
import {
  Activity,
  CheckCircle as CheckCircle2,
  AlertTriangle,
  Server01 as Server,
  Database01 as Database,
  Signal01 as Radio,
  RefreshCw01 as RefreshCw,
  Loading01 as Loader2,
  Code01 as Code2,
  Stars01 as Sparkles,
  Sliders01 as Sliders,
} from "@untitledui/icons";

export function AboutTab() {
  const { settings, updateLocalSetting } = useSettings();
  const { setIsDevModalOpen, activeDevModesCount } = useDevMode();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await userApi.getHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: "degraded",
        database: "disconnected",
        version: "1.2.0",
        environment: "development",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">System & Diagnostics</h3>
        <p className="text-xs text-muted-foreground">
          System version information, backend service health, and real-time connectivity status.
        </p>
      </div>

      {/* App Branding Card */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/25">
            <div className="w-4 h-4 border-2 border-primary-foreground rounded-sm" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase italic tracking-tight text-foreground">
              Sticky Mind <span className="text-primary not-italic">Grid</span>
            </h4>
            <p className="text-[11px] text-muted-foreground font-medium">
              Collaborative visual task management platform
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          v{health?.version || "1.2.0"}
        </span>
      </div>

      {/* Live System Diagnostics */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Live System Health Diagnostics
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Backend API Status */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-primary" />
                Backend API
              </span>
              {health?.status === "healthy" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Flask REST</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {health?.status === "healthy" ? "Healthy (200)" : "Degraded"}
              </span>
            </div>
          </div>

          {/* Database Connectivity */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-primary" />
                Database Engine
              </span>
              {health?.database === "connected" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">SQLAlchemy ORM</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  health?.database === "connected"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {health?.database === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {/* SSE Real-Time Stream */}
          <div className="p-3.5 rounded-xl bg-card border border-border/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-primary" />
                Live Sync (SSE)
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Event Broadcaster</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active Stream
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Mode Suite (Hidden in Production) */}
      {import.meta.env.DEV && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-amber-500" />
                  Developer Mode Suite
                </Label>
                <Badge variant="outline" className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Dev Only
                </Badge>
                {activeDevModesCount > 0 && (
                  <Badge variant="default" className="text-[9px] bg-amber-500 text-white hover:bg-amber-600">
                    {activeDevModesCount} Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Simulate network latency, chaos error injection (500/403/401), RBAC role spoofing, SSE connection drops, and UI state freezes.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                <span>Shortcuts:</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-mono text-[9px] bg-background px-1 py-0.5 rounded border border-border/60">Ctrl + Alt + D</kbd>
                  <span>(Suite)</span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-mono text-[9px] bg-background px-1 py-0.5 rounded border border-border/60">Ctrl + Alt + S</kbd>
                  <span>(Freeze Skeletons)</span>
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsDevModalOpen(true)}
              className="h-8 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm shadow-amber-600/20"
            >
              <Sliders className="h-3.5 w-3.5" />
              Open Suite
            </Button>
          </div>
        </div>
      )}

      {/* Tech Stack Details */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Code2 className="h-4 w-4 text-primary" />
          <span>Technology & Architecture</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Powered by React 18, TypeScript, TailwindCSS, @dnd-kit, next-themes, Python Flask 3.0, and SQLAlchemy with multi-user Server-Sent Events real-time synchronization.
        </p>
      </div>
    </div>
  );
}
