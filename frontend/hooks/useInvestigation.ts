/**
 * hooks/useInvestigation.ts – React Query hook for the investigation flow.
 * Placeholder – will be fully wired when the backend investigation endpoint is ready.
 */

import { useMutation } from "@tanstack/react-query";
import { runInvestigation } from "@/services/api";

export function useInvestigation() {
  return useMutation({
    mutationFn: (namespace: string) => runInvestigation(namespace),
  });
}
