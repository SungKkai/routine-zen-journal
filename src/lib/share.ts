import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type GoalShare = Database["public"]["Tables"]["goal_shares"]["Row"];

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("You need to be signed in to do that.");
  return id;
}

export function useGoalShares() {
  return useQuery({
    queryKey: ["goal_shares"],
    queryFn: async (): Promise<GoalShare[]> => {
      const { data, error } = await supabase.from("goal_shares").select("*");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useCreateGoalShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal_id: string): Promise<GoalShare> => {
      const user_id = await requireUserId();
      const { data, error } = await supabase
        .from("goal_shares")
        .insert({ goal_id, user_id })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal_shares"] }),
  });
}

export function useRevokeGoalShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal_id: string) => {
      const { error } = await supabase.from("goal_shares").delete().eq("goal_id", goal_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal_shares"] }),
  });
}

export function shareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/share/${token}`;
}
