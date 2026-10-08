import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTasks, type Task } from "@/lib/data";
import { GOAL_STATUSES, useGoals, type Goal, type GoalStatus } from "@/lib/goals";
import { GoalDialog } from "@/components/goal-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { GoalShare } from "@/components/goal-share";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — Kronos" },
      { name: "description", content: "Group tasks under goals and watch progress build." },
      { property: "og:title", content: "Goals — Kronos" },
      { property: "og:description", content: "Group tasks under goals and watch progress build." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals();
  const { data: tasks = [] } = useTasks();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [taskGoalId, setTaskGoalId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<GoalStatus | "all">("active");

  const byGoal = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.goal_id) continue;
      map.set(task.goal_id, [...(map.get(task.goal_id) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const visible = goals.filter((g) => filter === "all" || g.status === filter);
  const unassigned = tasks.filter((t) => !t.goal_id && t.status !== "done");

  return (
    <div className="enter space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">(07) Direction</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Goals</h1>
        </div>
        <Button onClick={() => setCreating(true)}>New goal</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", ...GOAL_STATUSES.map((s) => s.value)] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value as GoalStatus | "all")}
          >
            {value === "all" ? "All" : (GOAL_STATUSES.find((s) => s.value === value)?.label ?? value)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading goals…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No goals here yet. Create one to group your work.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((goal) => {
            const goalTasks = byGoal.get(goal.id) ?? [];
            const done = goalTasks.filter((t) => t.status === "done").length;
            const pct = goalTasks.length ? Math.round((done / goalTasks.length) * 100) : 0;
            return (
              <article
                key={goal.id}
                className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{goal.name}</h2>
                    {goal.description && (
                      <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(goal)}>
                    Edit
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="label-mono flex justify-between text-muted-foreground">
                    <span>
                      {done}/{goalTasks.length} done
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>

                <ul className="space-y-1.5">
                  {goalTasks.slice(0, 5).map((task) => (
                    <li key={task.id}>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="flex w-full items-center gap-2 text-left text-sm hover:text-accent"
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            task.status === "done" ? "bg-muted-foreground" : "bg-accent"
                          }`}
                        />
                        <span
                          className={`truncate ${
                            task.status === "done" ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </button>
                    </li>
                  ))}
                  {goalTasks.length === 0 && (
                    <li className="text-sm text-muted-foreground">No tasks linked yet.</li>
                  )}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label-mono text-muted-foreground">
                    {goal.target_date ? `Due ${goal.target_date}` : "No target date"}
                  </span>
                  <span className="flex items-center gap-1">
                    <GoalShare goalId={goal.id} />
                    <Button size="sm" variant="outline" onClick={() => setTaskGoalId(goal.id)}>
                      Add task
                    </Button>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="label-mono text-muted-foreground">Unassigned tasks ({unassigned.length})</h2>
        <ul className="divide-y divide-border border-y border-border">
          {unassigned.slice(0, 10).map((task) => (
            <li key={task.id}>
              <button
                onClick={() => setEditingTask(task)}
                className="w-full truncate py-3 text-left text-sm hover:text-accent"
              >
                {task.title}
              </button>
            </li>
          ))}
          {unassigned.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Everything is linked to a goal.</li>
          )}
        </ul>
      </section>

      <GoalDialog open={creating} onOpenChange={setCreating} />
      <GoalDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} goal={editing} />
      <TaskDialog
        open={!!taskGoalId}
        onOpenChange={(o) => !o && setTaskGoalId(null)}
        defaultGoalId={taskGoalId}
      />
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(o) => !o && setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
}
