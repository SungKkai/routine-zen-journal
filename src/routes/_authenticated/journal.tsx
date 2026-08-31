import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { journalReply } from "@/lib/journal-ai.functions";
import {
  MOODS,
  useAddJournalMessage,
  useJournalEntries,
  useJournalMessages,
  useUpsertCheckIn,
} from "@/lib/wellbeing";
import { useTasks } from "@/lib/data";
import { toDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal — Kronos" },
      {
        name: "description",
        content: "Log your mood and energy, then think it through with a sharp AI counterpart.",
      },
      { property: "og:title", content: "Journal — Kronos" },
      {
        property: "og:description",
        content: "Log your mood and energy, then think it through with a sharp AI counterpart.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const today = toDateKey(new Date());
  const { data: entries = [] } = useJournalEntries();
  const { data: tasks = [] } = useTasks();
  const upsert = useUpsertCheckIn();
  const addMessage = useAddJournalMessage();
  const ask = useServerFn(journalReply);

  const todayEntry = useMemo(
    () => entries.find((e) => e.entry_date === today) ?? null,
    [entries, today],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const entryId = activeId ?? todayEntry?.id ?? null;
  const activeEntry = entries.find((e) => e.id === entryId) ?? null;
  const { data: messages = [] } = useJournalMessages(entryId);

  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [closed, setClosed] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (todayEntry && !activeId) {
      setMood(todayEntry.mood);
      setEnergy(todayEntry.energy);
      setNote(todayEntry.note ?? "");
    }
  }, [todayEntry, activeId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, thinking]);

  const contextLine = () => {
    const done = tasks.filter(
      (t) => t.status === "done" && (t.completed_at ?? "").slice(0, 10) === today,
    ).length;
    const open = tasks.filter((t) => t.status !== "done").length;
    return [
      `Date: ${today}`,
      mood ? `Mood: ${mood}/5 (${MOODS.find((m) => m.value === mood)?.label})` : null,
      energy ? `Energy: ${energy}/5` : null,
      `Tasks completed today: ${done}. Open tasks: ${open}.`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  async function converse(entry: string, userText: string) {
    setThinking(true);
    try {
      await addMessage.mutateAsync({ entry_id: entry, role: "user", content: userText });
      const history = [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userText },
      ];
      const { reply } = await ask({ data: { context: contextLine(), messages: history } });
      await addMessage.mutateAsync({ entry_id: entry, role: "assistant", content: reply });
      setClosed(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Counsel couldn't reply right now.");
    } finally {
      setThinking(false);
    }
  }

  async function saveCheckIn() {
    if (!mood) {
      toast.error("Pick a mood first.");
      return;
    }
    try {
      const entry = await upsert.mutateAsync({
        entry_date: today,
        mood,
        energy,
        note: note.trim() || null,
      });
      setActiveId(entry.id);
      if (messages.length === 0) {
        await converse(
          entry.id,
          note.trim() ||
            `Checking in. Mood ${mood}/5${energy ? `, energy ${energy}/5` : ""}. No notes yet.`,
        );
      } else {
        toast.success("Check-in saved.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that check-in.");
    }
  }

  const viewingPast = activeEntry && activeEntry.entry_date !== today;

  return (
    <div className="enter space-y-10">
      <header>
        <p className="label-mono text-accent">(05) Reflect</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tighter">Journal</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Log where you are, then think it through with Counsel — a counterpart with its own read
          on things, not a mirror.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="label-mono text-muted-foreground">Today&apos;s check-in</p>

            <p className="mt-5 text-xs text-muted-foreground">Mood</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    mood === m.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs text-muted-foreground">Energy</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setEnergy(v)}
                  className={`size-8 rounded-full border font-mono text-xs transition-colors ${
                    energy === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's actually going on today?"
              className="mt-5 min-h-28"
            />
            <Button className="mt-4 w-full" onClick={() => void saveCheckIn()} disabled={upsert.isPending || thinking}>
              {todayEntry ? "Update check-in" : "Save & start"}
            </Button>
          </div>

          <div>
            <p className="label-mono text-muted-foreground">History</p>
            <ul className="mt-3 divide-y divide-border border-t border-border">
              {entries.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">No entries yet.</li>
              )}
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setActiveId(e.id)}
                    className={`flex w-full items-baseline gap-3 py-3 text-left ${
                      e.id === entryId ? "" : "opacity-70"
                    }`}
                  >
                    <span className="label-mono w-24 shrink-0 text-accent">{e.entry_date}</span>
                    <span className="flex-1 truncate text-sm">
                      {e.note || MOODS.find((m) => m.value === e.mood)?.label || "Check-in"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="label-mono text-muted-foreground">
              Counsel {activeEntry ? `· ${activeEntry.entry_date}` : ""}
            </p>
            {messages.length > 0 && !closed && (
              <Button size="sm" variant="ghost" onClick={() => setClosed(true)}>
                Done for now
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && !thinking && (
              <p className="text-sm text-muted-foreground">
                Save a check-in to open the conversation. Counsel will push back where it disagrees.
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {thinking && <p className="text-sm text-muted-foreground">Counsel is thinking…</p>}
            <div ref={bottom} />
          </div>

          <div className="border-t border-border p-4">
            {closed ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Closed out. Reopen anytime.</p>
                <Button size="sm" variant="outline" onClick={() => setClosed(false)}>
                  Continue
                </Button>
              </div>
            ) : (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text || !entryId || thinking) return;
                  setDraft("");
                  void converse(entryId, text);
                }}
              >
                <AutoTextarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    viewingPast ? "Continue this past thread…" : "Keep going — or push back."
                  }
                  className="min-h-11 flex-1 resize-none"
                  disabled={!entryId || thinking}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                    }
                  }}
                />
                <Button type="submit" disabled={!entryId || thinking || !draft.trim()}>
                  Send
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
