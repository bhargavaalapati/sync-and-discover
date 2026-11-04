import { isUrgent, shortDate, type ActionItem, type Analysis, type Decision } from './syncexec';
import { governingBrief } from './syncexec.exports';

export type MeetingRecord = { id: string; date: string; title: string };
export type Defense = { decisionText: string; date: string; proposal: string; reason: string };
export type MemorySource = { id: string; kind: 'decision' | 'task'; date: string; label: string };
export const domains = ['Database & Infra', 'Launch Timeline', 'GTM Budget', 'Security & Auth', 'Other Decisions'] as const;
export function decisionDomain(text: string) {
  if (/auth|jwt|oauth|security|encrypt|permission|cors/i.test(text)) return domains[3];
  if (/database|postgres|mongo|infra|architect|webhook|framework/i.test(text)) return domains[0];
  if (/launch|timeline|milestone|schedule/i.test(text)) return domains[1];
  if (/budget|spend|cost|fund|\$/i.test(text)) return domains[2];
  return domains[4];
}
export const plainDecision = (text: string) => text.replace(/^\[[^\]]+\]\s*/, '').trim();
export function recordDate(decision: Decision, meetings: MeetingRecord[]) {
  return decision.decision_text.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] ?? meetings.find(m => m.id === decision.meeting_id)?.date ?? decision.created_at.slice(0, 10);
}
export function confirmedDefenses(analysis: Analysis, date: string): Defense[] {
  return analysis.conflicts.filter(c => c.resolution === 'rejected').map(c => ({ decisionText: c.contradicted_decision, date, proposal: c.new_statement, reason: c.reason }));
}
export function decisionLineage(decisions: Decision[], meetings: MeetingRecord[], defenses: Defense[]) {
  const governing = new Set(governingBrief(decisions, meetings).decisions.map(d => d.id));
  const sorted = [...decisions].sort((a,b) => recordDate(a, meetings).localeCompare(recordDate(b, meetings)) || a.created_at.localeCompare(b.created_at));
  return sorted.map(decision => {
    const date = recordDate(decision, meetings);
    const domain = decisionDomain(decision.decision_text);
    const isGoverning = governing.has(decision.id) || domain === domains[4];
    const successor = !isGoverning ? sorted.find(d => governing.has(d.id) && decisionDomain(d.decision_text) === domain && recordDate(d, meetings) >= date) : undefined;
    const defense = isGoverning ? defenses.filter(d => plainDecision(d.decisionText) === plainDecision(decision.decision_text)).sort((a,b) => b.date.localeCompare(a.date))[0] : undefined;
    return { decision, date, domain, successor, defense, status: successor ? 'superseded' as const : defense ? 'protected' as const : 'governing' as const };
  });
}
export function memoryAnswer(query: string, decisions: Decision[], tasks: ActionItem[], meetings: MeetingRecord[], defenses: Defense[]) {
  const lineage = decisionLineage(decisions, meetings, defenses);
  const sources: MemorySource[] = [];
  const citeDecision = (d: Decision) => {
    const date = recordDate(d, meetings);
    if (!sources.some(s => s.id === d.id)) sources.push({ id: d.id, kind: 'decision', date, label: plainDecision(d.decision_text) });
    return `[${shortDate(date)}]`;
  };
  const citeTask = (t: ActionItem) => {
    const date = meetings.find(m => m.id === t.meeting_id)?.date;
    if (!date) return '(meeting date not recorded)';
    sources.push({ id: t.id, kind: 'task', date, label: t.task });
    return `[${shortDate(date)}]`;
  };
  let text = '';
  if (/mongo|blocked|drift/i.test(query)) {
    const db = lineage.filter(l => l.domain === domains[0]);
    text = db.length ? db.map(l => `${citeDecision(l.decision)} ${l.decision.speaker}: ${plainDecision(l.decision.decision_text)}${l.defense ? `\nDefended on ${shortDate(l.defense.date)}: Blocked unapproved MongoDB switch. Rejected proposal: ${l.defense.proposal}\n${l.defense.reason}` : ''}`).join('\n\n') : 'No database decision is recorded.';
    if (!db.some(l => l.defense)) text += '\n\nNo confirmed rejection is recorded in this browser. A PostgreSQL rule alone does not prove a migration was rejected.';
  } else if (/urgent|48|due/i.test(query)) {
    const urgent = tasks.filter(isUrgent);
    text = 'Urgency uses the Oct 31 demo reference (open tasks due Nov 1 or Nov 2).\n\n' + (urgent.length ? [...new Set(urgent.map(t => t.owner))].map(owner => `${owner}\n${urgent.filter(t => t.owner === owner).map(t => `• ${t.task} — due ${t.deadline} ${citeTask(t)}`).join('\n')}`).join('\n\n') : 'No urgent open tasks recorded.');
  } else if (/launch|timeline|evolv/i.test(query)) {
    const rows = lineage.filter(l => l.domain === domains[1]);
    text = rows.length ? rows.map(l => `${citeDecision(l.decision)} ${l.decision.speaker}: ${plainDecision(l.decision.decision_text)} — ${l.status === 'superseded' ? 'superseded by the later saved decision' : 'governing (locked)'}`).join('\n→\n') : 'No launch timeline decision is recorded.';
  } else {
    const words = query.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(w => !['show','what','why','the','all','was','our','who','how','and','for','are'].includes(w)) ?? [];
    const matches = decisions.filter(d => words.some(w => `${d.speaker} ${d.decision_text}`.toLowerCase().includes(w)));
    const taskMatches = tasks.filter(t => words.some(w => `${t.owner} ${t.task}`.toLowerCase().includes(w)));
    text = [...matches.map(d => `${citeDecision(d)} ${d.speaker}: ${plainDecision(d.decision_text)}`), ...taskMatches.map(t => `${citeTask(t)} ${t.owner}: ${t.task} — due ${t.deadline ?? 'not set'} (${t.status})`)].join('\n\n') || 'No matching records found in the loaded meeting memory.';
  }
  return { text, sources };
}