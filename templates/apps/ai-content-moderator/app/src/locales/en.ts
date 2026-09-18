/**
 * Aggregated English locale entry for the ai-content-moderator app.
 *
 * Re-exports the keys defined in `./en/ui.ts` (and friends) at one
 * location so feature scaffolding scripts and the flagship-rollout
 * verify gate can scan a single canonical file. The actual content is
 * authored in the per-bond files under `./en/`.
 *
 * App-specific moderation keys (queue / rules / analytics / API tokens)
 * are added here so they don't clutter the canonical UI bond strings.
 */

import { ui } from './en/ui.js'

export const meta = {
  appName: 'Sift',
  appDescription: 'Trust & safety dashboard with AI pre-classification and human review.',
  langCode: 'en',
  langName: 'English',
}

export const moderation = {
  'queue.title': 'Review Queue',
  'queue.empty': 'No content waiting for review.',
  'queue.claim': 'Claim',
  'queue.aiScore': 'AI score',
  'queue.severity': 'Severity',
  'queue.age': 'Age',
  'queue.bulkApprove': 'Approve all matching',
  'queue.bulkConfirm': 'Confirm bulk action',
  'review.approve': 'Approve',
  'review.reject': 'Reject',
  'review.escalate': 'Escalate',
  'review.aiRationale': 'AI rationale',
  'review.ruleMatches': 'Rule matches',
  'review.notFound': 'Review item not found.',
  'review.decisionRecorded': 'Decision recorded.',
  'rules.title': 'Moderation rules',
  'rules.add': 'Add rule',
  'rules.name': 'Rule name',
  'rules.pattern': 'Pattern',
  'rules.action': 'Action',
  'rules.severity': 'Severity',
  'rules.enabled': 'Enabled',
  'rules.patternRequired': 'Pattern is required.',
  'analytics.title': 'Analytics',
  'analytics.throughput': 'Decisions per day',
  'analytics.falsePositiveTrend': 'False positive trend',
  'analytics.leaderboard': 'Reviewer leaderboard',
  'apiTokens.title': 'API tokens',
  'apiTokens.create': 'Create token',
  'apiTokens.label': 'Label',
  'apiTokens.scope': 'Scope',
  'apiTokens.lastUsed': 'Last used',
  'notifications.title': 'Notifications',
  'notifications.assignment': 'Assigned to you',
  'notifications.escalation': 'Escalated to you',
  'notifications.mention': 'Mentioned',
  'notifications.ruleFired': 'Rule fired',
  'notifications.markRead': 'Mark as read',
  'pricing.title': 'Pricing',
  'pricing.free': 'Free',
  'pricing.pro': 'Pro',
  'pricing.team': 'Team',
  'pricing.cta.free': 'Get started',
  'pricing.cta.pro': 'Start Pro trial',
  'pricing.cta.team': 'Contact sales',
  'pricing.feature.decisions': '{{count}} decisions / month',
  'pricing.feature.reviewers': '{{count}} reviewer seats',
  'pricing.feature.unlimited': 'Unlimited',
}

export const en = {
  ...ui,
  ...moderation,
}

export default en
