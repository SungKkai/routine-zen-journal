import { COUNSEL_SYSTEM_PROMPT, callCounsel, personaOverlay, type Persona } from "./journal-ai.server";

export const DAY_PLAN_PROMPT = `${COUNSEL_SYSTEM_PROMPT}

TASK: build a realistic plan for the rest of today from the data given.
Return ONLY a JSON object, no prose, no markdown fences, shaped exactly:
{"headline":"one short sentence naming the day's real priority","blocks":[{"start":"HH:MM","minutes":45,"title":"what they do","why":"one short clause"}]}
Rules: 3-6 blocks, ordered by time, never overlapping existing routine blocks, respect the current local time (do not schedule the past), keep total load honest for the stated energy level, include one break if the plan runs over three hours.`;

export const TASK_EXTRACT_PROMPT = `${COUNSEL_SYSTEM_PROMPT}

TASK: read the journal conversation and pull out the concrete, actionable commitments hiding in it.
Return ONLY a JSON object, no prose, no markdown fences, shaped exactly:
{"tasks":[{"title":"short imperative task","priority":"low|medium|high","why":"one short clause quoting their own framing"}]}
Rules: at most 6 tasks, skip vague intentions that cannot be finished in a sitting, no duplicates of tasks already listed as open, titles under 70 characters.`;

/** Calls the model and parses the JSON object it returns, tolerating stray fences. */
export async function callJson<T>(system: string, user: string, persona?: Persona): Promise<T> {
  const overlay = personaOverlay(persona);
  const raw = await callCounsel([
    { role: "system", content: system },
    ...(overlay ? [{ role: "system" as const, content: overlay }] : []),
    { role: "user", content: user },
  ]);

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The model returned an unexpected response.");
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    throw new Error("The model returned an unexpected response.");
  }
}
