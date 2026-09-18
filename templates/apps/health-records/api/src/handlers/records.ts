/**
 * health-records — unified timeline aggregator.
 *
 * Combines conditions, allergies, visits, labs, and medications into a
 * single ordered timeline for the records page. Each entry includes the
 * source type and a polymorphic id (e.g. `condition:abc-123`) so the
 * detail page can route back to the correct underlying resource.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface TimelineEntry {
  id: string
  type: 'condition' | 'allergy' | 'visit' | 'procedure' | 'lab' | 'medication'
  title: string
  date: string
  status?: string
  detail?: string
  source_id: string
}

function isoDateOnly(d: unknown): string {
  if (!d) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return ''
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    await seedDemoForUser(userId)

    const [conditions, allergies, visits, labs, medications] = await Promise.all([
      findMany<Record<string, unknown>>('conditions', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'onset_date', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('allergies', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'onset_date', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('visits', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'scheduled_at', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('lab_results', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'collected_date', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('medications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'start_date', direction: 'desc' }],
      }),
    ])

    const entries: TimelineEntry[] = []

    for (const c of conditions) {
      entries.push({
        id: `condition:${c.id}`,
        source_id: String(c.id ?? ''),
        type: 'condition',
        title: String(c.name ?? 'Condition'),
        date: isoDateOnly(c.onset_date) || isoDateOnly(c.created_at),
        status: c.status as string | undefined,
        detail:
          [
            c.icd10_code ? `ICD-10 ${c.icd10_code}` : null,
            c.severity ?? null,
            c.provider_name ?? null,
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
      })
    }
    for (const a of allergies) {
      entries.push({
        id: `allergy:${a.id}`,
        source_id: String(a.id ?? ''),
        type: 'allergy',
        title: String(a.allergen ?? a.substance ?? 'Allergy'),
        date: isoDateOnly(a.onset_date) || isoDateOnly(a.created_at),
        status: a.severity as string | undefined,
        detail:
          [a.reaction, a.verified_by ? `verified by ${a.verified_by}` : null]
            .filter(Boolean)
            .join(' · ') || undefined,
      })
    }
    for (const v of visits) {
      const provider = v.provider_name as string | undefined
      const clinic = v.clinic_name as string | undefined
      entries.push({
        id: `visit:${v.id}`,
        source_id: String(v.id ?? ''),
        type: 'visit',
        title:
          [v.chief_complaint, provider ? `· ${provider}` : null].filter(Boolean).join(' ') ||
          'Visit',
        date: isoDateOnly(v.scheduled_at) || isoDateOnly(v.created_at),
        status: v.completed_at ? 'completed' : 'scheduled',
        detail: clinic ?? undefined,
      })
    }
    for (const l of labs) {
      entries.push({
        id: `lab:${l.id}`,
        source_id: String(l.id ?? ''),
        type: 'lab',
        title: String(l.panel_name ?? l.test_name ?? 'Lab'),
        date: isoDateOnly(l.collected_date) || isoDateOnly(l.created_at),
        status: l.flag as string | undefined,
        detail: [l.ordering_provider, l.performing_lab].filter(Boolean).join(' · ') || undefined,
      })
    }
    for (const m of medications) {
      entries.push({
        id: `medication:${m.id}`,
        source_id: String(m.id ?? ''),
        type: 'medication',
        title: String(m.name ?? 'Medication'),
        date: isoDateOnly(m.start_date) || isoDateOnly(m.created_at),
        status: m.status as string | undefined,
        detail: [m.dosage, m.frequency, m.prescriber].filter(Boolean).join(' · ') || undefined,
      })
    }

    entries.sort((a, b) => b.date.localeCompare(a.date))
    res.json(entries)
  } catch (err) {
    console.error('health-records 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
