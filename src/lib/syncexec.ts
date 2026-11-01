// Pure helpers for SyncExec: types, seed data, deterministic transcript parser.
import { conflictTypes } from "./syncexec.schema";

export type Decision = { id: string; meeting_id: string | null; speaker: string; decision_text: string; created_at: string };
export type ActionItem = {
  id: string; meeting_id: string | null; task: string; owner: string; deadline: string | null;
  status: string; synced_to_tracker: boolean;
};
export type ExtractedDecision = { speaker: string; decision_text: string; checked: boolean };
export type ExtractedTask = { task: string; owner: string; deadline: string; checked: boolean };
export type Conflict = {
  speaker: string; new_statement: string; contradicted_decision: string; past_meeting_date: string;
  past_speaker: string; conflict_type: typeof conflictTypes[number]; confidence_score: string;
  past_value: string; new_value: string; impacted_task_preview: string;
  severity: "HIGH"; reason: string; related_decision_index: number | null; related_task_index: number | null;
  resolution?: "accepted" | "rejected";
};
export type Analysis = { extracted_decisions: ExtractedDecision[]; action_items: ExtractedTask[]; conflicts: Conflict[]; source: "ai" | "parser" };

export const TODAY = "2026-10-31";
export const DEFAULT_WEBHOOK = "https://hook.eu1.make.com/kh7belyva5g5qdosmt7yj4ram8k90jo0";

export const DEMO_TRANSCRIPT = `Priya (PM): Okay Rahul, after reviewing the onboarding funnel metrics today, we need to make some big changes. First, let's push the public beta launch date to November 25, 2026 to give us ten extra days of polish.
Rahul (Eng): Makes sense. Also, I'm switching our primary production database from PostgreSQL to MongoDB by November 5, 2026 because our nested webhook payloads are easier to dump as raw documents.
Priya (PM): Wait, really? Okay, let's also increase our Q4 beta marketing budget to $8,000 so we can run influencer sponsorships during launch week.
Rahul (Eng): Sounds good. For action items: I will complete the MongoDB cluster migration and update the ORM models by November 5, 2026. Also, I'll patch the staging CORS headers by November 1, 2026.
Priya (PM): And I will update the investor launch deck with the November 25 timeline and $8,000 budget allocation by November 2, 2026.`;

export const SEED = [
  {
    title: "Q4 Architecture & Beta Timeline Sync", date: "2026-10-10",
    decisions: [
      { speaker: "Priya (PM)", decision_text: "[2026-10-10] Public beta launch date is locked for November 15, 2026." },
      { speaker: "Rahul (Eng)", decision_text: "[2026-10-10] Exclusively use PostgreSQL as primary production database; no NoSQL." },
    ],
    tasks: [
      { owner: "Rahul (Eng)", task: "Provision production PostgreSQL schema and staging environment", deadline: "2026-10-25", status: "completed" },
      { owner: "Priya (PM)", task: "Finalize beta waitlist onboarding email sequence", deadline: "2026-11-01", status: "open" },
    ],
  },
  {
    title: "Sprint 4 API & GTM Budget Review", date: "2026-10-20",
    decisions: [
      { speaker: "Priya (PM)", decision_text: "[2026-10-20] Total Q4 beta marketing budget is strictly capped at $5,000." },
      { speaker: "Rahul (Eng)", decision_text: "[2026-10-20] Use JWT-based OAuth2 with Google and GitHub for authentication." },
    ],
    tasks: [
      { owner: "Rahul (Eng)", task: "Finish JWT authentication API and rate-limiting middleware", deadline: "2026-11-02", status: "open" },
      { owner: "Priya (PM)", task: "Publish paid social ad creatives and UTM tracking links", deadline: "2026-11-01", status: "open" },
    ],
  },
];

