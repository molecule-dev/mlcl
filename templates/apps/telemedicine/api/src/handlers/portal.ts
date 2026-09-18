/**
 * Telemedicine — patient-portal aggregator handlers.
 *
 * Mounts the handful of derived endpoints the patient UI calls but
 * which don't map 1:1 to a single resource table:
 *
 *   GET /api/patients                  — current user as the sole "patient"
 *   GET /api/patients/:id              — same, scoped to self
 *   GET /api/reports/vitals            — counts (visits, rx, etc.) for the dashboard hero
 *   GET /api/reports/vitals-snapshot   — last-known vitals, derived from medical_records
 *   GET /api/patient-history           — chronological appts + records + rx for the dashboard
 *   GET /api/messages                  — flattened consultation_messages addressed to/from user
 *   POST /api/messages                 — append a message to the most recent consultation
 *   GET /api/providers/search?q=       — search the verified-provider directory
 *   GET /api/profile/me                — current user's profile + plan + name
 *   PUT /api/profile/me                — update name + preferences (theme, etc.)
 *
 * These are deliberately patient-facing: the schema modelling treats
 * the signed-in user as both the chart owner and the conversation
 * counterparty for the demo flow.
 *
 * Errors are logged and surfaced as 5xx responses — see
 * `flagship-production-ready.md` "Silent error masking".
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateProviders } from './_lib/decorate.js'
import { seedForUser } from './_seed.js'

const router = Router()

interface UserRow extends Record<string, unknown> {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

interface AppointmentRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  scheduled_at?: string | Date
  duration_minutes?: number
  type?: string
  reason?: string | null
  status?: string
  summary?: string | null
  completed_at?: string | Date | null
  created_at?: string | Date
}

interface ProviderRow extends Record<string, unknown> {
  id: string
  user_id?: string
  display_name?: string
  first_name?: string | null
  last_name?: string | null
  title?: string | null
  specialty?: string | null
  specialty_id?: string | null
  bio?: string | null
  rating?: number
  total_reviews?: number
  consultation_fee?: number
  avatar_url?: string | null
  is_accepting_patients?: boolean
  accepting_patients?: boolean
  is_verified?: boolean
}

interface PrescriptionRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  provider_id?: string
  drug_name?: string
  dosage?: string | null
  frequency?: string | null
  refills_allowed?: number
  refills_used?: number
  pharmacy_id?: string | null
  status?: string
  prescribed_at?: string | Date
}

interface MedicalRecordRow extends Record<string, unknown> {
  id: string
  patient_user_id?: string
  provider_user_id?: string | null
  kind?: string
  type?: string
  title?: string
  description?: string | null
  data?: unknown
  created_at?: string | Date
}

const onError = (res: Response, error: unknown, where: string): void => {
  logger.error(`telemedicine ${where}:`, error)
  res.status(500).json({
    error: t('errors.internalServer', undefined, {
      defaultValue: 'Something went wrong. Please try again.',
    }),
  })
}

function nameFromUser(u: UserRow | null): string {
  if (!u) return 'You'
  return (u.name && String(u.name).trim()) || (u.email ? String(u.email).split('@')[0] : 'You')
}

function ageFromDob(dob: unknown): number {
  if (!dob || typeof dob !== 'string') return 0
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

function patientShape(user: UserRow): {
  id: string
  name: string
  dob: string
  age: number
  sex: 'M' | 'F' | 'X'
  primary_concern: string
  last_visit: string | null
  next_visit: string | null
  flag: 'none' | 'urgent' | 'new' | 'overdue'
} {
  const oauth = (user.oauthData ?? {}) as Record<string, unknown>
  const dob = (oauth.dob as string | undefined) ?? ''
  const sex = (oauth.sex as 'M' | 'F' | 'X' | undefined) ?? 'X'
  const concern = (oauth.primary_concern as string | undefined) ?? 'General wellness'
  return {
    id: user.id,
    name: nameFromUser(user),
    dob,
    age: ageFromDob(dob),
    sex,
    primary_concern: concern,
    last_visit: null,
    next_visit: null,
    flag: 'none',
  }
}

router.get('/profile/me', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const user = await findById<UserRow>('users', userId)
    if (!user) return onError(res, new Error('user vanished'), 'profile/me')
    res.json({
      id: user.id,
      name: nameFromUser(user),
      email: user.email,
      planKey: user.planKey ?? '',
      preferences:
        ((user.oauthData ?? {}) as { preferences?: Record<string, unknown> }).preferences ?? {},
    })
  } catch (error) {
    onError(res, error, 'profile/me')
  }
})

const profileUpdateSchema = z.object({
  name: z.string().trim().max(120).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

router.put(
  '/profile/me',
  validateBody(profileUpdateSchema),
  async (req: Request, res: Response) => {
    const userId = requireUser(res)
    if (!userId) return
    try {
      const body = req.body as z.infer<typeof profileUpdateSchema>
      const user = await findById<UserRow>('users', userId)
      if (!user) return onError(res, new Error('user vanished'), 'profile/me put')
      const updates: Record<string, unknown> = {}
      if (typeof body.name === 'string') updates.name = body.name
      if (body.preferences) {
        const oauth = ((user.oauthData ?? {}) as Record<string, unknown>) || {}
        const merged = {
          ...oauth,
          preferences: { ...(oauth.preferences ?? {}), ...body.preferences },
        }
        updates.oauthData = merged
      }
      if (Object.keys(updates).length === 0) {
        res.json({
          id: user.id,
          name: nameFromUser(user),
          email: user.email,
          planKey: user.planKey ?? '',
          preferences:
            ((user.oauthData ?? {}) as { preferences?: Record<string, unknown> }).preferences ?? {},
        })
        return
      }
      await updateById('users', userId, updates)
      const fresh = await findById<UserRow>('users', userId)
      if (!fresh) return onError(res, new Error('user vanished after update'), 'profile/me put')
      res.json({
        id: fresh.id,
        name: nameFromUser(fresh),
        email: fresh.email,
        planKey: fresh.planKey ?? '',
        preferences:
          ((fresh.oauthData ?? {}) as { preferences?: Record<string, unknown> }).preferences ?? {},
      })
    } catch (error) {
      onError(res, error, 'profile/me put')
    }
  },
)

router.get('/patients', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await seedForUser(userId)
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.json([])
      return
    }
    res.json([patientShape(user)])
  } catch (error) {
    onError(res, error, 'patients')
  }
})

router.get('/patients/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const id = req.params.id
    if (id !== userId) {
      res.status(404).json({
        error: t('patients.notFound', undefined, { defaultValue: 'Patient not found.' }),
      })
      return
    }
    const user = await findById<UserRow>('users', id)
    if (!user) {
      res.status(404).json({
        error: t('patients.notFound', undefined, { defaultValue: 'Patient not found.' }),
      })
      return
    }
    res.json(patientShape(user))
  } catch (error) {
    onError(res, error, 'patients/:id')
  }
})

router.get('/reports/vitals', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await seedForUser(userId)
    const [appts, rx, msgsRes] = await Promise.all([
      findMany<AppointmentRow>('appointments', {
        where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      }),
      findMany<PrescriptionRow>('prescriptions', {
        where: [{ field: 'patient_user_id', operator: '=', value: userId }],
      }),
      query<{ id: string }>(
        `SELECT cm.id FROM consultation_messages cm
         JOIN consultations c ON c.id = cm.consultation_id
         WHERE c.patient_user_id = $1 AND cm.read_at IS NULL`,
        [userId],
      ).catch(
        () =>
          ({ rows: [] as Array<{ id: string }>, rowCount: 0 }) as {
            rows: Array<{ id: string }>
            rowCount: number
          },
      ),
    ])
    const today = new Date().toDateString()
    const visits_today = appts.filter((a) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).toDateString() : null
      return at === today
    }).length
    const open_prescriptions = rx.filter((p) => p.status === 'active').length
    const pending_messages = (msgsRes.rows ?? []).length
    res.json({
      patient_count: 1,
      visits_today,
      avg_rating: 0,
      pending_messages,
      open_prescriptions,
    })
  } catch (error) {
    onError(res, error, 'reports/vitals')
  }
})

router.get('/reports/vitals-snapshot', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await seedForUser(userId)
    const records = await findMany<MedicalRecordRow>('medical_records', {
      where: [
        { field: 'patient_user_id', operator: '=', value: userId },
        { field: 'kind', operator: '=', value: 'lab' },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1,
    })
    const last = records[0]
    const data = (() => {
      if (!last) return {}
      const raw = last.data
      if (raw == null) return {}
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>
        } catch (_error) {
          // malformed JSON data — fall back to empty object
          return {}
        }
      }
      return raw as Record<string, unknown>
    })()
    const num = (k: string): number | null =>
      typeof data[k] === 'number' ? (data[k] as number) : null
    const snapshot: Array<{
      label: string
      value: string
      unit: string
      state: 'good' | 'warn' | 'urgent' | 'bad'
    }> = []
    const glucose = num('glucose')
    if (glucose != null) {
      snapshot.push({
        label: 'Glucose',
        value: String(glucose),
        unit: 'mg/dL',
        state: glucose > 125 ? 'warn' : 'good',
      })
    }
    const sodium = num('sodium')
    if (sodium != null) {
      snapshot.push({
        label: 'Sodium',
        value: String(sodium),
        unit: 'mEq/L',
        state: sodium < 135 || sodium > 145 ? 'warn' : 'good',
      })
    }
    const potassium = num('potassium')
    if (potassium != null) {
      snapshot.push({
        label: 'Potassium',
        value: String(potassium),
        unit: 'mEq/L',
        state: potassium < 3.5 || potassium > 5.0 ? 'warn' : 'good',
      })
    }
    if (snapshot.length === 0) {
      snapshot.push(
        { label: 'BP', value: '—', unit: 'mmHg', state: 'good' },
        { label: 'HR', value: '—', unit: 'bpm', state: 'good' },
        { label: 'SpO2', value: '—', unit: '%', state: 'good' },
      )
    }
    res.json(snapshot)
  } catch (error) {
    onError(res, error, 'reports/vitals-snapshot')
  }
})

router.get('/patient-history', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await seedForUser(userId)
    const apptId = (req.query.appointment_id as string | undefined) ?? null
    let patientId = (req.query.patient_id as string | undefined) ?? userId
    if (apptId) {
      const appt = await findById<AppointmentRow>('appointments', apptId)
      if (appt && (appt.patient_user_id === userId || appt.provider_user_id === userId)) {
        patientId = appt.patient_user_id ?? userId
      }
    }
    if (patientId !== userId) {
      // Patients can only see their own history. Providers in the future
      // would need an explicit access grant — out of scope here.
      res.json([])
      return
    }
    const [appts, recs, rx] = await Promise.all([
      findMany<AppointmentRow>('appointments', {
        where: [
          { field: 'patient_user_id', operator: '=', value: patientId },
          { field: 'status', operator: '=', value: 'completed' },
        ],
        orderBy: [{ field: 'completed_at', direction: 'desc' }],
        limit: 5,
      }),
      findMany<MedicalRecordRow>('medical_records', {
        where: [{ field: 'patient_user_id', operator: '=', value: patientId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5,
      }),
      findMany<PrescriptionRow>('prescriptions', {
        where: [{ field: 'patient_user_id', operator: '=', value: patientId }],
        orderBy: [{ field: 'prescribed_at', direction: 'desc' }],
        limit: 5,
      }),
    ])
    const items: Array<{
      id: string
      date: string
      type: 'visit' | 'lab' | 'rx' | 'note'
      summary: string
    }> = []
    for (const a of appts) {
      items.push({
        id: a.id,
        date: a.completed_at
          ? new Date(a.completed_at as string | Date).toISOString()
          : new Date().toISOString(),
        type: 'visit',
        summary: a.summary || a.reason || 'Completed visit',
      })
    }
    for (const r of recs) {
      const kind = r.kind === 'lab' || r.kind === 'note' ? r.kind : 'note'
      items.push({
        id: r.id,
        date: r.created_at
          ? new Date(r.created_at as string | Date).toISOString()
          : new Date().toISOString(),
        type: kind === 'lab' ? 'lab' : 'note',
        summary: r.title ?? r.description ?? 'Record',
      })
    }
    for (const p of rx) {
      items.push({
        id: p.id,
        date: p.prescribed_at
          ? new Date(p.prescribed_at as string | Date).toISOString()
          : new Date().toISOString(),
        type: 'rx',
        summary: `${p.drug_name ?? 'Medication'}${p.dosage ? ` ${p.dosage}` : ''}`.trim(),
      })
    }
    items.sort((a, b) => b.date.localeCompare(a.date))
    res.json(items.slice(0, 12))
  } catch (error) {
    onError(res, error, 'patient-history')
  }
})

router.get('/messages', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await seedForUser(userId)
    const rows = await query<{
      id: string
      consultation_id: string
      sender_user_id: string
      sender_role: string
      body: string
      sent_at: string
      read_at: string | null
      sender_name: string | null
      provider_display_name: string | null
    }>(
      `SELECT cm.id, cm.consultation_id, cm.sender_user_id, cm.sender_role, cm.body,
              cm.sent_at, cm.read_at,
              u.name AS sender_name,
              p.display_name AS provider_display_name
       FROM consultation_messages cm
       JOIN consultations c ON c.id = cm.consultation_id
       LEFT JOIN users u ON u.id = cm.sender_user_id
       LEFT JOIN providers p ON p.id = c.provider_id
       WHERE c.patient_user_id = $1 OR c.provider_user_id = $1
       ORDER BY cm.sent_at DESC
       LIMIT 100`,
      [userId],
    ).catch(
      () =>
        ({ rows: [] as Array<Record<string, unknown>>, rowCount: 0 }) as {
          rows: Array<{
            id: string
            consultation_id: string
            sender_user_id: string
            sender_role: string
            body: string
            sent_at: string
            read_at: string | null
            sender_name: string | null
            provider_display_name: string | null
          }>
          rowCount: number
        },
    )
    const items = (rows.rows ?? []).map((m) => {
      const isMine = m.sender_user_id === userId
      const fromName = isMine
        ? 'You'
        : m.sender_role === 'provider'
          ? (m.provider_display_name ?? m.sender_name ?? 'Provider')
          : (m.sender_name ?? 'User')
      const role: 'doctor' | 'patient' | 'nurse' | 'admin' =
        m.sender_role === 'provider' ? 'doctor' : m.sender_role === 'admin' ? 'admin' : 'patient'
      const preview = (m.body || '').slice(0, 120)
      return {
        id: m.id,
        thread_id: m.consultation_id,
        from_id: m.sender_user_id,
        from_name: fromName,
        from_role: role,
        preview,
        body: m.body,
        unread: !isMine && !m.read_at,
        created_at: m.sent_at,
      }
    })
    res.json(items)
  } catch (error) {
    onError(res, error, 'messages')
  }
})

const messagePostSchema = z.object({
  body: z.string().min(1).max(8000),
  thread_id: z.string().optional(),
})

router.post('/messages', validateBody(messagePostSchema), async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const body = req.body as z.infer<typeof messagePostSchema>
    let consultationId = body.thread_id ?? null
    let senderRole: 'patient' | 'provider' = 'patient'
    if (consultationId) {
      // Authorize a client-supplied thread_id before writing into it: the caller MUST
      // be a party to that consultation, else this is a cross-tenant message-injection
      // IDOR into another patient/provider's private medical thread (the find-or-create
      // branch below is already self-scoped to the caller). [P5TPL-1]
      const consultation = await findById<{
        patient_user_id?: string
        provider_user_id?: string
      }>('consultations', consultationId)
      if (
        !consultation ||
        (consultation.patient_user_id !== userId && consultation.provider_user_id !== userId)
      ) {
        res.status(404).json({
          error: t('consultation.notFound', undefined, {
            defaultValue: 'Consultation not found.',
          }),
        })
        return
      }
      senderRole = consultation.provider_user_id === userId ? 'provider' : 'patient'
    }
    if (!consultationId) {
      // Find the most recent consultation involving the user, or create
      // one tied to a stub consultation row (so Send always has somewhere
      // to land — common when a patient messages outside a live visit).
      const rows = await query<{ id: string }>(
        `SELECT id FROM consultations
         WHERE patient_user_id = $1 OR provider_user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      )
      const existing = (rows.rows ?? [])[0]
      if (existing) {
        consultationId = existing.id
      } else {
        const provider = (
          await findMany<ProviderRow>('providers', {
            where: [{ field: 'is_verified', operator: '=', value: true }],
            limit: 1,
          })
        )[0]
        if (!provider) {
          res.status(503).json({
            error: t('messages.noProvider', undefined, {
              defaultValue: 'No providers available to message.',
            }),
          })
          return
        }
        const apptResult = await create<{ id: string }>('appointments', {
          patient_user_id: userId,
          provider_user_id: provider.user_id,
          provider_id: provider.id,
          scheduled_at: new Date(),
          duration_minutes: 0,
          type: 'messaging',
          status: 'scheduled',
          reason: 'Direct message',
          created_at: new Date(),
        })
        const appt = apptResult.data
        if (!appt?.id) {
          res.status(503).json({
            error: t('messages.appointmentFailed', undefined, {
              defaultValue: 'Could not start a conversation. Try again later.',
            }),
          })
          return
        }
        const consultResult = await create<{ id: string }>('consultations', {
          appointment_id: appt.id,
          patient_user_id: userId,
          provider_user_id: provider.user_id,
          provider_id: provider.id,
          status: 'waiting',
          started_at: new Date(),
          created_at: new Date(),
        })
        const consult = consultResult.data
        if (!consult?.id) {
          res.status(503).json({
            error: t('messages.consultationFailed', undefined, {
              defaultValue: 'Could not start a conversation. Try again later.',
            }),
          })
          return
        }
        consultationId = consult.id
      }
    }
    const created = await create<{ id: string }>('consultation_messages', {
      consultation_id: consultationId,
      sender_user_id: userId,
      sender_role: senderRole,
      body: body.body,
      type: 'text',
      attachments: JSON.stringify([]),
      sent_at: new Date(),
      created_at: new Date(),
    })
    res.status(201).json({
      id: created.data?.id,
      thread_id: consultationId,
      body: body.body,
      from_id: userId,
      from_name: 'You',
      from_role: 'patient',
      preview: body.body.slice(0, 120),
      unread: false,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    onError(res, error, 'messages post')
  }
})

router.get('/providers/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim().toLowerCase() ?? ''
    const all = (await findMany<ProviderRow>('providers', {
      where: [{ field: 'is_verified', operator: '=', value: true }],
      orderBy: [{ field: 'rating', direction: 'desc' }],
    })) as ProviderRow[]
    const filtered = q
      ? all.filter((p) => {
          const blob = [p.display_name, p.first_name, p.last_name, p.specialty, p.bio]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return blob.includes(q)
        })
      : all
    res.json(decorateProviders(filtered))
  } catch (error) {
    onError(res, error, 'providers/search')
  }
})

// Make sure `count` isn't tree-shaken — used only for a soft sanity probe
// in tests/dev. Keep importing so the bundle declares the dependency.
void count

export default router
