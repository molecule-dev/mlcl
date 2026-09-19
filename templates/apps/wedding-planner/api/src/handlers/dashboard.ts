/**
 * Dashboard summary — one GET feeding the whole Dashboard page:
 * countdown, RSVP tally, budget vs spent, task progress, vendor progress.
 *
 * GET /summary
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { countOverdue, daysUntil, rollupBudget, tallyRsvps } from '../lib/wedding.js'
import { findWeddingForUser, seedDemoForUser } from './_seed.js'

const router = Router()

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    // The dashboard is often the first authenticated surface — make sure the
    // starter kit exists so the page renders real content.
    await seedDemoForUser(userId)
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }

    const [guests, budgetItems, tasks, vendors] = await Promise.all([
      findMany<{ rsvp_status: string; plus_ones: number }>('guests', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 1000,
      }),
      findMany<{ category: string; estimated_cents: number; actual_cents: number | null }>(
        'budget_items',
        {
          where: [{ field: 'user_id', operator: '=', value: userId }],
          limit: 500,
        },
      ),
      findMany<{
        done: boolean
        due_date: string | null
        title: string
        category: string
        id: string
      }>('tasks', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'due_date', direction: 'asc' }],
        limit: 300,
      }),
      findMany<{ status: string }>('vendors', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        limit: 200,
      }),
    ])

    const { tally: rsvpTally, plus_ones_confirmed: plusOnes } = tallyRsvps(guests)

    const { estimated_total_cents: estimatedTotal, actual_total_cents: actualTotal } =
      rollupBudget(budgetItems)

    const tasksDone = tasks.filter((task) => Boolean(task.done)).length
    const upcomingTasks = tasks
      .filter((task) => !task.done)
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        due_date: task.due_date,
      }))
    const overdue = countOverdue(tasks)

    const vendorsBooked = vendors.filter((v) => v.status === 'booked' || v.status === 'paid').length

    const date =
      wedding.wedding_date instanceof Date
        ? (wedding.wedding_date as Date).toISOString()
        : String(wedding.wedding_date ?? '')

    res.json({
      wedding: {
        id: String(wedding.id),
        partner_a_name: wedding.partner_a_name,
        partner_b_name: wedding.partner_b_name,
        wedding_date: date,
        venue: wedding.venue,
        rsvp_code: wedding.rsvp_code,
      },
      days_until: daysUntil(date),
      guests_total: guests.length,
      rsvp_tally: rsvpTally,
      plus_ones_confirmed: plusOnes,
      headcount_confirmed: rsvpTally.yes + plusOnes,
      budget: {
        estimated_total_cents: estimatedTotal,
        actual_total_cents: actualTotal,
        line_item_count: budgetItems.length,
      },
      tasks: { total: tasks.length, done: tasksDone, overdue, upcoming: upcomingTasks },
      vendors: { total: vendors.length, booked: vendorsBooked },
    })
  } catch (err) {
    logger.error('dashboard summary GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
