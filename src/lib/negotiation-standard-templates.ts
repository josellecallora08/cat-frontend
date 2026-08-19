import type { NegotiationStandardContent, RubricBlock, RubricCriterion } from "@/lib/negotiation-standard-types";

/** A starter template offered in the guided setup wizard (TASK-038). */
export interface NegotiationStandardTemplate {
  /** Stable key used to select the template; never shown to the user. */
  key: string;
  /** Plain-language title shown on the template card. */
  title: string;
  /** One-line plain-language description of who the template is best for. */
  description: string;
  /** Fully-formed content, ready to create a draft standard from. */
  content: NegotiationStandardContent;
}

const DEFAULT_PASSING_SCORE = 70;

let counter = 0;

/**
 * Deterministic slug generator so templates (and their tests) never depend on
 * `crypto.randomUUID()` timing. Real edits after creation still use the
 * existing `crypto.randomUUID()`-based generator in `standard-editor.tsx`.
 */
function slug(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function criterion(name: string, description: string, evidenceInstructions: string): RubricCriterion {
  return {
    id: slug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    name,
    description,
    evidence_instructions: evidenceInstructions,
  };
}

function block(params: {
  category: string;
  weight: number;
  behaviors: RubricCriterion[];
  violations: RubricCriterion[];
  displayOrder: number;
}): RubricBlock {
  return {
    id: slug(params.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    category: params.category,
    weight: params.weight,
    passing_score: DEFAULT_PASSING_SCORE,
    scoring_instructions: `Score this category using observable evidence from the conversation.`,
    positive_behaviors: params.behaviors,
    violations: params.violations,
    penalties: params.violations.map((violation) => ({
      violation_id: violation.id,
      deduction: 10,
      max_occurrences: 1,
    })),
    recommendation_guidance: `Reinforce strengths and practice improvements for ${params.category.toLowerCase()}.`,
    display_order: params.displayOrder,
  };
}

const debtCollectionCall: NegotiationStandardTemplate = {
  key: "debt-collection-call",
  title: "Debt Collection Call",
  description: "Best for outbound collection calls — checks opening, compliance, and resolution.",
  content: {
    schema_version: 1,
    overall_passing_score: DEFAULT_PASSING_SCORE,
    blocks: [
      block({
        category: "Opening",
        weight: 25,
        displayOrder: 0,
        behaviors: [criterion("Clear, professional greeting", "Agent opens with a courteous, professional greeting and states the reason for the call.", "Quote the greeting and reason for the call.")],
        violations: [criterion("Rude or hostile tone", "Agent uses hostile or unprofessional wording.", "Quote the hostile wording.")],
      }),
      block({
        category: "Compliance",
        weight: 40,
        displayOrder: 1,
        behaviors: [criterion("Required disclosures given", "Agent provides all legally required notices before discussing the debt.", "Quote the disclosure.")],
        violations: [criterion("Unsupported legal threat", "Agent states an unverified legal consequence as certain.", "Quote the exact claim.")],
      }),
      block({
        category: "Resolution",
        weight: 35,
        displayOrder: 2,
        behaviors: [criterion("Offers a reasonable payment option", "Agent proposes a workable plan tailored to the debtor's situation.", "Quote the offer and the debtor's response.")],
        violations: [criterion("Ends without a next step", "Call ends without a plan or clear next step.", "Quote the closing exchange.")],
      }),
    ],
  },
};

const customerServiceCall: NegotiationStandardTemplate = {
  key: "customer-service-call",
  title: "Customer Service Call",
  description: "Best for general support calls — checks greeting, listening, and problem-solving.",
  content: {
    schema_version: 1,
    overall_passing_score: DEFAULT_PASSING_SCORE,
    blocks: [
      block({
        category: "Greeting & Rapport",
        weight: 20,
        displayOrder: 0,
        behaviors: [criterion("Warm, welcoming greeting", "Agent greets the customer warmly and confirms how they can help.", "Quote the greeting.")],
        violations: [criterion("Skips the greeting", "Agent jumps straight into the issue without any greeting.", "Quote the opening line.")],
      }),
      block({
        category: "Active Listening",
        weight: 30,
        displayOrder: 1,
        behaviors: [criterion("Confirms understanding", "Agent restates the customer's issue to confirm understanding.", "Quote the restatement.")],
        violations: [criterion("Interrupts the customer", "Agent repeatedly interrupts before the customer finishes explaining.", "Quote the interruption.")],
      }),
      block({
        category: "Problem-Solving",
        weight: 50,
        displayOrder: 2,
        behaviors: [criterion("Offers a clear solution", "Agent proposes a specific, workable solution to the customer's issue.", "Quote the solution offered.")],
        violations: [criterion("Gives no resolution", "Call ends without offering any solution or next step.", "Quote the closing exchange.")],
      }),
    ],
  },
};

const startFromScratch: NegotiationStandardTemplate = {
  key: "start-from-scratch",
  title: "Start from scratch",
  description: "Build your own from a single blank category — good if none of the templates fit.",
  content: {
    schema_version: 1,
    overall_passing_score: DEFAULT_PASSING_SCORE,
    blocks: [
      block({
        category: "Call Quality",
        weight: 100,
        displayOrder: 0,
        behaviors: [],
        violations: [],
      }),
    ],
  },
};

export const NEGOTIATION_STANDARD_TEMPLATES: NegotiationStandardTemplate[] = [
  debtCollectionCall,
  customerServiceCall,
  startFromScratch,
];

export { DEFAULT_PASSING_SCORE };
