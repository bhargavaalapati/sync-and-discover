import { z } from "zod";

export const conflictTypes = ["DIRECTIONAL_REVERSAL", "METRIC_OR_DATE_SHIFT", "OWNERSHIP_OR_SCOPE_DRIFT"] as const;

export const aiAnalysisSchema = z.object({
  extracted_decisions: z.array(z.object({ speaker: z.string(), decision_text: z.string() })),
  action_items: z.array(z.object({ task: z.string(), owner: z.string(), deadline: z.string() })),
  conflicts: z.array(z.object({
    speaker: z.string(), past_speaker: z.string(), new_statement: z.string(),
    contradicted_decision: z.string(), past_meeting_date: z.string(),
    severity: z.literal("HIGH"), reason: z.string(),
    conflict_type: z.enum(conflictTypes), confidence_score: z.string().regex(/^(100|[1-9]?\d)%$/),
    past_value: z.string().min(1), new_value: z.string().min(1), impacted_task_preview: z.string(),
    related_decision_index: z.number().int().nonnegative().nullable(),
    related_task_index: z.number().int().nonnegative().nullable(),
  })),
}).superRefine((result, ctx) => {
  result.conflicts.forEach((c, i) => {
    if (c.related_decision_index !== null && !result.extracted_decisions[c.related_decision_index])
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conflicts", i], message: "Invalid decision link" });
    if (c.related_task_index !== null && !result.action_items[c.related_task_index])
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["conflicts", i], message: "Invalid task link" });
  });
});