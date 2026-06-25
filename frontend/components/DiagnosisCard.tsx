/**
 * components/DiagnosisCard.tsx – Placeholder for rendering AI diagnosis results.
 * Will be fully implemented in a later prompt.
 */

import { DiagnosisResult } from "@/types";

interface Props {
  result: DiagnosisResult;
}

export default function DiagnosisCard({ result }: Props) {
  return (
    <div className="glass rounded-xl p-6 space-y-3">
      <h2 className="text-white font-semibold text-lg">Diagnosis</h2>
      <p className="text-slate-400 text-sm">
        Root cause:{" "}
        <span className="text-white">{result.root_cause ?? "Pending…"}</span>
      </p>
      <p className="text-slate-400 text-sm">
        Suggested fix:{" "}
        <span className="text-white">{result.suggested_fix ?? "Pending…"}</span>
      </p>
    </div>
  );
}
