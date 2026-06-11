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

// Per-question AI answer state
type AiState = {
  status: "idle" | "loading" | "done" | "error";
  answer: string;
  open: boolean;
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
  const [aiStates, setAiStates] = useState<Record<string, AiState>>({});

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Debounced search
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
    const res = await fetch(
      `/api/questions?offset=${questions.length}&voterId=${user.id}`
    );
    const data = await res.json();
    setQuestions((qs) => [...qs, ...data.questions]);
    setHasMore(data.hasMore);
    setLoading(false);
  }

  async function handleAiAnswer(questionId: string, questionBody: string) {
    const current = aiStates[questionId];

    // If already done, just toggle open/close
    if (current?.status === "done" || current?.status === "error") {
      setAiStates((s) => ({
        ...s,
        [questionId]: { ...s[questionId], open: !s[questionId].open },
      }));
      return;
    }

    // Start loading & open panel
    setAiStates((s) => ({
      ...s,
      [questionId]: { status: "loading", answer: "", open: true },
    }));

    try {
      const res = await fetch("/api/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionBody }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setAiStates((s) => ({
          ...s,
          [questionId]: {
            status: "error",
            answer: data.error || "Something went wrong.",
            open: true,
          },
        }));
      } else {
        setAiStates((s) => ({
          ...s,
          [questionId]: { status: "done", answer: data.answer, open: true },
        }));
      }
    } catch {
      setAiStates((s) => ({
        ...s,
        [questionId]: {
          status: "error",
          answer: "Network error. Please try again.",
          open: true,
        },
      }));
    }
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
        {questions.map((q) => {
          const ai = aiStates[q.id];
          const isLoading = ai?.status === "loading";
          const isOpen = ai?.open ?? false;
          const isDone = ai?.status === "done";
          const isError = ai?.status === "error";

          return (
            <li
              key={q.id}
              className="rounded-2xl cyber-panel-cyan overflow-hidden"
            >
              <div className="flex items-start gap-4 p-4">
                {/* Score Control */}
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

                {/* Question body + AI button */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="leading-snug text-foreground/90 font-medium">
                    {q.body}
                  </p>
                  {q.author && (
                    <p className="mt-2 text-[10px] text-muted font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/40" />
                      Sender: {q.author}
                    </p>
                  )}

                  {/* AI Answer Button */}
                  <button
                    onClick={() => handleAiAnswer(q.id, q.body)}
                    disabled={isLoading}
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider font-mono transition-all cursor-pointer disabled:cursor-not-allowed ${
                      isDone && isOpen
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                        : isError && isOpen
                        ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                        : "bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/40 hover:shadow-[0_0_8px_rgba(139,92,246,0.25)]"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="w-3 h-3 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Querying AI…
                      </>
                    ) : isDone || isError ? (
                      <>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              isOpen
                                ? "M5 15l7-7 7 7"
                                : "M19 9l-7 7-7-7"
                            }
                          />
                        </svg>
                        {isOpen ? "Hide AI Answer" : "Show AI Answer"}
                      </>
                    ) : (
                      <>
                        {/* Sparkle icon */}
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                        AI Answer
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Answer Panel */}
              {isOpen && ai && (
                <div
                  className={`border-t px-5 py-4 text-sm leading-relaxed font-sans transition-all ${
                    isError
                      ? "border-red-500/20 bg-red-500/5 text-red-400"
                      : "border-violet-500/20 bg-violet-500/5 text-foreground/80"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-violet-400 font-mono text-xs uppercase tracking-wider">
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Scanning neural network…
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-violet-400">
                          ✦ AI Response
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{ai.answer}</p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
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
