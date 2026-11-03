import { Button } from "@/components/ui/button";
import type { AutonomyMode } from "@/lib/syncexec.agents";

export function AgentTelemetry({ state, tone, mode, setMode, disabled }: { state: string; tone: "idle" | "listening" | "reasoning" | "gate" | "executing"; mode: AutonomyMode; setMode: (mode: AutonomyMode) => void; disabled: boolean }) {
  const color = tone === "reasoning" ? "text-agent" : tone === "gate" || tone === "executing" ? "text-primary" : "text-success";
  return <section aria-label="Agent telemetry and autonomy" className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
    <div role="status" className={`flex min-w-0 items-center gap-2 text-xs font-medium ${color}`}><span className="h-2 w-2 shrink-0 rounded-full bg-current motion-safe:animate-pulse" />{state}</div>
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Autonomy Mode</span><div role="group" aria-label="Autonomy Mode" className="flex flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
      {([['strict', '🛡️ Strict Human Gate'], ['assisted', '⚡ Assisted Co-Pilot'], ['sandbox', '🧪 Safe Sandbox Mode']] as const).map(([value, label]) => <Button key={value} variant={mode === value ? "default" : "ghost"} size="sm" disabled={disabled} aria-pressed={mode === value} className="h-auto whitespace-normal px-2 py-1.5 text-xs" onClick={() => setMode(value)}>{label}</Button>)}
    </div></div>
  </section>;
}