export function parseSpeakers(text: string) {
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([^:]{2,40}):\s*\S/);
    if (m?.[1]) counts.set(m[1].trim(), (counts.get(m[1].trim()) ?? 0) + 1);
  }
  return [...counts.entries()].map(([speaker, lines]) => ({ speaker, lines }));
}

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
export function toIsoDate(s: string): string | null {
  const m = s.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
  if (!m?.[1] || !m[2]) return null;
  const mo = MONTHS.indexOf(m[1].toLowerCase()) + 1;
  return `${m[3] ?? "2026"}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

const TOPICS: { key: string; match: RegExp; value: (s: string) => string | null; label: string }[] = [
  { key: "launch", label: "public beta launch date", match: /launch (date|timeline)|beta launch/i, value: (s) => toIsoDate(s) },
  { key: "database", label: "primary production database", match: /database|postgres|mongo|nosql/i,
    value: (s) => (/to mongodb|mongodb by|switching.*mongo/i.test(s) ? "mongodb" : /mongo/i.test(s) && !/postgres/i.test(s) ? "mongodb" : /postgres/i.test(s) ? "postgresql" : null) },
  { key: "budget", label: "Q4 beta marketing budget", match: /budget/i, value: (s) => s.match(/\$\s?([\d,]+)/)?.[1]?.replace(/,/g, "") ?? null },
];

function cleanLead(s: string) {
  return s
    .replace(/^(okay|ok|wait, really\?|sounds good\.?|makes sense\.?)[,.]?\s*/i, "")
    .replace(/^(okay|ok)[,.]?\s*/i, "")
    .replace(/^(first|also|and|so)[,]?\s+/i, "")
    .trim();
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function shortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function conflictValue(topic: string, value: string, date: string, proposed = false) {
  if (topic === "database") return `${proposed ? "Switch to" : "Locked:"} ${value === "mongodb" ? "MongoDB" : "PostgreSQL"} (${shortDate(date)})`;
  if (topic === "budget") return `$${Number(value).toLocaleString("en-US")} ${proposed ? "proposed budget" : "budget cap"} (${shortDate(date)})`;
  return `Beta launch: ${shortDate(value)} (${proposed ? "proposed" : "locked"})`;
}

export function isConflictBlocked(a: Analysis, kind: "decision" | "task", index: number) {
  return a.conflicts.some((c) => c.resolution === "rejected" &&
    (kind === "decision" ? c.related_decision_index : c.related_task_index) === index);
}

export function approvedItems(a: Analysis) {
  return {
    decisions: a.extracted_decisions.filter((d, i) => d.checked && !isConflictBlocked(a, "decision", i)),
    tasks: a.action_items.filter((t, i) => t.checked && !isConflictBlocked(a, "task", i)),
  };
}

export function resolveConflict(a: Analysis, index: number, resolution: "accepted" | "rejected"): Analysis {
  const next = structuredClone(a);
  const conflict = next.conflicts[index];
  if (!conflict) return next;
  conflict.resolution = resolution;
  const decision = conflict.related_decision_index === null ? undefined : next.extracted_decisions[conflict.related_decision_index];
  const task = conflict.related_task_index === null ? undefined : next.action_items[conflict.related_task_index];
  if (decision) decision.checked = resolution === "accepted" && !isConflictBlocked(next, "decision", conflict.related_decision_index ?? -1);
  if (task) task.checked = resolution === "accepted" && !isConflictBlocked(next, "task", conflict.related_task_index ?? -1);
  return next;
}

export function deterministicAnalyze(transcript: string, history: Decision[]): Analysis {
  const decisions: ExtractedDecision[] = [];
  const tasks: ExtractedTask[] = [];
  for (const line of transcript.split("\n")) {
    const m = line.match(/^\s*([^:]{2,40}):\s*(.+)$/);
    if (!m?.[1] || !m[2]) continue;
    const speaker = m[1].trim();
    const body = m[2].replace(/for action items:\s*/i, "");
    const sentences = body.split(/(?<=[.!?])\s+/);
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      if (/\bI(?: will|'ll)\b/i.test(s) && /\bby\s+\w+\s+\d/i.test(s)) {
        const deadline = toIsoDate(s.split(/\bby\b/i).pop() ?? "") ?? "";
        let task = s.replace(/^.*?\bI(?: will|'ll)\s+/i, "").replace(/\s+by\s+[A-Za-z]+\s+\d{1,2}(,\s*\d{4})?\.?$/i, "").replace(/\.$/, "");
        tasks.push({ task: cap(task), owner: speaker, deadline, checked: true });
      } else if (/(let's|we need to|\bI'm switching|switch|increase|decrease|push|lock|cap|move to|adopt)/i.test(s) && !/\?$/.test(s) && !/big changes/i.test(s)) {
        decisions.push({ speaker, decision_text: cap(cleanLead(s)).replace(/\.$/, ""), checked: true });
      }
    }
  }

  const conflicts: Conflict[] = [];
  decisions.forEach((d, di) => {
    for (const t of TOPICS) {
      if (!t.match.test(d.decision_text)) continue;
      const newVal = t.value(d.decision_text);
      if (!newVal) continue;
      const past = [...history].reverse().find((h) => t.match.test(h.decision_text) && t.value(h.decision_text) && t.value(h.decision_text) !== newVal);
      if (!past) continue;
      const pastDate = past.decision_text.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] ?? past.created_at.slice(0, 10);
      const taskNeedle = t.key === "database" ? /mongo/i : t.key === "budget" ? new RegExp(newVal.replace(/(\d)(?=(\d{3})+$)/g, "$1,?")) : /november 25|timeline/i;
      const ti = tasks.findIndex((x) => taskNeedle.test(x.task));
      conflicts.push({
        speaker: d.speaker, new_statement: d.decision_text,
        past_speaker: past.speaker,
        conflict_type: t.key === "database" ? "DIRECTIONAL_REVERSAL" : "METRIC_OR_DATE_SHIFT",
        confidence_score: t.key === "database" ? "98%" : t.key === "launch" ? "95%" : "94%",
        past_value: conflictValue(t.key, t.value(past.decision_text) ?? "", pastDate),
        new_value: conflictValue(t.key, newVal, toIsoDate(d.decision_text) ?? "2026-10-31", true),
        impacted_task_preview: tasks[ti]?.task ?? "No linked action item",
        contradicted_decision: past.decision_text.replace(/^\[[^\]]+\]\s*/, ""), past_meeting_date: pastDate,
        severity: "HIGH",
        reason: `New statement changes the ${t.label}, which was already governed by a decision on ${pastDate}.`,
        related_decision_index: di, related_task_index: ti >= 0 ? ti : null,
      });
      break;
    }
  });
  return { extracted_decisions: decisions, action_items: tasks, conflicts, source: "parser" };
}

export function isUrgent(item: Pick<ActionItem, "status" | "deadline">) {
  return item.status === "open" && (item.deadline === "2026-11-01" || item.deadline === "2026-11-02");
}
