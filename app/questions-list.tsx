"use client";
import { useState, useEffect } from "react";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
  userVote?: "up" | "down" | null;
};

type User = {
  id: string;
  email: string;
  name: string;
};

export default function QuestionsList({
  user,
  initialQuestions,
  initialHasMore,
}: {
  user: User;
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Debounced search: fetch search results including voterId for vote checking
  useEffect(() => {
    if (!hydrated) return;

    const id = setTimeout(async () => {
      const url = query
        ? `/api/questions?q=${encodeURIComponent(query)}&voterId=${user.id}`
        : `/api/questions?voterId=${user.id}`;
      const res = await fetch(url);
      const data = await res.json();
      setQuestions(data.questions);
      setHasMore(data.hasMore);
    }, 300);

    return () => clearTimeout(id);
  }, [query, user.id, hydrated]);

  async function submit() {
    if (!draft.trim()) return;

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft, author: user.name }),
    });
    const created = await res.json();

    setQuestions((qs) => [{ ...created, votes: 0, userVote: null }, ...qs]);
    setDraft("");
  }

  async function handleVote(questionId: string, type: "up" | "down") {
    const target = questions.find((q) => q.id === questionId);
    if (!target) return;

    const currentVote = target.userVote;
    let nextVote: "up" | "down" | null = null;
    let voteDiff = 0;

    if (currentVote === type) {
      nextVote = null;
      voteDiff = type === "up" ? -1 : 1;
    } else {
      nextVote = type;
      if (currentVote === null) {
        voteDiff = type === "up" ? 1 : -1;
      } else {
        voteDiff = type === "up" ? 2 : -2;
      }
    }

    // Optimistic UI Update
    const previousQuestions = [...questions];
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === questionId
          ? { ...q, votes: q.votes + voteDiff, userVote: nextVote }
          : q
      )
    );

    try {
      const res = await fetch(`/api/questions/${questionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: user.id, voteType: nextVote }),
      });

      if (!res.ok) {
        setQuestions(previousQuestions);
        const data = await res.json();
        alert(data.error || "Failed to cast vote.");
      }
    } catch (err) {
      setQuestions(previousQuestions);
      console.error("Error voting:", err);
    }
  }

  async function loadMore() {
    setLoading(true);
    const res = await fetch(`/api/questions?offset=${questions.length}&voterId=${user.id}`);
    const data = await res.json();
    setQuestions((qs) => [...qs, ...data.questions]);
    setHasMore(data.hasMore);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Ask box */}
      <div className="rounded-2xl cyber-panel-cyan p-4">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Transmit query to mainframe…"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
          />
          <button
            onClick={submit}
            className="rounded-xl bg-cyan px-5 py-2.5 text-sm font-bold text-black hover:bg-cyan-strong hover:shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all cursor-pointer font-mono uppercase tracking-wider"
          >
            Transmit
          </button>
        </div>
      </div>

      {/* Search + hydration status */}
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter logs by keyword…"
          className="w-full flex-1 rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
        />
        <span className="shrink-0 text-[10px] text-muted font-bold font-mono uppercase tracking-wider">
          {hydrated ? "[LINK: ONLINE]" : "[LINK: OFFLINE]"}
        </span>
      </div>

      {/* Questions */}
      <ul className="space-y-3">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex items-start gap-4 rounded-2xl cyber-panel-cyan p-4"
          >
            {/* Score Control Component */}
            <div className="flex shrink-0 flex-col items-center rounded-xl border border-cyan-500/10 bg-background/50 py-1.5 px-2">
              <button
                onClick={() => handleVote(q.id, "up")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  q.userVote === "up"
                    ? "text-cyan bg-cyan-soft shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                    : "text-muted hover:text-cyan hover:bg-cyan-soft/50"
                }`}
                title="Upvote"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 14h6v8h4v-8h6L12 4 4 14z" />
                </svg>
              </button>
              <span className="text-xs font-black my-1 tabular-nums text-foreground leading-none font-mono">
                {Math.max(0, q.votes)}
              </span>
              <button
                onClick={() => handleVote(q.id, "down")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  q.userVote === "down"
                    ? "text-brand bg-brand-soft shadow-[0_0_8px_rgba(255,0,85,0.2)]"
                    : "text-muted hover:text-brand hover:bg-brand-soft/50"
                }`}
                title="Downvote"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 10h-6V2h-4v8H4l8 10 8-10z" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="leading-snug text-foreground/90 font-medium">{q.body}</p>
              {q.author && (
                <p className="mt-2 text-[10px] text-muted font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/40" />
                  Sender: {q.author}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {questions.length === 0 && (
        <p className="rounded-2xl border border-dashed border-cyan-500/10 p-8 text-center text-sm font-mono text-muted uppercase tracking-wider bg-surface/30">
          [No transmission logs detected]
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border border-cyan-500/20 bg-surface/80 hover:bg-cyan-soft hover:border-cyan hover:text-cyan px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 font-mono cursor-pointer"
          >
            {loading ? "Syncing..." : "Sync More logs"}
          </button>
        </div>
      )}
    </div>
  );
}
