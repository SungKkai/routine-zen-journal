import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  statusLabel,
  useProfile,
  useRoutineEntries,
  useTasks,
  useUpdateTask,
  type Task,
} from "@/lib/data";
import { formatClock, formatTime, greeting, toDateKey } from "@/lib/format";
import { useTimer } from "@/components/timer-provider";
import { TaskDialog } from "@/components/task-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Kronos" },
      { name: "description", content: "Your tasks, routine blocks and focus timer for today." },
      { property: "og:title", content: "Today — Kronos" },
      { property: "og:description", content: "Your tasks, routine blocks and focus timer for today." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const today = toDateKey(new Date());
  const { data: profile } = useProfile();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: routines = [] } = useRoutineEntries();
  const updateTask = useUpdateTask();
  const timer = useTimer();
  const [editing, setEditing] = useState<Task | null>(null);

  const todaysTasks = useMemo(
    () => tasks.filter((t) => (t.due_date ?? today) <= today && t.status !== "done"),
    [tasks, today],
  );
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === "done" && (t.completed_at ?? "").slice(0, 10) === today),
    [tasks, today],
  );
  const todaysRoutine = useMemo(
    () => routines.filter((r) => r.entry_date === today),
    [routines, today],
  );

  function toggle(task: Task, done: boolean) {
    updateTask
      .mutateAsync({
        id: task.id,
        status: done ? "done" : "not_started",
        completed_at: done ? new Date().toISOString() : null,
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Couldn't update that task."));
  }

  return (
    <div className="enter space-y-12">
      <header>
        <p className="label-mono text-accent">{new Date().toDateString()}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tighter sm:text-4xl">
          {greeting()}
          {profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {todaysTasks.length === 0
            ? "Nothing on the list right now."
            : `${todaysTasks.length} open ${todaysTasks.length === 1 ? "task" : "tasks"} · ${doneToday.length} done today`}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-mono text-muted-foreground">Focus timer</p>
            <p className="mt-2 font-mono text-4xl tracking-tight">
              {formatClock(timer.remaining ?? timer.elapsed)}
            </p>
            {timer.taskTitle && (
              <p className="mt-1 text-sm text-muted-foreground">on {timer.taskTitle}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!timer.active && (
              <>
                <Button onClick={() => timer.start({})}>Start</Button>
                <Button variant="outline" onClick={() => timer.start({ minutes: 25 })}>
                  25 min
                </Button>
              </>
            )}
            {timer.active && (
              <>
                {timer.running ? (
                  <Button variant="outline" onClick={timer.pause}>
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" onClick={timer.resume}>
                    Resume
                  </Button>
                )}
                <Button onClick={() => void timer.stop()}>Stop &amp; save</Button>
                <Button variant="ghost" onClick={timer.discard}>
                  Discard
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="label-mono text-muted-foreground">Tasks</h2>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {isLoading && <li className="py-4 text-sm text-muted-foreground">Loading…</li>}
            {!isLoading && todaysTasks.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">
                Nothing due. Use the + button to add something.
              </li>
            )}
            {todaysTasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 py-3">
                <Checkbox
                  className="mt-1"
                  checked={false}
                  onCheckedChange={(v) => toggle(task, v === true)}
                  aria-label={`Complete ${task.title}`}
                />
                <button className="flex-1 text-left" onClick={() => setEditing(task)}>
                  <span className="text-sm font-medium">{task.title}</span>
                  <span className="mt-1 block label-mono text-muted-foreground">
                    {task.priority} · {statusLabel(task.status)}
                    {task.due_time ? ` · ${formatTime(task.due_time)}` : ""}
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => timer.start({ taskId: task.id, taskTitle: task.title })}
                >
                  Focus
                </Button>
              </li>
            ))}
            {doneToday.map((task) => (
              <li key={task.id} className="flex items-start gap-3 py-3 opacity-50">
                <Checkbox
                  className="mt-1"
                  checked
                  onCheckedChange={(v) => toggle(task, v === true)}
                  aria-label={`Reopen ${task.title}`}
                />
                <span className="flex-1 text-sm line-through">{task.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="label-mono text-muted-foreground">Routine</h2>
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {todaysRoutine.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">No blocks planned today.</li>
            )}
            {todaysRoutine.map((entry) => (
              <li key={entry.id} className="flex items-baseline gap-4 py-3">
                <span className="label-mono w-20 shrink-0 text-accent">
                  {formatTime(entry.entry_time) ?? "Anytime"}
                </span>
                <span className="flex-1 text-sm">{entry.title}</span>
                {entry.duration_minutes ? (
                  <span className="label-mono text-muted-foreground">{entry.duration_minutes}m</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <TaskDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
    </div>
  );
}
