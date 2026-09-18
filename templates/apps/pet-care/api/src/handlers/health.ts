/**
 * Aggregated health-events feed for the dashboard "alerts" rail.
 *
 * Each row is normalised to:
 *
 *   { id, kind, title, reminder_date (ISO), pet_name, pet_id }
 *
 * Sources: vet_records.follow_up_date, pet_vaccinations.due_on,
 * pet_medications (active+ending soon). Everything is scoped to pets the
 * caller owns.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface ReminderRow {
  id: string
  kind: 'follow_up' | 'vaccination' | 'medication'
  title: string
  reminder_date: string
  pet_id: string
  pet_name: string
}

router.get('/reminders', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const ownedPets = await findMany<Record<string, unknown>>('pets', {
    where: [{ field: 'owner_user_id', operator: '=', value: userId }],
    select: ['id', 'name'],
  })
  const petIds = ownedPets.map((p) => String(p.id))
  if (petIds.length === 0) return res.json([])

  const petById = new Map(ownedPets.map((p) => [String(p.id), String(p.name ?? '')]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + 60)

  const [vetFollowUps, vaccinations, medications] = await Promise.all([
    findMany<Record<string, unknown>>('vet_records', {
      where: [
        { field: 'pet_id', operator: 'in', value: petIds },
        { field: 'follow_up_date', operator: '>=', value: today },
      ],
      orderBy: [{ field: 'follow_up_date', direction: 'asc' }],
      limit: 50,
    }),
    findMany<Record<string, unknown>>('pet_vaccinations', {
      where: [
        { field: 'pet_id', operator: 'in', value: petIds },
        { field: 'due_on', operator: '>=', value: today },
        { field: 'due_on', operator: '<=', value: horizon },
      ],
      orderBy: [{ field: 'due_on', direction: 'asc' }],
      limit: 50,
    }),
    findMany<Record<string, unknown>>('pet_medications', {
      where: [
        { field: 'pet_id', operator: 'in', value: petIds },
        { field: 'is_active', operator: '=', value: true },
      ],
      limit: 50,
    }),
  ])

  const rows: ReminderRow[] = []
  for (const r of vetFollowUps) {
    const due =
      r.follow_up_date instanceof Date
        ? r.follow_up_date
        : r.follow_up_date
          ? new Date(String(r.follow_up_date))
          : null
    if (!due) continue
    rows.push({
      id: `follow_up-${String(r.id)}`,
      kind: 'follow_up',
      title: `${r.title ?? 'Follow-up'}`,
      reminder_date: due.toISOString(),
      pet_id: String(r.pet_id),
      pet_name: petById.get(String(r.pet_id)) ?? '',
    })
  }
  for (const v of vaccinations) {
    const due = v.due_on instanceof Date ? v.due_on : v.due_on ? new Date(String(v.due_on)) : null
    if (!due) continue
    rows.push({
      id: `vacc-${String(v.id)}`,
      kind: 'vaccination',
      title: `${v.vaccine_name ?? 'Vaccination'} due`,
      reminder_date: due.toISOString(),
      pet_id: String(v.pet_id),
      pet_name: petById.get(String(v.pet_id)) ?? '',
    })
  }
  for (const m of medications) {
    const end =
      m.end_date instanceof Date ? m.end_date : m.end_date ? new Date(String(m.end_date)) : null
    if (!end) continue
    if (end < today || end > horizon) continue
    rows.push({
      id: `med-${String(m.id)}`,
      kind: 'medication',
      title: `Refill ${m.name ?? 'medication'}`,
      reminder_date: end.toISOString(),
      pet_id: String(m.pet_id),
      pet_name: petById.get(String(m.pet_id)) ?? '',
    })
  }

  rows.sort((a, b) => a.reminder_date.localeCompare(b.reminder_date))
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100))
  res.json(rows.slice(0, limit))
})

export default router
