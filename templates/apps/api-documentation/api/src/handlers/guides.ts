import { type Request, type Response, Router } from 'express'

import { t } from '@molecule/api-i18n'

const router = Router()

interface Guide {
  id: string
  title: string
  description: string
  category: string
  read_time: number
  updated: string
}

// Read-only catalog of long-form how-tos. These are reference content
// (not user data), so we serve them as a versioned, static catalog
// rather than persisting them per-user. Replace this list (or wire it
// to a CMS) when authoring real guide content.
const GUIDES: Guide[] = [
  {
    id: 'quickstart',
    title: 'Quickstart in 5 minutes',
    description:
      'Sign up, grab a key, make your first call. The fastest path from zero to first 200.',
    category: 'getting-started',
    read_time: 5,
    updated: '2026-04-22',
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'Bearer tokens, scopes, key rotation, and how rate-limit headers behave.',
    category: 'authentication',
    read_time: 8,
    updated: '2026-04-18',
  },
  {
    id: 'pagination',
    title: 'Pagination patterns',
    description: 'Cursor vs offset, picking the right limit, handling backoff under heavy queries.',
    category: 'core',
    read_time: 6,
    updated: '2026-04-12',
  },
  {
    id: 'errors',
    title: 'Error handling',
    description:
      'Retry with idempotency keys, distinguishing 4xx from 5xx, and tracing failed requests.',
    category: 'core',
    read_time: 7,
    updated: '2026-04-10',
  },
  {
    id: 'webhooks',
    title: 'Webhooks deep dive',
    description: 'Signature verification, replay protection, idempotency, and queue patterns.',
    category: 'advanced',
    read_time: 12,
    updated: '2026-04-25',
  },
  {
    id: 'streaming',
    title: 'Streaming responses',
    description: 'Server-sent events for low-latency consumers and how to back-pressure them.',
    category: 'advanced',
    read_time: 10,
    updated: '2026-04-08',
  },
  {
    id: 'oauth-pkce',
    title: 'OAuth 2.0 with PKCE',
    description: 'Wire a public client end-to-end without leaking secrets to the browser.',
    category: 'recipes',
    read_time: 9,
    updated: '2026-04-02',
  },
  {
    id: 'background-jobs',
    title: 'Long-running jobs',
    description: 'Polling, webhook callbacks, and job-result endpoints for slow operations.',
    category: 'recipes',
    read_time: 8,
    updated: '2026-03-28',
  },
]

router.get('/', (_req: Request, res: Response) => {
  res.json(GUIDES)
})

router.get('/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const guide = GUIDES.find((g) => g.id === id)
  if (!guide) {
    return res.status(404).json({ error: t('guides.notFound') })
  }
  res.json(guide)
})

export default router
