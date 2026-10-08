import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  HABIT_COLORS,
  streakFor,
  useCreateHabit,
  useDeleteHabit,
  useHabitLogs,
  useHabits,
  useToggleHabitLog,
  type Cadence,
} from "@/lib/wellbeing";
import { addDays, toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({
    meta: [
      { title: "Habits — Kronos" },
      { name: "description", content: "Track daily habits and keep your streaks alive." },
      { property: "og:title", content: "Habits — Kronos" },
      { property: "og:description", content: "Track daily habits and keep your streaks alive." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HabitsPage,
});

const CADENCES: { value: Cadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
];

function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const toggle = useToggleHabitLog();
  const createHabit = useCreateHabit();
  const removeHabit = useDeleteHabit();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(HABIT_COLORS[0]!);
  const [cadence, setCadence] = useState<Cadence>("daily");

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13)),
    [],
  );
  const logged = useMemo(
    () => new Set(logs.map((l) => `${l.habit_id}:${l.log_date}`)),
    [logs],
  );

  async function submit() {
    if (!name.trim()) return;
    try {
      await createHabit.mutateAsync({ name: name.trim(), color, cadence });
      setName("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create that habit.");
    }
  }

  return (
    <div className="enter space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">(04) Consistency</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Habits</h1>
        </div>
        <Button onClick={() => setOpen(true)}>New habit</Button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left label-mono font-normal text-muted-foreground">Habit</th>
              {days.map((d) => (
                <th
                  key={toDateKey(d)}
                  className="w-8 py-2 text-center label-mono font-normal text-muted-foreground"
                >
                  {d.getDate()}
                </th>
              ))}
              <th className="py-2 pl-4 text-right label-mono font-normal text-muted-foreground">
                Streak
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={days.length + 3} className="py-6 text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && habits.length === 0 && (
              <tr>
                <td colSpan={days.length + 3} className="py-8 text-muted-foreground">
                  No habits yet. Start with one you can hold for two weeks.
                </td>
              </tr>
            )}
            {habits.map((habit) => (
              <tr key={habit.id} className="border-b border-border">
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    <span className="font-medium">{habit.name}</span>
                    <span className="label-mono text-muted-foreground">{habit.cadence}</span>
                  </span>
                </td>
                {days.map((d) => {
                  const key = toDateKey(d);
                  const done = logged.has(`${habit.id}:${key}`);
                  return (
                    <td key={key} className="py-3 text-center">
                      <button
                        aria-label={`${habit.name} on ${key}`}
                        onClick={() =>
                          toggle
                            .mutateAsync({ habit_id: habit.id, log_date: key, done: !done })
                            .catch((e) =>
                              toast.error(e instanceof Error ? e.message : "Couldn't update."),
                            )
                        }
                        className="size-5 rounded-[4px] border transition-colors"
                        style={{
                          backgroundColor: done ? habit.color : "transparent",
                          borderColor: done ? habit.color : "var(--border)",
                        }}
                      />
                    </td>
                  );
                })}
                <td className="py-3 pl-4 text-right font-mono">{streakFor(logs, habit.id)}d</td>
                <td className="py-3 pl-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      removeHabit
                        .mutateAsync(habit.id)
                        .catch((e) =>
                          toast.error(e instanceof Error ? e.message : "Couldn't delete."),
                        )
                    }
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Colour ${c}`}
                  className={`size-6 rounded-full border-2 ${
                    color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {CADENCES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCadence(c.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    cadence === c.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void submit()} disabled={createHabit.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
