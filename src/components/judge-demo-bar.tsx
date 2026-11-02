import { useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

export type JudgeStep = { label: string; badge?: string; onClick: () => void | Promise<void> };

export function JudgeDemoBar({ steps, done, active }: { steps: JudgeStep[]; done: number[]; active: number | null }) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Interactive Judge Evaluation Flow" className="panel overflow-hidden">
      <button className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>🎯 Interactive Judge Evaluation Flow <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">30-sec guided demo · {done.length}/{steps.length}</span></span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ol className="grid gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const isDone = done.includes(i);
            const isActive = active === i;
            return (
              <li key={s.label}>
                <button onClick={s.onClick}
                  className={`flex h-full w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${isActive ? "border-primary bg-primary/15 text-foreground" : isDone ? "border-success/50 bg-success/10 text-success" : "border-border bg-secondary hover:border-primary/60"}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-xs ${isDone ? "bg-success text-success-foreground" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{s.label}</span>
                  {s.badge && <span className="shrink-0 rounded-full border border-success/50 bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success">{s.badge}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
