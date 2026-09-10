import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useTasks } from "@/lib/data";
import { useGoals } from "@/lib/goals";
import { useHabits, useJournalEntries } from "@/lib/wellbeing";
import { TaskDialog } from "@/components/task-dialog";
import { RoutineDialog } from "@/components/routine-dialog";
import { GoalDialog } from "@/components/goal-dialog";

const PAGES = [
  { to: "/today", label: "Today" },
  { to: "/tasks", label: "Tasks" },
  { to: "/calendar", label: "Calendar" },
  { to: "/goals", label: "Goals" },
  { to: "/habits", label: "Habits" },
  { to: "/journal", label: "Journal" },
  { to: "/insights", label: "Insights" },
  { to: "/review", label: "Weekly review" },
  { to: "/settings", label: "Settings" },
] as const;

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: habits = [] } = useHabits();
  const { data: entries = [] } = useJournalEntries();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    setTimeout(action, 10);
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tasks, goals, habits, journal…" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>

          <CommandGroup heading="Create">
            <CommandItem onSelect={() => run(() => setTaskOpen(true))}>New task</CommandItem>
            <CommandItem onSelect={() => run(() => setRoutineOpen(true))}>New routine</CommandItem>
            <CommandItem onSelect={() => run(() => setGoalOpen(true))}>New goal</CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            {PAGES.map((page) => (
              <CommandItem
                key={page.to}
                value={`go ${page.label}`}
                onSelect={() => run(() => navigate({ to: page.to }))}
              >
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {tasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 40).map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task ${task.title}`}
                  onSelect={() => run(() => navigate({ to: "/tasks" }))}
                >
                  <span className="truncate">{task.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {goals.length > 0 && (
            <CommandGroup heading="Goals">
              {goals.map((goal) => (
                <CommandItem
                  key={goal.id}
                  value={`goal ${goal.name}`}
                  onSelect={() => run(() => navigate({ to: "/goals" }))}
                >
                  <span className="truncate">{goal.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {habits.length > 0 && (
            <CommandGroup heading="Habits">
              {habits.map((habit) => (
                <CommandItem
                  key={habit.id}
                  value={`habit ${habit.name}`}
                  onSelect={() => run(() => navigate({ to: "/habits" }))}
                >
                  <span className="truncate">{habit.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {entries.length > 0 && (
            <CommandGroup heading="Journal">
              {entries.slice(0, 20).map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={`journal ${entry.entry_date} ${entry.note ?? ""}`}
                  onSelect={() => run(() => navigate({ to: "/journal" }))}
                >
                  <span className="truncate">
                    {entry.entry_date}
                    {entry.note ? ` — ${entry.note}` : ""}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
      <RoutineDialog open={routineOpen} onOpenChange={setRoutineOpen} />
      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} />
    </>
  );
}
