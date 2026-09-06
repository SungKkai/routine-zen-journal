import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DAY_PLAN_PROMPT, TASK_EXTRACT_PROMPT, callJson } from "./planner.server";

const personaSchema = z
  .object({
    assistant_name: z.string().max(40).optional(),
    tone: z.string().max(40).optional(),
    directness: z.number().min(1).max(5).optional(),
    reply_length: z.string().max(20).optional(),
    custom_instructions: z.string().max(2000).nullable().optional(),
  })
  .optional();

export type PlanBlock = { start: string; minutes: number; title: string; why: string };
export type DayPlan = { headline: string; blocks: PlanBlock[] };
export type SuggestedTask = { title: string; priority: "low" | "medium" | "high"; why: string };

export const planDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ context: z.string().min(1).max(6000), persona: personaSchema }).parse(data),
  )
  .handler(async ({ data }): Promise<DayPlan> => {
    const plan = await callJson<Partial<DayPlan>>(DAY_PLAN_PROMPT, data.context, data.persona);
    return {
      headline: typeof plan.headline === "string" ? plan.headline : "Here's a workable shape for today.",
      blocks: Array.isArray(plan.blocks)
        ? plan.blocks
            .filter((b) => b && typeof b.title === "string")
            .slice(0, 8)
            .map((b) => ({
              start: String(b.start ?? "").slice(0, 5),
              minutes: Number.isFinite(Number(b.minutes)) ? Math.max(5, Math.min(240, Number(b.minutes))) : 30,
              title: String(b.title).slice(0, 120),
              why: String(b.why ?? "").slice(0, 160),
            }))
        : [],
    };
  });

export const extractTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ transcript: z.string().min(1).max(12000), persona: personaSchema }).parse(data),
  )
  .handler(async ({ data }): Promise<{ tasks: SuggestedTask[] }> => {
    const out = await callJson<{ tasks?: SuggestedTask[] }>(
      TASK_EXTRACT_PROMPT,
      data.transcript,
      data.persona,
    );
    const tasks = Array.isArray(out.tasks) ? out.tasks : [];
    return {
      tasks: tasks
        .filter((t) => t && typeof t.title === "string" && t.title.trim())
        .slice(0, 6)
        .map((t) => ({
          title: String(t.title).trim().slice(0, 120),
          priority: t.priority === "high" || t.priority === "low" ? t.priority : "medium",
          why: String(t.why ?? "").slice(0, 200),
        })),
    };
  });
