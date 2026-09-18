/**
 * Onboarding journey endpoint.
 *
 * Synthesises a templated onboarding checklist for every employee whose
 * `hire_date` is recent (last 90 days) so the Onboarding page renders
 * with realistic content immediately. The checklist progress is derived
 * deterministically from days-since-hire so a freshly-created employee
 * appears at 0% and a 60-day-old employee appears mostly done.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'

import { buildLookups } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

const CHECKLIST = [
  { key: 'offer-signed', label: 'Sign offer letter', category: 'Paperwork' },
  { key: 'i9-w4', label: 'Complete I-9 + W-4 paperwork', category: 'Paperwork' },
  { key: 'laptop', label: 'Receive laptop and peripherals', category: 'Equipment' },
  { key: 'accounts', label: 'Provision Slack, Email, GitHub access', category: 'Access' },
  { key: 'first-1on1', label: 'First 1:1 with manager', category: 'Manager' },
  { key: 'team-intro', label: 'Team introduction lunch', category: 'Team' },
  { key: 'training', label: 'Security & policy training', category: 'Compliance' },
  { key: 'benefits', label: 'Enroll in benefits', category: 'Benefits' },
  { key: 'project', label: 'First project assigned', category: 'Manager' },
  { key: '30-day', label: '30-day check-in with manager', category: 'Manager' },
]

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)

  const lookups = await buildLookups(userId)
  const now = Date.now()
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  const candidates = lookups.decoratedEmployees.filter((emp) => {
    const hire = emp.hire_date || emp.start_date
    if (!hire) return false
    const ts = new Date(hire).getTime()
    return !Number.isNaN(ts) && ts >= ninetyDaysAgo - 30 * 24 * 60 * 60 * 1000 // include up to 120 days
  })

  // If nothing recent, seed at least the most-recent two.
  const recents =
    candidates.length > 0
      ? candidates
      : [...lookups.decoratedEmployees]
          .sort(
            (a, b) =>
              new Date(b.hire_date || b.start_date || 0).getTime() -
              new Date(a.hire_date || a.start_date || 0).getTime(),
          )
          .slice(0, 2)

  const journeys = recents.map((emp) => {
    const hireMs = new Date(emp.hire_date || emp.start_date || Date.now()).getTime()
    const daysSinceHire = Math.max(0, Math.floor((now - hireMs) / (24 * 60 * 60 * 1000)))
    // Deterministic progress: 1 task per ~3 days, capped at total
    const tasksDone = Math.min(CHECKLIST.length, Math.floor(daysSinceHire / 3))
    const tasks = CHECKLIST.map((task, i) => ({
      id: `${emp.id}-${task.key}`,
      label: task.label,
      status: i < tasksDone ? 'done' : i === tasksDone ? 'in_progress' : 'todo',
      category: task.category,
    }))
    const progressPct = Math.round((tasksDone / CHECKLIST.length) * 100)
    const nextItem = tasks.find((t) => t.status !== 'done')?.label ?? 'Complete'
    return {
      id: String(emp.id),
      employee_name: emp.name,
      employee_initial: emp.avatar_initial,
      role: emp.title,
      department: emp.department,
      start_date: emp.hire_date || emp.start_date || '',
      buddy_name: emp.manager_name || 'Buddy TBD',
      progress_pct: progressPct,
      checklist_total: CHECKLIST.length,
      checklist_done: tasksDone,
      next_item: nextItem,
      tasks,
    }
  })

  res.json(journeys)
})

export default router
