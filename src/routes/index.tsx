import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadAll, saveMeeting, seedDemo, setTaskStatus } from "@/lib/syncexec.db.functions";
import {
  DEFAULT_WEBHOOK, DEMO_TRANSCRIPT, SEED, TODAY, deterministicAnalyze, isUrgent, parseSpeakers,
  type ActionItem, type Analysis, type Decision,
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

  const [title, setTitle] = useState("Emergency Pre-Launch Sync");
  const [date, setDate] = useState(TODAY);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("syncexec.webhook");
    if (saved) setWebhook(saved);
    void refresh();
  }, []);
  useEffect(() => { localStorage.setItem("syncexec.webhook", webhook); }, [webhook]);

  async function refresh() {
    const r = await loadAll();
    setDecisions(r.decisions as Decision[]);
    setItems(r.items as ActionItem[]);
    setMeetings(r.meetings);
  }

  async function sendHook(payload: Record<string, unknown>) {
    if (!webhook.startsWith("https://")) { setNotice({ kind: "err", text: "Add a valid https webhook URL first." }); return false; }
    const r = await postWebhook({ data: { url: webhook, payload } });
    if (!r.ok) setNotice({ kind: "err", text: `Webhook failed (${r.status}): ${r.body}` });
    return r.ok;
  }

  async function seed() {
    setBusy("seed");
    await seedDemo();
    await refresh();
    setBusy("");
    setNotice({ kind: "ok", text: "Oct 10 & Oct 20 memory seeded: 4 decisions, 4 tasks." });
  }

  async function analyze() {
    setBusy("analyze");
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
    setAnalysis(result);
    setBusy("");
    setTab("review");
  }

  async function confirm() {
    if (!analysis) return;
    setBusy("confirm");
    const ds = analysis.extracted_decisions.filter((d) => d.checked);
    const ts = analysis.action_items.filter((t) => t.checked);
    const rejected = analysis.conflicts.filter((c) => c.resolution === "rejected").length;
    const approvedDecisions = ds.map((d) => ({ speaker: d.speaker, decision_text: `[${date}] ${d.decision_text}` }));
    const approvedTasks = ts.map((t) => ({ task: t.task, owner: t.owner, deadline: t.deadline, status: "open", synced_to_tracker: true }));
    const saved = await saveMeeting({ data: { title, date, transcript, decisions: approvedDecisions, tasks: approvedTasks.map(({ task, owner, deadline }) => ({ task, owner, deadline })) } });
    if (!saved.ok) { setBusy(""); setNotice({ kind: "err", text: saved.error }); return; }
    const hookOk = await sendHook({
      event_type: "confirm_and_execute", meeting_title: title, meeting_date: date,
      approved_decisions: approvedDecisions, approved_tasks: approvedTasks,
      target_person: "All Team", digest_summary: "Synced from Review Gate",
    });
    await refresh();
    setAnalysis(null);
    setBusy("");
    setNotice({ kind: "ok", text: `Executed: ${approvedDecisions.length} decisions saved, ${approvedTasks.length} tasks synced, ${rejected} conflicts rejected.${hookOk ? " Webhook delivered." : " Webhook not delivered — check that your Make.com scenario is switched on."}` });
  }

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
            <input className="field w-72 rounded-full font-mono text-xs" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="Make.com webhook URL" />
            <button className={btnGhost} disabled={busy === "test"} onClick={async () => {
              setBusy("test");
              const ok = await sendHook({ event_type: "test", digest_summary: "SyncExec webhook test", sent_at: new Date().toISOString() });
              if (ok) setNotice({ kind: "ok", text: "Webhook test delivered." });
              setBusy("");
            }}>Test Webhook</button>
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
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {notice && (
          <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 text-sm ${notice.kind === "ok" ? "border-success/50 bg-success/10 text-success" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
            <span className="font-medium">{notice.text}</span>
            <button className="opacity-70 hover:opacity-100" onClick={() => setNotice(null)}>✕</button>
          </div>
        )}
        {tab === "ingest" && (
          <Ingest {...{ title, setTitle, date, setDate, transcript, setTranscript }} memory={decisions.length} busy={busy === "analyze"} onAnalyze={analyze} />
        )}
        {tab === "review" && <Review analysis={analysis} setAnalysis={setAnalysis} busy={busy === "confirm"} onConfirm={confirm} goIngest={() => setTab("ingest")} />}
        {tab === "vault" && <Vault decisions={decisions} meetings={meetings} />}
        {tab === "digest" && <Digest items={items} decisions={decisions} sendHook={sendHook} setNotice={setNotice} onToggle={async (it) => {
          await setTaskStatus({ data: { id: it.id, status: it.status === "open" ? "completed" : "open" } });
          await refresh();
        }} />}
      </main>

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
  transcript: string; setTranscript: (v: string) => void; memory: number; busy: boolean; onAnalyze: () => void;
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
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs text-destructive">
            <span className="pulse-urgent h-2 w-2 rounded-full bg-destructive" /> 🎙 Wispr Flow Voice Dictation Active
          </span>
        </div>
        <textarea className="field min-h-[320px] w-full font-mono text-xs leading-relaxed" placeholder="Speaker (Role): what they said…"
          value={p.transcript} onChange={(e) => p.setTranscript(e.target.value)} />
        <button className={`${btnPrimary} w-full py-3 text-base`} disabled={!p.transcript.trim() || p.busy} onClick={p.onAnalyze}>
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

function Review({ analysis, setAnalysis, busy, onConfirm, goIngest }: {
  analysis: Analysis | null; setAnalysis: (a: Analysis) => void; busy: boolean; onConfirm: () => void; goIngest: () => void;
}) {
  if (!analysis) return (
    <div className="panel p-10 text-center">
      <p className="text-muted-foreground">Nothing awaiting review.</p>
      <button className={`${btnPrimary} mt-4`} onClick={goIngest}>Ingest a meeting</button>
    </div>
  );
  const a = analysis;
  const resolve = (i: number, resolution: "accepted" | "rejected") => {
    const next: Analysis = structuredClone(a);
    const c = next.conflicts[i]!;
    c.resolution = resolution;
    const on = resolution === "accepted";
    if (c.related_decision_index != null && next.extracted_decisions[c.related_decision_index]) next.extracted_decisions[c.related_decision_index]!.checked = on;
    if (c.related_task_index != null && next.action_items[c.related_task_index]) next.action_items[c.related_task_index]!.checked = on;
    setAnalysis(next);
  };
  const upd = (fn: (n: Analysis) => void) => { const n = structuredClone(a); fn(n); setAnalysis(n); };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Human-in-the-Loop Review</h2>
        <span className="font-mono text-xs text-muted-foreground">source: {a.source === "ai" ? "AI analysis" : "deterministic parser"}</span>
      </div>
      {a.conflicts.map((c, i) => (
        <div key={i} className={`rounded-lg border-2 p-5 ${c.resolution === "rejected" ? "border-border bg-muted opacity-70" : c.resolution === "accepted" ? "border-primary/60 bg-primary/5" : "border-destructive bg-destructive/10"}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded bg-destructive px-2 py-0.5 font-mono text-xs font-bold text-destructive-foreground">⚠ {c.severity} CONFLICT</span>
            {c.resolution && <span className="rounded border border-border px-2 py-0.5 font-mono text-xs uppercase">{c.resolution === "accepted" ? "Change accepted" : "Change rejected"}</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="font-mono text-xs uppercase text-muted-foreground">New · {c.speaker}</p><p className="mt-1 font-medium">“{c.new_statement}”</p></div>
            <div><p className="font-mono text-xs uppercase text-muted-foreground">Contradicts · {c.past_meeting_date}</p><p className="mt-1 line-through decoration-destructive/60">{c.contradicted_decision}</p></div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{c.reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => resolve(i, "accepted")}>Override Past Decision (Accept Change)</button>
            <button className={btnDanger} onClick={() => resolve(i, "rejected")}>Keep Past Decision (Reject Change)</button>
          </div>
        </div>
      ))}
      <section className="panel space-y-3 p-5">
        <h3 className="font-semibold">Extracted Decisions</h3>
        {a.extracted_decisions.map((d, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-2 ${d.checked ? "" : "opacity-50"}`}>
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={d.checked} onChange={(e) => upd((n) => { n.extracted_decisions[i]!.checked = e.target.checked; })} />
            <input className="field w-36" value={d.speaker} onChange={(e) => upd((n) => { n.extracted_decisions[i]!.speaker = e.target.value; })} />
            <input className="field min-w-0 flex-1" value={d.decision_text} onChange={(e) => upd((n) => { n.extracted_decisions[i]!.decision_text = e.target.value; })} />
          </div>
        ))}
      </section>
      <section className="panel space-y-3 p-5">
        <h3 className="font-semibold">Extracted Action Items</h3>
        {a.action_items.map((t, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-2 ${t.checked ? "" : "opacity-50"}`}>
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={t.checked} onChange={(e) => upd((n) => { n.action_items[i]!.checked = e.target.checked; })} />
            <input className="field min-w-0 flex-1" value={t.task} onChange={(e) => upd((n) => { n.action_items[i]!.task = e.target.value; })} />
            <input className="field w-36" value={t.owner} onChange={(e) => upd((n) => { n.action_items[i]!.owner = e.target.value; })} />
            <input className="field w-36 font-mono" value={t.deadline} onChange={(e) => upd((n) => { n.action_items[i]!.deadline = e.target.value; })} />
          </div>
        ))}
      </section>
      <button className={`${btnPrimary} w-full py-3 text-base`} disabled={busy} onClick={onConfirm}>
        {busy ? "Executing…" : `Confirm & Execute Approved Items (${a.extracted_decisions.filter((d) => d.checked).length} decisions · ${a.action_items.filter((t) => t.checked).length} tasks)`}
      </button>
    </div>
  );
}

function Vault({ decisions, meetings }: { decisions: Decision[]; meetings: { id: string; date: string; title: string }[] }) {
  const [speaker, setSpeaker] = useState("All");
  const [q, setQ] = useState("");
  const list = decisions.filter((d) => (speaker === "All" || d.speaker === speaker) && d.decision_text.toLowerCase().includes(q.toLowerCase())).reverse();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="field flex-1" placeholder="Search decisions…" value={q} onChange={(e) => setQ(e.target.value)} />
        {["All", "Priya (PM)", "Rahul (Eng)"].map((s) => (
          <button key={s} className={speaker === s ? btnPrimary : btnGhost} onClick={() => setSpeaker(s)}>{s}</button>
        ))}
      </div>
      {list.length === 0 && <p className="panel p-8 text-center text-muted-foreground">No decisions yet — seed memory from the header.</p>}
      <ol className="relative space-y-3 border-l border-border pl-6">
        {list.map((d) => {
          const m = meetings.find((x) => x.id === d.meeting_id);
          const dt = d.decision_text.match(/\[(\d{4}-\d{2}-\d{2})\]/)?.[1] ?? m?.date ?? d.created_at.slice(0, 10);
          return (
            <li key={d.id} className="panel relative p-4">
              <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-primary" />
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <Avatar name={d.speaker} /><span className="font-medium">{d.speaker}</span>
                <span className="rounded bg-secondary px-2 py-0.5 font-mono">{dt}</span>
                {m && <span className="text-muted-foreground">{m.title}</span>}
                <span className="ml-auto rounded border border-success/40 bg-success/10 px-2 py-0.5 text-success">✓ Active Governing Decision</span>
              </div>
              <p>{d.decision_text.replace(/^\[[^\]]+\]\s*/, "")}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Digest({ items, decisions, sendHook, setNotice, onToggle }: {
  items: ActionItem[]; decisions: Decision[]; sendHook: (p: Record<string, unknown>) => Promise<boolean>;
  setNotice: (n: { kind: "ok" | "err"; text: string }) => void; onToggle: (i: ActionItem) => Promise<void>;
}) {
  const [person, setPerson] = useState("All Team");
  const [digest, setDigest] = useState("");
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
      <section className="panel p-5">
        <h3 className="mb-4 font-semibold">48-Hour Deadline Radar</h3>
        <ul className="divide-y divide-border">
          {mine.length === 0 && <li className="py-4 text-sm text-muted-foreground">No tasks yet.</li>}
          {mine.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className={it.status === "completed" ? "text-muted-foreground line-through" : ""}>{it.task}</p>
                <p className="font-mono text-xs text-muted-foreground">{it.owner} · due {it.deadline}</p>
              </div>
              {isUrgent(it) && <span className="pulse-urgent rounded bg-destructive px-2 py-0.5 font-mono text-xs font-bold text-destructive-foreground">URGENT: DUE IN &lt; 48H</span>}
              <button className={btnGhost} onClick={() => onToggle(it)}>{it.status === "open" ? "○ open" : "● completed"}</button>
              <button className={btnGhost} onClick={async () => {
                const ok = await sendHook({ event_type: "deadline_reminder", target_person: it.owner, approved_tasks: [it], digest_summary: `Urgent 48h deadline reminder: ${it.task} due ${it.deadline}` });
                if (ok) setNotice({ kind: "ok", text: `Reminder sent to ${it.owner}.` });
              }}>Send Reminder to Webhook</button>
            </li>
          ))}
        </ul>
      </section>
      {digest && (
        <section className="panel space-y-4 border-primary/40 p-5">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{digest}</pre>
          <button className={btnPrimary} onClick={async () => {
            const ok = await sendHook({ event_type: "weekly_digest", target_person: person, digest_summary: digest, approved_tasks: open });
            if (ok) setNotice({ kind: "ok", text: "Weekly digest posted to webhook." });
          }}>Post Weekly Digest to Slack/Webhook</button>
        </section>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const pm = /priya/i.test(name);
  return <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${pm ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>{name.charAt(0)}</span>;
}
