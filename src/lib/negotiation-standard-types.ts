export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  evidence_instructions: string;
}

export type RubricViolation = RubricCriterion;

export interface RubricPenalty {
  violation_id: string;
  deduction: number;
  max_occurrences: number;
}

export interface RubricBlock {
  id: string;
  category: string;
  weight: number;
  passing_score: number;
  scoring_instructions: string;
  positive_behaviors: RubricCriterion[];
  violations: RubricViolation[];
  penalties: RubricPenalty[];
  recommendation_guidance: string;
  display_order: number;
}

export interface NegotiationStandardContent {
  schema_version: number;
  overall_passing_score: number;
  blocks: RubricBlock[];
}
