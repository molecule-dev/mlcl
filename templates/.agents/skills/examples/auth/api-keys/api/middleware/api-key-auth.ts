import type { NextFunction, Request, Response } from 'express'

import { recordApiKeyUse, verifyApiKey } from '@molecule/api-resource-api-key'

/**
 * Authorize a request via Bearer API key.
 * Use only on programmatic routes (e.g. /api/v1/*) — NOT on web routes,
 * since API keys bypass MFA and have longer lifetimes than sessions.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.header('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing API key' })
    return
  }
  const plain = auth.slice('Bearer '.length).trim()
  const apiKey = await verifyApiKey(plain)
  if (!apiKey) {
    res.status(401).json({ error: 'Invalid or revoked API key' })
    return
  }
  // Update last_used_at fire-and-forget; never block on this.
  void recordApiKeyUse(apiKey.id).catch(() => {})
  res.locals.session = { userId: apiKey.user_id, viaApiKey: true }
  next()
}
