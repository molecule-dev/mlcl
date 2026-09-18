/**
 * Templates catalog — read-only blueprint library exposed to the app.
 *
 * Each template is a workflow blueprint (trigger + steps) that the user can
 * fork via `POST /api/templates/:id/install`. Installation creates a new
 * disabled workflow row with the blueprint's steps.
 */
import { type Request, type Response, Router } from 'express'

import { create } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

interface TemplateConnection {
  name: string
  icon: string
  required: boolean
}

interface TemplateNode {
  kind: 'trigger' | 'condition' | 'action'
  icon: string
  title: string
  subtitle?: string
}

interface TemplateBlueprint {
  id: string
  name: string
  category: 'Sales' | 'Support' | 'Ops' | 'Marketing' | 'Engineering'
  description: string
  highlights: string[]
  installs: number
  rating: number
  badge?: 'new' | 'popular'
  connections: TemplateConnection[]
  nodes: TemplateNode[]
  /** Initial workflow steps when installed (matches workflow_steps schema). */
  steps: Array<{ type: string; config: Record<string, unknown> }>
  triggerType: 'manual' | 'webhook' | 'cron' | 'schedule'
  cronExpression?: string
}

const CATALOG: TemplateBlueprint[] = [
  {
    id: 'lead-routing',
    name: 'Lead routing — Inbound forms',
    category: 'Sales',
    description:
      'Route inbound form submissions to the right rep based on company size, industry, and territory.',
    highlights: [
      'Round-robin within territory with weekend overrides',
      'AI-driven intent score before routing',
      'Slack interactive card with one-click claim',
    ],
    installs: 1284,
    rating: 4.8,
    badge: 'popular',
    connections: [
      { name: 'Webhook', icon: 'webhook', required: true },
      { name: 'AI', icon: 'psychology', required: true },
      { name: 'Email', icon: 'mail', required: true },
    ],
    nodes: [
      {
        kind: 'trigger',
        icon: 'webhook',
        title: 'Inbound webhook',
        subtitle: 'POST /forms/contact',
      },
      {
        kind: 'condition',
        icon: 'rule',
        title: 'Score ≥ medium?',
        subtitle: 'AI intent classifier',
      },
      { kind: 'action', icon: 'mail', title: 'Notify rep', subtitle: 'Send routing email' },
    ],
    steps: [
      { type: 'ai', config: { system: 'Classify intent', prompt: 'Score 0-1 for this lead.' } },
      {
        type: 'email',
        config: { to: 'sales@example.com', subject: 'New inbound lead', body: 'Lead arrived.' },
      },
    ],
    triggerType: 'webhook',
  },
  {
    id: 'refund-triage',
    name: 'Refund triage classifier',
    category: 'Support',
    description:
      'Classify incoming refund requests into auto-approve, manual review, or fraud queues.',
    highlights: [
      'Multi-tier classification with thresholds',
      'Audit log for every routing decision',
      'Fraud signal injection from external feed',
    ],
    installs: 624,
    rating: 4.6,
    connections: [
      { name: 'Webhook', icon: 'webhook', required: true },
      { name: 'AI', icon: 'psychology', required: true },
    ],
    nodes: [
      { kind: 'trigger', icon: 'inbox', title: 'Inbound request' },
      { kind: 'condition', icon: 'rule', title: 'Auto-approve?' },
      { kind: 'action', icon: 'task_alt', title: 'Route to queue' },
    ],
    steps: [
      {
        type: 'ai',
        config: { system: 'Triage refund', prompt: 'Classify: auto / manual / fraud' },
      },
    ],
    triggerType: 'webhook',
  },
  {
    id: 'stripe-digest',
    name: 'Daily Stripe → email digest',
    category: 'Ops',
    description:
      "Aggregate yesterday's charges, refunds, and disputes into a daily markdown digest.",
    highlights: ['Daily 07:00 cron', 'Markdown summary', 'Sent via email bond'],
    installs: 392,
    rating: 4.7,
    connections: [
      { name: 'Cron', icon: 'schedule', required: true },
      { name: 'Email', icon: 'mail', required: true },
    ],
    nodes: [
      { kind: 'trigger', icon: 'schedule', title: 'Daily 07:00' },
      { kind: 'action', icon: 'analytics', title: 'Aggregate metrics' },
      { kind: 'action', icon: 'mail', title: 'Send digest' },
    ],
    steps: [
      {
        type: 'email',
        config: { to: 'team@example.com', subject: 'Daily digest', body: 'Daily metrics summary.' },
      },
    ],
    triggerType: 'schedule',
    cronExpression: '0 7 * * *',
  },
  {
    id: 'onboarding-day3',
    name: 'Onboarding nudge · Day 3',
    category: 'Marketing',
    description:
      'Three days post-signup, check activation; nudge inactive users with a contextual email.',
    highlights: ['Activation gate', 'Personalised email content', 'Cron-driven'],
    installs: 502,
    rating: 4.5,
    badge: 'new',
    connections: [
      { name: 'Cron', icon: 'schedule', required: true },
      { name: 'Email', icon: 'mail', required: true },
    ],
    nodes: [
      { kind: 'trigger', icon: 'event', title: 'Day-3 cron' },
      { kind: 'condition', icon: 'rule', title: 'Active?' },
      { kind: 'action', icon: 'mail', title: 'Send nudge' },
    ],
    steps: [
      {
        type: 'email',
        config: { to: 'user@example.com', subject: 'Welcome aboard', body: 'How is it going?' },
      },
    ],
    triggerType: 'schedule',
    cronExpression: '0 10 * * *',
  },
  {
    id: 'gh-triage',
    name: 'Issue tracker triage',
    category: 'Engineering',
    description:
      'Auto-label new issues by component, severity, and team based on title and body content.',
    highlights: ['Multi-label classifier', 'Severity routing', 'Bot-comment summary'],
    installs: 318,
    rating: 4.6,
    connections: [
      { name: 'Webhook', icon: 'webhook', required: true },
      { name: 'AI', icon: 'psychology', required: true },
    ],
    nodes: [
      { kind: 'trigger', icon: 'webhook', title: 'Issue created' },
      { kind: 'action', icon: 'psychology', title: 'Classify' },
      { kind: 'action', icon: 'label', title: 'Apply labels' },
    ],
    steps: [
      {
        type: 'ai',
        config: { system: 'Classify issue', prompt: 'Pick component + severity + team' },
      },
    ],
    triggerType: 'webhook',
  },
  {
    id: 'anomaly-pd',
    name: 'Anomaly detector → on-call page',
    category: 'Ops',
    description: 'Watch a metric stream; on anomaly, page the on-call engineer with rich context.',
    highlights: ['Stream watcher', 'Rich context bundle', 'On-call escalation'],
    installs: 211,
    rating: 4.7,
    connections: [
      { name: 'Webhook', icon: 'webhook', required: true },
      { name: 'AI', icon: 'psychology', required: true },
      { name: 'Email', icon: 'mail', required: true },
    ],
    nodes: [
      { kind: 'trigger', icon: 'monitoring', title: 'Metric event' },
      { kind: 'condition', icon: 'warning', title: 'Anomaly?' },
      { kind: 'action', icon: 'campaign', title: 'Page on-call' },
    ],
    steps: [
      { type: 'ai', config: { system: 'Anomaly detector', prompt: 'Score severity 0-1' } },
      {
        type: 'email',
        config: { to: 'oncall@example.com', subject: 'Anomaly detected', body: 'See dashboard.' },
      },
    ],
    triggerType: 'webhook',
  },
]

