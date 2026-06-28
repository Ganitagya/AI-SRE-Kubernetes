import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useInvestigate, InvestigationProgress } from '@/hooks/useInvestigation';
import { ProgressSteps } from '@/components/ProgressSteps';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { InvestigationHistory } from '@/components/InvestigationHistory';
import { InvestigationResponse } from '@/services/api';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState<InvestigationResponse['diagnosis']>(null);
  const [investigationData, setInvestigationData] = useState<InvestigationResponse['investigation'] | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<{name: string}[] | null>(null); // null=loading, []=empty, array=loaded
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<string[] | null>(null); // null=loading, []=empty, array=loaded
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { investigate, isPending, progress, investigationId } = useInvestigate();

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Fetch Kubernetes contexts on mount
  useEffect(() => {
    fetchKubernetesContexts();
  }, []);

  const fetchKubernetesContexts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/contexts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Backend returns { contexts: [...], current_context: ... }
      setClusters(data.contexts || []);
    } catch (error) {
      console.error('Failed to fetch Kubernetes contexts:', error);
      setClusters([]); // Set to empty array to avoid loading state indefinitely
    }
  };

  // Fetch namespaces when context changes
  useEffect(() => {
    if (!selectedContext) {
      setNamespaces(null);
      setSelectedNamespace(null);
      return;
    }
    setNamespaces(null); // reset to loading
    fetchNamespaces();
  }, [selectedContext]);

  const fetchNamespaces = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/namespaces?context=${selectedContext}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Backend returns { namespaces: [...] }
      setNamespaces(data.namespaces || []);
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      setNamespaces([]); // empty array to show no namespaces
    }
  };

  const handleInvestigate = useCallback(async (useDeepScan: boolean) => {
    setDiagnosis(null);
    setInvestigationData(null);
    setLastError(null);
    setShowDetails(false);

    // Use selected namespace if available, otherwise empty string (which means default namespace in backend)
    const namespaceToUse = selectedNamespace ?? '';
    try {
      const response = await investigate(namespaceToUse, user?.id, selectedContext ?? undefined, useDeepScan);
      if (response.diagnosis) {
        setDiagnosis(response.diagnosis);
      }
      if (response.investigation) {
        setInvestigationData(response.investigation);
        setShowDetails(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Investigation failed';
      setLastError(message);
      console.error('Investigation error:', err);
    }
  }, [investigate, selectedNamespace, user?.id, selectedContext]);

  return (
    <div className="space-y-6">
      {/* User Banner */}
      {user && (
        <div className="flex items-center gap-4 bg-slate-800/50 backdrop-blur px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium">Logged in as {user.email}</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors">
            Logout
          </button>
        </div>
      )}

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

        {/* Context Selector */}
        {clusters === null && (
          <p className="text-slate-400 text-center py-2">
            Loading Kubernetes contexts...
          </p>
        )}
        {clusters !== null && clusters.length === 0 && (
          <p className="text-red-400 text-center py-2">
            No Kubernetes contexts found. Please check your kubeconfig.
          </p>
        )}
        {clusters !== null && clusters.length > 0 && (
          <div className="mb-4">
            <label htmlFor="context-select" className="block text-sm font-medium text-slate-300 mb-1.5">
              Kubernetes Context
            </label>
            <select
              id="context-select"
              value={selectedContext || ''}
              onChange={(e) => setSelectedContext(e.target.value || null)}
              disabled={isPending}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            >
              <option value="">-- Select Context (uses default) --</option>
              {clusters.map((cluster) => (
                <option key={cluster.name} value={cluster.name}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Namespace Selector - appears when a context is selected */}
        {selectedContext && (
          <div className="mb-4">
            <label htmlFor="namespace-select" className="block text-sm font-medium text-slate-300 mb-1.5">
              Namespace
            </label>
            <select
              id="namespace-select"
              value={selectedNamespace || ''}
              onChange={(e) => setSelectedNamespace(e.target.value || null)}
              disabled={isPending || namespaces === null}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            >
              <option value="">-- Select Namespace (uses default) --</option>
              {namespaces === null ? (
                <option>Loading namespaces...</option>
              ) : namespaces?.length === 0 ? (
                <option>No namespaces found</option>
              ) : (
                namespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Investigate Buttons */}
        {selectedContext && (
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => handleInvestigate(false)}
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
            <button
              onClick={() => handleInvestigate(true)}
              disabled={isPending}
              className="w-full max-w-xs mx-auto py-3 px-6 rounded-xl font-semibold text-white
                bg-gradient-to-r from-green-600 to-green-500
                hover:from-green-500 hover:to-green-400
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-green-900/40
                hover:shadow-green-800/50 active:scale-[0.98]
                text-sm"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Scanning…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                  </svg>
                  Deep Scan
                </span>
              )}
            </button>
          </div>
        )}

        {lastError && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-w-md mx-auto">
            {lastError}
          </div>
        )}
      </section>

      {/* Progress Section - show when an investigation has been started */}
      {investigationId != null && (
        <section aria-live="polite">
          <ProgressSteps progress={progress} isActive={!!investigationId} />
        </section>
      )}

      {/* Diagnosis Section - only show when diagnosis is available */}
      {diagnosis && (
        <section>
          <DiagnosisCard diagnosis={diagnosis} />
        </section>
      )}

      {/* Investigation Details - collapsible view of raw investigation data */}
      {investigationData && (
        <section>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mb-2 text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            {showDetails ? 'Hide Investigation Details' : 'Show Investigation Details'}
          </button>
          {showDetails && (
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <pre className="text-xs text-green-400 bg-slate-800 p-2 overflow-auto rounded">{JSON.stringify(investigationData, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {/* History Section - always show */}
      <section>
        <InvestigationHistory onRefresh={() => {}} />
      </section>
    </div>
  );
}