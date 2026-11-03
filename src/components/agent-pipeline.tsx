import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PIPELINE_ENDS, pipelineStep } from "@/lib/syncexec.agents";
import { parseSpeakers, type Analysis } from "@/lib/syncexec";

export function AgentPipeline({ open, elapsed, transcript, memory, result, skip }: { open: boolean; elapsed: number; transcript: string; memory: number; result: Analysis | null; skip: () => void }) {
  const active = pipelineStep(elapsed);
  const speakers = parseSpeakers(transcript).map((s) => `${s.speaker}: ${s.lines} turns`).join(", ");
  const reversals = result?.conflicts.filter((c) => c.conflict_type === "DIRECTIONAL_REVERSAL").length ?? 0;
  const shifts = result?.conflicts.filter((c) => c.conflict_type === "METRIC_OR_DATE_SHIFT").length ?? 0;
  const steps = [
    ["🎙️", "Diarization & Speech Agent", `Normalizing Wispr Flow voice input & attributing speaker turns (${speakers || "no speakers detected"})...`],
    ["🧠", "Cross-Meeting Memory Agent", `Querying Decision Vault → Retrieved ${memory} governing decisions from historical meetings...`],
    ["⚖️", "ReAct Conflict Critic Agent", result ? `Cross-checking historical constraints → Flagged ${result.conflicts.length} HIGH-SEVERITY contradictions (${reversals} Directional Reversal, ${shifts} Metric/Date Shifts)...` : "Cross-checking new statements against historical constraints → Analysis in progress..."],
    ["🛡️", "Governance Gate Agent", result ? `${result.conflicts.length ? "Autonomous tracker write HALTED due to conflicts." : "Tracker writes held for confirmation."} Routing payload to Human-in-the-Loop Confirmation Gate...` : "Holding tracker writes until analysis completes..."],
  ];
  return <Dialog open={open} onOpenChange={(value) => { if (!value) skip(); }}><DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border-agent/40 bg-card/95 backdrop-blur-xl">
    <DialogHeader><DialogTitle>Autonomous Agent Orchestration Pipeline</DialogTitle><DialogDescription>Orchestration visualization · {result ? result.source === "ai" ? "AI analysis received" : "Deterministic analysis received" : "Awaiting analysis"} · not private model reasoning</DialogDescription></DialogHeader>
    <ol className="divide-y divide-border">{steps.map(([icon, name, text], i) => {
      const done = elapsed >= (PIPELINE_ENDS[i] ?? 3200) && (i < 2 || result !== null);
      const visible = active === -1 || i <= active;
      const start = i === 0 ? 0 : PIPELINE_ENDS[i - 1] ?? 0;
      return <li key={name} className={`flex gap-3 py-4 ${visible ? "" : "opacity-40"}`}>
        <span className="mt-0.5 text-xl">{icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">[{name}]</h3><span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">{Math.max(0, Math.min(elapsed, PIPELINE_ENDS[i] ?? 3200) - start)}ms {done ? <Check className="h-4 w-4 text-success" /> : <Clock className="h-3 w-3" />}</span></div>
        {visible && <p className="mt-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">{text}</p>}
        {visible && !done && <span aria-label="Thinking" className="thinking-dots mt-2 flex gap-1 text-agent"><span>●</span><span>●</span><span>●</span></span>}
      </div></li>;
    })}</ol><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-muted-foreground">{elapsed}ms elapsed</span><Button variant="ghost" onClick={skip}>Skip Animation →</Button></div>
  </DialogContent></Dialog>;
}