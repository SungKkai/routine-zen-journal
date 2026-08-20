import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateRoutine,
  useDeleteRoutine,
  useUpdateRoutine,
  type RoutineEntry,
} from "@/lib/data";
import { toDateKey } from "@/lib/format";

const RECURRENCES = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
] as const;

type Recurrence = (typeof RECURRENCES)[number]["value"];

export function RoutineDialog({
  open,
  onOpenChange,
  entry,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: RoutineEntry | null;
  defaultDate?: string | null;
}) {
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(entry?.title ?? "");
    setDate(entry?.entry_date ?? defaultDate ?? toDateKey(new Date()));
    setTime(entry?.entry_time ? entry.entry_time.slice(0, 5) : "");
    setDuration(entry?.duration_minutes ? String(entry.duration_minutes) : "");
    setRecurrence((entry?.recurrence as Recurrence) ?? "none");
    setNotes(entry?.notes ?? "");
  }, [open, entry, defaultDate]);

  const saving = createRoutine.isPending || updateRoutine.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      entry_date: date,
      entry_time: time || null,
      duration_minutes: duration ? Number(duration) : null,
      recurrence,
      notes: notes.trim() || null,
    };
    try {
      if (entry) await updateRoutine.mutateAsync({ id: entry.id, ...payload });
      else await createRoutine.mutateAsync(payload);
      toast.success(entry ? "Routine updated." : "Routine added.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that entry.");
    }
  }

  async function handleDelete() {
    if (!entry) return;
    try {
      await deleteRoutine.mutateAsync(entry.id);
      toast.success("Routine deleted.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that entry.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit routine" : "New routine entry"}</DialogTitle>
          <DialogDescription>Something you do at a particular time.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="routine-title">Title</Label>
            <Input
              id="routine-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Study block"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="routine-date">Date</Label>
              <Input
                id="routine-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-time">Time</Label>
              <Input
                id="routine-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-duration">Minutes</Label>
              <Input
                id="routine-duration"
                type="number"
                min={0}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Leave the time empty for “anytime today”.</p>

          <div className="space-y-2">
            <Label>Repeats</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routine-notes">Notes</Label>
            <Textarea
              id="routine-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {entry && (
                <Button type="button" variant="ghost" onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Add routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
