"use client";

/**
 * components/InvestigationHistory.tsx – Displays investigation history from InsForge database.
 */

import { useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { InvestigationHistoryItem, SeverityLevel } from '@/services/api';

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

interface Props {
  onRefresh?: () => void;
}

export function InvestigationHistory({ onRefresh }: Props) {
  const [history, setHistory] = useState<InvestigationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await insforge.database
        .from('investigation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbError) {
        throw new Error(dbError.message);
      }

      setHistory(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history';
      setError(message);
      console.error('Failed to fetch investigation history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 space-y-3 animate-fade-in">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investigation History
        </h3>
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6 space-y-3 animate-fade-in">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investigation History
        </h3>
        <div className="text-red-400 text-sm text-center py-4">
          Failed to load history: {error}
          <button
            onClick={fetchHistory}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Investigation History
        </h3>
        <button
          onClick={fetchHistory}
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-slate-400 text-sm text-center py-8">
          No investigations yet. Click "Investigate Cluster" to run your first analysis.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((item) => {
            const severityColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.medium;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${item.severity === 'critical' ? 'bg-red-500' : item.severity === 'high' ? 'bg-orange-500' : item.severity === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.root_cause}</p>
                    <p className="text-slate-500 text-xs truncate">
                      {item.namespace} • {formatDate(item.created_at)} • {item.confidence}% confidence
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${severityColor}`}>
                    {item.severity}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}