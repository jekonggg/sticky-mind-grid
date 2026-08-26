import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  VolumeX,
  Bell,
  AtSign,
  UserCheck,
  MailPlus,
  MessageSquare,
  Sparkles,
  Info,
} from "lucide-react";

export function NotificationTab() {
  const { settings, updateLocalSetting, updateSyncedSetting, playSound, isSyncing } =
    useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Notifications & Audio</h3>
        <p className="text-xs text-muted-foreground">
          Configure real-time in-app alerts and audio feedback preferences.
        </p>
      </div>

      {/* Audio Feedback Section */}
      <div className="space-y-4 p-4 rounded-xl bg-muted/40 border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {settings.soundEffectsEnabled ? (
                <Volume2 className="h-4.5 w-4.5" />
              ) : (
                <VolumeX className="h-4.5 w-4.5 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label
                htmlFor="sound-toggle"
                className="text-xs font-bold text-foreground cursor-pointer"
              >
                In-App Sound Effects
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Synthesized audio feedback on task drag, drop, completion, and trash actions.
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={settings.soundEffectsEnabled}
            onCheckedChange={(checked) =>
              updateLocalSetting("soundEffectsEnabled", checked)
            }
          />
        </div>

        {settings.soundEffectsEnabled && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Sound Volume</span>
              <span className="font-bold text-foreground">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.soundVolume * 100]}
              min={5}
              max={100}
              step={5}
              onValueChange={(val) =>
                updateLocalSetting("soundVolume", val[0] / 100)
              }
              className="py-1"
            />

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] text-muted-foreground font-semibold">
                Test audio:
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => playSound("move")}
                className="h-7 text-xs px-2.5"
              >
                Move Chime
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => playSound("complete")}
                className="h-7 text-xs px-2.5"
              >
                Done Chime
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => playSound("delete")}
                className="h-7 text-xs px-2.5"
              >
                Trash Pop
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => playSound("notify")}
                className="h-7 text-xs px-2.5"
              >
                Alert Chime
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* In-App Notification Categories */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            In-App Notification Triggers
          </Label>
          {isSyncing && (
            <span className="text-[10px] text-primary font-semibold animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        <div className="space-y-2">
          {/* Mentions */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <AtSign className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-mentions" className="text-xs font-bold text-foreground cursor-pointer">
                  Mentions
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When someone @mentions your name or email in a comment
                </p>
              </div>
            </div>
            <Switch
              id="notify-mentions"
              checked={settings.notifyMentions}
              onCheckedChange={(checked) =>
                updateSyncedSetting("notifyMentions", checked)
              }
            />
          </div>

          {/* Assignments */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-assignments" className="text-xs font-bold text-foreground cursor-pointer">
                  Task Assignments
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When a task is assigned or reassigned to you
                </p>
              </div>
            </div>
            <Switch
              id="notify-assignments"
              checked={settings.notifyAssignments}
              onCheckedChange={(checked) =>
                updateSyncedSetting("notifyAssignments", checked)
              }
            />
          </div>

          {/* Board Invites */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MailPlus className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-invites" className="text-xs font-bold text-foreground cursor-pointer">
                  Board Invitations
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When you are invited to collaborate on a new board
                </p>
              </div>
            </div>
            <Switch
              id="notify-invites"
              checked={settings.notifyInvites}
              onCheckedChange={(checked) =>
                updateSyncedSetting("notifyInvites", checked)
              }
            />
          </div>

          {/* Comments on Assigned Tasks */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-comments" className="text-xs font-bold text-foreground cursor-pointer">
                  Comments on My Tasks
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When other team members comment on tasks assigned to you
                </p>
              </div>
            </div>
            <Switch
              id="notify-comments"
              checked={settings.notifyComments}
              onCheckedChange={(checked) =>
                updateSyncedSetting("notifyComments", checked)
              }
            />
          </div>
        </div>
      </div>

      {/* Future channels note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">External Channels: </span>
          Email summaries and browser desktop push notifications are scheduled for future platform releases.
        </div>
      </div>
    </div>
  );
}
