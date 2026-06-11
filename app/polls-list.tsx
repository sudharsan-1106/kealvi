"use client";
import { useState, useEffect } from "react";

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string;
  author: string | null;
  createdAt: string;
  options: PollOption[];
  userVotedOptionId: string | null;
};

type User = {
  id: string;
  email: string;
  name: string;
};

function RelativeTime({ timestamp }: { timestamp: string }) {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const formatRelativeTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 60) return "Just now";
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    };

    setTimeStr(formatRelativeTime(timestamp));
  }, [timestamp]);

  return <span className="text-muted">{timeStr}</span>;
}

export default function PollsList({ user }: { user: User }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Poll creation form state
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [author, setAuthor] = useState(user.name);
  const [formError, setFormError] = useState("");

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch polls including user.id for vote checking
  useEffect(() => {
    if (!hydrated) return;

    async function loadPolls() {
      try {
        const res = await fetch(`/api/polls?voterId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setPolls(data.polls);
        }
      } catch (err) {
        console.error("Error loading polls:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPolls();
  }, [hydrated, user.id]);

  function addOptionField() {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  }

  function removeOptionField(index: number) {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  }

  function handleOptionChange(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }

  async function submitPoll(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!question.trim()) {
      setFormError("Please enter a question.");
      return;
    }

    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setFormError("Please provide at least 2 options.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: filledOptions,
          author: author.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create poll.");
      }

      const newPoll = await res.json();
      setPolls((prev) => [newPoll, ...prev]);

      // Reset form
      setQuestion("");
      setOptions(["", ""]);
      setAuthor(user.name);
      setIsFormExpanded(false);
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function castVote(pollId: string, optionId: string) {
    const voterId = user.id;

    const targetPoll = polls.find((p) => p.id === pollId);
    if (!targetPoll || targetPoll.userVotedOptionId) return;

    // Optimistic UI Update
    const previousPolls = [...polls];

    setPolls((prevPolls) =>
      prevPolls.map((p) => {
        if (p.id === pollId) {
          return {
            ...p,
            userVotedOptionId: optionId,
            options: p.options.map((opt) =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, voterId }),
      });

      if (!res.ok) {
        setPolls(previousPolls);
        const data = await res.json();
        alert(data.error || "Failed to cast vote.");
      }
    } catch (err) {
      setPolls(previousPolls);
      console.error("Error casting vote:", err);
    }
  }

  async function changeVote(pollId: string) {
    const targetPoll = polls.find((p) => p.id === pollId);
    if (!targetPoll || !targetPoll.userVotedOptionId) return;

    const previousVotedOptionId = targetPoll.userVotedOptionId;
    const voterId = user.id;

    // Optimistic UI Update: remove vote locally and return to voting screen
    const previousPolls = [...polls];

    setPolls((prevPolls) =>
      prevPolls.map((p) => {
        if (p.id === pollId) {
          return {
            ...p,
            userVotedOptionId: null,
            options: p.options.map((opt) =>
              opt.id === previousVotedOptionId ? { ...opt, votes: Math.max(0, opt.votes - 1) } : opt
            ),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/polls/${pollId}/vote?voterId=${voterId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Rollback
        setPolls(previousPolls);
        const data = await res.json();
        alert(data.error || "Failed to change vote.");
      }
    } catch (err) {
      // Rollback
      setPolls(previousPolls);
      console.error("Error changing vote:", err);
    }
  }

  async function switchVote(pollId: string, oldOptionId: string, newOptionId: string) {
    const voterId = user.id;

    // Optimistic UI Update
    const previousPolls = [...polls];
    setPolls((prevPolls) =>
      prevPolls.map((p) => {
        if (p.id === pollId) {
          return {
            ...p,
            userVotedOptionId: newOptionId,
            options: p.options.map((opt) => {
              if (opt.id === oldOptionId) {
                return { ...opt, votes: Math.max(0, opt.votes - 1) };
              }
              if (opt.id === newOptionId) {
                return { ...opt, votes: opt.votes + 1 };
              }
              return opt;
            }),
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: newOptionId, voterId }),
      });

      if (!res.ok) {
        setPolls(previousPolls);
        const data = await res.json();
        alert(data.error || "Failed to switch vote.");
      }
    } catch (err) {
      setPolls(previousPolls);
      console.error("Error switching vote:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted">
        <svg className="w-8 h-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="mt-2 text-sm font-mono uppercase tracking-widest">[Synchronizing Matrix...]</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Poll Card */}
      <div className="rounded-2xl cyber-panel-pink p-5 transition-all duration-300">
        {!isFormExpanded ? (
          <button
            onClick={() => setIsFormExpanded(true)}
            className="flex w-full items-center justify-between text-left focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Initiate Poll</h3>
                <p className="text-xs text-muted font-mono uppercase">[Consensus: Offline]</p>
              </div>
            </div>
            <span className="rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-semibold font-mono uppercase text-brand hover:bg-brand hover:text-white hover:shadow-[0_0_10px_rgba(255,0,85,0.4)] transition-all cursor-pointer">
              Launch Node
            </span>
          </button>
        ) : (
          <form onSubmit={submitPoll} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-brand/20 pb-2">
              <h3 className="font-semibold text-foreground font-mono uppercase tracking-wider">New Consensus Node</h3>
              <button
                type="button"
                onClick={() => {
                  setIsFormExpanded(false);
                  setFormError("");
                }}
                className="text-xs text-muted hover:text-brand font-medium uppercase font-mono cursor-pointer"
              >
                [Abort]
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-red-950/40 p-3 text-xs font-semibold text-red-400 border border-red-500/30 font-mono">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono block">
                Query Body
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is your favorite network architecture?"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none cyber-input"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block font-mono">
                Parameters (Options)
              </label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-xs text-muted font-mono font-bold w-5">{index + 1}.</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 rounded-xl px-4 py-2 text-sm outline-none cyber-input"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOptionField(index)}
                      className="text-muted hover:text-red-500 p-1.5 transition-colors cursor-pointer"
                      title="Delete option"
                    >
                      <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={addOptionField}
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-strong cursor-pointer font-mono uppercase"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  [Insert option]
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Identity metadata"
                  className="w-full rounded-xl px-4 py-2 text-sm outline-none cyber-input"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand hover:bg-brand-strong px-6 py-2.5 text-xs font-bold text-white uppercase tracking-widest hover:shadow-[0_0_12px_rgba(255,0,85,0.45)] disabled:opacity-50 font-mono cursor-pointer"
              >
                {submitting ? "Broadcasting..." : "Broadcast"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Polls List */}
      <ul className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
          const hasVoted = !!poll.userVotedOptionId;

          return (
            <li
              key={poll.id}
              className="rounded-2xl cyber-panel-pink p-5"
            >
              <div className="mb-4">
                <h4 className="text-base font-semibold text-foreground leading-snug">
                  {poll.question}
                </h4>
                <p className="mt-2 text-[10px] text-muted font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500/40" />
                  <span>Sender: {poll.author || "Anonymous"}</span>
                  <span>•</span>
                  <RelativeTime timestamp={poll.createdAt} />
                </p>
              </div>

              {/* Poll Options */}
              <div className="space-y-3">
                {poll.options.map((option) => {
                  const votePercentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                  const isSelected = poll.userVotedOptionId === option.id;

                  if (hasVoted) {
                    // Result View
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (isSelected) {
                            changeVote(poll.id);
                          } else {
                            switchVote(poll.id, poll.userVotedOptionId!, option.id);
                          }
                        }}
                        className="relative flex flex-col justify-center rounded-xl border border-brand-500/10 bg-background/30 p-3.5 overflow-hidden text-left w-full cursor-pointer hover:border-cyan/50 hover:shadow-[0_0_10px_rgba(0,240,255,0.15)] transition-all"
                      >
                        {/* Progress Bar Background fill */}
                        <div
                          className={`absolute inset-y-0 left-0 rounded-l-xl transition-all duration-700 ease-out ${
                            isSelected 
                              ? "bg-gradient-to-r from-brand/20 to-brand/30 border-r-2 border-brand" 
                              : "bg-gradient-to-r from-cyan-soft to-cyan/10 border-r border-cyan/20"
                          }`}
                          style={{ width: `${votePercentage}%` }}
                        />

                        {/* Text Label & Stats */}
                        <div className="relative z-10 flex items-center justify-between text-xs font-semibold w-full">
                          <span className="flex items-center gap-2 pr-4 text-foreground leading-tight font-mono">
                            {option.text}
                            {isSelected && (
                              <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-widest shadow-[0_0_8px_rgba(255,0,85,0.4)]">
                                Selected
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-muted font-mono font-bold tabular-nums">
                            {votePercentage}% ({option.votes} {option.votes === 1 ? "v" : "v"})
                          </span>
                        </div>
                      </button>
                    );
                  } else {
                    // Voting View
                    return (
                      <button
                        key={option.id}
                        onClick={() => castVote(poll.id, option.id)}
                        className="w-full text-left rounded-xl border border-muted/20 bg-background/50 px-4 py-3 text-xs font-semibold text-foreground hover:text-cyan hover:border-cyan hover:bg-cyan-soft hover:scale-[1.005] transition-all cursor-pointer font-mono"
                      >
                        {option.text}
                      </button>
                    );
                  }
                })}
              </div>

              {/* Total votes and Change Vote button footer */}
              <div className="mt-4 flex items-center justify-between border-t border-muted/10 pt-3 text-[10px] text-muted font-mono font-bold uppercase tracking-wider">
                <span>
                  {totalVotes} {totalVotes === 1 ? "total signal" : "total signals"}
                </span>
                {hasVoted && (
                  <button
                    onClick={() => changeVote(poll.id)}
                    className="text-brand hover:text-brand-strong transition-colors cursor-pointer uppercase font-mono tracking-widest text-[9px]"
                  >
                    [Recalibrate vote]
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {polls.length === 0 && (
        <p className="rounded-2xl border border-dashed border-brand-500/10 p-8 text-center text-sm font-mono text-muted uppercase tracking-wider bg-surface/30">
          [No consensus logs detected]
        </p>
      )}
    </div>
  );
}
