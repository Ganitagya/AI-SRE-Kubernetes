/**
 * services/api.ts – API service for backend communication.
 * All API calls to the FastAPI backend go through this module.
 */

import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000, // 2 minutes for investigation
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
}

export interface InvestigationRequest {
  namespace: string;
  include_logs?: boolean;
  user_id?: string;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DiagnosisOutput {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  prevention: string;
  confidence: number;
  severity: SeverityLevel;
}

export interface InvestigationResult {
  pods: Record<string, unknown>;
  logs: Record<string, unknown>;
  events: Record<string, unknown>;
  deployments: Record<string, unknown>;
  network: Record<string, unknown>;
  id?: string;
}

export interface InvestigationResponse {
  status: string;
  investigation: InvestigationResult;
  diagnosis: DiagnosisOutput | null;
}

export interface InvestigationHistoryItem {
  id: string;
  created_at: string;
  namespace: string;
  root_cause: string;
  confidence: number;
  severity: SeverityLevel;
  status: 'completed' | 'failed';
}

// ─────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────
export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get('/health');
  return data;
}

// ─────────────────────────────────────────────────────────
// Investigation
// ─────────────────────────────────────────────────────────
export async function runInvestigation(
  namespace = 'default',
  userId?: string
): Promise<InvestigationResponse> {
  const { data } = await apiClient.post('/investigate', { namespace, user_id: userId });
  return data;
}

// ─────────────────────────────────────────────────────────
// Investigation History (InsForge Database)
// ─────────────────────────────────────────────────────────
export async function fetchInvestigationHistory(): Promise<InvestigationHistoryItem[]> {
  // This will be called via InsForge SDK directly from components
  // Kept here for type reference
  return [];
}

export async function saveInvestigationToHistory(
  item: Omit<InvestigationHistoryItem, 'id' | 'created_at'>
): Promise<InvestigationHistoryItem | null> {
  // This will be called via InsForge SDK directly from components
  // Kept here for type reference
  return null;
}