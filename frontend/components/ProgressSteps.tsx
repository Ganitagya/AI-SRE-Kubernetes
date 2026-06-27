"use client";

/**
 * components/ProgressSteps.tsx – Displays investigation progress steps.
 */

import { InvestigationProgress } from '@/hooks/useInvestigation';

interface Props {
  progress: InvestigationProgress[];
  isActive: boolean;
}

export function ProgressSteps({ progress, isActive }: Props) {
  if (!isActive && !progress.some((p) => p.completed)) {
    return null;
  }

  return (
    <div className="glass rounded-xl p-6 space-y-3 animate-fade-in">
      <h3 className="text-white font-semibold text-lg flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Investigation Progress
      </h3>

      <div className="space-y-2" role="list" aria-label="Investigation steps">
        {progress.map((item, index) => (
          <div
            key={item.step}
            className={`flex items-center gap-3 transition-all duration-300 ${
              item.completed ? 'opacity-100' : 'opacity-50'
            }`}
            role="listitem"
          >
            {/* Step indicator */}
            <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  item.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : item.step === progress.find((p) => !p.completed)?.step && isActive
                    ? 'border-blue-500 bg-blue-500/20 animate-pulse'
                    : 'border-slate-600 bg-slate-800'
                }`}
              >
                {item.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!item.completed && item.step === progress.find((p) => !p.completed)?.step && isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>

              {/* Connecting line */}
              {index < progress.length - 1 && (
                <div
                  className={`absolute left-1/2 top-6 w-0.5 h-10 transition-colors ${
                    item.completed ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>

            {/* Step label */}
            <span className={`text-sm font-medium ${
              item.completed ? 'text-emerald-300' : 'text-slate-300'
            }`}>
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}