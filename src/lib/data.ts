import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isOffline, localId, queueMutation, type SyncTable } from "@/lib/sync-queue";

type Tables = Database["public"]["Tables"];

export type Task = Tables["tasks"]["Row"];
export type TaskInsert = Omit<Tables["tasks"]["Insert"], "user_id">;
export type Category = Tables["categories"]["Row"];
export type RoutineEntry = Tables["routine_entries"]["Row"];
export type RoutineInsert = Omit<Tables["routine_entries"]["Insert"], "user_id">;
export type TimerSession = Tables["timer_sessions"]["Row"];
export type Profile = Tables["profiles"]["Row"];

export type Priority = Database["public"]["Enums"]["task_priority"];
export type Status = Database["public"]["Enums"]["task_status"];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function statusLabel(status: Status) {
  return STATUSES.find((s) => s.value === status)?.label ?? status;
}

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("You need to be signed in to do that.");
  return id;
}

/** Last signed-in user id, cached so offline edits can still be attributed. */
async function offlineUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (id) {
      window.localStorage.setItem("kronos.user-id", id);
      return id;
    }
  } catch {
    /* fall back to the cached id */
  }
  const cached = window.localStorage.getItem("kronos.user-id");
  if (!cached) throw new Error("You need to be signed in to do that.");
  return cached;
}

/* -------------------------- offline cache helpers -------------------------- */

const KEYS: Record<SyncTable, string> = { tasks: "tasks", routine_entries: "routine_entries" };

function cacheInsert<T extends { id: string }>(qc: QueryClient, table: SyncTable, row: T) {
  qc.setQueryData<T[]>([KEYS[table]], (rows = []) => [row, ...rows]);
}

function cacheUpdate<T extends { id: string }>(
  qc: QueryClient,
  table: SyncTable,
  id: string,
  patch: Partial<T>,
) {
  qc.setQueryData<T[]>([KEYS[table]], (rows = []) =>
    rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  );
}

function cacheDelete<T extends { id: string }>(qc: QueryClient, table: SyncTable, id: string) {
  qc.setQueryData<T[]>([KEYS[table]], (rows = []) => rows.filter((row) => row.id !== id));
}

/* ---------------------------------- tasks --------------------------------- */

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInsert) => {
      if (isOffline()) {
        const user_id = await offlineUserId();
        const row = {
          id: localId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
          category_id: null,
          goal_id: null,
          description: null,
          due_date: null,
          due_time: null,
          duration_minutes: null,
          priority: "medium" as Priority,
          status: "not_started" as Status,
          ...input,
          user_id,
        } as Task;
        queueMutation({
          table: "tasks",
          op: "insert",
          rowId: row.id,
          payload: { ...input, user_id },
        });
        cacheInsert<Task>(qc, "tasks", row);
        return row;
      }
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      if (isOffline()) {
        queueMutation({ table: "tasks", op: "update", rowId: id, payload: patch });
        cacheUpdate<Task>(qc, "tasks", id, patch);
        return null;
      }
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        queueMutation({ table: "tasks", op: "delete", rowId: id });
        cacheDelete<Task>(qc, "tasks", id);
        return;
      }
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/* -------------------------------- categories ------------------------------- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; color?: string }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/* ------------------------------ routine entries ----------------------------- */

export function useRoutineEntries() {
  return useQuery({
    queryKey: ["routine_entries"],
    queryFn: async (): Promise<RoutineEntry[]> => {
      const { data, error } = await supabase
        .from("routine_entries")
        .select("*")
        .order("entry_date", { ascending: true })
        .order("entry_time", { ascending: true, nullsFirst: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoutineInsert) => {
      if (isOffline()) {
        const user_id = await offlineUserId();
        const row = {
          id: localId(),
          created_at: new Date().toISOString(),
          entry_time: null,
          duration_minutes: null,
          notes: null,
          ...input,
          user_id,
        } as RoutineEntry;
        queueMutation({
          table: "routine_entries",
          op: "insert",
          rowId: row.id,
          payload: { ...input, user_id },
        });
        cacheInsert<RoutineEntry>(qc, "routine_entries", row);
        return row;
      }
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("routine_entries")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["routine_entries"] });
    },
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RoutineEntry> & { id: string }) => {
      if (isOffline()) {
        queueMutation({ table: "routine_entries", op: "update", rowId: id, payload: patch });
        cacheUpdate<RoutineEntry>(qc, "routine_entries", id, patch);
        return;
      }
      const { error } = await supabase.from("routine_entries").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["routine_entries"] });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        queueMutation({ table: "routine_entries", op: "delete", rowId: id });
        cacheDelete<RoutineEntry>(qc, "routine_entries", id);
        return;
      }
      const { error } = await supabase.from("routine_entries").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (!isOffline()) qc.invalidateQueries({ queryKey: ["routine_entries"] });
    },
  });
}

/* ------------------------------ timer sessions ------------------------------ */

export function useTimerSessions() {
  return useQuery({
    queryKey: ["timer_sessions"],
    queryFn: async (): Promise<TimerSession[]> => {
      const { data, error } = await supabase
        .from("timer_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export async function saveTimerSession(input: {
  task_id: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
}) {
  const user_id = await requireUserId();
  const { error } = await supabase.from("timer_sessions").insert({ ...input, user_id });
  if (error) throw new Error(error.message);
}

/* --------------------------------- profile --------------------------------- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { display_name?: string | null }) => {
      const user_id = await requireUserId();
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id, ...patch }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