router.use(authorizers.auth())

router.get('/', (_req: Request, res: Response) => {
  res.json({
    data: CATALOG.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      installs: tpl.installs,
      rating: tpl.rating,
      badge: tpl.badge,
      thumb: { nodes: tpl.nodes.slice(0, 3).map((n) => ({ kind: n.kind, icon: n.icon })) },
    })),
    total: CATALOG.length,
  })
})

router.get('/:id', (req: Request, res: Response) => {
  const tpl = CATALOG.find((t) => t.id === req.params.id)
  if (!tpl) {
    res
      .status(404)
      .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
    return
  }
  res.json(tpl)
})

router.post('/:id/install', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const tpl = CATALOG.find((t) => t.id === req.params.id)
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('templates.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const result = await create<Record<string, unknown>>('workflows', {
      user_id: userId,
      name: tpl.name,
      description: tpl.description,
      trigger_type: tpl.triggerType,
      cron_expression: tpl.cronExpression ?? null,
      condition_prompt: '',
      enabled: false,
      run_count: 0,
      success_count: 0,
      failure_count: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const workflow = result.data
    if (workflow && Array.isArray(tpl.steps)) {
      for (let i = 0; i < tpl.steps.length; i++) {
        await create('workflow_steps', {
          workflow_id: workflow.id,
          position: i,
          type: tpl.steps[i].type,
          config: JSON.stringify(tpl.steps[i].config ?? {}),
          created_at: new Date().toISOString(),
        })
      }
    }
    res.status(201).json({ workflow_id: workflow?.id, template_id: tpl.id })
  } catch (error) {
    logger.error('templates.install', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
