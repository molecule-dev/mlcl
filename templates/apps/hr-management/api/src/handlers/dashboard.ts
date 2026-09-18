/**
 * Dashboard / overview endpoint.
 *
 * Returns a single object the Dashboard and Reports pages render — KPI
 * counts, headcount by department, tenure buckets, etc. Always reads
 * from live tables so the dashboard reflects real state including
 * brand-new employees the user just created.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { canonicalEmployeeStatus } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const DEPT_COLORS = [
  'var(--color-dept-engineering)',
  'var(--color-dept-design)',
  'var(--color-dept-sales)',
  'var(--color-dept-marketing)',
  'var(--color-dept-support)',
  'var(--color-dept-people)',
  'var(--color-dept-finance)',
]

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)

  const employees = await findMany<{
    id: string
    department_id: string | null
    status: string
    hire_date: string | null
    start_date: string | null
  }>('employees', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const departments = await findMany<{ id: string; name: string }>('departments', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'name', direction: 'asc' }],
  })

  const headcount = employees.length
  const active = employees.filter((e) => e.status === 'active').length
  // The app write-path stores the hyphen form ('on-leave') while the seed stores 'on_leave' —
  // canonicalize before counting so app-marked on-leave employees aren't dropped from this KPI.
  const onLeave = employees.filter((e) => canonicalEmployeeStatus(e.status) === 'on-leave').length
  const terminated = employees.filter((e) => e.status === 'terminated').length

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const headcountDelta = employees.filter((e) => {
    const d = e.hire_date ?? e.start_date
    if (!d) return false
    const dt = new Date(d)
    return !Number.isNaN(dt.getTime()) && dt >= thirtyDaysAgo && dt <= now
  }).length

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const startingThisMonth = employees.filter((e) => {
    const d = e.hire_date ?? e.start_date
    if (!d) return false
    const dt = new Date(d)
    return !Number.isNaN(dt.getTime()) && dt >= startOfMonth && dt <= endOfMonth
  }).length

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const anniversariesThisWeek = employees.filter((e) => {
    const d = e.hire_date ?? e.start_date
    if (!d) return false
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return false
    const anniv = new Date(now.getFullYear(), dt.getMonth(), dt.getDate())
    return anniv >= startOfWeek && anniv <= endOfWeek && dt < startOfMonth
  }).length

  const headcountByDept = departments.map((dept, i) => ({
    name: dept.name,
    count: employees.filter((e) => e.department_id === dept.id).length,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))
  const unassigned = employees.filter((e) => !e.department_id).length
  if (unassigned > 0) {
    headcountByDept.push({
      name: 'Unassigned',
      count: unassigned,
      color: 'var(--color-dept-other, #94a3b8)',
    })
  }

  const tenureBuckets = [
    { label: '< 1 year', count: 0 },
    { label: '1–3 years', count: 0 },
    { label: '3–5 years', count: 0 },
    { label: '5+ years', count: 0 },
  ]
  for (const e of employees) {
    const d = e.hire_date ?? e.start_date
    if (!d) {
      tenureBuckets[0].count++
      continue
    }
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) {
      tenureBuckets[0].count++
      continue
    }
    const yrs = (now.getTime() - dt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (yrs < 1) tenureBuckets[0].count++
    else if (yrs < 3) tenureBuckets[1].count++
    else if (yrs < 5) tenureBuckets[2].count++
    else tenureBuckets[3].count++
  }

  const openPto = await count('pto_requests', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'pending' },
  ])

  res.json({
    headcount,
    headcount_delta: headcountDelta,
    active_today: active,
    on_leave: onLeave,
    terminated,
    open_pto_requests: openPto,
    anniversaries_this_week: anniversariesThisWeek,
    starting_this_month: startingThisMonth,
    headcount_by_dept: headcountByDept,
    tenure_buckets: tenureBuckets,
  })
})

export default router
