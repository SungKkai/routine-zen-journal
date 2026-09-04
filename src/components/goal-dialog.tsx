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
  GOAL_COLORS,
  GOAL_STATUSES,
  useCreateGoal,
  useDeleteGoal,
  useUpdateGoal,
  type Goal,
  type GoalStatus,
} from "@/lib/goals";

export function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(GOAL_COLORS[0]!);
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setDescription(goal?.description ?? "");
    setColor(goal?.color ?? GOAL_COLORS[0]!);
    setTargetDate(goal?.target_date ?? "");
    setStatus(goal?.status ?? "active");
  }, [open, goal]);

  const saving = createGoal.isPending || updateGoal.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      target_date: targetDate || null,
      status,
    };
    try {
      if (goal) await updateGoal.mutateAsync({ id: goal.id, ...payload });
      else await createGoal.mutateAsync(payload);
      toast.success(goal ? "Goal updated." : "Goal created.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that goal.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>A bigger objective your tasks ladder up to.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ship the thesis"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target date</Label>
              <Input
                id="goal-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as GoalStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={`size-7 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-notes">Notes</Label>
            <Textarea
              id="goal-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this matters, and what done looks like."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {goal ? (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await deleteGoal.mutateAsync(goal.id);
                  toast.success("Goal deleted.");
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving}>
              {goal ? "Save" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
