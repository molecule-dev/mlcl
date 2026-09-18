/**
 * Search — workspace-wide search across projects and templates by name.
 *
 * Endpoints:
 * - GET /search?q=&category=  — { results:[…], total }
 *   - category in {all, project, template, component} (component falls back to design_tokens)
 *
 * Uses ILIKE on the canonical name/description columns. Templates are
 * scoped to public templates; projects are scoped to the caller's own.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface SearchHit {
  id: string
  title: string
  snippet: string
  category: 'project' | 'template' | 'component'
  href: string
  meta: string
  accentColor: string
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const q = String(req.query.q ?? '').trim()
  const category = String(req.query.category ?? 'all') as
    'all' | 'project' | 'template' | 'component'
  const like = q ? `%${q}%` : '%'

  const out: SearchHit[] = []

  if (category === 'all' || category === 'project') {
    const rows = await query(
      `SELECT id, name, updated_at
       FROM projects
       WHERE user_id = $1::uuid
         AND name ILIKE $2
       ORDER BY updated_at DESC
       LIMIT 20`,
      [userId, like],
    )
    const list = (rows as { rows?: Array<Record<string, unknown>> }).rows ?? []
    for (const r of list) {
      out.push({
        id: `proj-${r.id}`,
        title: String(r.name),
        snippet: 'Personal canvas in your workspace.',
        category: 'project',
        href: `/editor/${r.id}`,
        meta: 'Project · You',
        accentColor: '#7c3aed',
      })
    }
  }

  if (category === 'all' || category === 'template') {
    const rows = await query(
      `SELECT id, name, description, category, accent_color, icon_name, usage_count
       FROM templates
       WHERE is_public = true
         AND (name ILIKE $1 OR COALESCE(description,'') ILIKE $1)
       ORDER BY usage_count DESC
       LIMIT 20`,
      [like],
    )
    const list = (rows as { rows?: Array<Record<string, unknown>> }).rows ?? []
    for (const r of list) {
      out.push({
        id: `tmpl-${r.id}`,
        title: String(r.name),
        snippet: String(r.description ?? ''),
        category: 'template',
        href: `/templates`,
        meta: `${r.category ?? 'Template'} · ${r.usage_count ?? 0} uses`,
        accentColor: String(r.accent_color ?? '#ec4899'),
      })
    }
  }

  if (category === 'all' || category === 'component') {
    const rows = await findMany<Record<string, unknown>>('design_tokens', {
      where: [{ field: 'section', operator: '=', value: 'components' }],
      limit: 100,
    }).catch(() => [])
    const filtered = q
      ? rows.filter((r) =>
          String(r.name ?? '')
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
      : rows
    for (const r of filtered.slice(0, 20)) {
      out.push({
        id: `cmp-${r.id}`,
        title: String(r.name),
        snippet: `${r.role ?? 'Component'} · used across the workspace.`,
        category: 'component',
        href: `/library`,
        meta: `Library · ${r.role ?? 'Component'}`,
        accentColor: '#06b6d4',
      })
    }
  }

  res.json({ results: out, total: out.length, q, category })
})

export default router
