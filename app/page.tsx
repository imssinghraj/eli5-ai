"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Upload, Download, Brain, Lightbulb, Target, HelpCircle,
  Zap, ChevronDown, X, AlertCircle, FileText, Loader2, CheckCircle,
  BookOpen, ChevronRight, Sparkles, Play, ListVideo, Map,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */
type Level = "child" | "beginner" | "intermediate" | "expert";
type MsgType = "user" | "explanation" | "chat" | "pdf" | "error";
type ConfusionRating = "confusing" | "okay" | "crystal" | null;

interface QuizItem { question: string; answer: string }
interface LearningStep { step: number; title: string; description: string }
interface VideoRec { title: string; channel: string; reason: string; url: string }
interface PlaylistRec { title: string; channel: string; url: string }
interface ExplainData {
  explanation: string; keyPoints: string[];
  examples: string[]; analogy: string; quiz: QuizItem[];
  learningPath?: LearningStep[];
}
interface PDFData {
  title: string; summary: string; keyPoints: string[];
  explanation: string; topics: string[]; difficulty: string;
  wordCount: number; charCount: number;
}
interface Message {
  id: string; type: MsgType; content: string;
  explainData?: ExplainData; pdfData?: PDFData;
  topic?: string; level?: Level; filename?: string;
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const LEVELS: { value: Level; emoji: string; label: string; desc: string }[] = [
  { value: "child",        emoji: "🧒", label: "ELI5",         desc: "Like I'm 5" },
  { value: "beginner",     emoji: "📗", label: "Beginner",      desc: "New to this" },
  { value: "intermediate", emoji: "📘", label: "Intermediate",  desc: "Some knowledge" },
  { value: "expert",       emoji: "🔬", label: "Expert",        desc: "Deep dive" },
];

const SUGGESTIONS = [
  "How does the internet work?",
  "What is quantum entanglement?",
  "Explain machine learning",
  "How do black holes form?",
  "What is CRISPR?",
  "How does the stock market work?",
];

/* ─── Utils ──────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const cn = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

function downloadMd(text: string, name: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([text], { type: "text/markdown" })),
    download: name,
  });
  a.click();
}

function explainToMd(topic: string, level: string, d: ExplainData) {
  return `# ELI5: ${topic}\n**Level:** ${level}\n\n---\n\n## Explanation\n${d.explanation}\n\n## Key Points\n${d.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## Examples\n${d.examples.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\n## Analogy\n${d.analogy}\n\n## Quiz\n${d.quiz.map((q, i) => `**Q${i + 1}: ${q.question}**\n> ${q.answer}`).join("\n\n")}`;
}

function pdfToMd(d: PDFData) {
  return `# ${d.title}\n\n## Summary\n${d.summary}\n\n## Key Points\n${d.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## ELI5\n${d.explanation}`;
}

/* ─── Micro components ───────────────────────────────────────────────── */
function Dots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse"
          style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
      {children}
    </p>
  );
}

