export type ClassificationSource =
  | "manual"
  | "user_rule"
  | "merchant_mapping"
  | "global_rule"
  | "parser"
  | "heuristic"
  | "ai_suggestion"
  | "unknown";

export type ClassificationField =
  "category" | "nature" | "ownership" | "competence";

export type ClassificationCandidate<T> = {
  source: ClassificationSource;
  value: T;
  priority?: number;
};

// This is a product rule, not a scoring heuristic. Lower sources never get
// to overwrite a higher source, and ties in user rules are explicit priority.
const PRECEDENCE: Record<ClassificationSource, number> = {
  manual: 0,
  user_rule: 1,
  merchant_mapping: 2,
  global_rule: 3,
  parser: 4,
  heuristic: 5,
  ai_suggestion: 6,
  unknown: 7,
};

export function chooseClassification<T>(
  candidates: readonly ClassificationCandidate<T>[],
): ClassificationCandidate<T> | null {
  if (!candidates.length) return null;
  return [...candidates].sort((left, right) => {
    const sourceDifference = PRECEDENCE[left.source] - PRECEDENCE[right.source];
    if (sourceDifference) return sourceDifference;
    return (
      (left.priority ?? Number.MAX_SAFE_INTEGER) -
      (right.priority ?? Number.MAX_SAFE_INTEGER)
    );
  })[0];
}

export function isManuallyLocked(
  locks: Record<string, unknown>,
  field: ClassificationField,
): boolean {
  return locks[field] === true;
}
