import { Pause, Play, Square, Timer as TimerIcon, X } from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { formatClock } from "@/lib/format";

/**
 * Compact focus timer available on every page. Sits above the mobile tab bar
 * and stays out of the way of the quick-add button.
 */
export function TimerBar() {
  const timer = useTimer();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-40 flex justify-center px-4 lg:bottom-6 lg:justify-start lg:pl-6">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md">
        <TimerIcon className="size-4 shrink-0 text-accent" />
        <span className="font-mono text-sm tabular-nums">
          {formatClock(timer.remaining ?? timer.elapsed)}
        </span>
        {timer.taskTitle && (
          <span className="hidden max-w-[12rem] truncate text-xs text-muted-foreground sm:inline">
            {timer.taskTitle}
          </span>
        )}

        <div className="flex items-center gap-1 border-l border-border pl-2">
          {!timer.active ? (
            <>
              <button
                type="button"
                onClick={() => timer.start({})}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Start timer"
              >
                <Play className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => timer.start({ minutes: 25 })}
                className="label-mono rounded-full px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                25m
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={timer.running ? timer.pause : timer.resume}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={timer.running ? "Pause timer" : "Resume timer"}
              >
                {timer.running ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => void timer.stop()}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Stop and save session"
              >
                <Square className="size-4" />
              </button>
              <button
                type="button"
                onClick={timer.discard}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Discard session"
              >
                <X className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
