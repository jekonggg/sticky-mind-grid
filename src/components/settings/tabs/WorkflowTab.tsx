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
  Columns03 as Kanban,
  FilterLines as ListFilter,
  Calendar,
  File06 as FileText,
  LayoutGrid01 as LayoutDashboard,
  Trash01 as Trash2,
  Sliders01 as Sliders,
} from "@untitledui/icons";
import { BoardViewMode, ExportFormat } from "@/types/settings";

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
          Configure default board view mode, export file format, and deletion safeguards.
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

      {/* Preferred Export Format */}
      <div className="space-y-2.5 p-4 rounded-xl bg-muted/40 border border-border/50">
        <div>
          <Label className="text-xs font-bold text-foreground">
            Preferred Export File Format
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Choose default file format for exporting board data and task lists
          </p>
        </div>

        <Select
          value={settings.exportFormat || "csv"}
          onValueChange={(val) =>
            updateLocalSetting("exportFormat", val as ExportFormat)
          }
        >
          <SelectTrigger className="h-9 text-xs bg-background" data-testid="export-format-select">
            <SelectValue placeholder="Select export format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv" className="text-xs" data-testid="export-format-csv">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold">CSV (.csv)</span>
                <span className="text-muted-foreground text-[11px]">
                  (Comma-separated values)
                </span>
              </div>
            </SelectItem>
            <SelectItem value="xlsx" className="text-xs" data-testid="export-format-xlsx">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Excel (.xlsx)</span>
                <span className="text-muted-foreground text-[11px]">
                  (Native Microsoft Excel spreadsheet)
                </span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Confirm on Delete */}
      <div className="space-y-3 pt-2">
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
