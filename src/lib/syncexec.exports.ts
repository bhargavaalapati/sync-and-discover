import { approvedItems, type ActionItem, type Analysis, type Decision } from "./syncexec";

type TaskRow = Pick<ActionItem, "task" | "owner" | "deadline"> & { status?: string };
const bullets = (rows: string[]) => rows.length ? rows.map((row) => `• ${row}`).join("\n") : "• None";
const slack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function confirmationPayload(analysis: Analysis, title: string, date: string) {
  const { decisions, tasks } = approvedItems(analysis);
  const rejected = analysis.conflicts.filter((c) => c.resolution === "rejected");
  const digest = `✅ *Approved Decisions (${decisions.length}):*\n${bullets(decisions.map((d) => `[${slack(d.speaker)}]: ${slack(d.decision_text)}`))}\n\n🛡️ *Conflicts Blocked from Backlog (${rejected.length}):*\n${bullets(rejected.map((c) => `[${slack(c.speaker)}]: ${slack(c.new_statement)} — Kept: ${slack(c.contradicted_decision)}`))}\n\n🚀 *Verified Action Items (${tasks.length}):*\n${bullets(tasks.map((t) => `${slack(t.task)} — Owner: ${slack(t.owner)} (Due: ${t.deadline || "Not set"})`))}`;
  return {
    event_type: "confirm_and_execute", meeting_title: title, meeting_date: date,
    approved_decisions: decisions.map((d) => ({ speaker: d.speaker, decision_text: `[${date}] ${d.decision_text}` })),
    approved_tasks: tasks.map((t) => ({ task: t.task, owner: t.owner, deadline: t.deadline, status: "open", synced_to_tracker: true })),
    target_person: "All Team", digest_summary: digest, slack_text: digest,
  };
}

export function reminderSummary(item: TaskRow) {
  return `🚨 *URGENT <48H DEADLINE ALERT*\n• *Owner:* ${slack(item.owner)}\n• *Task:* ${slack(item.task)}\n• *Due Date:* ${item.deadline || "Not set"} (Due in <48 hours from Oct 31)\n• *Action Required:* Please update status in SyncExec.`;
}

const cell = (value: string) => value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").replace(/([`*_\[\]])/g, "\\$1");
export function tasksMarkdown(tasks: TaskRow[]) {
  return ["| Task | Owner | Due Date | Status |", "| --- | --- | --- | --- |", ...tasks.map((t) => `| ${cell(t.task)} | ${cell(t.owner)} | ${cell(t.deadline || "Not set")} | ${cell(t.status || "open")} |`)].join("\n");
}

export const briefCategories = ["Architecture", "Timeline", "Budget", "Security"] as const;
type Category = typeof briefCategories[number];
type Meeting = { id: string; date: string; title: string };
const topics: { category: Category; key: string; match: RegExp }[] = [
  { category: "Security", key: "authentication", match: /auth|jwt|oauth|sign.in/i },
  { category: "Security", key: "security", match: /security|encrypt|permission|rate.limit|cors/i },
  { category: "Architecture", key: "database", match: /database|postgres|mongo|nosql/i },
  { category: "Architecture", key: "architecture", match: /architect|infrastructure|framework|api|webhook/i },
  { category: "Timeline", key: "launch", match: /launch|beta.*date|timeline/i },
  { category: "Timeline", key: "schedule", match: /deadline|milestone|schedule/i },
  { category: "Budget", key: "budget", match: /budget|spend|cost|fund|\$/i },
];

export function governingBrief(decisions: Decision[], meetings: Meeting[]) {
  const latest = new Map<string, { category: Category; decision: Decision; date: string }>();
  for (const decision of decisions) {
    const text = decision.decision_text.replace(/^\[[^\]]+\]\s*/, "");
    const topic = topics.find((t) => t.match.test(text));
    if (!topic) continue;
    const date = decision.decision_text.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] ?? meetings.find((m) => m.id === decision.meeting_id)?.date ?? decision.created_at.slice(0, 10);
    // Only explicit governing subjects supersede previous decisions; preserve independent rules.
    const key = ["database", "launch", "budget", "authentication"].includes(topic.key) ? topic.key : `${topic.key}:${text.toLowerCase()}`;
    const previous = latest.get(key);
    if (!previous || date > previous.date || (date === previous.date && decision.created_at >= previous.decision.created_at)) latest.set(key, { category: topic.category, decision, date });
  }
  const sections = briefCategories.map((category) => ({ category, entries: [...latest.values()].filter((v) => v.category === category) }));
  const text = ["PRE-MEETING CONTEXT BRIEF — NEXT SYNC", ...sections.map((section) => `\n${section.category}\n${bullets(section.entries.map(({ decision, date }) => `[${date}] ${decision.speaker}: ${decision.decision_text.replace(/^\[[^\]]+\]\s*/, "")}`))}`)].join("\n");
  return { sections, text, decisions: [...latest.values()].map((v) => v.decision) };
}