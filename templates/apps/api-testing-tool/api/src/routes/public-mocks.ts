/**
 * Public mock-server route — serves a saved mock fixture to anyone who
 * holds the `public_token`. No auth required (the token IS the auth).
 *
 * Mounted under `/api/mock-server/:token[/optional/sub/path]`. The owning
 * mock row's `path_pattern` is informational — the public route accepts any
 * sub-path so the mock's URL can stand in for an upstream API root.
 *
 * The `is_public` flag is enforced on every read, so a mock that gets
 * flipped back to private becomes inaccessible immediately even if a
 * client still holds the old token.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'

const router = Router()

interface PublicMockRow {
  id: string
  is_public: boolean
  public_token: string | null
  method: string
  response_status: number
  response_headers: string
  response_body: string
  latency_ms: number
}

async function findByToken(token: string): Promise<PublicMockRow | null> {
  const where: WhereCondition[] = [
    { field: 'public_token', operator: '=', value: token },
    { field: 'is_public', operator: '=', value: true },
  ]
  const rows = await findMany<PublicMockRow>('mocks', { where, limit: 1 })
  return rows?.[0] ?? null
}

async function serveMock(req: Request, res: Response): Promise<void> {
  const raw = req.params.token
  const token = Array.isArray(raw) ? raw[0] : raw
  if (!token) {
    res.status(400).json({ error: 'mock token required' })
    return
  }
  const mock = await findByToken(token)
  if (!mock) {
    res.status(404).json({ error: 'mock not found or not public' })
    return
  }
  if (mock.method && mock.method.toUpperCase() !== req.method.toUpperCase()) {
    res.status(405).json({
      error: `mock only responds to ${mock.method.toUpperCase()}`,
      allowed: mock.method.toUpperCase(),
    })
    return
  }

  let headers: Record<string, string> = {}
  try {
    const parsed = JSON.parse(mock.response_headers || '{}')
    if (parsed && typeof parsed === 'object') {
      headers = parsed as Record<string, string>
    }
  } catch (_error) {
    // Bad header JSON falls back to defaults.
  }

  if (mock.latency_ms > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, Math.min(mock.latency_ms, 30_000)))
  }

  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  if (!headers['Content-Type'] && !headers['content-type']) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
  }
  res.status(mock.response_status || 200)
  res.send(mock.response_body ?? '')
}

router.all('/:token', serveMock)
router.all('/:token/*splat', serveMock)

export default router
