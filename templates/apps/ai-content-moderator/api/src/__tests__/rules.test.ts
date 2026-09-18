import { describe, expect, it } from 'vitest'

import { evaluateRegexRules, matchesRegexRule, type ModerationRule } from '../lib/rules.js'

// Moderation rules (kind + pattern_or_threshold + action) were stored but the submit path never
// evaluated them. evaluateRegexRules applies the enabled regex rules and returns the action to take.

const rule = (over: Partial<ModerationRule>): ModerationRule => ({
  kind: 'regex',
  pattern_or_threshold: 'spam',
  action: 'auto_reject',
  enabled: true,
  ...over,
})

describe('matchesRegexRule', () => {
  it('matches case-insensitively and never throws on a bad pattern', () => {
    expect(matchesRegexRule('This is SPAM', 'spam')).toBe(true)
    expect(matchesRegexRule('clean text', 'spam')).toBe(false)
    expect(matchesRegexRule('anything', '[unclosed')).toBe(false)
  })
})

describe('evaluateRegexRules', () => {
  it('applies a matching regex rule and maps the action to a decision', () => {
    expect(evaluateRegexRules('buy cheap spam now', [rule({ action: 'auto_reject' })])).toEqual({
      action: 'auto_reject',
      decision: 'reject',
      pattern: 'spam',
    })
    expect(
      evaluateRegexRules('vip content', [
        rule({ pattern_or_threshold: 'vip', action: 'auto_approve' }),
      ]),
    ).toEqual({ action: 'auto_approve', decision: 'approve', pattern: 'vip' })
  })

  it('returns null when nothing matches, the action is queue, or the rule is disabled/non-regex', () => {
    expect(evaluateRegexRules('clean', [rule({ pattern_or_threshold: 'dirty' })])).toBeNull()
    expect(evaluateRegexRules('spam', [rule({ action: 'queue' })])).toBeNull()
    expect(evaluateRegexRules('spam', [rule({ enabled: false })])).toBeNull()
    expect(evaluateRegexRules('spam', [rule({ kind: 'embedding' })])).toBeNull()
  })

  it('is most-restrictive-wins when several rules match', () => {
    const match = evaluateRegexRules('vip spam', [
      rule({ pattern_or_threshold: 'vip', action: 'auto_approve' }),
      rule({ pattern_or_threshold: 'spam', action: 'auto_reject' }),
    ])
    expect(match?.decision).toBe('reject')
  })
})
