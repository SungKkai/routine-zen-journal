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
  PRIORITIES,
  STATUSES,
  useCategories,
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  type Priority,
  type Status,
  type Task,
} from "@/lib/data";
import { useTimer } from "@/components/timer-provider";
import { CategoryDialog } from "@/components/category-dialog";
import { useGoals } from "@/lib/goals";

const NO_CATEGORY = "__none__";
const NO_GOAL = "__none__";

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultDate,
  defaultGoalId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultDate?: string | null;
  defaultGoalId?: string | null;
}) {
  const { data: categories = [] } = useCategories();
  const { data: goals = [] } = useGoals();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const timer = useTimer();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("not_started");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [goalId, setGoalId] = useState<string>(NO_GOAL);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "not_started");
    setCategoryId(task?.category_id ?? NO_CATEGORY);
    setDueDate(task?.due_date ?? defaultDate ?? "");
    setDueTime(task?.due_time ? task.due_time.slice(0, 5) : "");
    setGoalId(task?.goal_id ?? defaultGoalId ?? NO_GOAL);
  }, [open, task, defaultDate, defaultGoalId]);

  const saving = createTask.isPending || updateTask.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      category_id: categoryId === NO_CATEGORY ? null : categoryId,
      goal_id: goalId === NO_GOAL ? null : goalId,
      due_date: dueDate || null,
      due_time: dueTime || null,
      completed_at: status === "done" ? (task?.completed_at ?? new Date().toISOString()) : null,
    };
    try {
      if (task) await updateTask.mutateAsync({ id: task.id, ...payload });
      else await createTask.mutateAsync(payload);
      toast.success(task ? "Task updated." : "Task added.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that task.");
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete that task.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Something you need to accomplish.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finish chapter 2"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: c.color ?? "#c2410c" }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Add category"
                  onClick={() => setCategoryOpen(true)}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Goal</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GOAL}>No goal</SelectItem>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: g.color }}
                        />
                        {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-date">Due date</Label>
              <Input
                id="task-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-time">Due time</Label>
              <Input
                id="task-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {task && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Anything worth remembering"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {task && (
                <>
                  <Button type="button" variant="ghost" onClick={handleDelete}>
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      timer.start({ taskId: task.id, taskTitle: task.title });
                      onOpenChange(false);
                      toast.success("Timer started.");
                    }}
                  >
                    Start timer
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : task ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
        <CategoryDialog
          open={categoryOpen}
          onOpenChange={setCategoryOpen}
          onCreated={(c) => setCategoryId(c.id)}
        />
      </DialogContent>
    </Dialog>
  );
}
