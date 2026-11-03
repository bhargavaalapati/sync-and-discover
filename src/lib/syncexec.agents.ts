import { approvedItems, type Analysis } from "./syncexec";

export type AutonomyMode = "strict" | "assisted" | "sandbox";
export const PIPELINE_ENDS = [800, 1600, 2500, 3200];
export function pipelineStep(elapsed: number) {
  return PIPELINE_ENDS.findIndex((end) => elapsed < end);
}
export function uniqueBy<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => { const value = key(row); if (seen.has(value)) return false; seen.add(value); return true; });
}
export function prepareReview(a: Analysis, mode: AutonomyMode): Analysis {
  if (mode !== "assisted") return a;
  const next = structuredClone(a);
  next.extracted_decisions.forEach((d, i) => { d.checked = !next.conflicts.some((c) => c.related_decision_index === i && c.resolution !== "accepted"); });
  next.action_items.forEach((t, i) => { t.checked = !next.conflicts.some((c) => c.related_task_index === i && c.resolution !== "accepted"); });
  return next;
}
export function executionItems(a: Analysis, mode: AutonomyMode) {
  const approved = approvedItems(a);
  if (mode !== "assisted") return approved;
  return {
    decisions: approved.decisions.filter((d) => !a.conflicts.some((c) => c.resolution !== "accepted" && c.related_decision_index !== null && a.extracted_decisions[c.related_decision_index] === d)),
    tasks: approved.tasks.filter((t) => !a.conflicts.some((c) => c.resolution !== "accepted" && c.related_task_index !== null && a.action_items[c.related_task_index] === t)),
  };
}
export function executionPolicy(mode: AutonomyMode, confirmed: boolean) {
  return { save: confirmed && mode !== "sandbox", webhook: confirmed && mode !== "sandbox" };
}
export function exportReview(a: Analysis, mode: AutonomyMode): Analysis {
  const allowed = executionItems(a, mode);
  return { ...a, extracted_decisions: a.extracted_decisions.map((d) => ({ ...d, checked: allowed.decisions.includes(d) })), action_items: a.action_items.map((t) => ({ ...t, checked: allowed.tasks.includes(t) })) };
}