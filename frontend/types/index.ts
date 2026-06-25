/**
 * types/index.ts – Shared TypeScript types for the frontend.
 */

export type SystemStatus = "ready" | "loading" | "done" | "error";

export interface HealthResponse {
  status: string;
  service: string;
}

export interface InvestigationRequest {
  namespace: string;
  include_logs?: boolean;
}

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface DiagnosisResult {
  root_cause: string | null;
  suggested_fix: string | null;
  severity: SeverityLevel | null;
  confidence: number | null;
  raw_diagnostics: Record<string, unknown> | null;
}
