import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveTimerSession } from "@/lib/data";

type TimerState = {
  taskId: string | null;
  taskTitle: string | null;
  countdownSeconds: number | null;
  sessionStart: string | null;
  runningSince: number | null;
  accumulated: number;
};

const EMPTY: TimerState = {
  taskId: null,
  taskTitle: null,
  countdownSeconds: null,
  sessionStart: null,
  runningSince: null,
  accumulated: 0,
};

const STORAGE_KEY = "kronos.timer";

type TimerContextValue = {
  active: boolean;
  running: boolean;
  elapsed: number;
  remaining: number | null;
  taskId: string | null;
  taskTitle: string | null;
  start: (opts?: { taskId?: string | null; taskTitle?: string | null; minutes?: number | null }) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  discard: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(EMPTY);
  const [now, setNow] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as TimerState);
    } catch {
      /* ignore malformed state */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  useEffect(() => {
    if (state.runningSince === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [state.runningSince]);

  const elapsed =
    state.accumulated + (state.runningSince !== null ? Math.floor((now - state.runningSince) / 1000) : 0);

  const start = useCallback<TimerContextValue["start"]>((opts) => {
    setNow(Date.now());
    setState({
      taskId: opts?.taskId ?? null,
      taskTitle: opts?.taskTitle ?? null,
      countdownSeconds: opts?.minutes ? opts.minutes * 60 : null,
      sessionStart: new Date().toISOString(),
      runningSince: Date.now(),
      accumulated: 0,
    });
  }, []);

  const pause = useCallback(() => {
    setState((s) =>
      s.runningSince === null
        ? s
        : {
            ...s,
            accumulated: s.accumulated + Math.floor((Date.now() - s.runningSince) / 1000),
            runningSince: null,
          },
    );
  }, []);

  const resume = useCallback(() => {
    setNow(Date.now());
    setState((s) => (s.sessionStart && s.runningSince === null ? { ...s, runningSince: Date.now() } : s));
  }, []);

  const stop = useCallback(async () => {
    const snapshot = state;
    const total =
      snapshot.accumulated +
      (snapshot.runningSince !== null ? Math.floor((Date.now() - snapshot.runningSince) / 1000) : 0);
    setState(EMPTY);
    if (!snapshot.sessionStart || total < 5) return;
    try {
      await saveTimerSession({
        task_id: snapshot.taskId,
        started_at: snapshot.sessionStart,
        ended_at: new Date().toISOString(),
        duration_seconds: total,
      });
      queryClient.invalidateQueries({ queryKey: ["timer_sessions"] });
      const mins = Math.round(total / 60);
      toast.success(`Session saved — ${mins < 1 ? "under a minute" : `${mins} min`} focused.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that session.");
    }
  }, [state, queryClient]);

  const discard = useCallback(() => setState(EMPTY), []);

  const remaining =
    state.countdownSeconds !== null ? Math.max(0, state.countdownSeconds - elapsed) : null;

  return (
    <TimerContext.Provider
      value={{
        active: state.sessionStart !== null,
        running: state.runningSince !== null,
        elapsed,
        remaining,
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        start,
        pause,
        resume,
        stop,
        discard,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
