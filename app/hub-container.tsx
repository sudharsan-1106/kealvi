"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionsList from "./questions-list";
import PollsList from "./polls-list";

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

export default function HubContainer({
  user,
  initialQuestions,
  initialHasMore,
}: {
  user: User;
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"qa" | "polls">("qa");
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & User Status */}
      <div className="flex items-start justify-between gap-4">
        <header className="transition-all duration-300">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-soft px-3 py-1 text-xs font-bold text-cyan neon-text-cyan uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
            Live Stream
          </span>
          {activeTab === "qa" ? (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black tracking-tight text-cyan uppercase neon-text-cyan">
                Live Q&amp;A
              </h1>
              <p className="mt-1 text-xs text-muted tracking-wider uppercase font-mono">
                [Protocol: Signal Upvotes &amp; Downvotes]
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h1 className="text-4xl font-black tracking-tight text-brand uppercase neon-text-pink">
                Live Polls
              </h1>
              <p className="mt-1 text-xs text-muted tracking-wider uppercase font-mono">
                [Protocol: Aggregate Consensus Metrics]
              </p>
            </div>
          )}
        </header>

        {/* User Status Card & Logout */}
        <div className="flex flex-col items-end gap-0.5 shrink-0 border border-cyan-500/10 bg-surface/80 px-4 py-2.5 rounded-xl shadow-xs font-mono">
          <span className="text-[9px] text-muted font-bold uppercase tracking-widest">NODE ID</span>
          <span className="text-xs font-bold text-cyan leading-none uppercase">{user.name}</span>
          <button
            onClick={handleLogout}
            className="mt-2 text-[9px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest cursor-pointer"
          >
            [Disconnect]
          </button>
        </div>
      </div>

      {/* Menubar (Tabs) */}
      <div className="flex rounded-2xl border border-muted/20 bg-surface/50 p-1 shadow-sm transition-all duration-200">
        <button
          onClick={() => setActiveTab("qa")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${
            activeTab === "qa"
              ? "bg-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              : "text-muted hover:text-cyan hover:bg-cyan-soft"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Q&amp;A
        </button>
        <button
          onClick={() => setActiveTab("polls")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${
            activeTab === "polls"
              ? "bg-brand text-white shadow-[0_0_15px_rgba(255,0,85,0.4)]"
              : "text-muted hover:text-brand hover:bg-brand-soft"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
            />
          </svg>
          Polls
        </button>
      </div>

      {/* Content Area */}
      <div className="relative pt-1">
        {activeTab === "qa" ? (
          <QuestionsList
            user={user}
            initialQuestions={initialQuestions}
            initialHasMore={initialHasMore}
          />
        ) : (
          <PollsList user={user} />
        )}
      </div>
    </div>
  );
}
