import { describe, it, expect } from "vitest";
import { deterministicAnalyze, DEMO_TRANSCRIPT, SEED, isUrgent } from "@/lib/syncexec";

const history = SEED.flatMap((m) => m.decisions.map((d, i) => ({ id: String(i), meeting_id: null, created_at: m.date, ...d })));

describe("deterministic parser", () => {
  const r = deterministicAnalyze(DEMO_TRANSCRIPT, history);
  it("flags the 3 conflicts", () => {
    expect(r.conflicts.map((c) => c.past_meeting_date)).toEqual(["2026-10-10", "2026-10-10", "2026-10-20"]);
  });
  it("extracts 3 tasks with deadlines", () => {
    expect(r.action_items.map((t) => t.deadline)).toEqual(["2026-11-05", "2026-11-01", "2026-11-02"]);
  });
  it("links the MongoDB conflict to the migration task", () => {
    const c = r.conflicts.find((c) => /mongo/i.test(c.new_statement))!;
    expect(r.action_items[c.related_task_index!]?.task).toMatch(/MongoDB cluster migration/);
  });
  it("urgent = open and due Nov 1 or 2", () => {
    expect(isUrgent({ status: "open", deadline: "2026-11-02" })).toBe(true);
    expect(isUrgent({ status: "open", deadline: "2026-11-05" })).toBe(false);
    expect(isUrgent({ status: "completed", deadline: "2026-11-01" })).toBe(false);
  });
});
