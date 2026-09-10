import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useTasks, useUpdateTask } from "@/lib/data";
import {
  MOODS,
  useAiSettings,
  useHabitLogs,
  useHabits,
  useJournalEntries,
  useReflections,
  useSaveReflection,
} from "@/lib/wellbeing";
import { useGoals } from "@/lib/goals";
import { weeklyReflection } from "@/lib/journal-ai.functions";
import { addDays, startOfWeek, toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Weekly review — Kronos" },
      {
        name: "description",
        content: "Close the week: what got done, what slipped, and what carries over.",
      },
      { property: "og:title", content: "Weekly review — Kronos" },
      {
        property: "og:description",
        content: "Close the week: what got done, what slipped, and what carries over.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const [offset, setOffset] = useState(0);
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: habitLogs = [] } = useHabitLogs();
  const { data: entries = [] } = useJournalEntries();
  const { data: goals = [] } = useGoals();
  const { data: reflections = [] } = useReflections();
  const { data: aiSettings } = useAiSettings();
  const saveReflection = useSaveReflection();
  const updateTask = useUpdateTask();
  const reflect = useServerFn(weeklyReflection);
  const [busy, setBusy] = useState(false);

  const weekStart = useMemo(
    () => startOfWeek(addDays(new Date(), offset * 7)),
    [offset],
  );
  const weekKey = toDateKey(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const endKey = toDateKey(weekEnd);
  const todayKey = toDateKey(new Date());
  const isCurrentWeek = offset === 0;

  const inWeek = (key: string | null) => !!key && key >= weekKey && key <= endKey;

  const completed = useMemo(
    () => tasks.filter((t) => t.status === "done" && inWeek((t.completed_at ?? "").slice(0, 10))),
    [tasks, weekKey, endKey],
  );
  const slipped = useMemo(
    () => tasks.filter((t) => t.status !== "done" && inWeek(t.due_date) && (t.due_date ?? "") < todayKey),
    [tasks, weekKey, endKey, todayKey],
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i))),
    [weekStart],
  );

  const habitRate = useMemo(() => {
    if (habits.length === 0) return null;
    const possible = habits.length * 7;
    const hit = habitLogs.filter((l) => days.includes(l.log_date)).length;
    return Math.round((hit / possible) * 100);
  }, [habits, habitLogs, days]);

  const weekEntries = useMemo(
    () => entries.filter((e) => days.includes(e.entry_date)),
    [entries, days],
  );
  const avgMood = useMemo(() => {
    const values = weekEntries.map((e) => e.mood).filter((m): m is number => m !== null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [weekEntries]);

  const existing = reflections.find((r) => r.week_start === weekKey);

  async function generate() {
    setBusy(true);
    try {
      const summary = [
        `Week of ${weekKey} to ${endKey}.`,
        `Completed ${completed.length} tasks: ${completed.slice(0, 15).map((t) => t.title).join("; ") || "none"}.`,
        `Slipped ${slipped.length} tasks: ${slipped.slice(0, 15).map((t) => t.title).join("; ") || "none"}.`,
        habitRate !== null ? `Habit consistency: ${habitRate}%.` : "",
        avgMood !== null ? `Average mood: ${avgMood.toFixed(1)} of 5 across ${weekEntries.length} check-ins.` : "",
        goals.filter((g) => g.status === "active").length
          ? `Active goals: ${goals.filter((g) => g.status === "active").map((g) => g.name).join("; ")}.`
          : "",
        weekEntries
          .filter((e) => e.note)
          .slice(0, 5)
          .map((e) => `Note ${e.entry_date}: ${e.note}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 5800);

      const { reply } = await reflect({
        data: {
          summary,
          persona: aiSettings
            ? {
                assistant_name: aiSettings.assistant_name,
                tone: aiSettings.tone,
                directness: aiSettings.directness,
                reply_length: aiSettings.reply_length,
                custom_instructions: aiSettings.custom_instructions,
              }
            : undefined,
        },
      });
      await saveReflection.mutateAsync({ week_start: weekKey, content: reply });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't write that review.");
    } finally {
      setBusy(false);
    }
  }

  async function carryOver() {
    try {
      await Promise.all(
        slipped.map((t) => updateTask.mutateAsync({ id: t.id, due_date: todayKey })),
      );
      toast.success(`Moved ${slipped.length} ${slipped.length === 1 ? "task" : "tasks"} to today.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't move those tasks.");
    }
  }

  const range = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="enter space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">Weekly review</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter sm:text-4xl">{range}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isCurrentWeek ? "This week so far." : "A closed week."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)} disabled={isCurrentWeek}>
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={isCurrentWeek}>
            Next
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Done" value={String(completed.length)} />
        <Stat label="Slipped" value={String(slipped.length)} />
        <Stat label="Habits" value={habitRate === null ? "—" : `${habitRate}%`} />
        <Stat
          label="Mood"
          value={
            avgMood === null
              ? "—"
              : (MOODS.find((m) => m.value === Math.round(avgMood))?.label ?? avgMood.toFixed(1))
          }
        />
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="label-mono text-muted-foreground">What got done</h2>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {completed.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">Nothing marked done this week.</li>
            )}
            {completed.map((t) => (
              <li key={t.id} className="break-words py-3 text-sm">
                {t.title}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="label-mono text-muted-foreground">What slipped</h2>
            {slipped.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void carryOver()}>
                Carry over to today
              </Button>
            )}
          </div>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {slipped.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">Nothing overdue. Clean week.</li>
            )}
            {slipped.map((t) => (
              <li key={t.id} className="break-words py-3 text-sm">
                {t.title}
                <span className="label-mono ml-2 text-muted-foreground">{t.due_date}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-mono text-muted-foreground">Reflection</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A short read on how the week actually went.
            </p>
          </div>
          <Button size="sm" onClick={() => void generate()} disabled={busy}>
            {busy ? "Thinking…" : existing ? "Regenerate" : "Write it"}
          </Button>
        </div>
        {existing ? (
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {existing.content}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No reflection for this week yet.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
