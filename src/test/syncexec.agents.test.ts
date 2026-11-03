import { describe, it, expect } from "vitest";
import { DEMO_TRANSCRIPT, SEED, deterministicAnalyze, resolveConflict } from "@/lib/syncexec";
import { executionItems, executionPolicy, pipelineStep, prepareReview, uniqueBy } from "@/lib/syncexec.agents";

const history = SEED.flatMap((m) => m.decisions.map((d, i) => ({ ...d, id: `${m.date}-${i}`, meeting_id: null, created_at: m.date })));
const analysis = deterministicAnalyze(DEMO_TRANSCRIPT, history);
describe("agent execution guardrails", () => {
  it("contains exactly 2 historical meetings, 4 governing decisions and 4 tasks", () => {
    expect(SEED.map((m) => m.date)).toEqual(["2026-10-10", "2026-10-20"]);
    expect(history).toHaveLength(4);
    expect(SEED.flatMap((m) => m.tasks)).toHaveLength(4);
  });
  it("deduplicates decisions by decision_text and tasks by task", () => {
    expect(uniqueBy([...history, ...history], (d) => d.decision_text)).toHaveLength(4);
    const tasks = SEED.flatMap((m) => m.tasks);
    expect(uniqueBy([...tasks, ...tasks], (t) => t.task)).toHaveLength(4);
  });
  it("strict mode cannot save or send before explicit confirmation", () => {
    expect(executionPolicy("strict", false)).toEqual({ save: false, webhook: false });
    expect(executionPolicy("strict", true)).toEqual({ save: true, webhook: true });
  });
  it("assisted mode only prechecks non-conflicting tasks and holds pending conflicts", () => {
    const prepared = prepareReview(analysis, "assisted");
    expect(prepared.action_items.map((t) => t.checked)).toEqual([false, true, false]);
    expect(prepared.extracted_decisions.map((d) => d.checked)).toEqual([false, false, false]);
    prepared.action_items.forEach((t) => { t.checked = true; });
    expect(executionItems(prepared, "assisted").tasks.map((t) => t.task)).toEqual(["Patch the staging CORS headers"]);
  });
  it("accepting a budget change cannot unblock a task with a pending timeline conflict", () => {
    const accepted = resolveConflict(prepareReview(analysis, "assisted"), 2, "accepted");
    expect(executionItems(accepted, "assisted").tasks.map((t) => t.task)).toEqual(["Patch the staging CORS headers"]);
  });
  it("sandbox disables both database execution and live webhooks even after confirmation", () => {
    expect(executionPolicy("sandbox", true)).toEqual({ save: false, webhook: false });
  });
  it("advances at 800, 1600, 2500 and completes at 3200 milliseconds", () => {
    expect([0, 800, 1600, 2500, 3199, 3200].map(pipelineStep)).toEqual([0, 1, 2, 3, 3, -1]);
  });
});