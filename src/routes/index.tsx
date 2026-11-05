import { Button } from "@/components/ui/button";
import { ShieldCheck, Copy, Send, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExportActions, copyText } from "@/components/export-actions";
import { confirmationPayload, reminderSummary, governingBrief, tasksMarkdown } from "@/lib/syncexec.exports";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { JudgeDemoBar } from "@/components/judge-demo-bar";
import { VoiceDictation } from "@/components/voice-dictation";
import { AgentTelemetry } from "@/components/agent-telemetry";
import { AgentPipeline } from "@/components/agent-pipeline";
import { MemoryAgent } from "@/components/memory-agent";
import { DecisionLineage } from "@/components/decision-lineage";
import { confirmedDefenses, type Defense, type MemorySource } from "@/lib/syncexec.memory";
import { executionItems, executionPolicy, exportReview, prepareReview, uniqueBy, type AutonomyMode } from "@/lib/syncexec.agents";
import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAll, saveMeeting, seedDemo, setTaskStatus } from "@/lib/syncexec.db.functions";
import {
  DEFAULT_WEBHOOK, DEMO_TRANSCRIPT, SEED, TODAY, deterministicAnalyze, isUrgent, parseSpeakers,
  approvedItems, isConflictBlocked, resolveConflict, shortDate,
  type ActionItem, type Analysis, type Conflict, type Decision,
} from "@/lib/syncexec";
import { analyzeWithAI, postWebhook } from "@/lib/syncexec.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SyncExec AI — Meeting-to-Execution Agent" },
      { name: "description", content: "Turn meeting transcripts into approved decisions and tasks, with cross-meeting memory and conflict detection." },
      { property: "og:title", content: "SyncExec AI — Meeting-to-Execution Agent" },
      { property: "og:description", content: "Cross-meeting memory and human-in-the-loop conflict detection for every meeting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "ingest" | "review" | "vault" | "digest";
const TABS: { id: Tab; label: string }[] = [
  { id: "ingest", label: "1 · Ingest Meeting" },
  { id: "review", label: "2 · Review & Confirm Gate" },
  { id: "vault", label: "3 · Decision Memory Vault" },
  { id: "digest", label: "4 · Digests & 48h Reminders" },
];

const btn = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:bg-muted`;
const btnDanger = `${btn} bg-destructive text-destructive-foreground hover:bg-destructive/90`;

function App() {
  const [tab, setTab] = useState<Tab>("ingest");
  const [webhook, setWebhook] = useState(DEFAULT_WEBHOOK);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [meetings, setMeetings] = useState<{ id: string; date: string; title: string }[]>([]);
  const [busy, setBusy] = useState("");
  const [demoDone, setDemoDone] = useState<number[]>([]);
  const [demoActive, setDemoActive] = useState<number | null>(null);
  const [pulseAnalyze, setPulseAnalyze] = useState(false);
  const [urgentFocus, setUrgentFocus] = useState(false);
  const [mode, setMode] = useState<AutonomyMode>("strict");
  const [voiceActive, setVoiceActive] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState<Analysis | null>(null);
  const [skipRequested, setSkipRequested] = useState(false);
  const [sandboxPayload, setSandboxPayload] = useState<Record<string, unknown> | null>(null);
  const runRef = useRef(0);
  const markStep = (i: number) => { setDemoActive(i); setDemoDone((d) => (d.includes(i) ? d : [...d, i])); };
  const onVoiceActive = useCallback((active: boolean) => setVoiceActive(active), []);

  const [title, setTitle] = useState("Emergency Pre-Launch Sync");
  const [date, setDate] = useState(TODAY);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [logs, setLogs] = useState<HookLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MemorySource | null>(null);
  const jumpSource = (source: MemorySource) => {
    setSelectedSource(source); setUrgentFocus(false); setTab(source.kind === "decision" ? "vault" : "digest");
    window.setTimeout(() => document.getElementById(`${source.kind}-${source.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  useEffect(() => {
    const saved = localStorage.getItem("syncexec.webhook");
    if (saved) setWebhook(saved);
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("syncexec.defenses") ?? "[]");
      if (Array.isArray(stored)) setDefenses(stored.filter((d): d is Defense => typeof d?.decisionText === "string" && typeof d?.date === "string" && typeof d?.proposal === "string" && typeof d?.reason === "string"));
    } catch { /* ignore invalid local review history */ }
    void refresh();
  }, []);
  useEffect(() => { localStorage.setItem("syncexec.webhook", webhook); }, [webhook]);

  async function refresh() {
    const r = await loadAll();
    setDecisions(uniqueBy(r.decisions as Decision[], (d) => d.decision_text.trim().toLowerCase()));
    setItems(uniqueBy(r.items as ActionItem[], (t) => t.task.trim().toLowerCase()));
    setMeetings(r.meetings);
  }

  async function sendHook(payload: Record<string, unknown>) {
    const log = (status: string, ms: number) => setLogs((l) => [{ id: crypto.randomUUID(), event_type: String(payload["event_type"] ?? "unknown"), status, ms, at: new Date().toISOString(), payload, url: webhook }, ...l]);
    if (mode === "sandbox") { log("SANDBOX", 0); setSandboxPayload(payload); return false; }
    if (!webhook.startsWith("https://")) { setNotice({ kind: "err", text: "Add a valid https webhook URL first." }); return false; }
    setBusy("webhook");
    const t0 = performance.now();
    try {
      const r = await postWebhook({ data: { url: webhook, payload } });
      log(r.ok ? `${r.status} OK` : `${r.status} ERROR`, Math.round(performance.now() - t0));
      if (!r.ok) setNotice({ kind: "err", text: `Webhook failed (${r.status}): ${r.body}` });
      return r.ok;
    } finally { setBusy((b) => (b === "webhook" ? "" : b)); }
  }

  async function seed() {
    setBusy("seed");
    try {
      await seedDemo();
      setDefenses([]); localStorage.removeItem("syncexec.defenses");
      setDecisions([]); setItems([]); setMeetings([]); setAnalysis(null); setPendingAnalysis(null);
      await refresh();
      setNotice({ kind: "ok", text: "Clean demo restored: 2 meetings, 4 decisions, 4 tasks." });
      return true;
    } catch {
      setNotice({ kind: "err", text: "Demo reset failed. Your existing data was not changed." });
      return false;
    } finally { setBusy(""); }
  }

  async function resetDemo() {
    runRef.current++;
    setPipelineOpen(false); setTranscript(""); setDemoDone([]); setDemoActive(null); setUrgentFocus(false); setPulseAnalyze(false);
    if (await seed()) toast.success("Clean demo state restored");
  }

  async function analyze() {
    const run = ++runRef.current;
    setBusy("analyze");
    setPendingAnalysis(null); setSkipRequested(false); setElapsed(0); setPipelineOpen(true);
    const history = decisions;
    let result: Analysis | null = null;
    try {
      const r = await analyzeWithAI({ data: { transcript, history: history.map((h) => ({ speaker: h.speaker, decision_text: h.decision_text })) } });
      if (r.ok && Array.isArray(r.result.extracted_decisions) && r.result.extracted_decisions.length) {
        result = {
          source: "ai",
          extracted_decisions: r.result.extracted_decisions.map((d: any) => ({ speaker: String(d.speaker ?? ""), decision_text: String(d.decision_text ?? ""), checked: true })),
          action_items: (r.result.action_items ?? []).map((t: any) => ({ task: String(t.task ?? ""), owner: String(t.owner ?? ""), deadline: String(t.deadline ?? ""), checked: true })),
          conflicts: (r.result.conflicts ?? []).map((c: any) => ({ ...c, severity: "HIGH" })),
        };
      }
    } catch { /* fall through to parser */ }
    if (!result || (history.length && result.conflicts.length === 0)) {
      const det = deterministicAnalyze(transcript, history);
      result = result && det.conflicts.length === 0 ? result : det;
    }
    if (run === runRef.current) setPendingAnalysis(prepareReview(result, mode));
  }

  useEffect(() => {
    if (!pipelineOpen) return;
    const started = Date.now() - elapsed;
    const id = window.setInterval(() => setElapsed(Math.min(3200, Date.now() - started)), 50);
    return () => window.clearInterval(id);
  }, [pipelineOpen]);
  useEffect(() => {
    if (!pipelineOpen || !pendingAnalysis || (!skipRequested && elapsed < 3200)) return;
    setAnalysis(pendingAnalysis); setPendingAnalysis(null); setPipelineOpen(false); setBusy(""); setTab("review");
  }, [pipelineOpen, pendingAnalysis, skipRequested, elapsed]);

  async function confirm() {
    if (!analysis) return;
    const policy = executionPolicy(mode, true);
    const gated = exportReview(analysis, mode);
    const payload = confirmationPayload(gated, title, date);
    if (!policy.save) { setSandboxPayload(payload); return; }
    setBusy("confirm");
    const rejected = analysis.conflicts.filter((c) => c.resolution === "rejected").length;
    const approvedDecisions = payload.approved_decisions;
    const approvedTasks = payload.approved_tasks;
    const saved = await saveMeeting({ data: { title, date, transcript, decisions: approvedDecisions, tasks: approvedTasks.map(({ task, owner, deadline }) => ({ task, owner, deadline })) } });
    if (!saved.ok) { setBusy(""); setNotice({ kind: "err", text: saved.error }); return; }
    const nextDefenses = uniqueBy([...defenses, ...confirmedDefenses(analysis, date)], d => `${d.decisionText}:${d.date}:${d.proposal}`);
    setDefenses(nextDefenses); localStorage.setItem("syncexec.defenses", JSON.stringify(nextDefenses));
    setBusy("webhook");
    const hookOk = policy.webhook && await sendHook(payload);
    await refresh();
    setAnalysis(null);
    setBusy("");
    setNotice({ kind: "ok", text: `Executed: ${approvedDecisions.length} decisions saved, ${approvedTasks.length} tasks synced, ${rejected} conflicts rejected.${hookOk ? " Webhook delivered." : " Webhook not delivered — check that your Make.com scenario is switched on."}` });
  }

  const pending = analysis?.conflicts.filter((c) => !c.resolution).length ?? 0;
  const telemetry = busy === "webhook" || busy === "confirm" ? { tone: "executing" as const, state: "⚡ Executing Make.com Webhook..." }
    : voiceActive ? { tone: "listening" as const, state: "🎙️ Listening via Wispr Flow..." }
    : pipelineOpen || busy === "analyze" ? { tone: "reasoning" as const, state: "🟣 Multi-Agent Reasoning..." }
    : tab === "review" && analysis ? { tone: "gate" as const, state: `🟠 Halted at Human Gate (${pending} Conflicts Pending)` }
    : { tone: "idle" as const, state: `🟢 Agent Idle • Memory Synced (${decisions.length} Decisions)` };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">S</div>
            <span className="text-lg font-semibold tracking-tight">SyncExec AI</span>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase text-accent">Wispr Flow Ready</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <MemoryAgent decisions={decisions} items={items} meetings={meetings} defenses={defenses} onSource={jumpSource} />
            <input className="field w-72 rounded-full font-mono text-xs" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="Make.com webhook URL" />
            <button className={btnGhost} disabled={busy === "test"} onClick={async () => {
              setBusy("test");
              const ok = await sendHook({ event_type: "test", digest_summary: "SyncExec webhook test", sent_at: new Date().toISOString() });
              if (ok) setNotice({ kind: "ok", text: "Webhook test delivered." });
              setBusy("");
            }}>Test Webhook</button>
            <button className={btnGhost} onClick={() => setLogsOpen(true)}>📡 Logs ({logs.length})</button>
            <button className={btnGhost} onClick={() => setSettingsOpen(true)}>Settings</button>
            <button className={btnPrimary} disabled={busy === "seed"} onClick={seed}>{busy === "seed" ? "Seeding…" : "1-Click Seed Oct 10 & Oct 20 Memory"}</button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}{t.id === "review" && analysis ? ` (${analysis.conflicts.length})` : ""}
            </button>
          ))}
        </nav>
        <div className="mx-auto max-w-7xl px-6"><AgentTelemetry {...telemetry} mode={mode} disabled={pipelineOpen || busy === "confirm" || busy === "webhook"} setMode={(m) => { setMode(m); if (analysis) setAnalysis(prepareReview(analysis, m)); }} /></div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <JudgeDemoBar done={demoDone} active={demoActive} onReset={() => void resetDemo()} resetting={busy === "seed"} steps={[
          { label: "1. Seed Oct 10 & 20 Memory", badge: decisions.length ? `${decisions.length} Decisions Active` : undefined,
            onClick: async () => { setDemoActive(0); if (await seed()) markStep(0); } },
          { label: "2. Load & Analyze Oct 31 Sync", onClick: () => {
            setTab("ingest"); setTranscript(DEMO_TRANSCRIPT); setPulseAnalyze(true); markStep(1);
            setTimeout(() => document.getElementById("analyze-btn")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
          } },
          { label: "3. Resolve 3 Red Conflicts", onClick: () => {
            setTab("review"); markStep(2);
            setTimeout(() => document.getElementById("conflict-gate")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          } },
          { label: "4. View <48h Urgency Radar", onClick: () => { setTab("digest"); setUrgentFocus(true); markStep(3); } },
        ]} />
        {notice && (
          <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 text-sm ${notice.kind === "ok" ? "border-success/50 bg-success/10 text-success" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
            <span className="font-medium">{notice.text}</span>
            <button className="opacity-70 hover:opacity-100" onClick={() => setNotice(null)}>✕</button>
          </div>
        )}
        {tab === "ingest" && (
          <Ingest {...{ title, setTitle, date, setDate, transcript, setTranscript }} onVoiceActive={onVoiceActive} memory={decisions.length} busy={busy === "analyze"} pulse={pulseAnalyze} onAnalyze={() => { setPulseAnalyze(false); void analyze(); }} />
        )}
        {tab === "review" && <Review mode={mode} meetingTitle={title} meetingDate={date} analysis={analysis} setAnalysis={setAnalysis} busy={busy === "confirm" || busy === "webhook"} onConfirm={confirm} goIngest={() => setTab("ingest")} />}
        {tab === "vault" && <Vault decisions={decisions} meetings={meetings} sendHook={sendHook} defenses={defenses} selectedSource={selectedSource} jumpSource={jumpSource} />}
        {tab === "digest" && <Digest selectedSource={selectedSource} urgentFocus={urgentFocus} setUrgentFocus={setUrgentFocus} items={items} decisions={decisions} sendHook={sendHook} setNotice={setNotice} onToggle={async (it) => {
          await setTaskStatus({ data: { id: it.id, status: it.status === "open" ? "completed" : "open" } });
          await refresh();
        }} />}
      </main>
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>📡 Webhook Logs</SheetTitle><SheetDescription>Every webhook dispatch from this session, newest first.</SheetDescription></SheetHeader>
          <div className="mt-4 space-y-3">
            {logs.length === 0 && <p className="text-sm text-muted-foreground">No webhook dispatches yet.</p>}
            {logs.map((l) => (
              <div key={l.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{l.event_type}</span>
                  <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${l.status === "SANDBOX" ? "bg-agent/20 text-agent" : l.status.endsWith("OK") ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{l.status}</span>
                  <span className="font-mono text-xs text-muted-foreground">{l.ms} ms</span>
                  <time className="ml-auto font-mono text-xs text-muted-foreground">{new Date(l.at).toLocaleTimeString()}</time>
                </div>
                <details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">JSON payload</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(l.payload, null, 2)}</pre></details>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className={btnGhost} disabled={busy === "webhook"} onClick={async () => { const ok = await sendHook(l.payload); if (ok) toast.success("Webhook replayed"); }}>🔄 Replay Webhook</button>
                  <button className={btnGhost} onClick={() => copyText(`curl -X POST '${l.url}' -H 'Content-Type: application/json' -d '${JSON.stringify(l.payload).replaceAll("'", "'\\''")}'`, "cURL copied")}>📋 Copy cURL</button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <AgentPipeline open={pipelineOpen} elapsed={elapsed} transcript={transcript} memory={decisions.length} result={pendingAnalysis} skip={() => setSkipRequested(true)} />
      <Dialog open={sandboxPayload !== null} onOpenChange={(open) => { if (!open) setSandboxPayload(null); }}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>🧪 Safe Sandbox Payload Preview</DialogTitle><DialogDescription>No Make.com call was sent and nothing was saved.</DialogDescription></DialogHeader>
          <pre className="max-h-[55dvh] overflow-auto rounded-md border border-border bg-muted p-4 font-mono text-xs">{JSON.stringify(sandboxPayload, null, 2)}</pre>
          <Button variant="outline" onClick={() => void copyText(JSON.stringify(sandboxPayload, null, 2), "Sandbox JSON copied")}><Copy className="h-4 w-4" />Copy JSON</Button>
        </DialogContent>
      </Dialog>

      {settingsOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-background/80 p-4" onClick={() => setSettingsOpen(false)}>
          <div className="panel w-full max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Integration Settings</h2>
            <div className="space-y-1 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
              <p>● Database connected — meetings, decisions and tasks are stored in Lovable Cloud.</p>
              <p>● AI analysis built in — no API key needed. A smart offline parser takes over if AI is unavailable.</p>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Make.com Webhook URL</span>
              <input className="field w-full font-mono text-xs" value={webhook} onChange={(e) => setWebhook(e.target.value)} />
            </label>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setWebhook(DEFAULT_WEBHOOK)}>Reset</button>
              <button className={btnPrimary} onClick={() => setSettingsOpen(false)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ingest(p: {
  title: string; setTitle: (v: string) => void; date: string; setDate: (v: string) => void;
  transcript: string; setTranscript: React.Dispatch<React.SetStateAction<string>>; memory: number; busy: boolean; pulse?: boolean; onAnalyze: () => void;
  onVoiceActive: (active: boolean) => void;
}) {
  const speakers = useMemo(() => parseSpeakers(p.transcript), [p.transcript]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="panel space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Meeting Title</span>
            <input className="field w-full" value={p.title} onChange={(e) => p.setTitle(e.target.value)} /></label>
          <label className="space-y-1 text-sm"><span className="text-muted-foreground">Meeting Date</span>
            <input type="date" className="field w-full" value={p.date} onChange={(e) => p.setDate(e.target.value)} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnGhost} onClick={() => p.setTranscript(DEMO_TRANSCRIPT)}>Load Oct 31 Live Demo Transcript</button>
          <label className={`${btnGhost} cursor-pointer`}>Upload .txt / .vtt
            <input type="file" accept=".txt,.vtt" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (f) p.setTranscript(await f.text());
            }} /></label>
        </div>
        <VoiceDictation onActiveChange={p.onVoiceActive} append={(t) => p.setTranscript((prev: string) => prev + t)} />
        <textarea className="field min-h-[320px] w-full font-mono text-xs leading-relaxed" placeholder="Speaker (Role): what they said…"
          value={p.transcript} onChange={(e) => p.setTranscript(e.target.value)} />
        <button id="analyze-btn" className={`${btnPrimary} w-full py-3 text-base ${p.pulse ? "pulse-cta" : ""}`} disabled={!p.transcript.trim() || p.busy} onClick={p.onAnalyze}>
          {p.busy ? "Analyzing against memory…" : "Analyze Transcript & Detect Conflicts"}
        </button>
      </section>
      <aside className="space-y-4">
        <div className="panel p-5">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Live Speaker Parser</h3>
          {speakers.length === 0 ? <p className="text-sm text-muted-foreground">No speakers detected yet.</p> : (
            <ul className="space-y-2">{speakers.map((s) => (
              <li key={s.speaker} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Avatar name={s.speaker} />{s.speaker}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.lines} lines</span>
              </li>))}</ul>
          )}
        </div>
        <div className="panel p-5">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Memory loaded</h3>
          <p className="text-3xl font-semibold">{p.memory}</p>
          <p className="text-sm text-muted-foreground">historical decisions checked for conflicts{p.memory === 0 ? " — seed memory first" : ""}.</p>
        </div>
      </aside>
    </div>
  );
}

function Review({ analysis, setAnalysis, busy, onConfirm, goIngest, meetingDate, meetingTitle, mode }: {
  mode: AutonomyMode;
  meetingDate: string; meetingTitle: string;
  analysis: Analysis | null; setAnalysis: (a: Analysis) => void; busy: boolean; onConfirm: () => void; goIngest: () => void;
}) {
  if (!analysis) return (
    <div className="panel p-10 text-center">
      <p className="text-muted-foreground">Nothing awaiting review.</p>
      <button className={`${btnPrimary} mt-4`} onClick={goIngest}>Ingest a meeting</button>
    </div>
  );
  const a = analysis;
  const resolve = (i: number, resolution: "accepted" | "rejected") => setAnalysis(resolveConflict(a, i, resolution));
  const approved = executionItems(a, mode);
  const exported = exportReview(a, mode);
  const upd = (fn: (n: Analysis) => void) => { const n = structuredClone(a); fn(n); setAnalysis(n); };
  return (
    <div className="space-y-6">
      <div id="conflict-gate" className="flex scroll-mt-28 items-center justify-between">
        <h2 className="text-xl font-semibold">Human-in-the-Loop Review</h2>
        <span className="font-mono text-xs text-muted-foreground">source: {a.source === "ai" ? "AI analysis" : "deterministic parser"}</span>
      </div>
      <Scorecard a={a} />
      {a.conflicts.map((c, i) => (
        <article aria-label={`${c.conflict_type} conflict`} key={i} className={`min-w-0 rounded-lg border-2 p-5 ${c.resolution === "rejected" ? "border-success/50 bg-success/5" : c.resolution === "accepted" ? "border-primary/60 bg-primary/5" : "border-destructive bg-destructive/10"}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="max-w-full break-words rounded border border-destructive/50 bg-destructive/10 px-2 py-1 font-mono text-xs font-bold text-destructive">{c.conflict_type.replaceAll("_", " ")}</span>
            <span className="rounded-full border border-border bg-secondary px-2 py-1 font-mono text-xs">{c.confidence_score} confidence</span>
            <time className="font-mono text-xs text-muted-foreground">Memory · {c.past_meeting_date}</time>
            {c.resolution && <span className="text-xs font-medium">{c.resolution === "accepted" ? "Change accepted" : "Change rejected"}</span>}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-md border border-success/40 bg-muted p-4">
              <p className="text-xs font-medium text-success">Governing Memory ({shortDate(c.past_meeting_date)})</p>
              <p className="mt-2 break-words font-semibold">{c.past_value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{c.past_speaker}</p>
              <p className="mt-2 break-words text-sm text-muted-foreground">{c.contradicted_decision}</p>
            </div>
            <div className="min-w-0 rounded-md border border-destructive/50 bg-destructive/5 p-4">
              <p className="text-xs font-medium text-destructive">New Transcript Proposal ({shortDate(meetingDate)})</p>
              <p className={`mt-2 break-words font-semibold ${c.resolution === "rejected" ? "line-through decoration-destructive" : ""}`}>{c.new_value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{c.speaker}</p>
              <p className={`mt-2 break-words text-sm text-muted-foreground ${c.resolution === "rejected" ? "line-through decoration-destructive" : ""}`}>{c.new_statement}</p>
            </div>
          </div>
          <div className="mt-3 border-l-2 border-primary bg-muted/50 px-4 py-3">
            <p className="text-xs font-semibold text-primary">Downstream Task Impact</p>
            <p className="mt-1 break-words text-sm">{c.related_task_index === null ? c.impacted_task_preview : a.action_items[c.related_task_index]?.task ?? c.impacted_task_preview}</p>
            {c.related_task_index !== null && <p className="mt-1 text-xs text-muted-foreground">{c.resolution === "rejected" ? "Blocked from execution" : "Blocked if this change is rejected"}</p>}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{c.reason}</p>
          <details className="mt-3 rounded-md border border-primary/40 bg-background p-3">
            <summary className="cursor-pointer text-sm font-medium text-primary">🔮 Simulate Impact</summary>
            <div className="mt-3 grid gap-2 text-sm">
              <p><span className="font-semibold text-destructive">If Overridden:</span> {impactOf(c).over}</p>
              <p><span className="font-semibold text-success">If Rejected (Protected):</span> {impactOf(c).rejected}</p>
            </div>
          </details>
          <details className="mt-3 rounded-md border border-agent/40 bg-background p-3">
            <summary className="cursor-pointer text-sm font-medium text-agent">🧠 View Agent Reasoning Trace</summary>
            <div className="mt-3 space-y-2 break-words font-mono text-xs leading-relaxed text-muted-foreground">
              <p><span className="text-foreground">Memory Vector Match:</span> Matched governing decision from {c.past_meeting_date} by {c.past_speaker}: “{c.contradicted_decision}”.</p>
              <p><span className="text-foreground">Agent Critique:</span> Proposed value “{c.new_value}” conflicts with “{c.past_value}”. Executing it unverified could create rework in {c.impacted_task_preview}.</p>
              <p><span className="text-foreground">Auto-Remediation Action:</span> Override approves the proposal for the next confirmation. After confirmation, approved decisions and tasks are saved and sent to Slack. Keep Past Decision preserves memory, blocks linked work, and excludes it from both writes. Sandbox previews only; no writes or Slack calls.</p>
            </div>
          </details>
          {c.resolution === "rejected" && <div className="mt-3 flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm font-medium text-success"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Backlog Protected: Unapproved scope blocked from Slack/Tracker</span></div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="h-auto whitespace-normal" onClick={() => resolve(i, "accepted")}>Override Past Decision (Accept Change)</Button>
            <Button variant="destructive" className="h-auto whitespace-normal" onClick={() => resolve(i, "rejected")}>Keep Past Decision (Reject Change)</Button>
          </div>
        </article>
      ))}
      <section className="panel space-y-3 p-5">
        <h3 className="font-semibold">Extracted Decisions</h3>
        {a.extracted_decisions.map((d, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-2 ${d.checked ? "" : "opacity-50"}`}>
            <input type="checkbox" className="h-4 w-4 accent-primary" aria-label={`Approve decision ${i + 1}`} disabled={isConflictBlocked(a, "decision", i)} checked={d.checked} onChange={(e) => upd((n) => { const item = n.extracted_decisions[i]; if (item) item.checked = e.target.checked; })} />
            <input className="field w-36" value={d.speaker} onChange={(e) => upd((n) => { const item = n.extracted_decisions[i]; if (item) item.speaker = e.target.value; })} />
            <input className={`field min-w-0 flex-1 ${isConflictBlocked(a, "decision", i) ? "line-through" : ""}`} value={d.decision_text} onChange={(e) => upd((n) => { const item = n.extracted_decisions[i]; if (item) item.decision_text = e.target.value; })} />
          </div>
        ))}
      </section>
      <section className="panel space-y-3 p-5">
        <h3 className="font-semibold">Extracted Action Items</h3>
        {a.action_items.map((t, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-2 ${t.checked ? "" : "opacity-50"}`}>
            <input type="checkbox" className="h-4 w-4 accent-primary" aria-label={`Approve task ${i + 1}`} disabled={isConflictBlocked(a, "task", i)} checked={t.checked} onChange={(e) => upd((n) => { const item = n.action_items[i]; if (item) item.checked = e.target.checked; })} />
            <input className="field min-w-0 flex-1" value={t.task} onChange={(e) => upd((n) => { const item = n.action_items[i]; if (item) item.task = e.target.value; })} />
            <input className="field w-36" value={t.owner} onChange={(e) => upd((n) => { const item = n.action_items[i]; if (item) item.owner = e.target.value; })} />
            <input className="field w-36 font-mono" value={t.deadline} onChange={(e) => upd((n) => { const item = n.action_items[i]; if (item) item.deadline = e.target.value; })} />
          </div>
        ))}
      </section>
      <div className="flex flex-wrap items-center gap-2">
      <Button className="h-auto min-w-0 flex-1 whitespace-normal py-3 text-base" disabled={busy} onClick={onConfirm}>
        {busy ? "Executing…" : mode === "sandbox" ? `Preview Sandbox Payload (${approved.decisions.length} decisions · ${approved.tasks.length} tasks)` : `Confirm & Execute Approved Items (${approved.decisions.length} decisions · ${approved.tasks.length} tasks)`}
      </Button>
      <ExportActions markdown={tasksMarkdown(approved.tasks)} payload={confirmationPayload(exported, meetingTitle, meetingDate)} filename={`syncexec-review-${meetingDate}.json`} />
      </div>
    </div>
  );
}

function Vault({ decisions, meetings, sendHook, defenses, selectedSource, jumpSource }: { defenses: Defense[]; selectedSource: MemorySource | null; jumpSource: (s: MemorySource) => void; decisions: Decision[]; meetings: { id: string; date: string; title: string }[]; sendHook: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [speaker, setSpeaker] = useState("All");
  const [q, setQ] = useState("");
  const [briefOpen, setBriefOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeline, setTimeline] = useState(false);
  useEffect(() => { if (selectedSource?.kind === "decision") { setQ(""); setSpeaker("All"); } }, [selectedSource]);
  const brief = useMemo(() => governingBrief(decisions, meetings), [decisions, meetings]);
  const list = decisions.filter((d) => (speaker === "All" || d.speaker === speaker) && d.decision_text.toLowerCase().includes(q.toLowerCase())).reverse();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Decision Memory Vault</h2>
        <Button className="h-auto whitespace-normal" disabled={!decisions.length} onClick={() => setBriefOpen(true)}><Zap className="h-4 w-4 shrink-0" />⚡ Generate Pre-Read Brief for Next Sync</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Decision view">
        <Button variant={timeline ? "outline" : "default"} aria-pressed={!timeline} onClick={() => setTimeline(false)}>📋 Ledger View</Button>
        <Button variant={timeline ? "default" : "outline"} aria-pressed={timeline} onClick={() => setTimeline(true)}>🕸️ Lineage Timeline View</Button>
      </div>
      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pre-Meeting Context Brief</DialogTitle>
            <DialogDescription>Next Sync · Active Governing Decisions</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border">
            {brief.sections.map((section) => <section key={section.category} className="py-4">
              <h3 className="mb-2 font-semibold text-primary">{section.category}</h3>
              {section.entries.length ? <ul className="space-y-3">{section.entries.map(({ decision, date }) => <li key={decision.id} className="min-w-0">
                <p className="break-words text-sm">{decision.decision_text.replace(/^\[[^\]]+\]\s*/, "")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{decision.speaker} · {date}</p>
              </li>)}</ul> : <p className="text-sm text-muted-foreground">No governing decisions recorded.</p>}
            </section>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-auto whitespace-normal" onClick={() => void copyText(brief.text, "Pre-read copied to clipboard")}><Copy className="h-4 w-4 shrink-0" />Copy Pre-Read to Clipboard</Button>
            <Button className="h-auto whitespace-normal" disabled={sending} onClick={async () => {
              setSending(true);
              try {
                const ok = await sendHook({ event_type: "pre_meeting_brief", meeting_title: "Next Sync", meeting_date: TODAY, approved_decisions: brief.decisions, approved_tasks: [], target_person: "All Team", digest_summary: brief.text, slack_text: brief.text });
                if (ok) toast.success("Pre-read sent to Slack webhook");
                else toast.error("Pre-read not delivered. Check your webhook scenario.");
              } catch { toast.error("Pre-read not delivered. Please try again."); }
              finally { setSending(false); }
            }}><Send className="h-4 w-4 shrink-0" />{sending ? "Sending…" : "Send Pre-Read to Slack Webhook"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap gap-2">
        <input className="field flex-1" placeholder="Search decisions…" value={q} onChange={(e) => setQ(e.target.value)} />
        {["All", "Priya (PM)", "Rahul (Eng)"].map((s) => (
          <button key={s} className={speaker === s ? btnPrimary : btnGhost} onClick={() => setSpeaker(s)}>{s}</button>
        ))}
      </div>
      {list.length === 0 && <p className="panel p-8 text-center text-muted-foreground">No decisions yet — seed memory from the header.</p>}
      <DecisionLineage decisions={list} allDecisions={decisions} meetings={meetings} defenses={defenses} timeline={timeline} selected={selectedSource?.id} onJump={id => { const d = decisions.find(d => d.id === id); if (d) { setQ(""); setSpeaker("All"); jumpSource({ id, kind: "decision", date: "", label: d.decision_text }); } }} />
    </div>
  );
}

function Digest({ items, decisions, sendHook, setNotice, onToggle, urgentFocus = false, setUrgentFocus, selectedSource }: {
  selectedSource?: MemorySource | null;
  urgentFocus?: boolean; setUrgentFocus?: (v: boolean) => void;
  items: ActionItem[]; decisions: Decision[]; sendHook: (p: Record<string, unknown>) => Promise<boolean>;
  setNotice: (n: { kind: "ok" | "err"; text: string }) => void; onToggle: (i: ActionItem) => Promise<void>;
}) {
  const [person, setPerson] = useState("All Team");
  const [digest, setDigest] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  useEffect(() => { if (selectedSource?.kind === "task") setPerson("All Team"); }, [selectedSource]);
  const mine = items.filter((i) => person === "All Team" || i.owner === person);
  const open = mine.filter((i) => i.status === "open");
  const urgent = open.filter(isUrgent);
  const done = mine.filter((i) => i.status === "completed");
  const authored = decisions.filter((d) => person === "All Team" || d.speaker === person);

  function generate() {
    const l = (arr: string[]) => (arr.length ? arr.map((x) => `  • ${x}`).join("\n") : "  • none");
    setDigest(`EXECUTIVE WEEKLY DIGEST — ${person} (week of ${TODAY})

🔴 Critical Tasks Due Next 48h
${l(urgent.map((i) => `${i.task} — ${i.owner} — due ${i.deadline}`))}

📋 Open Backlog
${l(open.filter((i) => !isUrgent(i)).map((i) => `${i.task} — ${i.owner} — due ${i.deadline}`))}

✅ Completed Wins
${l(done.map((i) => `${i.task} — ${i.owner}`))}

🏛 Key Decisions Owned
${l(authored.map((d) => `${d.decision_text} (${d.speaker})`))}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select className="field" value={person} onChange={(e) => { setPerson(e.target.value); setDigest(""); }}>
          {["All Team", "Rahul (Eng)", "Priya (PM)"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className={btnPrimary} onClick={generate}>Generate Weekly Digest</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Open Action Items", open.length, "text-foreground"], ["Urgent (< 48h)", urgent.length, "text-destructive"], ["Completed Tasks", done.length, "text-success"], ["Decisions Authored", authored.length, "text-primary"]].map(([l, v, c]) => (
          <div key={l as string} className="panel p-5"><p className="text-sm text-muted-foreground">{l}</p><p className={`mt-1 text-4xl font-semibold ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex gap-1 rounded-full border border-border p-1 text-sm w-fit">
        {([["list", "🚨 48h List"], ["kanban", "🗂️ Kanban Board"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {view === "kanban" && (
        <div className="grid gap-4 md:grid-cols-3">
          {([["🔴 Urgent <48h", urgent, "border-destructive/50"], ["🔵 Open Backlog", open.filter((i) => !isUrgent(i)), "border-accent/50"], ["🟢 Completed", done, "border-success/50"]] as const).map(([label, col, border]) => (
            <section key={label} className={`panel border-t-4 ${border} p-4`}>
              <h3 className="mb-3 font-semibold">{label} <span className="font-mono text-xs text-muted-foreground">({col.length})</span></h3>
              <div className="space-y-2">
                {col.length === 0 && <p className="text-sm text-muted-foreground">Empty</p>}
                {col.map((it) => (
                  <div key={it.id} className="rounded-md border border-border bg-muted/40 p-3">
                    <p className={`text-sm ${it.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{it.task}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{it.owner} · due {it.deadline}</p>
                    <button className={`${btnGhost} mt-2`} onClick={() => onToggle(it)}>{it.status === "open" ? "→ Move to Completed" : "↺ Reopen"}</button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {view === "list" && <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">48-Hour Deadline Radar</h3>
          <button className={`rounded-full border px-3 py-1 font-mono text-xs ${urgentFocus ? "border-destructive bg-destructive/15 text-destructive" : "border-border text-muted-foreground"}`}
            onClick={() => setUrgentFocus?.(!urgentFocus)}>{urgentFocus ? "● Urgent only: Rahul & Priya" : "○ Show urgent only"}</button>
        </div>
        <ul className="divide-y divide-border">
          {(urgentFocus ? mine.filter((i) => isUrgent(i) && ["Rahul (Eng)", "Priya (PM)"].includes(i.owner)) : mine).length === 0 && <li className="py-4 text-sm text-muted-foreground">No tasks yet.</li>}
          {(urgentFocus ? mine.filter((i) => isUrgent(i) && ["Rahul (Eng)", "Priya (PM)"].includes(i.owner)) : mine).map((it) => (
            <li id={`task-${it.id}`} key={it.id} className={`flex scroll-mt-64 flex-wrap items-center gap-3 py-3 ${selectedSource?.id === it.id ? "rounded-md ring-2 ring-accent/40" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className={it.status === "completed" ? "text-muted-foreground line-through" : ""}>{it.task}</p>
                <p className="font-mono text-xs text-muted-foreground">{it.owner} · due {it.deadline}</p>
              </div>
              {isUrgent(it) && <span className="pulse-urgent rounded bg-destructive px-2 py-0.5 font-mono text-xs font-bold text-destructive-foreground">URGENT: DUE IN &lt; 48H</span>}
              <button className={btnGhost} onClick={() => onToggle(it)}>{it.status === "open" ? "○ open" : "● completed"}</button>
              <button className={btnGhost} onClick={async () => {
                const summary = reminderSummary(it);
                const ok = await sendHook({ event_type: "deadline_reminder", target_person: it.owner, approved_tasks: [it], digest_summary: summary, slack_text: summary });
                if (ok) setNotice({ kind: "ok", text: `Reminder sent to ${it.owner}.` });
              }}>Send Reminder to Webhook</button>
            </li>
          ))}
        </ul>
      </section>}
      {digest && (
        <section className="panel space-y-4 border-primary/40 p-5">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{digest}</pre>
          <div className="flex flex-wrap items-center gap-2">
          <Button className="h-auto whitespace-normal" onClick={async () => {
            const ok = await sendHook({ event_type: "weekly_digest", target_person: person, digest_summary: digest, approved_tasks: open });
            if (ok) setNotice({ kind: "ok", text: "Weekly digest posted to webhook." });
          }}>Post Weekly Digest to Slack/Webhook</Button>
          <ExportActions markdown={tasksMarkdown(mine)} payload={{ event_type: "weekly_digest", target_person: person, digest_summary: digest, approved_tasks: open }} filename={`syncexec-digest-${TODAY}.json`} />
          </div>
        </section>
      )}
    </div>
  );
}

type HookLog = { id: string; event_type: string; status: string; ms: number; at: string; payload: Record<string, unknown>; url: string };

function topicOf(c: Conflict) {
  const t = `${c.new_value} ${c.past_value} ${c.new_statement}`;
  return /mongo|postgres|database/i.test(t) ? "database" : /\$|budget/i.test(t) ? "budget" : /launch|beta/i.test(t) ? "launch" : "other";
}
function impactOf(c: Conflict) {
  const t = topicOf(c);
  if (t === "budget") return { over: "Q4 marketing spend rises to $8,000: +$3,000 (+60%) over the approved cap.", rejected: "Budget stays capped at $5,000; influencer spend is blocked from the backlog." };
  if (t === "launch") return { over: "Public beta slips from Nov 15 to Nov 25: +10 days; investor deck and GTM dates shift.", rejected: "Nov 15 launch stays locked; timeline-dependent tasks remain on schedule." };
  if (t === "database") return { over: "PostgreSQL → MongoDB migration starts: ~16h engineering rework on schema and ORM.", rejected: "PostgreSQL stays primary; migration work is blocked, saving ~16h of engineering." };
  return { over: `Adopts “${c.new_value}” and replaces “${c.past_value}”.`, rejected: `Keeps “${c.past_value}”; linked work stays blocked.` };
}
function Scorecard({ a }: { a: Analysis }) {
  const total = a.conflicts.length;
  const resolved = a.conflicts.filter((c) => c.resolution).length;
  const score = total ? Math.round(58 + (38 * resolved) / total) : 96;
  const overrideOn = (topic: string) => a.conflicts.some((c) => topicOf(c) === topic && c.resolution !== "rejected" && c.related_decision_index !== null && a.extracted_decisions[c.related_decision_index]?.checked);
  const reworkSaved = a.conflicts.some((c) => topicOf(c) === "database" && c.resolution === "rejected");
  const stats: [string, string, string][] = [
    ["Alignment Score", `${score}/100 (${score >= 90 ? "Aligned" : score >= 75 ? "Moderate Drift" : "High Drift"})`, score >= 90 ? "text-success" : score >= 75 ? "text-primary" : "text-destructive"],
    ["Budget Variance", overrideOn("budget") ? "+$3,000 (+60%)" : "$0", overrideOn("budget") ? "text-destructive" : "text-success"],
    ["Timeline Slip", overrideOn("launch") ? "+10 Days" : "0 Days", overrideOn("launch") ? "text-destructive" : "text-success"],
    ["Rework Saved", reworkSaved ? "16h Eng Saved" : "0h", reworkSaved ? "text-success" : "text-muted-foreground"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Executive Alignment Scorecard">
      {stats.map(([l, v, c]) => <div key={l} className="panel p-4"><p className="text-xs text-muted-foreground">{l}</p><p className={`mt-1 text-xl font-semibold ${c}`}>{v}</p></div>)}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const pm = /priya/i.test(name);
  return <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${pm ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>{name.charAt(0)}</span>;
}
