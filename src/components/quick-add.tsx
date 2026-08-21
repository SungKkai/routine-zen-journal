import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskDialog } from "@/components/task-dialog";
import { RoutineDialog } from "@/components/routine-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuickAdd() {
  const [taskOpen, setTaskOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Quick add"
          className="fixed bottom-6 right-6 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
        >
          <Plus className="size-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-44">
          <DropdownMenuItem onSelect={() => setTaskOpen(true)}>New task</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRoutineOpen(true)}>New routine</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
      <RoutineDialog open={routineOpen} onOpenChange={setRoutineOpen} />
    </>
  );
}
