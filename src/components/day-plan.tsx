import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { planDay, type DayPlan } from "@/lib/planner.functions";
import { useCreateRoutine, type RoutineEntry, type Task } from "@/lib/data";
import { useAiSettings, useJournalEntries } from "@/lib/wellbeing";
import { formatTime, toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function DayPlan({ tasks, routines }: { tasks: Task[]; routines: RoutineEntry[] }) {
  const today = toDateKey(new Date());
  const run = useServerFn(planDay);
  const { data: aiSettings } = useAiSettings();
  const { data: entries = [] } = useJournalEntries();
  const createRoutine = useCreateRoutine();
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const aiName = aiSettings?.assistant_name?.trim() || "Counsel";
  const todayEntry = entries.find((e) => e.entry_date === today);

  async function generate() {
    setBusy(true);
    try {
      const now = new Date();
      const context = [
        `Date: ${today}. Current local time: ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}.`,
        todayEntry?.mood ? `Mood ${todayEntry.mood}/5, energy ${todayEntry.energy ?? "?"}/5.` : "No check-in logged today.",
        "Open tasks:",
        ...(tasks.length
          ? tasks.map(
              (t) =>
                `- ${t.title} (${t.priority} priority${t.due_time ? `, due ${t.due_time.slice(0, 5)}` : ""})`,
            )
          : ["- none"]),
        "Routine blocks already fixed today:",
        ...(routines.length
          ? routines.map(
              (r) =>
                `- ${r.entry_time?.slice(0, 5) ?? "anytime"} ${r.title}${r.duration_minutes ? ` (${r.duration_minutes}m)` : ""}`,
            )
          : ["- none"]),
      ].join("\n");

      const result = await run({
        data: {
          context,
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
      setPlan(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build a plan right now.");
    } finally {
      setBusy(false);
    }
  }

  async function addAll() {
    if (!plan) return;
    try {
      for (const block of plan.blocks) {
        await createRoutine.mutateAsync({
          title: block.title,
          entry_date: today,
          entry_time: /^\d{2}:\d{2}$/.test(block.start) ? `${block.start}:00` : null,
          duration_minutes: block.minutes,
          notes: block.why || null,
          recurrence: "none",
        });
      }
      toast.success("Plan added to today's routine.");
      setPlan(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the plan.");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-mono text-muted-foreground">Plan the day · {aiName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan ? plan.headline : "Turn what's open into a schedule that fits the time you have left."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={plan ? "outline" : "default"} onClick={() => void generate()} disabled={busy}>
            {busy ? "Thinking…" : plan ? "Rebuild" : "Plan my day"}
          </Button>
          {plan && plan.blocks.length > 0 && (
            <Button onClick={() => void addAll()} disabled={createRoutine.isPending}>
              Add to routine
            </Button>
          )}
        </div>
      </div>

      {plan && plan.blocks.length > 0 && (
        <ul className="mt-5 divide-y divide-border border-t border-border">
          {plan.blocks.map((block, i) => (
            <li key={`${block.start}-${i}`} className="flex items-baseline gap-4 py-3">
              <span className="label-mono w-20 shrink-0 text-accent">
                {formatTime(block.start ? `${block.start}:00` : null) ?? "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium break-words">{block.title}</span>
                {block.why && (
                  <span className="mt-0.5 block text-xs break-words text-muted-foreground">{block.why}</span>
                )}
              </span>
              <span className="label-mono shrink-0 text-muted-foreground">{block.minutes}m</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
