import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  COUNSEL_SYSTEM_PROMPT,
  WEEKLY_REFLECTION_PROMPT,
  callCounsel,
  personaOverlay,
} from "./journal-ai.server";

const personaSchema = z
  .object({
    assistant_name: z.string().max(40).optional(),
    tone: z.string().max(40).optional(),
    directness: z.number().min(1).max(5).optional(),
    reply_length: z.string().max(20).optional(),
    custom_instructions: z.string().max(2000).nullable().optional(),
  })
  .optional();

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
        persona: personaSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const reply = await callCounsel([
      { role: "system", content: COUNSEL_SYSTEM_PROMPT },
      ...((o) => (o ? [{ role: "system" as const, content: o }] : []))(
        personaOverlay(data.persona),
      ),
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
    z.object({ summary: z.string().min(1).max(6000), persona: personaSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const reply = await callCounsel([
      { role: "system", content: WEEKLY_REFLECTION_PROMPT },
      ...((o) => (o ? [{ role: "system" as const, content: o }] : []))(
        personaOverlay(data.persona),
      ),
      { role: "user", content: data.summary },
    ]);
    return { reply };
  });
