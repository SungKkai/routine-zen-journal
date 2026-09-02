import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { addDays, toDateKey } from "./format";

type Tables = Database["public"]["Tables"];

export type JournalEntry = Tables["journal_entries"]["Row"];
export type JournalMessage = Tables["journal_messages"]["Row"];
export type Habit = Tables["habits"]["Row"];
export type HabitLog = Tables["habit_logs"]["Row"];
export type Reflection = Tables["reflections"]["Row"];
export type Cadence = Database["public"]["Enums"]["recurrence"];

export const MOODS = [
  { value: 1, label: "Rough" },
  { value: 2, label: "Low" },
  { value: 3, label: "Even" },
  { value: 4, label: "Good" },
  { value: 5, label: "Sharp" },
] as const;

export const HABIT_COLORS = [
  "#c2410c",
  "#0f766e",
  "#1d4ed8",
  "#7c3aed",
  "#b91c1c",
  "#4d7c0f",
  "#a16207",
  "#475569",
];

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("You need to be signed in to do that.");
  return id;
}

/* -------------------------------- journal -------------------------------- */

export function useJournalEntries() {
  return useQuery({
    queryKey: ["journal_entries"],
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .limit(120);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useJournalMessages(entryId: string | null) {
  return useQuery({
    queryKey: ["journal_messages", entryId],
    enabled: !!entryId,
    queryFn: async (): Promise<JournalMessage[]> => {
      const { data, error } = await supabase
        .from("journal_messages")
        .select("*")
        .eq("entry_id", entryId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useUpsertCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entry_date: string;
      mood: number | null;
      energy: number | null;
      note?: string | null;
    }): Promise<JournalEntry> => {
      const user_id = await requireUserId();
      const { data: existing } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("entry_date", input.entry_date)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("journal_entries")
          .update(input)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal_entries"] }),
  });
}

export function useAddJournalMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entry_id: string;
      role: "user" | "assistant";
      content: string;
    }) => {
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("journal_messages")
        .insert({ ...input, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (row) =>
      qc.invalidateQueries({ queryKey: ["journal_messages", row.entry_id] }),
  });
}

/* --------------------------------- habits -------------------------------- */

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useHabitLogs() {
  return useQuery({
    queryKey: ["habit_logs"],
    queryFn: async (): Promise<HabitLog[]> => {
      const since = toDateKey(addDays(new Date(), -120));
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .gte("log_date", since)
        .order("log_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; cadence: Cadence }) => {
      const user_id = await requireUserId();
      const { error } = await supabase.from("habits").insert({ ...input, user_id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Habit>) => {
      const { error } = await supabase.from("habits").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habit_logs"] });
    },
  });
}

export function useToggleHabitLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      habit_id,
      log_date,
      done,
    }: {
      habit_id: string;
      log_date: string;
      done: boolean;
    }) => {
      if (!done) {
        const { error } = await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habit_id)
          .eq("log_date", log_date);
        if (error) throw new Error(error.message);
        return;
      }
      const user_id = await requireUserId();
      const { error } = await supabase
        .from("habit_logs")
        .upsert({ habit_id, log_date, user_id }, { onConflict: "habit_id,log_date" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_logs"] }),
  });
}

/** Consecutive days (ending today or yesterday) with a log. */
export function streakFor(logs: HabitLog[], habitId: string) {
  const dates = new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.log_date));
  if (dates.size === 0) return 0;
  const today = new Date();
  let cursor = dates.has(toDateKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/* ------------------------------- reflections ------------------------------ */

export function useReflections() {
  return useQuery({
    queryKey: ["reflections"],
    queryFn: async (): Promise<Reflection[]> => {
      const { data, error } = await supabase
        .from("reflections")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(12);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useSaveReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { week_start: string; content: string }) => {
      const user_id = await requireUserId();
      const { error } = await supabase
        .from("reflections")
        .upsert({ ...input, user_id }, { onConflict: "user_id,week_start" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reflections"] }),
  });
}

/* ------------------------------ ai settings ------------------------------ */

export type AiSettings = Tables["ai_settings"]["Row"];

export const AI_TONES = ["grounded", "warm", "clinical", "playful", "stoic"] as const;
export const AI_LENGTHS = ["brief", "short", "detailed"] as const;

export function useAiSettings() {
  return useQuery({
    queryKey: ["ai_settings"],
    queryFn: async (): Promise<AiSettings | null> => {
      const { data, error } = await supabase.from("ai_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useSaveAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assistant_name: string;
      tone: string;
      directness: number;
      reply_length: string;
      custom_instructions: string | null;
    }) => {
      const user_id = await requireUserId();
      const { error } = await supabase
        .from("ai_settings")
        .upsert({ ...input, user_id }, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_settings"] }),
  });
}

/* --------------------------- journal history ----------------------------- */

export function useClearJournalMessages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from("journal_messages").delete().eq("entry_id", entryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, entryId) =>
      qc.invalidateQueries({ queryKey: ["journal_messages", entryId] }),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error: mErr } = await supabase
        .from("journal_messages")
        .delete()
        .eq("entry_id", entryId);
      if (mErr) throw new Error(mErr.message);
      const { error } = await supabase.from("journal_entries").delete().eq("id", entryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal_entries"] }),
  });
}

export function useDeleteAllJournalHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const user_id = await requireUserId();
      const { error: mErr } = await supabase
        .from("journal_messages")
        .delete()
        .eq("user_id", user_id);
      if (mErr) throw new Error(mErr.message);
      const { error } = await supabase.from("journal_entries").delete().eq("user_id", user_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal_entries"] });
      qc.invalidateQueries({ queryKey: ["journal_messages"] });
    },
  });
}
