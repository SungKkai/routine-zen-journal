import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  COUNSEL_SYSTEM_PROMPT,
  WEEKLY_REFLECTION_PROMPT,
  callCounsel,
} from "./journal-ai.server";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const journalReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        context: z.string().max(4000).default(""),
        messages: z.array(messageSchema).min(1).max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const reply = await callCounsel([
      { role: "system", content: COUNSEL_SYSTEM_PROMPT },
      ...(data.context
        ? [{ role: "system" as const, content: `Today's check-in data:\n${data.context}` }]
        : []),
      ...data.messages,
    ]);
    return { reply };
  });

export const weeklyReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ summary: z.string().min(1).max(6000) }).parse(data),
  )
  .handler(async ({ data }) => {
    const reply = await callCounsel([
      { role: "system", content: WEEKLY_REFLECTION_PROMPT },
      { role: "user", content: data.summary },
    ]);
    return { reply };
  });
