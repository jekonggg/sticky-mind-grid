import { useState, useEffect, useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { notificationApi, urlBase64ToUint8Array } from "@/services/notificationApi";
import {
  VolumeMax as Volume2,
  VolumeX,
  Bell01 as Bell,
  AtSign,
  UserCheck01 as UserCheck,
  Mail01 as MailPlus,
  MessageChatSquare as MessageSquare,
  Stars01 as Sparkles,
  InfoCircle as Info,
  ArrowRight,
  Phone01 as Smartphone,
  CheckCircle as CheckCircle2,
  AlertTriangle as AlertTriangleIcon,
  Loading01 as Loader2,
  Send01 as Send,
} from "@untitledui/icons";

export function NotificationTab() {
  const { settings, updateLocalSetting, updateSyncedSetting, playSound, isSyncing } =
    useSettings();

  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const checkPushStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);
    if (!supported) return;

    setPushPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    } catch {
      setPushSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void checkPushStatus();
  }, [checkPushStatus]);

  const handleTogglePush = async (enable: boolean) => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in this browser environment.");
      return;
    }

    try {
      setLoadingPush(true);
      const reg = await navigator.serviceWorker.ready;

      if (enable) {
        if (Notification.permission === "denied") {
          toast.error(
            "Notifications are blocked by your browser settings. Please allow notifications for this site in your browser permissions."
          );
          setPushPermission("denied");
          return;
        }

        let perm = Notification.permission;
        if (perm === "default") {
          perm = await Notification.requestPermission();
          setPushPermission(perm);
          if (perm !== "granted") {
            toast.info("Push notification permission was not granted.");
            return;
          }
        }

        const pubKey = await notificationApi.getVapidPublicKey();
        const convertedVapidKey = urlBase64ToUint8Array(pubKey);

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        await notificationApi.registerPushSubscription(sub.toJSON());
        setPushSubscribed(true);
        toast.success("Mobile & browser push notifications enabled!");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          try {
            await notificationApi.unregisterPushSubscription(sub.endpoint);
          } catch {
            // Ignore backend unregister error if endpoint already invalidated
          }
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
        toast.info("Push notifications disabled for this device.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update push notifications";
      toast.error(message);
    } finally {
      setLoadingPush(false);
      void checkPushStatus();
    }
  };

  const handleSendTestPush = async () => {
    try {
      setSendingTest(true);
      const res = await notificationApi.sendTestPush();
      if (res.devicesNotified > 0) {
        toast.success(
          `Test push sent to ${res.devicesNotified} registered device(s)! Check your notification tray.`
        );
      } else {
        toast.info("No active device push subscriptions found to receive the alert.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send test push notification";
      toast.error(message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Notifications & Audio</h3>
        <p className="text-xs text-muted-foreground">
          Configure real-time in-app alerts, audio feedback, and mobile lock-screen push notifications.
        </p>
      </div>

      {/* Mobile & Browser Web Push Notification Section */}
      <div className="space-y-3.5 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="push-notification-toggle"
                  className="text-xs font-bold text-foreground cursor-pointer"
                >
                  Mobile & Browser Push Notifications
                </Label>
                {pushSubscribed ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Active on this device
                  </Badge>
                ) : pushPermission === "denied" ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1"
                  >
                    <AlertTriangleIcon className="h-3 w-3" />
                    Blocked by Browser
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {pushSupported ? "Supported" : "Not Supported"}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Receive instant notifications on your phone lock screen, Android/iOS notification tray, and desktop browser even when Sticky Mind Grid is closed.
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0 pt-0.5">
            {loadingPush ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Switch
                id="push-notification-toggle"
                data-testid="push-notification-toggle"
                disabled={!pushSupported || loadingPush}
                checked={pushSubscribed}
                onCheckedChange={handleTogglePush}
              />
            )}
          </div>
        </div>

        {/* Test Push Button & Mobile Guides */}
        <div className="pt-2 border-t border-primary/10 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>
              <strong>iPhone Users:</strong> Apple requires adding this site to your Home Screen (<strong>Share → Add to Home Screen</strong>) to receive lock-screen push alerts.
            </span>
          </div>

          {pushSubscribed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendTestPush}
              disabled={sendingTest}
              className="h-7 text-xs px-2.5 gap-1.5"
              data-testid="send-test-push-btn"
            >
              {sendingTest ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Send Test Push
            </Button>
          )}
        </div>
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

        <div className="space-y-2.5">
          {/* Mentions */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <AtSign className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-mentions" className="text-xs font-bold text-foreground cursor-pointer">
                  Mentions
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When someone tags you in a card comment (@name)
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

          {/* Task Assignments */}
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
                  When you are assigned or unassigned from a task card
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

          {/* Board Invitations */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
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

          {/* Discussion Comments */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-comments" className="text-xs font-bold text-foreground cursor-pointer">
                  Discussion Comments
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When a comment is posted on a card you created or are assigned to
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

          {/* Card Movements */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="notify-card-moves" className="text-xs font-bold text-foreground cursor-pointer">
                  Card Movements
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When a card you follow or created is moved between columns
                </p>
              </div>
            </div>
            <Switch
              id="notify-card-moves"
              checked={settings.notifyCardMoves}
              onCheckedChange={(checked) =>
                updateSyncedSetting("notifyCardMoves", checked)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
