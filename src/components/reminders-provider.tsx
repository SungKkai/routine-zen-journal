import { useEffect } from "react";
import { useRoutineEntries, useTasks } from "@/lib/data";
import { useJournalEntries } from "@/lib/wellbeing";
import { toDateKey } from "@/lib/format";
import { minutesUntil, notifyOnce, useReminderPrefs } from "@/lib/reminders";

/** Watches today's tasks, routine blocks and check-in time, and raises desktop reminders. */
export function RemindersProvider() {
  const { prefs } = useReminderPrefs();
  const { data: tasks = [] } = useTasks();
  const { data: routines = [] } = useRoutineEntries();
  const { data: entries = [] } = useJournalEntries();

  useEffect(() => {
    if (!prefs.enabled) return;

    const tick = () => {
      const now = new Date();
      const today = toDateKey(now);

      for (const task of tasks) {
        if (task.status === "done" || task.due_date !== today || !task.due_time) continue;
        const mins = minutesUntil(today, task.due_time.slice(0, 5), now);
        if (mins <= prefs.leadMinutes && mins > -1) {
          notifyOnce(
            `${today}:task:${task.id}`,
            "Task due soon",
            `${task.title} · ${task.due_time.slice(0, 5)}`,
          );
        }
      }

      for (const entry of routines) {
        if (entry.entry_date !== today || !entry.entry_time) continue;
        const mins = minutesUntil(today, entry.entry_time.slice(0, 5), now);
        if (mins <= prefs.leadMinutes && mins > -1) {
          notifyOnce(
            `${today}:routine:${entry.id}`,
            "Routine block starting",
            `${entry.title} · ${entry.entry_time.slice(0, 5)}`,
          );
        }
      }

      if (prefs.checkInEnabled) {
        const mins = minutesUntil(today, prefs.checkInTime, now);
        const logged = entries.some((e) => e.entry_date === today && e.mood !== null);
        if (!logged && mins <= 0 && mins > -120) {
          notifyOnce(
            `${today}:checkin`,
            "Evening check-in",
            "Two minutes: log your mood and energy, then let the day close.",
          );
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [prefs, tasks, routines, entries]);

  return null;
}
