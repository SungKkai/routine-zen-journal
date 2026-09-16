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
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
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
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("routine_entries")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_entries"] }),
  });
}

export function useUpdateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RoutineEntry> & { id: string }) => {
      const { error } = await supabase.from("routine_entries").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_entries"] }),
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routine_entries").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_entries"] }),
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
