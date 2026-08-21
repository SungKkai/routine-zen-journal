import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useCategories,
  useRoutineEntries,
  useTasks,
  type Category,
  type RoutineEntry,
  type Task,
} from "@/lib/data";
import { addDays, formatTime, startOfWeek, toDateKey } from "@/lib/format";
import { RoutineDialog } from "@/components/routine-dialog";
import { TaskDialog } from "@/components/task-dialog";
import { CategoryDialog } from "@/components/category-dialog";
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRIORITY_COLOR: Record<string, string> = {
  high: "#be123c",
  medium: "#b45309",
  low: "#475569",
};
const ROUTINE_COLOR = "#0f766e";

type View = "month" | "week";

function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [offset, setOffset] = useState(0);
  const { data: tasks = [] } = useTasks();
  const { data: routines = [] } = useRoutineEntries();
  const { data: categories = [] } = useCategories();

  const [routineFor, setRoutineFor] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineEntry | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  );

  const anchor = useMemo(() => {
    const base = new Date();
    if (view === "week") return addDays(startOfWeek(base), offset * 7);
    const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    return d;
  }, [view, offset]);

  const days = useMemo(() => {
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
    }
    const first = startOfWeek(anchor);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const total = Math.ceil((last.getTime() - first.getTime()) / 86400000) + 1;
    const weeks = Math.max(5, Math.ceil(total / 7));
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  }, [view, anchor]);

  const todayKey = toDateKey(new Date());
  const monthIndex = anchor.getMonth();

  const heading =
    view === "week"
      ? `${anchor.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(anchor, 6).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function taskColor(task: Task) {
    const cat = task.category_id ? categoryById.get(task.category_id) : null;
    return cat?.color ?? PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR["medium"]!;
  }

  return (
    <div className="enter space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-accent">(03) The week</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tighter">{heading}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => {
                setView("month");
                setOffset(0);
              }}
              className={`px-3 py-1.5 text-xs ${view === "month" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Month
            </button>
            <button
              onClick={() => {
                setView("week");
                setOffset(0);
              }}
              className={`px-3 py-1.5 text-xs ${view === "week" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              Week
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)}>
            ‹
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 1)}>
            ›
          </Button>
        </div>
      </header>

      {/* Category legend */}
      <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
        <span className="label-mono mr-1 text-muted-foreground">Categories</span>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setEditingCategory(category)}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: category.color ?? ROUTINE_COLOR }}
            />
            {category.name}
          </button>
        ))}
        <button
          onClick={() => setNewCategory(true)}
          aria-label="Add category"
          className="flex size-7 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          +
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: ROUTINE_COLOR }} />
          Routine
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="label-mono px-2 py-2 text-center text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const outside = view === "month" && day.getMonth() !== monthIndex;
            const dayRoutines = routines.filter((r) => r.entry_date === key);
            const dayTasks = tasks.filter((t) => t.due_date === key);
            return (
              <div
                key={key}
                className={`group relative min-h-28 border-b border-r border-border p-1.5 ${
                  i % 7 === 6 ? "border-r-0" : ""
                } ${outside ? "bg-muted/30" : ""} ${view === "week" ? "min-h-[22rem]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full font-mono text-xs ${
                      isToday
                        ? "bg-accent text-accent-foreground"
                        : outside
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <button
                    onClick={() => setRoutineFor(key)}
                    aria-label={`Add entry on ${key}`}
                    className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                  >
                    +
                  </button>
                </div>

                <ul className="mt-1 space-y-1">
                  {dayRoutines.map((entry) => (
                    <li key={entry.id}>
                      <button
                        onClick={() => setEditingRoutine(entry)}
                        className="flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] text-white"
                        style={{ backgroundColor: ROUTINE_COLOR }}
                      >
                        <span className="font-mono opacity-80">
                          {formatTime(entry.entry_time) ?? "—"}
                        </span>
                        <span className="truncate">{entry.title}</span>
                      </button>
                    </li>
                  ))}
                  {dayTasks.map((task) => {
                    const color = taskColor(task);
                    return (
                      <li key={task.id}>
                        <button
                          onClick={() => setEditingTask(task)}
                          className={`flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-[11px] ${
                            task.status === "done" ? "line-through opacity-50" : ""
                          }`}
                          style={{ backgroundColor: `${color}1f`, color }}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{task.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
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
      <CategoryDialog open={newCategory} onOpenChange={setNewCategory} />
      <CategoryDialog
        open={editingCategory !== null}
        onOpenChange={(o) => !o && setEditingCategory(null)}
        category={editingCategory}
      />
    </div>
  );
}
