"use client";

/**
 * hooks/useInvestigation.ts – React Query hook for investigation flow with realtime progress.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runInvestigation, type InvestigationResponse } from '@/services/api';
import { insforge } from '@/lib/insforge';

// Debug: log the insforge object to see what methods it has
console.log('insforge object:', insforge);
console.log('insforge keys:', Object.keys(insforge));

export type InvestigationStep =
  | 'pods'
  | 'logs'
  | 'events'
  | 'deployments'
  | 'network'
  | 'ai_reasoning'
  | 'complete';

export interface InvestigationProgress {
  step: InvestigationStep;
  message: string;
  completed: boolean;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

const STEP_ORDER: InvestigationStep[] = [
  'pods',
  'logs',
  'events',
  'deployments',
  'network',
  'ai_reasoning',
  'complete',
];

const STEP_MESSAGES: Record<InvestigationStep, string> = {
  pods: 'Checking Pods',
  logs: 'Reading Logs',
  events: 'Analyzing Events',
  deployments: 'Inspecting Deployments',
  network: 'Checking Networking',
  ai_reasoning: 'AI Reasoning',
  complete: 'Root Cause Found',
};

/**
 * Mutation hook for running an investigation.
 */
export function useInvestigationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      namespace,
      userId,
      context,
      deepScan
    }: {
      namespace: string;
      userId?: string;
      context?: string;
      deepScan?: boolean;
    }) => {
      const response = await runInvestigation(namespace, userId, context, deepScan ?? false);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investigation-history'] });
    },
  });
}

/**
 * Uses InsForge realtime to track investigation progress.
 * Falls back to simulated progress if realtime not available.
 */
export function useInvestigationProgress(
  investigationId: string | null,
  isPending: boolean
) {
  const [progress, setProgress] = useState<InvestigationProgress[]>(() =>
    STEP_ORDER.map((step, index) => ({
      step,
      message: STEP_MESSAGES[step],
      completed: false,
      status: index === 0 ? 'running' : 'pending',
    }))
  );

  const channelRef = useRef<string | null>(null);
  const subscribedRef = useRef(false);

  // Initialize progress state
  useEffect(() => {
    if (!isPending) {
      // Investigation finished, mark all steps as completed
      setProgress(prev => prev.map(p => ({ ...p, completed: true, status: 'completed' })));
      return;
    }

    // Reset to initial state when starting
    setProgress(
      STEP_ORDER.map((step, index) => ({
        step,
        message: STEP_MESSAGES[step],
        completed: index === 0,
        status: index === 0 ? 'running' : 'pending',
      }))
    );
  }, [isPending]);

  // Subscribe to realtime progress updates
  useEffect(() => {
    if (!investigationId || !isPending) {
      return;
    }

    const channel = `investigation:${investigationId}`;
    channelRef.current = channel;

    let mounted = true;
    let realtimeReceived = false; // flag to track if we got any realtime update

    const setupRealtime = async () => {
      try {
        await insforge.realtime.connect();

        const response = await insforge.realtime.subscribe(channel);
        if (!response.ok) {
          console.warn('Failed to subscribe to progress channel, using fallback');
          return;
        }

        subscribedRef.current = true;

        // Listen for progress updates
        insforge.realtime.on('progress_update', (message: any) => {
          if (!mounted) return;

          realtimeReceived = true; // we got a realtime update

          const payload = message.payload;
          if (payload && payload.step) {
            setProgress(prev => prev.map(p => {
              if (p.step === payload.step) {
                return {
                  ...p,
                  completed: payload.status === 'completed' || payload.status === 'failed',
                  status: payload.status || p.status,
                  message: payload.message || p.message,
                };
              }
              // Auto-advance: if previous step completed, start next
              const currentIndex = STEP_ORDER.indexOf(p.step);
              const payloadIndex = STEP_ORDER.indexOf(payload.step);
              if (payloadIndex > currentIndex && payload.status === 'running') {
                return { ...p, completed: true, status: 'pending' };
              }
              return p;
            }));
          }
        });

        // Also listen for investigation_complete event
        insforge.realtime.on('investigation_complete', () => {
          if (!mounted) return;
          setProgress(prev => prev.map(p => ({ ...p, completed: true, status: 'completed' })));
        });

      } catch (err) {
        console.warn('Realtime setup failed, using fallback:', err);
      }
    };

    setupRealtime();

    // Fallback: simulate progress if realtime doesn't receive updates
    const fallbackTimeout = setTimeout(() => {
      if (!mounted || !isPending) return;

      // If we never received a realtime update, simulate progress
      if (!realtimeReceived) {
        // Simulate progress as fallback
        let currentIndex = 0;
        const interval = setInterval(() => {
          if (!mounted || currentIndex >= STEP_ORDER.length - 1) {
            clearInterval(interval);
            setProgress(prev => prev.map(p => ({ ...p, completed: true, status: 'completed' })));
            return;
          }

          setProgress(prev => prev.map((p, i) => ({
            ...p,
            completed: i <= currentIndex + 1,
            status: i === currentIndex + 1 ? 'running' : (i <= currentIndex ? 'completed' : 'pending'),
          })));

          currentIndex++;
        }, 3000);

        return () => clearInterval(interval);
      }
    }, 5000); // Wait 5 seconds for realtime to work

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);

      if (subscribedRef.current && channelRef.current) {
        insforge.realtime.unsubscribe(channelRef.current);
        subscribedRef.current = false;
      }
    };
  }, [investigationId, isPending]);

  return progress;
}

/**
 * Combined hook for investigation with temporary ID for progress tracking.
 */
export function useInvestigate() {
  const mutation = useInvestigationMutation();
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const progress = useInvestigationProgress(investigationId, mutation.isPending);

  const investigate = useCallback(async (namespace: string, userId?: string, context?: string, deepScan: boolean = false) => {
    // Generate a temporary ID for this investigation
    const tempId = Math.random().toString(36).substring(2, 15);
    setInvestigationId(tempId);

    try {
      const result = await mutation.mutateAsync({ namespace, userId, context, deepScan });
      // If we got a real investigation ID from the backend, use that
      if (result.investigation.id) {
        setInvestigationId(result.investigation.id);
      }
      // If not, we keep the temporary one until the next investigation
      return result;
    } catch (err) {
      // Clear the investigationId on error so the progress bar goes away
      setInvestigationId(null);
      throw err;
    }
  }, [mutation]);

  return {
    ...mutation,
    investigate,
    progress,
    investigationId,
  };
}