import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { snapshot } from '../lib/snapshot.js'

/**
 * Documents + their version history.
 *
 * Every update SNAPSHOTS the pre-edit state into the `revisions` table via the
 * `snapshot()` helper (api/lib/snapshot.ts) BEFORE writing the new state, so an
 * older version is never lost. Restoring an old version creates a NEW revision
 * rather than rewriting history.
 *
 * Every route is owner-scoped: a user only ever sees or mutates their own
 * documents (and, transitively, that document's revisions). Missing rows and
 * other users' rows both 404 — never 403 — so existence isn't leaked. See the
 * @molecule/api-database owner-scoping rules.
 */

const documentSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(100_000),
})

type DocumentRow = {
  id: string
  user_id: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

type RevisionRow = {
  id: string
  table_name: string
  record_id: string
  revision_number: number
  actor_user_id: string
  state: { title: string; body: string } & Record<string, unknown>
  created_at: string
}

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

/**
 * Load a document and assert the caller owns it. Returns null when the row is
 * missing OR belongs to someone else — the caller 404s in both cases so
 * existence is never leaked (404, not 403).
 */
async function loadOwnedDocument(id: string, userId: string): Promise<DocumentRow | null> {
  const doc = (await findById('documents', id)) as DocumentRow | null
  if (!doc || doc.user_id !== userId) return null
  return doc
}

const router = Router()

// List the caller's own documents (newest-edited first).
router.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const docs = await findMany('documents', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(docs)
})

// Read one document (owner-scoped).
router.get('/:id', requireAuth, async (req, res) => {
  const doc = await loadOwnedDocument(req.params.id as string, res.locals.session.userId)
  if (!doc)
    return res
      .status(404)
      .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
  res.json(doc)
})

// Create a document.
router.post('/', requireAuth, async (req, res) => {
  const parsed = documentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
  }
  const now = new Date().toISOString()
  const result = await create('documents', {
    ...parsed.data,
    user_id: res.locals.session.userId,
    created_at: now,
    updated_at: now,
  })
  res.status(201).json(result.data)
})

// Update a document. SNAPSHOT the current (pre-edit) state FIRST, then write the
// new state — so the version that existed before this save is preserved.
router.put('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const doc = await loadOwnedDocument(req.params.id as string, userId)
  if (!doc)
    return res
      .status(404)
      .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
  const parsed = documentSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }) })
  }
  await snapshot('documents', doc, userId)
  const result = await updateById('documents', doc.id, {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  })
  res.json(result.data)
})

// List a document's version history (newest first). Ownership is enforced on
// the parent document; the revisions inherit that scope.
router.get('/:id/versions', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const doc = await loadOwnedDocument(req.params.id as string, userId)
  if (!doc)
    return res
      .status(404)
      .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
  const versions = await findMany('revisions', {
    where: [
      { field: 'table_name', operator: '=', value: 'documents' },
      { field: 'record_id', operator: '=', value: doc.id },
    ],
    orderBy: [{ field: 'revision_number', direction: 'desc' }],
    limit: 100,
  })
  res.json(versions)
})

// View a single past version's stored state (powers the diff view).
router.get('/:id/versions/:versionId', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const doc = await loadOwnedDocument(req.params.id as string, userId)
  if (!doc)
    return res
      .status(404)
      .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
  const version = (await findById(
    'revisions',
    req.params.versionId as string,
  )) as RevisionRow | null
  if (!version || version.table_name !== 'documents' || version.record_id !== doc.id) {
    return res
      .status(404)
      .json({ error: t('versions.notFound', undefined, { defaultValue: 'Version not found' }) })
  }
  res.json(version)
})

// Restore an old version. SNAPSHOT the current (pre-restore) state FIRST — the
// same discipline as the PUT path — so the content that is live right before
// the rollback is preserved as a new revision and the restore is itself
// reversible. THEN write the old content back to the live document.
router.post('/:id/versions/:versionId/restore', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const doc = await loadOwnedDocument(req.params.id as string, userId)
  if (!doc)
    return res
      .status(404)
      .json({ error: t('documents.notFound', undefined, { defaultValue: 'Document not found' }) })
  const version = (await findById(
    'revisions',
    req.params.versionId as string,
  )) as RevisionRow | null
  if (!version || version.table_name !== 'documents' || version.record_id !== doc.id) {
    return res
      .status(404)
      .json({ error: t('versions.notFound', undefined, { defaultValue: 'Version not found' }) })
  }
  // Preserve what is live NOW (the pre-restore state) before overwriting it —
  // otherwise restoring an old version silently discards the current content
  // with no way back. snapshot() must run BEFORE the update (see snapshot.ts).
  await snapshot('documents', doc, userId)
  const restored = { title: version.state.title, body: version.state.body }
  const result = await updateById('documents', doc.id, {
    ...restored,
    updated_at: new Date().toISOString(),
  })
  res.json(result.data)
})

export default router
