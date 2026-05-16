export type DiagnosisTier = "high" | "moderate" | "low";

export interface Diagnosis {
  rank: number;
  condition: string;
  probability: number;
  tier: DiagnosisTier;
  rationale: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  key_workup: string[];
}

export interface DifferentialDiagnosisPayload {
  summary: string;
  diagnoses: Diagnosis[];
  red_flags: string[];
  recommended_workup: string[];
  reasoning_notes: string;
  disclaimer: string;
}
