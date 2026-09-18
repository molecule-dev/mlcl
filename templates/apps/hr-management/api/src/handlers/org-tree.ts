/**
 * Org-chart endpoint.
 *
 * Returns a single tree rooted at the manager-less employee (typically
 * the CEO). Each node carries the view-shape the OrgChart page expects.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'

import { buildLookups, type DecoratedEmployee } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

interface OrgNode {
  id: string
  name: string
  title: string
  department: string
  initial: string
  children: OrgNode[]
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)

  const lookups = await buildLookups(userId)
  const employees = lookups.decoratedEmployees
  if (employees.length === 0) {
    return res.json(null)
  }

  const childrenByManager = new Map<string | null, DecoratedEmployee[]>()
  for (const emp of employees) {
    const list = childrenByManager.get(emp.manager_id) ?? []
    list.push(emp)
    childrenByManager.set(emp.manager_id, list)
  }

  // Pick the most senior manager-less employee as the canonical root so
  // that adding a new manager-less hire later doesn't bump the founder
  // out of the chart. Order: Chief/CEO/Founder titles first, then by
  // descendant count (so a tree with reports beats an isolated node),
  // then by oldest hire_date.
  const roots = (childrenByManager.get(null) ?? []).slice()
  const isExec = (t: string | undefined): boolean =>
    !!t && /\bchief|\bceo\b|\bcoo\b|\bcto\b|\bcfo\b|founder/i.test(t)
  const descendantCount = (id: string): number => {
    const seen = new Set<string>()
    const walk = (nid: string): number => {
      if (seen.has(nid)) return 0
      seen.add(nid)
      const kids = childrenByManager.get(nid) ?? []
      let n = kids.length
      for (const k of kids) n += walk(String(k.id))
      return n
    }
    return walk(id)
  }
  roots.sort((a, b) => {
    const ax = isExec(a.title) ? 1 : 0
    const bx = isExec(b.title) ? 1 : 0
    if (ax !== bx) return bx - ax
    const ad = descendantCount(String(a.id))
    const bd = descendantCount(String(b.id))
    if (ad !== bd) return bd - ad
    const aHire = new Date(a.hire_date || a.start_date || 0).getTime()
    const bHire = new Date(b.hire_date || b.start_date || 0).getTime()
    return aHire - bHire
  })
  const root = roots[0] ?? employees[0]

  const seen = new Set<string>()
  const build = (emp: DecoratedEmployee): OrgNode => {
    seen.add(String(emp.id))
    const kids = (childrenByManager.get(emp.id) ?? []).filter((c) => !seen.has(String(c.id)))
    return {
      id: String(emp.id),
      name: emp.name,
      title: emp.title,
      department: emp.department,
      initial: emp.avatar_initial,
      children: kids.map(build),
    }
  }

  // Append any other roots (e.g. brand-new hires whose manager hasn't
  // been assigned yet) as additional children of the canonical root so
  // the chart doesn't silently hide them.
  const rootNode = build(root)
  for (const other of roots.slice(1)) {
    if (seen.has(String(other.id))) continue
    rootNode.children.push(build(other))
  }
  res.json(rootNode)
})

export default router
