import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDevMode } from "@/contexts/DevModeContext";
import { ChaosErrorMode, SimulatedRole } from "@/types/devMode";
import { taskApi } from "@/services/api";
import { Tag } from "@/types/task";
import { toast } from "sonner";
import {
  Sparkles,
  Wifi,
  WifiOff,
  Shield,
  Radio,
  Sliders,
  RotateCcw,
  Zap,
  Flame,
  UserCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Layers,
  Activity,
  PlusCircle,
} from "lucide-react";

export function DevSuiteModal() {
  const {
    devSettings,
    updateDevSetting,
    resetDevSettings,
    isDevModalOpen,
    setIsDevModalOpen,
    sseLogs,
    clearSseLogs,
    activeDevModesCount,
  } = useDevMode();

  const [activeTab, setActiveTab] = useState("network");
  const [isSeeding, setIsSeeding] = useState(false);

  // Helper to extract active board ID from URL if currently viewing a board
  const getCurrentBoardId = () => {
    const match = window.location.pathname.match(/\/boards\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleSeedStressTasks = async () => {
    const boardId = getCurrentBoardId();
    if (!boardId) {
      toast.error("Please open a board to seed stress-test tasks.");
      return;
    }

    setIsSeeding(true);
    try {
      const titles = [
        "Audit zero-trust network boundaries",
        "Refactor SSE event broadcast backpressure",
        "Implement WebGPU canvas chart renderer",
        "Benchmark SQLite vs PyMySQL memory pool",
        "Optimize React reconciliation tree",
        "Verify RBAC permission decorator isolation",
        "Investigate cumulative layout shift on mount",
        "Add automated Playwright smoke spec",
        "Profile garbage collection allocations",
        "Stress test WebSocket connection failover",
      ];
      const priorities: Array<"low" | "medium" | "high" | "urgent"> = [
        "low",
        "medium",
        "high",
        "urgent",
      ];
      const tagsList: Tag[][] = [
        [
          { id: "tag-infra", name: "infra", color: "#3b82f6" },
          { id: "tag-security", name: "security", color: "#ef4444" },
        ],
        [
          { id: "tag-frontend", name: "frontend", color: "#10b981" },
          { id: "tag-perf", name: "perf", color: "#8b5cf6" },
        ],
        [
          { id: "tag-backend", name: "backend", color: "#f59e0b" },
          { id: "tag-api", name: "api", color: "#06b6d4" },
        ],
        [
          { id: "tag-qa", name: "qa", color: "#ec4899" },
          { id: "tag-e2e", name: "e2e", color: "#6366f1" },
        ],
        [
          { id: "tag-database", name: "database", color: "#14b8a6" },
          { id: "tag-migration", name: "migration", color: "#f97316" },
        ],
      ];

      for (let i = 1; i <= 15; i++) {
        const title = `${titles[i % titles.length]} (#${i})`;
        const priority = priorities[i % priorities.length];
        const tags = tagsList[i % tagsList.length];

        await taskApi.createTask({
          boardId,
          title,
          description: `DevMode stress-test synthetic task for performance benchmarking. Index ${i}.`,
          status: "todo",
          priority,
          progress: Math.floor(Math.random() * 100),
          tags,
          emoji: "🧪",
        });
      }

      toast.success("Successfully seeded 15 stress-test tasks into active board!");
      // Trigger soft reload or realtime event
      window.dispatchEvent(new Event("task-updated"));
    } catch (err: any) {
      toast.error(`Failed to seed tasks: ${err.message || "Unknown error"}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const copyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("JSON copied to clipboard");
  };

  return (
    <Dialog open={isDevModalOpen} onOpenChange={setIsDevModalOpen}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl h-[88dvh] sm:h-auto sm:max-h-[85vh] max-h-[88dvh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-amber-500/30 shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/40 shrink-0">
                <Sliders className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <DialogTitle className="text-sm sm:text-base font-black tracking-tight truncate">
                    Developer Mode Suite
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9px] sm:text-[10px] font-mono font-bold shrink-0"
                  >
                    DEV ONLY
                  </Badge>
                  {activeDevModesCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] h-4.5 sm:h-5 px-1.5 font-bold shrink-0">
                      {activeDevModesCount} Active
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Live latency injection, error simulation, RBAC role preview & real-time telemetry.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={resetDevSettings}
              className="h-7 sm:h-8 text-xs font-semibold gap-1 sm:gap-1.5 px-2.5 sm:px-3 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset All</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 sm:px-5 pt-2 sm:pt-3 border-b border-border/40 bg-muted/10 shrink-0 overflow-x-auto custom-scrollbar">
            <TabsList className="flex sm:grid sm:grid-cols-4 w-max sm:w-full bg-muted/40 p-1 gap-1 min-w-full">
              <TabsTrigger value="network" className="text-xs font-bold gap-1.5 py-1.5 px-3 whitespace-nowrap shrink-0">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>Skeletons & Network</span>
              </TabsTrigger>
              <TabsTrigger value="rbac" className="text-xs font-bold gap-1.5 py-1.5 px-3 whitespace-nowrap shrink-0">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Role Preview</span>
              </TabsTrigger>
              <TabsTrigger value="sse" className="text-xs font-bold gap-1.5 py-1.5 px-3 whitespace-nowrap shrink-0">
                <Radio className="h-3.5 w-3.5 shrink-0" />
                <span>Real-Time SSE</span>
              </TabsTrigger>
              <TabsTrigger value="sandbox" className="text-xs font-bold gap-1.5 py-1.5 px-3 whitespace-nowrap shrink-0">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span>Helpers & Stress</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar min-h-0 overscroll-contain">
            {/* TAB 1: Skeletons & Network */}
            <TabsContent value="network" className="space-y-4 m-0">
              {/* 1. Skeleton Loading Simulation */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-bold text-foreground">
                        Freeze Skeleton Loading
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Freezes all views in skeleton loading state. Shortcut:{" "}
                      <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold">
                        Ctrl + Alt + S
                      </kbd>
                    </p>
                  </div>
                  <Switch
                    checked={devSettings.simulateSkeletonLoading}
                    onCheckedChange={(checked) =>
                      updateDevSetting("simulateSkeletonLoading", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* 2. Network Latency Throttling */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">
                        Network Latency Throttling
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs font-bold bg-background/80"
                    >
                      {devSettings.networkLatencyMs === 0
                        ? "Off (0ms)"
                        : `${devSettings.networkLatencyMs}ms Delay`}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Artificially delays all <code className="text-xs">authenticatedFetch</code> calls
                    to observe real skeleton-to-content transitions.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "Off (0ms)", val: 0 },
                      { label: "Fast 3G (500ms)", val: 500 },
                      { label: "Slow 3G (1.5s)", val: 1500 },
                      { label: "High Latency (3s)", val: 3000 },
                    ].map((preset) => (
                      <Button
                        key={preset.val}
                        size="sm"
                        variant={devSettings.networkLatencyMs === preset.val ? "default" : "outline"}
                        className="h-7 text-xs font-bold"
                        onClick={() => updateDevSetting("networkLatencyMs", preset.val)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Slider
                      value={[devSettings.networkLatencyMs]}
                      min={0}
                      max={5000}
                      step={100}
                      onValueChange={([val]) => updateDevSetting("networkLatencyMs", val)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Chaos / API Error Injection */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-bold text-foreground">
                        Chaos / API Error Injection
                      </span>
                    </div>
                    {devSettings.chaosErrorMode !== "none" && (
                      <Badge variant="destructive" className="text-[10px] font-bold uppercase">
                        Active ({devSettings.chaosErrorMode})
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Intercepts API calls with simulated server failures to test optimistic UI
                    rollbacks and error toast resilience in <code className="text-xs">useTasks</code>.
                  </p>

                  <Select
                    value={devSettings.chaosErrorMode}
                    onValueChange={(v) =>
                      updateDevSetting("chaosErrorMode", v as ChaosErrorMode)
                    }
                  >
                    <SelectTrigger className="w-full bg-background/80">
                      <SelectValue placeholder="Select error simulation mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal (No simulated errors)</SelectItem>
                      <SelectItem value="500">500 Internal Server Error</SelectItem>
                      <SelectItem value="403">403 Forbidden Access</SelectItem>
                      <SelectItem value="401">401 Unauthorized (Auto-Logout)</SelectItem>
                      <SelectItem value="network_error">Offline / Network Failure</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* 4. Simulate Empty State */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground">
                      Simulate Empty Data State
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Forces boards and tasks API queries to return empty arrays <code className="text-xs">[]</code> to test onboarding and zero-data states.
                    </p>
                  </div>
                  <Switch
                    checked={devSettings.simulateEmptyState}
                    onCheckedChange={(checked) =>
                      updateDevSetting("simulateEmptyState", checked)
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: RBAC Role Preview */}
            <TabsContent value="rbac" className="space-y-4 m-0">
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Board RBAC Role Spoofing
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Preview board UI permissions without switching user accounts. Strictly client-side via <code className="text-xs">useBoardPermissions</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        role: "none",
                        title: "Actual Role (Live)",
                        desc: "Uses real database membership",
                        icon: UserCheck,
                      },
                      {
                        role: "owner",
                        title: "Owner 👑",
                        desc: "Full board deletion, invite & edit",
                        icon: Shield,
                      },
                      {
                        role: "admin",
                        title: "Admin 🛡️",
                        desc: "Manage members, tasks & columns",
                        icon: Shield,
                      },
                      {
                        role: "member",
                        title: "Member 👤",
                        desc: "Create, move & edit own tasks",
                        icon: CheckCircle2,
                      },
                      {
                        role: "viewer",
                        title: "Viewer 👁️",
                        desc: "Read-only. DND & edits disabled",
                        icon: Eye,
                      },
                    ].map((item) => (
                      <div
                        key={item.role}
                        onClick={() =>
                          updateDevSetting("simulatedRole", item.role as SimulatedRole)
                        }
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          devSettings.simulatedRole === item.role
                            ? "bg-primary/10 border-primary shadow-xs"
                            : "bg-background/80 border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <item.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>{item.title}</span>
                            {devSettings.simulatedRole === item.role && (
                              <Badge className="text-[9px] h-4 px-1 bg-primary">Active</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Permission breakdown matrix */}
                  <div className="p-3.5 rounded-xl bg-background border border-border/60 text-xs space-y-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Current Simulated Permissions:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {devSettings.simulatedRole === "viewer" ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                        <span>Drag & Drop Task Movement</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {devSettings.simulatedRole === "viewer" ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                        <span>Create & Edit Tasks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {devSettings.simulatedRole === "owner" ||
                        devSettings.simulatedRole === "admin" ||
                        devSettings.simulatedRole === "none" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span>Invite & Manage Members</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {devSettings.simulatedRole === "owner" ||
                        devSettings.simulatedRole === "none" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span>Permanent Board Deletion</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Real-Time SSE */}
            <TabsContent value="sse" className="space-y-4 m-0">
              {/* SSE Disconnect Simulation */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {devSettings.simulateSseDisconnect ? (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Activity className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-bold text-foreground">
                        Simulate Real-Time SSE Drop
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Disconnects the Server-Sent Events stream to test backoff reconnection and offline resilience.
                    </p>
                  </div>
                  <Switch
                    checked={devSettings.simulateSseDisconnect}
                    onCheckedChange={(checked) =>
                      updateDevSetting("simulateSseDisconnect", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* SSE Live Telemetry Log */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">
                        Recent SSE Event Stream ({sseLogs.length})
                      </span>
                    </div>
                    {sseLogs.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearSseLogs}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Clear</span>
                      </Button>
                    )}
                  </div>

                  {sseLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                      No SSE events captured in this session yet. Perform task actions or open boards to view live payloads.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {sseLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-lg bg-background border border-border/60 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                {log.event}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {log.timestamp}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyJson(log.payload)}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Copy JSON payload"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <pre className="text-[10px] font-mono bg-muted/40 p-2 rounded max-h-24 overflow-x-auto text-muted-foreground">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Helpers & Stress Testing */}
            <TabsContent value="sandbox" className="space-y-4 m-0">
              {/* Force Reduced Motion */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground">
                      Force Reduced Motion
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Disables all shimmer animations and Framer Motion transitions to test accessibility (<code className="text-xs">motion-reduce</code>).
                    </p>
                  </div>
                  <Switch
                    checked={devSettings.forceReducedMotion}
                    onCheckedChange={(checked) =>
                      updateDevSetting("forceReducedMotion", checked)
                    }
                  />
                </CardContent>
              </Card>

              {/* Stress-Test Task Seeder */}
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Stress-Test Dataset Generator
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instantly generates 15 synthetic tasks with diverse tags, priorities, and progress values into the active board to benchmark performance.
                    </p>
                  </div>

                  <Button
                    onClick={handleSeedStressTasks}
                    disabled={isSeeding}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{isSeeding ? "Generating Tasks..." : "Seed 15 Stress Tasks in Active Board"}</span>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
