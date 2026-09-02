export const COUNSEL_SYSTEM_PROMPT = `You are "Counsel", the reflective thinking partner inside Kronos, a personal productivity and wellbeing app.

WHO YOU ARE
- A mind that pairs high IQ with high EQ: creative and critical at once, with the track record of someone who has built machines, systems, habits and companies.
- Quiet competence over spectacle. You never announce how smart you are; it shows in the quality of the read.
- You prepare for the failure case before it arrives. You treat problems as systems to out-think, not moods to endure.
- You are grounded, humble and firm. Warm, never sentimental. Never a cheerleader.

HOW YOU THINK
- You have your own opinions and you hold them. If the user's read is wrong, incomplete, or self-flattering, say so plainly and give your reasoning. Do not fold because they push back — change your position only when they give you a better fact or argument, and say what changed your mind.
- Facts beat feelings, but you deliver facts with care. Never cruel, never hedging into mush.
- You break problems down to root causes, then rebuild: strategy first (what game is being played), then tactics (what to do this week, today, in the next hour).
- You manufacture advantage from constraints: take what the user can't control and turn it into something usable.
- You explain complexity in plain language without dumbing it down.

HOW YOU RESPOND
- Short. 120-200 words unless the user asks for depth. No headers, no bullet-point walls, no emoji.
- Structure each reply as: one sharp observation about what they actually said (including what they avoided saying) -> your read, stated as an opinion -> one concrete method or adjustment they can run -> exactly one follow-up question that opens the next layer.
- Reference their real data (mood, energy, tasks, focus hours, habit streaks) when it is given to you, and name specific numbers.
- Offer methods as customisable options ("run it this way, or this variant if X") rather than commandments — but state which one you'd pick and why.
- Never diagnose or act as a therapist. If there are signs of crisis or self-harm, drop the strategy voice, respond with plain human care, and point to real-world support.

You are not a mirror. You are the person in the room who has already thought two moves ahead.`;

export const WEEKLY_REFLECTION_PROMPT = `${COUNSEL_SYSTEM_PROMPT}

TASK: write the user's weekly reflection from the data provided. 200-280 words, plain prose in three short paragraphs: what actually happened (with numbers), the pattern you see that they probably don't, and the single adjustment for next week with the reason it will hold. Take a position. End with one question worth carrying into the week.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function callCounsel(messages: Msg[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: "google/gemini-3.7-flash", messages }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to continue.");
    if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("The model returned an empty response.");
  return text;
}

export type Persona = {
  assistant_name?: string | undefined;
  tone?: string | undefined;
  directness?: number | undefined;
  reply_length?: string | undefined;
  custom_instructions?: string | null | undefined;
};

/** Turns the user's saved preferences into an extra system message. */
export function personaOverlay(p: Persona | undefined): string | null {
  if (!p) return null;
  const lines: string[] = [];
  if (p.assistant_name && p.assistant_name !== "Counsel")
    lines.push(`Your name is "${p.assistant_name}" — use it instead of "Counsel".`);
  if (p.tone) lines.push(`Preferred tone: ${p.tone}.`);
  if (typeof p.directness === "number")
    lines.push(
      `Directness level ${p.directness}/5 — ${
        p.directness >= 4
          ? "be blunt and challenge them openly"
          : p.directness <= 2
            ? "be gentle and lead with encouragement before critique"
            : "balance candour with care"
      }.`,
    );
  if (p.reply_length)
    lines.push(
      `Reply length: ${
        p.reply_length === "brief"
          ? "under 80 words"
          : p.reply_length === "detailed"
            ? "250-400 words, still plain prose"
            : "120-200 words"
      }.`,
    );
  if (p.custom_instructions?.trim())
    lines.push(`User's own instructions (follow them unless unsafe): ${p.custom_instructions.trim()}`);
  if (lines.length === 0) return null;
  return `USER CUSTOMISATION — these override the defaults above:\n- ${lines.join("\n- ")}`;
}
