import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharedGoal = {
  name: string;
  description: string | null;
  color: string;
  target_date: string | null;
  status: string;
  owner: string | null;
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
};

/** Public read-only view of one goal, reached only with its secret share token. */
export const getSharedGoal = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(data))
  .handler(async ({ data }): Promise<SharedGoal | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: share } = await supabaseAdmin
      .from("goal_shares")
      .select("goal_id, user_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!share) return null;

    const { data: goal } = await supabaseAdmin
      .from("goals")
      .select("name, description, color, target_date, status")
      .eq("id", share.goal_id)
      .maybeSingle();
    if (!goal) return null;

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, status, due_date")
      .eq("goal_id", share.goal_id)
      .order("due_date", { ascending: true, nullsFirst: false });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", share.user_id)
      .maybeSingle();

    return {
      name: goal.name,
      description: goal.description,
      color: goal.color,
      target_date: goal.target_date,
      status: goal.status,
      owner: profile?.display_name ?? null,
      tasks: tasks ?? [],
    };
  });