/* ─── Quiz ───────────────────────────────────────────────────────────── */
function Quiz({ items }: { items: QuizItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setOpen(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  return (
    <div className="space-y-2">
      {items.map((q, i) => (
        <div key={i} className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
          <button onClick={() => toggle(i)}
            className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--bg-muted)] transition-colors">
            <span className="text-sm text-[var(--text-primary)]">
              <span className="text-[var(--text-accent)] font-semibold mr-2">Q{i + 1}.</span>{q.question}
            </span>
            <ChevronRight className={cn("w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5 transition-transform", open.has(i) && "rotate-90")} />
          </button>
          {open.has(i) && (
            <div className="px-4 pb-3 pt-1 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Learning Path ──────────────────────────────────────────────────── */
function LearningPath({ steps }: { steps: LearningStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center text-[11px] font-bold text-[var(--text-accent)]">
              {step.step}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px h-4 bg-[var(--border-subtle)] mt-1" />
            )}
          </div>
          <div className="pb-2 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{step.title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Watch & Learn ──────────────────────────────────────────────────── */
function WatchLearn({ topic, level }: { topic: string; level: Level }) {
  const [status, setStatus]     = useState<"idle" | "loading" | "done" | "error">("idle");
  const [video, setVideo]       = useState<VideoRec | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistRec | null>(null);
  const [errMsg, setErrMsg]     = useState("");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    setStatus("loading");
    fetch(`/api/youtube?topic=${encodeURIComponent(topic)}&level=${level}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErrMsg(d.error); setStatus("error"); return; }
        setVideo(d.video ?? null);
        setPlaylist(d.playlist ?? null);
        setStatus("done");
      })
      .catch(e => { setErrMsg(e.message); setStatus("error"); });
  }, [topic, level]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="space-y-2.5">
        {[0, 1].map(i => (
          <div key={i} className="flex items-center gap-3 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl p-3.5 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-[var(--border-default)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 bg-[var(--border-default)] rounded w-3/4" />
              <div className="h-2 bg-[var(--border-subtle)] rounded w-1/3" />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-[var(--text-muted)] text-center">Searching YouTube…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-2.5 px-3.5 py-3 bg-red-500/8 border border-red-500/20 rounded-xl">
        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-red-300">Couldn't load videos</p>
          <p className="text-[10px] text-red-400/70 mt-0.5">{errMsg}</p>
        </div>
      </div>
    );
  }

  if (!video && !playlist) {
    return <p className="text-xs text-[var(--text-muted)]">No video results found for this topic.</p>;
  }

  return (
    <div className="space-y-2.5">
      {video && (
        <a href={video.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 bg-[var(--bg-overlay)] hover:bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-xl p-3.5 transition-all group">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center mt-0.5">
            <Play className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] leading-snug group-hover:text-[var(--text-accent)] transition-colors">
              {video.title}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{video.channel}</p>
            {video.reason && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2">{video.reason}</p>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-1 group-hover:text-[var(--text-accent)] transition-colors" />
        </a>
      )}
      {playlist && (
        <a href={playlist.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[var(--bg-overlay)] hover:bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-xl p-3 transition-all group">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center">
            <ListVideo className="w-3.5 h-3.5 text-[var(--text-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--text-accent)] transition-colors">{playlist.title}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{playlist.channel} · Playlist</p>
          </div>
          <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0 group-hover:text-[var(--text-accent)] transition-colors" />
        </a>
      )}
    </div>
  );
}

/* ─── Confusion Meter ────────────────────────────────────────────────── */
function ConfusionMeter() {
  const [selected, setSelected] = useState<ConfusionRating>(null);

  const options: { value: ConfusionRating; emoji: string; label: string; activeClass: string; hoverClass: string }[] = [
    {
      value: "confusing",
      emoji: "😵",
      label: "Confusing",
      activeClass: "border-red-500/50 bg-red-500/10 text-red-300",
      hoverClass: "hover:border-red-500/30 hover:bg-red-500/6 hover:text-red-300",
    },
    {
      value: "okay",
      emoji: "🙂",
      label: "Okay",
      activeClass: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300",
      hoverClass: "hover:border-yellow-500/30 hover:bg-yellow-500/6 hover:text-yellow-300",
    },
    {
      value: "crystal",
      emoji: "🤯",
      label: "Crystal Clear",
      activeClass: "border-green-500/50 bg-green-500/10 text-green-300",
      hoverClass: "hover:border-green-500/30 hover:bg-green-500/6 hover:text-green-300",
    },
  ];

  return (
    <div className="space-y-2.5">
      <SectionLabel>How clear was this explanation?</SectionLabel>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
              selected === opt.value
                ? opt.activeClass
                : `border-[var(--border-default)] text-[var(--text-muted)] ${opt.hoverClass}`
            )}
          >
            <span className="text-base leading-none">{opt.emoji}</span>
            {opt.label}
            {selected === opt.value && <CheckCircle className="w-3 h-3 shrink-0" />}
          </button>
        ))}
      </div>

      {selected === "confusing" && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-[var(--text-accent)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Try asking{" "}
            <span className="text-[var(--text-accent)] font-medium">"Can you simplify this further?"</span>
            {" "}or{" "}
            <span className="text-[var(--text-accent)] font-medium">"Give me a simpler analogy"</span>
            {" "}in the chat below.
          </p>
        </div>
      )}

      {selected === "crystal" && (
        <p className="text-xs text-green-400/80">🎉 Glad it clicked! Keep exploring.</p>
      )}
    </div>
  );
}

/* ─── Explanation Card ───────────────────────────────────────────────── */
function ExplainCard({ topic, level, data, onDownload }:
  { topic: string; level: Level; data: ExplainData; onDownload: () => void }) {
  const [tab, setTab] = useState<"explain" | "points" | "examples" | "analogy" | "quiz" | "path" | "watch">("explain");

  const hasPath  = Array.isArray(data.learningPath) && data.learningPath.length > 0;

  const tabs = [
    { id: "explain"  as const, label: "Explanation",   icon: BookOpen },
    { id: "points"   as const, label: "Key Points",    icon: Target },
    { id: "examples" as const, label: "Examples",      icon: Lightbulb },
    { id: "analogy"  as const, label: "Analogy",       icon: Brain },
    { id: "quiz"     as const, label: "Quiz",          icon: HelpCircle },
    ...(hasPath ? [{ id: "path"  as const, label: "Learning Path", icon: Map }] : []),
    { id: "watch" as const, label: "Watch & Learn", icon: Play },
  ];

  const cur = LEVELS.find(l => l.value === level)!;

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-[var(--text-primary)] leading-snug">{topic}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{cur.emoji} {cur.label} level</p>
        </div>
        <button onClick={onDownload}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg transition-all">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === id
                ? "bg-[var(--accent-glow)] text-[var(--text-accent)] border border-[var(--accent-dim)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
            )}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-muted)] rounded-xl border border-[var(--border-subtle)] p-4">
        {tab === "explain" && (
          <div className="space-y-2">
            {data.explanation.split("\n\n").map((p, i) => (
              <p key={i} className="text-sm text-[var(--text-secondary)] leading-relaxed">{p}</p>
            ))}
          </div>
        )}
        {tab === "points" && (
          <ul className="space-y-2.5">
            {data.keyPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--text-accent)]">{i + 1}</span>
                <span className="text-sm text-[var(--text-secondary)]">{pt}</span>
              </li>
            ))}
          </ul>
        )}
        {tab === "examples" && (
          <div className="space-y-2">
            {data.examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-[var(--bg-overlay)] rounded-lg p-3">
                <Zap className="w-4 h-4 text-[var(--text-accent)] mt-0.5 shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">{ex}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "analogy" && (
          <div className="relative px-2 py-1">
            <span className="absolute top-0 left-0 text-5xl opacity-10 font-display leading-none select-none">❝</span>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic pt-5">{data.analogy}</p>
          </div>
        )}
        {tab === "quiz" && <Quiz items={data.quiz} />}
        {tab === "path" && hasPath && (
          <div>
            <SectionLabel>Your learning roadmap</SectionLabel>
            <LearningPath steps={data.learningPath!} />
          </div>
        )}
        {tab === "watch" && (
          <div>
            <SectionLabel>Recommended resources</SectionLabel>
            <WatchLearn topic={topic} level={level} />
          </div>
        )}
      </div>

      {/* Confusion Meter */}
      <div className="bg-[var(--bg-muted)] rounded-xl border border-[var(--border-subtle)] px-4 py-3.5">
        <ConfusionMeter />
      </div>
    </div>
  );
}

/* ─── PDF Card ───────────────────────────────────────────────────────── */
function PDFCard({ data, filename, onDownload }:
  { data: PDFData; filename: string; onDownload: () => void }) {
  const diffColor: Record<string, string> = {
    beginner: "text-green-400", intermediate: "text-yellow-400", advanced: "text-red-400",
  };
  return (
    <div className="w-full space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[var(--text-accent)]" />
          </div>
          <div>
            <h3 className="font-display text-lg text-[var(--text-primary)] leading-snug">{data.title}</h3>
            <p className="text-xs text-[var(--text-muted)]">{filename} · {data.wordCount.toLocaleString()} words</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs font-medium capitalize", diffColor[data.difficulty] ?? "text-[var(--text-muted)]")}>{data.difficulty}</span>
          <button onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg transition-all">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {data.topics.map((t, i) => (
          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">{t}</span>
        ))}
      </div>

      <div className="bg-[var(--bg-muted)] rounded-xl border border-[var(--border-subtle)] p-4 space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Summary</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.summary}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Key Points</p>
          <ul className="space-y-1.5">
            {data.keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[var(--text-accent)] mt-0.5 shrink-0" />
                <span className="text-sm text-[var(--text-secondary)]">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">ELI5 Explanation</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.explanation}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Message Bubble ─────────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: Message }) {
  if (msg.type === "user") {
    return (
      <div className="flex justify-end animate-in">
        <div className="max-w-[75%] px-4 py-2.5 bg-[var(--accent-dim)] text-[var(--text-primary)] text-sm rounded-2xl rounded-br-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "error") {
    return (
      <div className="flex items-start gap-2.5 animate-in">
        <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="max-w-[80%] px-4 py-2.5 bg-red-500/8 border border-red-500/20 rounded-2xl rounded-bl-sm">
          <p className="text-sm text-red-300">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-in">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center mt-1">
        <Brain className="w-3.5 h-3.5 text-[var(--text-accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.type === "chat" && (
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        )}
        {msg.type === "explanation" && msg.explainData && (
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl rounded-bl-sm p-4">
            <ExplainCard
              topic={msg.topic!} level={msg.level!} data={msg.explainData}
              onDownload={() => downloadMd(
                explainToMd(msg.topic!, msg.level!, msg.explainData!),
                `eli5-${msg.topic!.replace(/\s+/g, "-")}.md`
              )}
            />
          </div>
        )}
        {msg.type === "pdf" && msg.pdfData && (
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl rounded-bl-sm p-4">
            <PDFCard
              data={msg.pdfData} filename={msg.filename ?? "document.pdf"}
              onDownload={() => downloadMd(pdfToMd(msg.pdfData!), `eli5-${msg.pdfData!.title.replace(/\s+/g, "-")}.md`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Typing indicator ───────────────────────────────────────────────── */
function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 animate-in">
      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--accent-glow)] border border-[var(--accent-dim)] flex items-center justify-center">
        <Brain className="w-3.5 h-3.5 text-[var(--text-accent)]" />
      </div>
      <div className="flex items-center gap-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl rounded-bl-sm px-4 py-2.5">
        <Dots />
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
    </div>
  );
}

/* ─── Level picker ───────────────────────────────────────────────────── */
function LevelPicker({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  const [open, setOpen] = useState(false);
  const cur = LEVELS.find(l => l.value === value)!;

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-strong)] rounded-lg transition-all">
        <span>{cur.emoji}</span>
        <span className="hidden sm:inline">{cur.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-xl z-50 min-w-[180px]">
          {LEVELS.map(l => (
            <button key={l.value} onClick={() => { onChange(l.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-[var(--bg-muted)] transition-all",
                value === l.value ? "text-[var(--text-accent)] bg-[var(--accent-glow)]" : "text-[var(--text-secondary)]"
              )}>
              <span className="flex items-center gap-2.5"><span>{l.emoji}</span><span>{l.label}</span></span>
              <span className="text-[10px] text-[var(--text-muted)]">{l.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Thinking…");
  const [pendingPDF, setPendingPDF] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const scroll = useCallback(() =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60), []);

  useEffect(() => { scroll(); }, [messages, loading]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

  const push = useCallback((m: Message) => setMessages(prev => [...prev, m]), []);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      push({ id: uid(), type: "error", content: "Only PDF files are supported." }); return;
    }
    if (f.size > 5 * 1024 * 1024) {
      push({ id: uid(), type: "error", content: "File must be under 5MB." }); return;
    }
    setPendingPDF(f);
    setInput(`Analyze: ${f.name}`);
    textRef.current?.focus();
  };

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const file = pendingPDF;
    setInput("");
    setPendingPDF(null);
    setLoading(true);
    push({ id: uid(), type: "user", content: trimmed });

    if (file) {
      setLoadingLabel(`Analyzing ${file.name}…`);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/pdf", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "PDF analysis failed");
        push({ id: uid(), type: "pdf", content: "", pdfData: data, filename: file.name });
      } catch (e) {
        push({ id: uid(), type: "error", content: e instanceof Error ? e.message : "PDF failed" });
      }
      setLoading(false);
      return;
    }

    const hasExplain = messages.some(m => m.type === "explanation");
    const isFollowUp = hasExplain &&
      !/^(what|how|explain|tell me|describe|why|who|where|define|give me|show me)/i.test(trimmed);

    if (!isFollowUp) {
      setLoadingLabel("Building explanation…");
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmed, level }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Explanation failed");
        if (!data.learningPath) data.learningPath = [];
        push({ id: uid(), type: "explanation", content: "", explainData: data, topic: trimmed, level });
      } catch (e) {
        push({ id: uid(), type: "error", content: e instanceof Error ? e.message : "Failed" });
      }
    } else {
      setLoadingLabel("Thinking…");
      const lastExplain = [...messages].reverse().find(m => m.type === "explanation");
      const topic = lastExplain?.topic ?? "";
      const chatLevel = lastExplain?.level ?? level;
      const textOnly = messages.filter(m => m.type === "user" || m.type === "chat");
      const recentExchanges = textOnly.slice(-8).map(m => ({
        role: m.type === "user" ? "user" : "assistant",
        content: m.content,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, topic, level: chatLevel, recentExchanges }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Chat failed");
        push({ id: uid(), type: "chat", content: data.reply });
      } catch (e) {
        push({ id: uid(), type: "error", content: e instanceof Error ? e.message : "Failed" });
      }
    }

    setLoading(false);
  }, [input, loading, messages, level, pendingPDF, push]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="noise flex flex-col h-screen bg-[var(--bg-base)] overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(123,123,245,0.07), transparent)" }} />

      <header className="relative z-20 flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="glow-dot" />
          <span className="font-display text-lg text-[var(--text-primary)] tracking-tight">ELI5 AI</span>
          <span className="hidden sm:inline text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
            llama-3.1-8b-instant · Groq
          </span>
        </div>
        <LevelPicker value={level} onChange={setLevel} />
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center gap-6 animate-in">
              <div className="space-y-2">
                <h1 className="font-display text-6xl gradient-text">ELI5 AI</h1>
                <p className="text-[var(--text-secondary)] text-lg">Understand anything, at any level.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); textRef.current?.focus(); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all">
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Upload className="w-3 h-3" /> Upload a PDF with the button below
              </p>
            </div>
          )}

          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && <Thinking label={loadingLabel} />}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="relative z-20 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-md px-3 pb-4 pt-3 md:px-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {pendingPDF && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl w-fit">
              <FileText className="w-3.5 h-3.5 text-[var(--text-accent)]" />
              <span className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{pendingPDF.name}</span>
              <button onClick={() => { setPendingPDF(null); setInput(""); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] focus-within:border-[var(--accent-dim)] rounded-2xl px-4 py-3 transition-all shadow-card">
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={loading} title="Upload PDF"
              className="shrink-0 mb-0.5 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-accent)] hover:bg-[var(--bg-muted)] disabled:opacity-40 transition-all">
              <Upload className="w-4 h-4" />
            </button>

            <textarea ref={textRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={onKey} rows={1} maxLength={500} disabled={loading}
              placeholder={isEmpty ? "Ask me to explain anything…" : "Ask a follow-up, or explain something new…"}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none disabled:opacity-50 leading-relaxed py-0.5"
              style={{ minHeight: "24px", maxHeight: "140px" }} />

            {input.length > 350 && (
              <span className="shrink-0 mb-0.5 text-[10px] text-[var(--text-muted)]">{500 - input.length}</span>
            )}

            <button onClick={send} disabled={!input.trim() || loading}
              className="shrink-0 mb-0.5 w-8 h-8 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all">
              {loading
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>

          <p className="text-center text-[10px] text-[var(--text-muted)]">
            Enter to send · Shift+Enter for newline · Attach PDF with <Upload className="w-2.5 h-2.5 inline mx-0.5" />
          </p>
        </div>
      </div>
    </div>
  );
}
