/**
 * Integration connections — read-only catalog of services the workflow
 * runtime can talk to. The state (connected / available / coming soon) is
 * derived from environment configuration so the UI surfaces real data.
 */
import { type Request, type Response, Router } from 'express'

import { authorizers } from '@molecule/api-resource-user'

const router = Router()

interface IntegrationItem {
  id: string
  name: string
  category: string
  icon: string
  brandColor: string
  description: string
  badge?: string
  /** Resolves to either 'connected', 'available', or 'comingSoon' at runtime. */
  envHint?: string
  status?: 'connected' | 'available' | 'comingSoon'
}

const ITEMS: IntegrationItem[] = [
  // Communication
  {
    id: 'email',
    name: 'Email',
    category: 'Comms',
    icon: 'mail',
    brandColor: '#dc2626',
    description: 'Send transactional and digest emails through the bonded email provider.',
    badge: 'Bond',
    envHint: 'MAILGUN_API_KEY',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    category: 'Comms',
    icon: 'webhook',
    brandColor: '#7c3aed',
    description: 'Trigger or POST to any HTTP endpoint as part of a workflow run.',
    badge: 'Built-in',
  },
  // AI
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'AI',
    icon: 'psychology',
    brandColor: '#f59e0b',
    description: 'Use Claude inside workflows for classification, summarisation, and tools.',
    badge: 'API key',
    envHint: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'AI',
    icon: 'auto_awesome',
    brandColor: '#16a34a',
    description: 'Plug GPT models into condition nodes and content actions.',
    badge: 'API key',
    envHint: 'OPENAI_API_KEY',
  },
  // Storage / data
  {
    id: 's3',
    name: 'Object storage',
    category: 'Storage',
    icon: 'cloud',
    brandColor: '#06b6d4',
    description: 'Upload run output and artifacts to S3-compatible storage.',
    badge: 'API key',
    envHint: 'AWS_ACCESS_KEY_ID',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'Data',
    icon: 'storage',
    brandColor: '#06b6d4',
    description: 'Query and write rows, run typed transactions inside a workflow.',
    badge: 'Direct conn',
    envHint: 'DATABASE_URL',
  },
  // Schedule
  {
    id: 'cron',
    name: 'Cron schedule',
    category: 'Schedule',
    icon: 'schedule',
    brandColor: '#7c3aed',
    description: 'Run any workflow on a recurring cron expression.',
    badge: 'Built-in',
  },
  // Payments
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    icon: 'payments',
    brandColor: '#7c3aed',
    description: 'React to events, issue refunds, build receipt automations.',
    badge: 'API key',
    envHint: 'STRIPE_SECRET_KEY',
  },
  // Search
  {
    id: 'meilisearch',
    name: 'Meilisearch',
    category: 'Search',
    icon: 'search',
    brandColor: '#f59e0b',
    description: 'Index and query workflow output for full-text retrieval.',
    badge: 'API key',
    envHint: 'MEILISEARCH_API_KEY',
  },
  // Coming soon
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    icon: 'business_center',
    brandColor: '#0891b2',
    description: 'Sync leads, contacts, and opportunities. Coming this quarter.',
  },
]

const CATEGORIES = ['Comms', 'Schedule', 'AI', 'Storage', 'Data', 'Search', 'Payments', 'CRM']

function resolveStatus(item: IntegrationItem): 'connected' | 'available' | 'comingSoon' {
  if (item.id === 'salesforce') return 'comingSoon'
  if (item.id === 'webhooks' || item.id === 'cron') return 'connected'
  if (item.envHint && process.env[item.envHint] && String(process.env[item.envHint]).length > 0) {
    return 'connected'
  }
  return 'available'
}

router.use(authorizers.auth())

router.get('/', (_req: Request, res: Response) => {
  const data = ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    icon: item.icon,
    brandColor: item.brandColor,
    description: item.description,
    badge: item.badge,
    status: resolveStatus(item),
  }))
  res.json({ data, categories: CATEGORIES, total: data.length })
})

export default router
