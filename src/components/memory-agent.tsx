import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUp, Database, Square } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { memoryAnswer, type Defense, type MeetingRecord, type MemorySource } from '@/lib/syncexec.memory';
import { shortDate, type ActionItem, type Decision } from '@/lib/syncexec';

const starters = ['Why was the MongoDB migration blocked?', 'Show all urgent tasks due within 48h by owner', 'Trace how our Q4 beta launch date evolved'];
export function MemoryAgent({ decisions, items, meetings, defenses, onSource }: { decisions: Decision[]; items: ActionItem[]; meetings: MeetingRecord[]; defenses: Defense[]; onSource: (s: MemorySource) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [sources, setSources] = useState<MemorySource[]>([]);
  const [thinking, setThinking] = useState(false);
  const [status, setStatus] = useState('');
  const run = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener('keydown', key);
    return () => { run.current++; abort.current?.abort(); window.removeEventListener('keydown', key); };
  }, []);
  async function ask(value: string) {
    if (!value.trim()) return;
    const id = ++run.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setQuery(value); setThinking(true); setStatus('Searching loaded memory…');
    const grounded = memoryAnswer(value, decisions, items, meetings, defenses);
    setText(grounded.text); setSources(grounded.sources);
    try {
      const response = await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: value, evidence: grounded.text }), signal: controller.signal });
      if (!response.ok || !response.body) { const problem = await response.json().catch(() => null); setStatus(typeof problem?.error === 'string' ? problem.error : 'AI unavailable · grounded memory result'); return; }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let streamed = '';
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        if (id !== run.current) { await reader.cancel(); return; }
        streamed += decoder.decode(chunk.value, { stream: true }); setText(streamed); setStatus('AI synthesis · grounded in loaded records');
      }
      if (!streamed.trim()) { setText(grounded.text); setStatus('AI returned no answer · grounded memory result'); }
    } catch { if (id === run.current) setStatus('AI unavailable · grounded memory result'); }
    finally { if (id === run.current) setThinking(false); }
  }
  return <>
    <Button variant="outline" className="h-auto whitespace-normal" onClick={() => setOpen(true)}><Search className="h-4 w-4 shrink-0" />Ask Memory Agent (⌘K)</Button>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { run.current++; abort.current?.abort(); setThinking(false); } }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border-accent/40 bg-popover/95 backdrop-blur-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-accent" />Ask SyncExec Memory Agent</DialogTitle><DialogDescription>{decisions.length} decisions · {items.length} tasks · {meetings.length} meetings</DialogDescription></DialogHeader>
        <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); void ask(query); }}>
          <input autoFocus aria-label="Ask meeting memory" className="field min-w-0 flex-1" maxLength={2000} placeholder="Ask anything across all meetings, decisions, or task owners…" value={query} onChange={e => setQuery(e.target.value)} />
          <Button size="icon" type="submit" disabled={!query.trim()} aria-label="Ask memory"><ArrowUp className="h-4 w-4" /></Button>
        </form>
        <div className="flex flex-wrap gap-2">{starters.map(s => <Button key={s} variant="outline" className="h-auto max-w-full whitespace-normal text-left text-xs" onClick={() => void ask(s)}>{s}</Button>)}</div>
        {(text || thinking) && <section className="min-w-0 border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-accent">{thinking && <span aria-label="Memory agent working" className="thinking-dots flex gap-1"><span>●</span><span>●</span><span>●</span></span>}<span>{status}</span>{thinking && <Button size="icon" variant="ghost" aria-label="Stop answer" onClick={() => { run.current++; abort.current?.abort(); setThinking(false); setStatus('Stopped · current memory result'); }}><Square className="h-3 w-3" /></Button>}</div>
          <p aria-live="polite" className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
          <div className="mt-4 flex flex-wrap gap-2">{sources.map(s => <Button key={`${s.kind}-${s.id}`} variant="outline" className="h-auto whitespace-normal border-accent/40 text-xs text-accent" title={s.label} onClick={() => { setOpen(false); onSource(s); }}>[{shortDate(s.date)}] {s.kind === 'task' ? 'Task' : 'Decision'}</Button>)}</div>
        </section>}
      </DialogContent>
    </Dialog>
  </>;
}