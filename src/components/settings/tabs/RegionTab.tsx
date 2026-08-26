import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Clock, CalendarDays, Languages } from "lucide-react";
import { DateFormatOption } from "@/types/settings";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Manila",
  "Australia/Sydney",
];

export function RegionTab() {
  const { settings, updateSyncedSetting, isSyncing } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Language & Region</h3>
        <p className="text-xs text-muted-foreground">
          Configure regional date formatting, calendar week structure, and timezone.
        </p>
      </div>

      <div className="space-y-4">
        {/* Timezone */}
        <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <Label className="text-xs font-bold text-foreground">Timezone</Label>
            </div>
            {isSyncing && (
              <span className="text-[10px] text-primary font-semibold animate-pulse">
                Syncing...
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Used for date scheduling, activity timestamps, and due date reminders
          </p>
          <Select
            value={settings.timezone}
            onValueChange={(val) => updateSyncedSetting("timezone", val)}
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz} className="text-xs">
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Format */}
        <div className="space-y-1.5 p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Label className="text-xs font-bold text-foreground">Date Format</Label>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Choose how calendar dates and task deadlines are formatted
          </p>
          <Select
            value={settings.dateFormat}
            onValueChange={(val) =>
              updateSyncedSetting("dateFormat", val as DateFormatOption)
            }
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/DD/YYYY" className="text-xs">
                MM/DD/YYYY (e.g. 08/26/2026)
              </SelectItem>
              <SelectItem value="DD/MM/YYYY" className="text-xs">
                DD/MM/YYYY (e.g. 26/08/2026)
              </SelectItem>
              <SelectItem value="YYYY-MM-DD" className="text-xs">
                YYYY-MM-DD (e.g. 2026-08-26)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* First Day of the Week */}
        <div className="space-y-1.5 p-4 rounded-xl bg-card border border-border/60">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="text-xs font-bold text-foreground">First Day of the Week</Label>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            Determines the first column on calendar date pickers and schedule views
          </p>
          <Select
            value={String(settings.firstDayOfWeek)}
            onValueChange={(val) =>
              updateSyncedSetting("firstDayOfWeek", (Number(val) === 1 ? 1 : 0) as 0 | 1)
            }
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="Select first day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0" className="text-xs">
                Sunday
              </SelectItem>
              <SelectItem value="1" className="text-xs">
                Monday
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Language (English with future note) */}
        <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-bold text-foreground">Display Language</Label>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-bold text-muted-foreground">
              English (Default)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Multi-language translation packs (i18n) will be available in future releases.
          </p>
        </div>
      </div>
    </div>
  );
}
