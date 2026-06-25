"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "ready" | "loading" | "done" }) {
  const colors = {
    ready:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    loading: "bg-yellow-500/20  text-yellow-400  border-yellow-500/30",
    done:    "bg-blue-500/20    text-blue-400    border-blue-500/30",
  };

  const labels = {
    ready:   "Ready",
    loading: "Investigating…",
    done:    "Complete",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${colors[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "loading" ? "animate-pulse bg-yellow-400" : "bg-current"
        }`}
      />
      {labels[status]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [status, setStatus] = useState<"ready" | "loading" | "done">("ready");

  const handleInvestigate = () => {
    // Placeholder – AI investigation will be wired in a later prompt
    setStatus("loading");
    setTimeout(() => setStatus("done"), 2000);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background grid decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08)_0%,_transparent_60%)]" />
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.03]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Card */}
      <div className="relative glass glow-blue rounded-2xl p-10 max-w-lg w-full text-center space-y-8">
        {/* Logo / Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            AI Kubernetes Agent
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Troubleshoot Kubernetes clusters with AI-powered root cause analysis
            and actionable fix suggestions.
          </p>
        </div>

        {/* CTA button */}
        <button
          id="investigate-btn"
          onClick={handleInvestigate}
          disabled={status === "loading"}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-white
            bg-gradient-to-r from-blue-600 to-blue-500
            hover:from-blue-500 hover:to-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 shadow-lg shadow-blue-900/40
            hover:shadow-blue-800/50 active:scale-[0.98]"
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Investigating…
            </span>
          ) : (
            "Investigate Cluster"
          )}
        </button>

        {/* Status row */}
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <span>System Status:</span>
          <StatusBadge status={status} />
        </div>

        {/* Footer hint */}
        {status === "done" && (
          <p className="text-xs text-slate-500 animate-fade-in">
            AI reasoning will be available in the next implementation phase.
          </p>
        )}
      </div>

      {/* Subtle footer */}
      <p className="mt-8 text-xs text-slate-600">
        AI-SRE-Kubernetes · Foundation v0.1
      </p>
    </main>
  );
}
