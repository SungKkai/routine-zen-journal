import { toast } from "sonner";
import {
  notificationsSupported,
  requestNotificationPermission,
  useReminderPrefs,
} from "@/lib/reminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const LEADS = [5, 10, 15, 30];

export function ReminderSettings() {
  const { prefs, update } = useReminderPrefs();

  async function toggle(on: boolean) {
    if (!on) {
      update({ enabled: false });
      return;
    }
    if (!notificationsSupported()) {
      toast.error("This browser can't show reminders.");
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.error("Reminders need notification permission.");
      return;
    }
    update({ enabled: true });
    toast.success("Reminders on. Keep a Kronos tab open to receive them.");
  }

  return (
    <section className="space-y-5 border-t border-border pt-8">
      <h2 className="label-mono text-muted-foreground">Reminders</h2>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Task &amp; routine reminders</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A quiet nudge before anything with a time on it starts.
          </p>
        </div>
        <Switch checked={prefs.enabled} onCheckedChange={(v) => void toggle(v)} />
      </div>

      {prefs.enabled && (
        <>
          <div className="space-y-2">
            <Label>Remind me</Label>
            <div className="flex flex-wrap gap-2">
              {LEADS.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={prefs.leadMinutes === m ? "default" : "outline"}
                  onClick={() => update({ leadMinutes: m })}
                >
                  {m} min before
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkin-time">Evening check-in nudge</Label>
              <Input
                id="checkin-time"
                type="time"
                className="w-36"
                value={prefs.checkInTime}
                onChange={(e) => update({ checkInTime: e.target.value })}
                disabled={!prefs.checkInEnabled}
              />
            </div>
            <Switch
              checked={prefs.checkInEnabled}
              onCheckedChange={(v) => update({ checkInEnabled: v })}
            />
          </div>
        </>
      )}
    </section>
  );
}
