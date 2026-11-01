import { describe, it, expect } from "vitest";
import { deterministicAnalyze, DEMO_TRANSCRIPT, SEED, isUrgent, resolveConflict, approvedItems } from "@/lib/syncexec";
import { aiAnalysisSchema } from "@/lib/syncexec.schema";

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
    const c = r.conflicts.find((c) => /mongo/i.test(c.new_statement));
    expect(c?.related_task_index).toBe(0);
    expect(r.action_items[c?.related_task_index ?? -1]?.task).toMatch(/MongoDB cluster migration/);
  });
  it("urgent = open and due Nov 1 or 2", () => {
    expect(isUrgent({ status: "open", deadline: "2026-11-02" })).toBe(true);
    expect(isUrgent({ status: "open", deadline: "2026-11-05" })).toBe(false);
    expect(isUrgent({ status: "completed", deadline: "2026-11-01" })).toBe(false);
  });
  it("classifies database reversal separately from date and budget shifts", () => {
    expect(r.conflicts.map((c) => c.conflict_type)).toEqual(["METRIC_OR_DATE_SHIFT", "DIRECTIONAL_REVERSAL", "METRIC_OR_DATE_SHIFT"]);
    expect(r.conflicts.map((c) => c.confidence_score)).toEqual(["95%", "98%", "94%"]);
  });
  it("compares the locked PostgreSQL value with proposed MongoDB", () => {
    expect(r.conflicts[1]?.past_value).toBe("Locked: PostgreSQL (Oct 10)");
    expect(r.conflicts[1]?.new_value).toBe("Switch to MongoDB (Nov 5)");
    expect(r.conflicts[1]?.past_speaker).toBe("Rahul (Eng)");
  });
  it("previews the exact impacted task for every demo conflict", () => {
    expect(r.conflicts.map((c) => c.related_task_index)).toEqual([2, 0, 2]);
    r.conflicts.forEach((c) => expect(c.impacted_task_preview).toBe(r.action_items[c.related_task_index ?? -1]?.task));
  });
  it("rejecting MongoDB unchecks and blocks its migration from execution", () => {
    const rejected = resolveConflict(r, 1, "rejected");
    expect(rejected.extracted_decisions[1]?.checked).toBe(false);
    expect(rejected.action_items[0]?.checked).toBe(false);
    const task = rejected.action_items[0];
    if (task) task.checked = true;
    expect(approvedItems(rejected).tasks.map((t) => t.task)).not.toContain(r.action_items[0]?.task);
    expect(approvedItems(rejected).tasks).toHaveLength(2);
  });
  it("accepting one conflict cannot unblock a task still rejected by another", () => {
    const rejected = resolveConflict(r, 0, "rejected");
    const acceptedBudget = resolveConflict(rejected, 2, "accepted");
    expect(acceptedBudget.action_items[2]?.checked).toBe(false);
    expect(approvedItems(acceptedBudget).tasks).toHaveLength(2);
  });
  it("accepts ownership drift but rejects categories outside the three-tier taxonomy", () => {
    const input = { ...r, conflicts: [{ ...r.conflicts[0], conflict_type: "OWNERSHIP_OR_SCOPE_DRIFT" }] };
    expect(aiAnalysisSchema.safeParse(input).success).toBe(true);
    expect(aiAnalysisSchema.safeParse({ ...input, conflicts: [{ ...input.conflicts[0], conflict_type: "OTHER" }] }).success).toBe(false);
  });
});
