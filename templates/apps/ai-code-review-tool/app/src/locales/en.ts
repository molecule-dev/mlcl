/**
 * Aggregated English locale entry for the ai-code-review-tool app.
 *
 * Re-exports the keys defined in `./en/ui.ts` (and friends) at one
 * location so feature scaffolding scripts and the flagship-rollout
 * verify gate can scan a single canonical file. The actual content is
 * authored in the per-bond files under `./en/`.
 *
 * App-specific code-review keys (repositories / pull requests /
 * reviews / rules / pricing) are added here so they don't clutter the
 * canonical UI bond strings.
 */

import { ui } from './en/ui.js'

export const meta = {
  appName: 'AI Code Review Tool',
  appDescription: 'Automated AI code review with custom rule engine and PR feedback.',
  langCode: 'en',
  langName: 'English',
}

export const codeReview = {
  'landing.heroCta': 'Connect your first repo',
  'repos.title': 'Repositories',
  'repos.empty': 'No repositories connected yet.',
  'repos.connect': 'Connect repository',
  'repos.lastSync': 'Last sync',
  'repos.syncNow': 'Sync now',
  'pr.title': 'Pull requests',
  'pr.empty': 'No open pull requests for this repo.',
  'pr.openOnGithub': 'Open on GitHub',
  'pr.runReview': 'Run AI review',
  'pr.rerun': 'Re-run review',
  'pr.author': 'Author',
  'pr.changes': '{{additions}} added · {{deletions}} removed',
  'review.queued': 'Queued',
  'review.running': 'Running',
  'review.completed': 'Completed',
  'review.failed': 'Failed',
  'review.qualityScore': 'Quality score',
  'review.severitySummary': 'Severity summary',
  'review.tokensUsed': 'Tokens used',
  'review.cost': 'Cost',
  'review.startedAt': 'Started',
  'review.completedAt': 'Completed',
  'review.notFound': 'Review not found.',
  'review.comments.title': 'Inline comments',
  'review.comments.empty': 'No comments produced for this run.',
  'review.comments.severity.info': 'Info',
  'review.comments.severity.warning': 'Warning',
  'review.comments.severity.error': 'Error',
  'review.comments.severity.critical': 'Critical',
  'rules.title': 'Custom rules',
  'rules.add': 'Add rule',
  'rules.edit': 'Edit rule',
  'rules.delete': 'Delete rule',
  'rules.name': 'Rule name',
  'rules.description': 'Description',
  'rules.language': 'Language',
  'rules.pattern': 'Pattern (regex)',
  'rules.severity': 'Severity',
  'rules.enabled': 'Enabled',
  'rules.invalidPattern': 'Pattern must be a valid regular expression.',
  'rules.empty': 'No custom rules defined.',
  'queue.title': 'Review queue',
  'queue.empty': 'Queue is empty.',
  'queue.attempts': '{{count}} attempts',
  'webhooks.title': 'Webhook events',
  'webhooks.empty': 'No webhook deliveries received yet.',
  'webhooks.signatureValid': 'Signature OK',
  'webhooks.signatureInvalid': 'Signature failed',
  'credentials.title': 'API credentials',
  'credentials.add': 'Connect provider',
  'credentials.provider': 'Provider',
  'credentials.scopes': 'Scopes',
  'credentials.expires': 'Expires',
  'credentials.tokenRedacted': '••••••••',
  'notifications.title': 'Notifications',
  'notifications.empty': 'No notifications.',
  'notifications.markRead': 'Mark as read',
  'notifications.kind.review': 'Review ready',
  'notifications.kind.mention': 'You were mentioned',
  'notifications.kind.system': 'System',
  'pricing.heading': 'Choose your {{appName}} plan',
  'pricing.title': 'Pricing',
  'pricing.free': 'Free',
  'pricing.pro': 'Pro',
  'pricing.team': 'Team',
  'pricing.cta.free': 'Get started',
  'pricing.cta.pro': 'Start Pro trial',
  'pricing.cta.team': 'Contact sales',
  'pricing.feature.reviews': 'reviews',
  'pricing.feature.webhooks': 'webhooks',
  'pricing.feature.advanced': 'Advanced features',
  'pricing.feature.export': 'Data export',
}

export const en = {
  ...ui,
  ...codeReview,
}

export default en
