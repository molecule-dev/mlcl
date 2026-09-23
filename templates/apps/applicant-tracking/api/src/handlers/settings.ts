import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface EmailTemplate {
  id: string
  name: string
}

interface Integration {
  id: string
  name: string
  status: 'connected' | 'disconnected'
}

interface PipelineStage {
  id: string
  name: string
  position: number
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
  oauthData?: Record<string, unknown> | null
}

interface ApplicantTrackingSettings {
  team_invites?: TeamMember[]
  integrations?: Integration[]
  pipeline_stages?: PipelineStage[]
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  { id: 'application_received', name: 'Application received' },
  { id: 'interview_invite', name: 'Interview invite' },
  { id: 'offer_letter', name: 'Offer letter' },
  { id: 'rejection_polite', name: 'Polite rejection' },
  { id: 'rejection_fit', name: 'Rejection — fit' },
]

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'linkedin', name: 'LinkedIn', status: 'connected' },
  { id: 'google_calendar', name: 'Google Calendar', status: 'connected' },
  { id: 'zoom', name: 'Zoom', status: 'connected' },
  { id: 'greenhouse', name: 'Greenhouse', status: 'disconnected' },
  { id: 'slack', name: 'Slack', status: 'disconnected' },
]

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'sourced', name: 'Sourced', position: 1 },
  { id: 'screening', name: 'Screening', position: 2 },
  { id: 'interview', name: 'Interview', position: 3 },
  { id: 'offer', name: 'Offer', position: 4 },
  { id: 'hired', name: 'Hired', position: 5 },
  { id: 'rejected', name: 'Rejected', position: 6 },
]

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
}

async function loadSettings(
  userId: string,
): Promise<{ user: UserRow; settings: ApplicantTrackingSettings }> {
  const user = await findById<UserRow>('users', userId)
  if (!user) throw new Error('user_not_found')
  const stored = (user.oauthData?.applicant_tracking_settings ??
    null) as ApplicantTrackingSettings | null
  return { user, settings: stored && typeof stored === 'object' ? stored : {} }
}

async function saveSettings(user: UserRow, settings: ApplicantTrackingSettings): Promise<void> {
  const oauthData = { ...(user.oauthData ?? {}), applicant_tracking_settings: settings }
  await updateById('users', user.id, { oauthData })
}

function ownerMember(user: UserRow): TeamMember {
  return {
    id: `${user.id}:owner`,
    name: user.name ?? t('settings.team.ownerName', {}, { defaultValue: 'Account owner' }),
    email: user.email ?? t('settings.team.ownerEmail', {}, { defaultValue: 'owner@your-domain' }),
    role: t('settings.team.ownerRole', {}, { defaultValue: 'Recruiter (Owner)' }),
  }
}

router.get('/team', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { user, settings } = await loadSettings(userId)
    res.json([ownerMember(user), ...(settings.team_invites ?? [])])
  } catch (err) {
    logger.error('settings.team_get_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/team/invite', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const role = typeof req.body?.role === 'string' ? req.body.role : 'recruiter'
    const email =
      typeof req.body?.email === 'string' && req.body.email.trim()
        ? req.body.email.trim()
        : t('settings.team.pendingEmail', {}, { defaultValue: 'invite@pending' })
    const name =
      typeof req.body?.name === 'string' && req.body.name.trim()
        ? req.body.name.trim()
        : t('settings.team.pendingName', {}, { defaultValue: 'Pending invite' })
    const member: TeamMember = {
      id: `${userId}:invite-${Date.now()}`,
      name,
      email,
      role,
    }
    const { user, settings } = await loadSettings(userId)
    const next: ApplicantTrackingSettings = {
      ...settings,
      team_invites: [...(settings.team_invites ?? []), member],
    }
    await saveSettings(user, next)
    res.status(201).json(member)
  } catch (err) {
    logger.error('settings.team_invite_failed', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/team/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { user, settings } = await loadSettings(userId)
    const next: ApplicantTrackingSettings = {
      ...settings,
      team_invites: (settings.team_invites ?? []).filter((m) => m.id !== req.params.id),
    }
    await saveSettings(user, next)
    res.status(204).end()
  } catch (err) {
    logger.error('settings.team_remove_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/email-templates', (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return unauthorized(res)
  res.json(DEFAULT_EMAIL_TEMPLATES)
})

router.get('/integrations', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { settings } = await loadSettings(userId)
    res.json(settings.integrations ?? DEFAULT_INTEGRATIONS.map((i) => ({ ...i })))
  } catch (err) {
    logger.error('settings.integrations_get_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { user, settings } = await loadSettings(userId)
    const list = settings.integrations ?? DEFAULT_INTEGRATIONS.map((i) => ({ ...i }))
    const idx = list.findIndex((i) => i.id === req.params.id)
    if (idx < 0)
      return res.status(404).json({
        error: t('settings.integrations.notFound', {}, { defaultValue: 'Integration not found' }),
      })
    const status = req.body?.status === 'connected' ? 'connected' : 'disconnected'
    list[idx] = { ...list[idx], status }
    await saveSettings(user, { ...settings, integrations: list })
    res.json(list[idx])
  } catch (err) {
    logger.error('settings.integrations_update_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/pipeline-stages', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { settings } = await loadSettings(userId)
    res.json(settings.pipeline_stages ?? DEFAULT_STAGES.map((s) => ({ ...s })))
  } catch (err) {
    logger.error('settings.stages_get_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/pipeline-stages/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { user, settings } = await loadSettings(userId)
    const list = settings.pipeline_stages ?? DEFAULT_STAGES.map((s) => ({ ...s }))
    await saveSettings(user, {
      ...settings,
      pipeline_stages: list.filter((s) => s.id !== req.params.id),
    })
    res.status(204).end()
  } catch (err) {
    logger.error('settings.stages_delete_failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
