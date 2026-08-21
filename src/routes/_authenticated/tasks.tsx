import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { STATUSES, statusLabel, useCategories, useTasks, type Status, type Task } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { TaskDialog } from "@/components/task-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Kronos" },
      { name: "description", content: "All of your tasks by priority, status and category." },
      { property: "og:title", content: "Tasks — Kronos" },
      { property: "og:description", content: "All of your tasks by priority, status and category." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: categories = [] } = useCategories();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (status === "all" || t.status === status) &&
          t.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [tasks, status, query],
  );

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? null) : null;

  return (
    <div className="enter space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">(02) All work</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Tasks</h1>
        </div>
        <Button onClick={() => setCreating(true)}>New task</Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", ...STATUSES.map((s) => s.value)] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value as Status | "all")}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                status === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "all" ? "All" : statusLabel(value as Status)}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {isLoading && <li className="py-4 text-sm text-muted-foreground">Loading…</li>}
        {!isLoading && filtered.length === 0 && (
          <li className="py-8 text-sm text-muted-foreground">No tasks match that.</li>
        )}
        {filtered.map((task) => (
          <li key={task.id}>
            <button
              onClick={() => setEditing(task)}
              className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <span className="label-mono w-16 shrink-0 text-accent">{task.priority}</span>
              <span className={`flex-1 text-sm font-medium ${task.status === "done" ? "line-through opacity-60" : ""}`}>
                {task.title}
              </span>
              <span className="label-mono text-muted-foreground">
                {[categoryName(task.category_id), statusLabel(task.status), task.due_date, formatTime(task.due_time)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <TaskDialog open={creating} onOpenChange={setCreating} />
      <TaskDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
    </div>
  );
}
