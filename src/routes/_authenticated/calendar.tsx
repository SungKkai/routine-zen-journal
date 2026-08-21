import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRoutineEntries, useTasks, type RoutineEntry, type Task } from "@/lib/data";
import { addDays, formatTime, startOfWeek, toDateKey } from "@/lib/format";
import { RoutineDialog } from "@/components/routine-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Kronos" },
      { name: "description", content: "Your week: tasks and routine blocks side by side." },
      { property: "og:title", content: "Calendar — Kronos" },
      { property: "og:description", content: "Your week: tasks and routine blocks side by side." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: tasks = [] } = useTasks();
  const { data: routines = [] } = useRoutineEntries();
  const [routineFor, setRoutineFor] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineEntry | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const days = useMemo(() => {
    const start = addDays(startOfWeek(new Date()), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  const todayKey = toDateKey(new Date());

  return (
    <div className="enter space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">(03) The week</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Calendar</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            Next
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayRoutines = routines.filter((r) => r.entry_date === key);
          const dayTasks = tasks.filter((t) => t.due_date === key);
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 ${key === todayKey ? "border-accent bg-card" : "border-border bg-card/50"}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="label-mono text-muted-foreground">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="font-mono text-sm">{day.getDate()}</span>
              </div>

              <ul className="mt-3 space-y-2">
                {dayRoutines.map((entry) => (
                  <li key={entry.id}>
                    <button
                      onClick={() => setEditingRoutine(entry)}
                      className="w-full rounded-md border border-border bg-muted px-2 py-1.5 text-left text-xs"
                    >
                      <span className="label-mono block text-accent">
                        {formatTime(entry.entry_time) ?? "Anytime"}
                      </span>
                      {entry.title}
                    </button>
                  </li>
                ))}
                {dayTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      onClick={() => setEditingTask(task)}
                      className={`w-full rounded-md border border-dashed border-border px-2 py-1.5 text-left text-xs ${task.status === "done" ? "line-through opacity-50" : ""}`}
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setRoutineFor(key)}
                className="mt-3 w-full rounded-md border border-border py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>

      <RoutineDialog
        open={routineFor !== null}
        onOpenChange={(o) => !o && setRoutineFor(null)}
        defaultDate={routineFor}
      />
      <RoutineDialog
        open={editingRoutine !== null}
        onOpenChange={(o) => !o && setEditingRoutine(null)}
        entry={editingRoutine}
      />
      <TaskDialog
        open={editingTask !== null}
        onOpenChange={(o) => !o && setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
}
