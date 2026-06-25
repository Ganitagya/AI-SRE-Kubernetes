/**
 * API service – axios client configured against the backend.
 *
 * All API calls to the FastAPI backend go through this module.
 */

import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const { data } = await apiClient.get("/health");
  return data;
}

// ─────────────────────────────────────────────────────────
// Investigation (placeholder – wired in later prompt)
// ─────────────────────────────────────────────────────────
export async function runInvestigation(
  namespace = "default"
): Promise<unknown> {
  const { data } = await apiClient.post("/investigate", { namespace });
  return data;
}
