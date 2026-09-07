import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { extractTasks, type SuggestedTask } from "@/lib/planner.functions";
import { useCreateTask } from "@/lib/data";
import { useAiSettings } from "@/lib/wellbeing";
import { toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Message = { role: string; content: string };

/** Turns a journal conversation into concrete, addable tasks. */
export function JournalTasks({ messages }: { messages: Message[] }) {
  const run = useServerFn(extractTasks);
  const createTask = useCreateTask();
  const { data: aiSettings } = useAiSettings();
  const [suggestions, setSuggestions] = useState<SuggestedTask[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (messages.length === 0) return null;

  async function suggest() {
    setBusy(true);
    try {
      const transcript = messages
        .map((m) => `${m.role === "assistant" ? "Counsel" : "Me"}: ${m.content}`)
        .join("\n")
        .slice(-11000);
      const { tasks } = await run({
        data: {
          transcript,
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
      setSuggestions(tasks);
      if (tasks.length === 0) toast.message("Nothing actionable in there yet.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function add(task: SuggestedTask) {
    try {
      await createTask.mutateAsync({
        title: task.title,
        priority: task.priority,
        due_date: toDateKey(new Date()),
      });
      setSuggestions((prev) => prev?.filter((t) => t.title !== task.title) ?? null);
      toast.success("Task added to today.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that task.");
    }
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-mono text-muted-foreground">Make it actionable</p>
        <Button size="sm" variant="outline" onClick={() => void suggest()} disabled={busy}>
          {busy ? "Reading…" : suggestions ? "Re-read" : "Turn this into tasks"}
        </Button>
      </div>

      {suggestions && suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((task) => (
            <li key={task.title} className="flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium">{task.title}</span>
                {task.why && (
                  <span className="mt-0.5 block break-words text-xs text-muted-foreground">
                    {task.priority} · {task.why}
                  </span>
                )}
              </span>
              <Button size="sm" variant="ghost" onClick={() => void add(task)}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
