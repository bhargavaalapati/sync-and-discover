import { describe, expect, it } from "vitest";
import { approvedItems, DEMO_TRANSCRIPT, deterministicAnalyze, resolveConflict, SEED, type Decision } from "@/lib/syncexec";
import { confirmationPayload, governingBrief, tasksMarkdown } from "@/lib/syncexec.exports";

const history: Decision[] = SEED.flatMap((m) => m.decisions.map((d, i) => ({ ...d, id: `${m.date}-${i}`, meeting_id: null, created_at: `${m.date}T10:00:00Z` })));
const analyzed = deterministicAnalyze(DEMO_TRANSCRIPT, history);

describe("approved webhook and export contract", () => {
  it("retains all seven webhook fields and adds identical slack_text", () => {
    const payload = confirmationPayload(analyzed, "Emergency Pre-Launch Sync", "2026-10-31");
    expect(Object.keys(payload)).toEqual(["event_type", "meeting_title", "meeting_date", "approved_decisions", "approved_tasks", "target_person", "digest_summary", "slack_text"]);
    expect(payload.meeting_title).toBe("Emergency Pre-Launch Sync");
    expect(payload.meeting_date).toBe("2026-10-31");
    expect(payload.slack_text).toBe(payload.digest_summary);
  });
  it("blocks rejected migration work from webhook and task-table export even if checked", () => {
    const rejected = resolveConflict(analyzed, 1, "rejected");
    const migration = rejected.action_items[0];
    if (!migration) throw new Error("Missing demo migration");
    migration.checked = true;
    const payload = confirmationPayload(rejected, "Sync", "2026-10-31");
    expect(payload.approved_tasks).toHaveLength(2);
    expect(payload.approved_tasks.map((t) => t.task)).not.toContain(migration.task);
    expect(tasksMarkdown(approvedItems(rejected).tasks)).not.toContain(migration.task);
    expect(payload.approved_decisions).toHaveLength(2);
  });
});

describe("active governing pre-read", () => {
  it("includes Oct 10 architecture and timeline and Oct 20 budget and security", () => {
    const brief = governingBrief(history, []);
    expect(brief.sections.map((s) => [s.category, s.entries.map((e) => e.date)])).toEqual([
      ["Architecture", ["2026-10-10"]], ["Timeline", ["2026-10-10"]],
      ["Budget", ["2026-10-20"]], ["Security", ["2026-10-20"]],
    ]);
  });
  it("accepted Oct 31 changes supersede older values, regardless of array order", () => {
    const latest: Decision = { id: "latest", meeting_id: "sync", speaker: "Priya (PM)", decision_text: "[2026-10-31] Public beta launch date is November 25, 2026.", created_at: "2026-11-01T10:00:00Z" };
    const brief = governingBrief([latest, ...history], []);
    expect(brief.sections[1]?.entries.map((e) => e.decision.id)).toEqual(["latest"]);
    expect(brief.decisions).toHaveLength(4);
  });
  it("rejected Oct 31 changes do not replace historical governing decisions", () => {
    const rejected = analyzed.conflicts.reduce((a, _, i) => resolveConflict(a, i, "rejected"), analyzed);
    const saved: Decision[] = approvedItems(rejected).decisions.map((d, i) => ({ id: `saved-${i}`, meeting_id: null, speaker: d.speaker, decision_text: `[2026-10-31] ${d.decision_text}`, created_at: "2026-11-01T10:00:00Z" }));
    expect(governingBrief([...history, ...saved], []).decisions).toEqual(history.slice().sort((a, b) => {
      const order = ["2026-10-10-0", "2026-10-10-1", "2026-10-20-0", "2026-10-20-1"];
      return order.indexOf(a.id) - order.indexOf(b.id);
    }));
  });
});