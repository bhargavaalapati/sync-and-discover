import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// All database access goes through these server functions; the tables have no
// public access rules, so the browser cannot read or write them directly.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const str = (max: number) => z.string().max(max);

export const loadAll = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [d, a, m] = await Promise.all([
    db.from("decisions").select("*").order("created_at"),
    db.from("action_items").select("*").order("deadline"),
    db.from("meetings").select("id,date,title"),
  ]);
  return { decisions: d.data ?? [], items: a.data ?? [], meetings: m.data ?? [] };
});

export const seedDemo = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const { error } = await db.rpc("reset_syncexec_demo");
  if (error) throw new Error("Demo reset failed. Existing data was not changed.");
  return { ok: true };
});

export const saveMeeting = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      title: str(300).min(1),
      date: str(20).min(1),
      transcript: str(50000),
      decisions: z.array(z.object({ speaker: str(100), decision_text: str(2000) })).max(200),
      tasks: z.array(z.object({ task: str(2000), owner: str(100), deadline: str(20) })).max(200),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: m, error } = await db.from("meetings").insert({ title: data.title, date: data.date, raw_transcript: data.transcript }).select().single();
    if (error || !m) return { ok: false as const, error: "Save failed" };
    if (data.decisions.length) await db.from("decisions").insert(data.decisions.map((d) => ({ ...d, meeting_id: m.id })));
    if (data.tasks.length) await db.from("action_items").insert(data.tasks.map((t) => ({ ...t, status: "open", synced_to_tracker: true, meeting_id: m.id })));
    return { ok: true as const };
  });

export const setTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ id: z.string().uuid(), status: z.enum(["open", "completed"]) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    await db.from("action_items").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  });
