"use client";

/**
 * components/DashboardPage.tsx – Main investigation dashboard component.
 * Contains investigate button, progress, diagnosis, and history.
 */

import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useInvestigate, InvestigationProgress } from '@/hooks/useInvestigation';
import { ProgressSteps } from '@/components/ProgressSteps';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { InvestigationHistory } from '@/components/InvestigationHistory';
import { InvestigationResponse } from '@/services/api';

export function DashboardPage() {
  const { user } = useAuth();
  const [diagnosis, setDiagnosis] = useState<InvestigationResponse['diagnosis']>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { investigate, isPending, progress } = useInvestigate();

  const handleInvestigate = async () => {
    setDiagnosis(null);
    setLastError(null);

    try {
      const response = await investigate('default', user?.id);
      if (response.diagnosis) {
        setDiagnosis(response.diagnosis);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Investigation failed';
      setLastError(message);
      console.error('Investigation error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="glass rounded-2xl p-8 text-center space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Investigate Your Cluster
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
            Run an AI-powered Kubernetes investigation. The agent will collect pod status,
            logs, events, deployment health, and networking data, then provide a root cause
            analysis with actionable fix suggestions.
          </p>
        </div>

        {/* Investigate Button */}
        <button
          onClick={handleInvestigate}
          disabled={isPending}
          className="w-full max-w-xs mx-auto py-4 px-8 rounded-xl font-semibold text-white
            bg-gradient-to-r from-blue-600 to-blue-500
            hover:from-blue-500 hover:to-blue-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 shadow-lg shadow-blue-900/40
            hover:shadow-blue-800/50 active:scale-[0.98]"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Investigating…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Investigate Cluster
            </span>
          )}
        </button>

        {lastError && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-w-md mx-auto">
            {lastError}
          </div>
        )}
      </section>

      {/* Progress Section */}
      <section aria-live="polite">
        <ProgressSteps progress={progress} isActive={isPending} />
      </section>

      {/* Diagnosis Section */}
      <section>
        <DiagnosisCard diagnosis={diagnosis} />
      </section>

      {/* History Section */}
      <section>
        <InvestigationHistory onRefresh={() => {}} />
      </section>
    </div>
  );
}