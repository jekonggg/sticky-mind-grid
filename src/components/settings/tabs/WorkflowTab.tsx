import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Kanban,
  ListFilter,
  Calendar,
  FileText,
  LayoutDashboard,
  Percent,
  Trash2,
  Sliders,
  LucideIcon,
} from "lucide-react";
import { BoardViewMode } from "@/types/settings";

export function WorkflowTab() {
  const { settings, updateLocalSetting, updateSyncedSetting, isSyncing } =
    useSettings();

  const viewOptions: { value: BoardViewMode; label: string; icon: LucideIcon }[] = [
    { value: "board", label: "Kanban Columns (Default)", icon: Kanban },
    { value: "list", label: "Task List View", icon: ListFilter },
    { value: "calendar", label: "Calendar Schedule", icon: Calendar },
    { value: "documents", label: "Board Notes & Docs", icon: FileText },
    { value: "overview", label: "Analytics & Overview", icon: LayoutDashboard },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Task & Workflow Defaults</h3>
        <p className="text-xs text-muted-foreground">
          Configure default view modes, task snapping, and deletion safeguards.
        </p>
      </div>

      {/* Default Board View */}
      <div className="space-y-2.5 p-4 rounded-xl bg-muted/40 border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground">
              Default Board View
            </Label>
            <p className="text-[11px] text-muted-foreground">
              The primary view loaded when you open any board
            </p>
          </div>
          {isSyncing && (
            <span className="text-[10px] text-primary font-semibold animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        <Select
          value={settings.defaultBoardView}
          onValueChange={(val) =>
            updateSyncedSetting("defaultBoardView", val as BoardViewMode)
          }
        >
          <SelectTrigger className="h-9 text-xs bg-background">
            <SelectValue placeholder="Select default view" />
          </SelectTrigger>
          <SelectContent>
            {viewOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Auto-Progress Snapping */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mt-0.5">
              <Percent className="h-4 w-4" />
            </div>
            <div>
              <Label
                htmlFor="auto-progress"
                className="text-xs font-bold text-foreground cursor-pointer"
              >
                Auto-Progress Calculation
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Automatically snaps task progress to 0% (To Do), 30% (In Progress), and 100% (Done) when dragging between columns.
              </p>
            </div>
          </div>
          <Switch
            id="auto-progress"
            checked={settings.autoProgressSnapping}
            onCheckedChange={(checked) =>
              updateLocalSetting("autoProgressSnapping", checked)
            }
          />
        </div>

        {/* Confirm on Delete */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mt-0.5">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <Label
                htmlFor="confirm-delete"
                className="text-xs font-bold text-foreground cursor-pointer"
              >
                Delete Confirmation Prompts
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ask for confirmation before moving tasks or notes to trash.
              </p>
            </div>
          </div>
          <Switch
            id="confirm-delete"
            checked={settings.confirmOnDelete}
            onCheckedChange={(checked) =>
              updateLocalSetting("confirmOnDelete", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}
