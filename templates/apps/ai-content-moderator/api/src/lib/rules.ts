/**
 * Moderation-rule evaluation.
 *
 * Users configure `moderation_rules` (kind + pattern_or_threshold + action +
 * enabled), but the submit path never evaluated them — every submission was
 * queued regardless of the owner's rules, so a "regex \bslur\b → auto_reject"
 * rule never fired. This applies the deterministic **regex** rules to submitted
 * content and returns the action to take. (`classifier_threshold` rules act on
 * the AI classifier's confidence in the separate ai-review step; `embedding`
 * rules need an embedding model — neither is evaluable at submit time.)
 *
 * @module
 */

export type RuleAction = 'auto_approve' | 'queue' | 'auto_reject' | 'escalate'

export interface ModerationRule {
  kind: string
  pattern_or_threshold: string
  action: RuleAction
  enabled?: boolean | null
}

// Most-restrictive-wins: if content matches both an auto_reject and an
// auto_approve rule, it is rejected (fail safe).
const ACTION_PRECEDENCE: Record<RuleAction, number> = {
  auto_reject: 3,
  escalate: 2,
  queue: 1,
  auto_approve: 0,
}

/** Test a regex rule's pattern against content; an invalid pattern never throws and never matches. */
export function matchesRegexRule(content: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(content)
  } catch (_error) {
    // Malformed user-supplied regex — treat as non-matching rather than crash the submit.
    return false
  }
}

/** The auto-decision an action maps to, or null when the action just queues for human review. */
export function actionToDecision(action: RuleAction): 'approve' | 'reject' | 'escalate' | null {
  if (action === 'auto_reject') return 'reject'
  if (action === 'auto_approve') return 'approve'
  if (action === 'escalate') return 'escalate'
  return null
}

export interface RuleEvaluation {
  action: RuleAction
  decision: 'approve' | 'reject' | 'escalate'
  pattern: string
}

/**
 * Evaluate the enabled REGEX rules against content and return the most
 * restrictive actionable match, or null when nothing matches (or the winning
 * rule's action is `queue`, i.e. no auto-decision).
 */
export function evaluateRegexRules(
  content: string,
  rules: ReadonlyArray<ModerationRule>,
): RuleEvaluation | null {
  let best: ModerationRule | null = null
  for (const rule of rules) {
    if (rule.enabled === false) continue
    if (rule.kind !== 'regex') continue
    if (!matchesRegexRule(content, rule.pattern_or_threshold)) continue
    if (best === null || ACTION_PRECEDENCE[rule.action] > ACTION_PRECEDENCE[best.action]) {
      best = rule
    }
  }
  if (best === null) return null
  const decision = actionToDecision(best.action)
  if (decision === null) return null
  return { action: best.action, decision, pattern: best.pattern_or_threshold }
}
