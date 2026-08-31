import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTasks, useTimerSessions } from "@/lib/data";
import {
  streakFor,
  useHabitLogs,
  useHabits,
  useJournalEntries,
  useReflections,
  useSaveReflection,
} from "@/lib/wellbeing";
import { weeklyReflection } from "@/lib/journal-ai.functions";
import { addDays, startOfWeek, toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Kronos" },
      {
        name: "description",
        content: "Focus hours, completed tasks, mood trends and an AI weekly reflection.",
      },
      { property: "og:title", content: "Insights — Kronos" },
      {
        property: "og:description",
        content: "Focus hours, completed tasks, mood trends and an AI weekly reflection.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { data: tasks = [] } = useTasks();
  const { data: sessions = [] } = useTimerSessions();
  const { data: entries = [] } = useJournalEntries();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const { data: reflections = [] } = useReflections();
  const saveReflection = useSaveReflection();
  const reflect = useServerFn(weeklyReflection);
  const [busy, setBusy] = useState(false);

  const weekStart = startOfWeek(new Date());
  const weekKey = toDateKey(weekStart);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => toDateKey(addDays(new Date(), i - 13))),
    [],
  );

  const series = useMemo(
    () =>
      days.map((day) => ({
        day: day.slice(5),
        done: tasks.filter(
          (t) => t.status === "done" && (t.completed_at ?? "").slice(0, 10) === day,
        ).length,
        focus:
          Math.round(
            (sessions
              .filter((s) => (s.started_at ?? "").slice(0, 10) === day)
              .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) /
              3600) *
              10,
          ) / 10,
        mood: entries.find((e) => e.entry_date === day)?.mood ?? null,
      })),
    [days, tasks, sessions, entries],
  );

  const weekDays = days.slice(-7);
  const weekDone = series.slice(-7).reduce((s, d) => s + d.done, 0);
  const weekFocus = Math.round(series.slice(-7).reduce((s, d) => s + d.focus, 0) * 10) / 10;
  const moods = series.slice(-7).map((d) => d.mood).filter((m): m is number => m !== null);
  const avgMood = moods.length ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null;
  const thisWeekReflection = reflections.find((r) => r.week_start === weekKey);

  async function generate() {
    setBusy(true);
    try {
      const habitLines = habits
        .map((h) => {
          const hit = weekDays.filter((d) =>
            logs.some((l) => l.habit_id === h.id && l.log_date === d),
          ).length;
          return `- ${h.name} (${h.cadence}): ${hit}/7 days this week, current streak ${streakFor(logs, h.id)} days`;
        })
        .join("\n");
      const journalLines = entries
        .filter((e) => weekDays.includes(e.entry_date))
        .map((e) => `- ${e.entry_date}: mood ${e.mood ?? "?"}/5, energy ${e.energy ?? "?"}/5. ${e.note ?? ""}`)
        .join("\n");

      const summary = [
        `Week starting ${weekKey}.`,
        `Tasks completed: ${weekDone}. Open tasks: ${tasks.filter((t) => t.status !== "done").length}.`,
        `Focus time logged: ${weekFocus} hours.`,
        avgMood ? `Average mood: ${avgMood}/5 across ${moods.length} check-ins.` : "No mood check-ins logged.",
        habitLines ? `Habits:\n${habitLines}` : "No habits tracked.",
        journalLines ? `Journal:\n${journalLines}` : "No journal entries.",
      ].join("\n");

      const { reply } = await reflect({ data: { summary } });
      await saveReflection.mutateAsync({ week_start: weekKey, content: reply });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate a reflection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="enter space-y-10">
      <header>
        <p className="label-mono text-accent">(06) Signal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Insights</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Tasks done (7d)", value: String(weekDone) },
          { label: "Focus hours (7d)", value: `${weekFocus}h` },
          { label: "Avg mood (7d)", value: avgMood ? `${avgMood}/5` : "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <p className="label-mono text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-mono text-3xl tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="label-mono text-muted-foreground">Tasks completed · 14 days</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="label-mono text-muted-foreground">Focus hours &amp; mood · 14 days</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="mood"
                  connectNulls
                  stroke="var(--foreground)"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-mono text-muted-foreground">Weekly reflection · Counsel</p>
            <p className="mt-1 text-sm text-muted-foreground">Week of {weekKey}</p>
          </div>
          <Button onClick={() => void generate()} disabled={busy}>
            {busy ? "Thinking…" : thisWeekReflection ? "Regenerate" : "Generate"}
          </Button>
        </div>
        {thisWeekReflection ? (
          <p className="mt-5 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {thisWeekReflection.content}
          </p>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            No reflection yet for this week. Counsel will read your tasks, focus time, habits and
            check-ins, and tell you what it actually thinks.
          </p>
        )}
      </section>

      {reflections.filter((r) => r.week_start !== weekKey).length > 0 && (
        <section>
          <p className="label-mono text-muted-foreground">Past reflections</p>
          <div className="mt-4 space-y-6 border-t border-border pt-4">
            {reflections
              .filter((r) => r.week_start !== weekKey)
              .map((r) => (
                <article key={r.id}>
                  <p className="label-mono text-accent">Week of {r.week_start}</p>
                  <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                    {r.content}
                  </p>
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
