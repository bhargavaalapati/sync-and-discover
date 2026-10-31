import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const analyzeWithAI = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ transcript: z.string().min(1).max(50000), history: z.array(z.object({ speaker: z.string(), decision_text: z.string() })) }).parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "AI not configured" };
    const prompt = `You are a meeting governance agent. Historical decisions:\n${data.history.map((h, i) => `${i + 1}. ${h.speaker}: ${h.decision_text}`).join("\n")}\n\nNew transcript:\n${data.transcript}\n\nReturn strict JSON: {"extracted_decisions":[{"speaker","decision_text"}],"action_items":[{"task","owner","deadline"}],"conflicts":[{"speaker","new_statement","contradicted_decision","past_meeting_date","severity":"HIGH","reason","related_decision_index","related_task_index"}]}. Use full speaker labels like "Priya (PM)". Deadlines as YYYY-MM-DD. related_*_index are 0-based indexes into your extracted arrays or null. Flag every new decision that contradicts a historical one.`;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
      });
      if (!res.ok) return { ok: false as const, error: `AI error ${res.status}` };
      const json = await res.json();
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
      return { ok: true as const, result: parsed as { extracted_decisions: any[]; action_items: any[]; conflicts: any[] } };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const postWebhook = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ url: z.string().url().startsWith("https://"), payload: z.record(z.string(), z.any()) }).parse(i))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data.payload) });
      const text = (await res.text()).slice(0, 200);
      return { ok: res.ok, status: res.status, body: text };
    } catch (e) {
      return { ok: false, status: 0, body: (e as Error).message };
    }
  });
