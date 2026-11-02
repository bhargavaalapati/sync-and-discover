import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const SIMULATED_VOICE_LINE = "\nRahul (Eng): Also, I will run load testing on the webhook ingestion endpoint by November 1, 2026.";

type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

function Waveform({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="flex h-6 items-end gap-[3px]">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className={`w-[3px] rounded-full bg-success ${active ? "wave-bar" : "opacity-30"}`}
          style={{ height: active ? undefined : "4px", animationDelay: `${(i * 83) % 600}ms` }} />
      ))}
    </span>
  );
}

export function VoiceDictation({ append }: { append: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { recRef.current?.stop(); if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  function toggleMic() {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast("Mic dictation isn't supported in this browser — try “Simulate Live Voice Note”."); return; }
    const rec = new Ctor();
    rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal) append(` ${r[0].transcript.trim()}`);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); toast.error("Microphone unavailable or permission denied."); };
    recRef.current = rec;
    try { rec.start(); setListening(true); append("\nSpeaker:"); } catch { setListening(false); }
  }

  function simulate() {
    if (streaming) return;
    setStreaming(true);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      const ch = SIMULATED_VOICE_LINE[i++];
      if (ch === undefined) { if (timerRef.current) window.clearInterval(timerRef.current); setStreaming(false); return; }
      append(ch);
    }, 22);
  }

  const active = listening || streaming;
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${active ? "border-success/60 bg-success/10" : "border-border bg-secondary"}`}>
      <span className="text-xs font-medium">🎙 Wispr Flow Voice Dictation</span>
      <Waveform active={active} />
      <span className="font-mono text-[10px] uppercase text-muted-foreground">{listening ? "Listening…" : streaming ? "Streaming voice note…" : "Idle"}</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <button className="rounded-md border border-success/50 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20" onClick={toggleMic}>
          {listening ? "■ Stop Dictation" : "🎙️ Dictate Live Line (Wispr Flow / Mic)"}
        </button>
        <button className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50" disabled={streaming} onClick={simulate}>
          ⚡ Simulate Live Voice Note (Rahul)
        </button>
      </div>
    </div>
  );
}
