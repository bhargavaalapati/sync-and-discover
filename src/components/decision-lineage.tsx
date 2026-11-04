import { Button } from './ui/button';
import { decisionLineage, domains, plainDecision, recordDate, type Defense, type MeetingRecord } from '@/lib/syncexec.memory';
import { shortDate, type Decision } from '@/lib/syncexec';

export function DecisionLineage({ decisions, allDecisions, meetings, defenses, timeline, selected, onJump }: { decisions: Decision[]; allDecisions: Decision[]; meetings: MeetingRecord[]; defenses: Defense[]; timeline: boolean; selected?: string | undefined; onJump: (id: string) => void }) {
  const visible = new Set(decisions.map(d => d.id));
  const rows = decisionLineage(allDecisions, meetings, defenses).filter(l => visible.has(l.decision.id));
  const card = (l: typeof rows[number]) => <li id={`decision-${l.decision.id}`} key={l.decision.id} className={`min-w-0 scroll-mt-64 rounded-md border bg-card p-4 ${selected === l.decision.id ? 'border-accent ring-2 ring-accent/40' : 'border-border'}`}>
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><span className="font-medium">{l.decision.speaker}</span><time className="font-mono text-muted-foreground">{l.date}</time>
      <span className={`max-w-full rounded border px-2 py-1 font-mono text-[10px] ${l.status === 'superseded' ? 'border-primary/40 text-primary' : 'border-success/40 text-success'}`}>{l.successor ? `🔄 SUPERSEDED BY ${shortDate(recordDate(l.successor, meetings)).toUpperCase()}` : l.defense ? '🛡️ PROTECTED AGAINST DRIFT' : '🟢 GOVERNING (LOCKED)'}</span>
    </div>
    <p className={`break-words text-sm ${l.successor ? 'text-muted-foreground' : ''}`}>{plainDecision(l.decision.decision_text)}</p>
    {l.defense && <p className="mt-3 break-words text-xs text-success">Defended on {shortDate(l.defense.date)} (Blocked unapproved MongoDB switch)<span className="mt-1 block text-muted-foreground">{l.defense.proposal}</span></p>}
    {l.successor && <div className="mt-3 border-l-2 border-primary pl-3 text-xs"><p className="break-words text-muted-foreground">[{shortDate(l.date)}: {plainDecision(l.decision.decision_text)}] →</p><Button variant="link" className="h-auto max-w-full justify-start whitespace-normal px-0 text-left text-xs" onClick={() => { if (l.successor) onJump(l.successor.id); }}>[{shortDate(recordDate(l.successor, meetings))} Override: {plainDecision(l.successor.decision_text)}]</Button></div>}
  </li>;
  if (!timeline) return <ol className="space-y-3">{[...rows].reverse().map(card)}</ol>;
  return <div className="space-y-6">{domains.filter(domain => rows.some(l => l.domain === domain)).map(domain => <section key={domain} className="min-w-0"><h3 className="mb-3 border-b border-border pb-2 font-semibold text-accent">{domain}</h3><ol className="space-y-3 border-l border-accent/40 pl-4">{rows.filter(l => l.domain === domain).map(card)}</ol></section>)}</div>;
}