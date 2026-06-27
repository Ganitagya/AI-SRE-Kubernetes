"use client";

/**
 * components/DiagnosisCard.tsx – Displays AI diagnosis results.
 */

import { DiagnosisOutput, SeverityLevel } from '@/services/api';

interface Props {
  diagnosis: DiagnosisOutput | null;
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const SEVERITY_ICONS: Record<SeverityLevel, JSX.Element> = {
  critical: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  high: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  medium: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  low: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function DiagnosisCard({ diagnosis }: Props) {
  if (!diagnosis) {
    return (
      <div className="glass rounded-xl p-6 space-y-3 animate-fade-in">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Diagnosis
        </h2>
        <p className="text-slate-400 text-sm">Run an investigation to see diagnosis results.</p>
      </div>
    );
  }

  const severityColor = SEVERITY_COLORS[diagnosis.severity] || SEVERITY_COLORS.medium;
  const severityIcon = SEVERITY_ICONS[diagnosis.severity] || SEVERITY_ICONS.medium;

  return (
    <div className="glass rounded-xl p-6 space-y-4 animate-fade-in">
      {/* Header with severity */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Diagnosis
        </h2>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${severityColor}`}>
          {severityIcon}
          {diagnosis.severity.charAt(0).toUpperCase() + diagnosis.severity.slice(1)}
        </span>
      </div>

      {/* Confidence score */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${diagnosis.confidence}%` }}
          />
        </div>
        <span className="text-sm font-mono text-blue-400 w-12 text-right">
          {diagnosis.confidence}%
        </span>
      </div>

      {/* Root Cause */}
      <div className="space-y-1 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium text-white">Root Cause</span>
        </div>
        <p className="text-slate-300 text-sm ml-6">{diagnosis.root_cause}</p>
      </div>

      {/* Explanation */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-white">Explanation</span>
        </div>
        <p className="text-slate-300 text-sm ml-6">{diagnosis.explanation}</p>
      </div>

      {/* Suggested Fix */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-white">Suggested Fix</span>
        </div>
        <p className="text-slate-300 text-sm ml-6">{diagnosis.fix}</p>
      </div>

      {/* kubectl Command */}
      <div className="space-y-1 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
          <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="font-medium text-white">kubectl Command</span>
        </div>
        <div className="relative">
          <code className="block text-sm text-emerald-300 font-mono whitespace-pre-wrap break-all bg-slate-900 p-3 rounded border border-slate-700">
            {diagnosis.kubectl_command}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(diagnosis.kubectl_command)}
            className="absolute top-2 right-2 text-slate-500 hover:text-emerald-400 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h10a2 2 0 012 2v1M8 5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prevention */}
      <div className="space-y-1 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-white">Prevention</span>
        </div>
        <p className="text-slate-300 text-sm ml-6">{diagnosis.prevention}</p>
      </div>
    </div>
  );
}