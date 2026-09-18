/**
 * Team — list every collaborator across the user's projects, plus
 * pending invitations. Backed by `project_collaborators` joined to
 * `users` for human-readable names.
 *
 * The /team page is a roll-up across the user's owned projects: a
 * collaborator with editor access on three of those projects appears
 * once in the list with role=editor.
 *
 * Endpoints:
 * - GET   /team             — { members:[…], pending:[…] }
 * - POST  /team/invite      — invite a user to all projects (or a single one)
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const COLOR_PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']

function pickColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length]
}

async function userOwnsProject(userId: string, projectId: string): Promise<boolean> {
  const project = await findById<Record<string, unknown>>('projects', projectId)
  return Boolean(project && project.user_id === userId)
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  // Owner himself
  const userRow = (
    await findMany<Record<string, unknown>>('users', {
      where: [{ field: 'id', operator: '=', value: userId }],
      limit: 1,
    })
  )[0]

  // Get every project this user owns
  const projects = await findMany<Record<string, unknown>>('projects', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  })
  const projectIds = projects.map((p) => p.id as string)

  // All collaborator rows across owner's projects
  const collabRows = projectIds.length
    ? await findMany<Record<string, unknown>>('project_collaborators', {
        where: [{ field: 'project_id', operator: 'in', value: projectIds }],
      }).catch(() => [])
    : []

  // Bucket by collaborator user_id, count distinct projects, choose
  // the highest role (owner > admin > editor > viewer).
  const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, editor: 2, viewer: 1 }
  type Bucket = {
    userId: string
    role: string
    projects: Set<string>
    pending: boolean
    invitedAt?: Date | null
    acceptedAt?: Date | null
  }
  const byUser = new Map<string, Bucket>()
  for (const row of collabRows) {
    const cuid = String(row.user_id ?? '')
    if (!cuid) continue
    const existing = byUser.get(cuid) ?? {
      userId: cuid,
      role: 'viewer',
      projects: new Set<string>(),
      pending: true,
      invitedAt: row.invited_at as Date | null,
      acceptedAt: row.accepted_at as Date | null,
    }
    existing.projects.add(String(row.project_id))
    const r = String(row.role ?? 'viewer')
    if ((ROLE_RANK[r] ?? 0) > (ROLE_RANK[existing.role] ?? 0)) existing.role = r
    if (row.accepted_at) existing.pending = false
    if (row.invited_at && (!existing.invitedAt || row.invited_at > existing.invitedAt)) {
      existing.invitedAt = row.invited_at as Date
    }
    if (row.accepted_at && (!existing.acceptedAt || row.accepted_at > existing.acceptedAt)) {
      existing.acceptedAt = row.accepted_at as Date
    }
    byUser.set(cuid, existing)
  }

  // Hydrate with user details
  const collaboratorIds = [...byUser.keys()]
  const collaboratorUsers = collaboratorIds.length
    ? await findMany<Record<string, unknown>>('users', {
        where: [{ field: 'id', operator: 'in', value: collaboratorIds }],
      })
    : []
  const userById = new Map<string, Record<string, unknown>>(
    collaboratorUsers.map((u) => [String(u.id), u]),
  )

  const members = [
    {
      id: userId,
      name: (userRow?.name as string) ?? (userRow?.email as string) ?? 'Workspace owner',
      email: (userRow?.email as string) ?? null,
      role: 'owner',
      avatarColor: pickColor(userId),
      projectsShared: projectIds.length,
      online: true,
      joined: 'Founding member',
    },
    ...[...byUser.values()]
      .filter((b) => !b.pending)
      .map((b) => {
        const u = userById.get(b.userId)
        return {
          id: b.userId,
          name: (u?.name as string) ?? (u?.email as string) ?? 'Collaborator',
          email: (u?.email as string) ?? null,
          role: b.role,
          avatarColor: pickColor(b.userId),
          projectsShared: b.projects.size,
          online: false,
          joined: b.acceptedAt
            ? new Date(b.acceptedAt).toISOString().slice(0, 10)
            : 'Recently joined',
        }
      }),
  ]

  const pending = [...byUser.values()]
    .filter((b) => b.pending)
    .map((b) => {
      const u = userById.get(b.userId)
      return {
        id: b.userId,
        email: (u?.email as string) ?? b.userId,
        invitedBy: 'You',
        role: b.role,
        invitedAt: b.invitedAt ? new Date(b.invitedAt).toISOString() : null,
      }
    })

  const ownerCount = members.filter((m) => m.role === 'owner').length
  const adminCount = members.filter((m) => m.role === 'admin').length
  const editorCount = members.filter((m) => m.role === 'editor').length
  const viewerCount = members.filter((m) => m.role === 'viewer').length

  res.json({
    members,
    pending,
    stats: {
      members: members.length,
      pending: pending.length,
      online: members.filter((m) => m.online).length,
      seatsRemaining: Math.max(0, 10 - members.length),
      byRole: { owner: ownerCount, admin: adminCount, editor: editorCount, viewer: viewerCount },
    },
  })
})

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin']).default('editor'),
  projectId: z.string().optional(),
})

router.post('/invite', validateBody(inviteSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof inviteSchema>

  // Look up the invitee — if the email isn't registered we still
  // record a placeholder pending row keyed off a synthetic uuid so
  // the invite shows up under "pending" until the user signs up.
  const candidates = await findMany<Record<string, unknown>>('users', {
    where: [{ field: 'email', operator: '=', value: body.email }],
    limit: 1,
  })
  const inviteeId =
    (candidates[0]?.id as string | undefined) ?? '00000000-0000-0000-0000-000000000000'

  // Pick the project: explicit projectId wins, otherwise pick the
  // user's most-recently-updated project (so invites still land
  // somewhere sensible).
  let projectId = body.projectId
  if (!projectId) {
    const projects = await findMany<Record<string, unknown>>('projects', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 1,
    })
    projectId = projects[0]?.id as string | undefined
  }
  if (!projectId) {
    res.status(400).json({
      error: t(
        'team.noProjectsToInviteInto',
        {},
        {
          defaultValue: 'Create a project before inviting collaborators',
        },
      ),
    })
    return
  }

  // Ownership guard: the caller may only invite collaborators into a
  // project they own. The fallback path above already scopes to the
  // caller's own projects, so it always passes; this rejects only an
  // attacker-supplied cross-tenant `projectId`. 404 (not 403) so
  // project existence isn't probeable — consistent with collaborators.ts.
  if (!(await userOwnsProject(userId, projectId))) {
    res.status(404).json({
      error: t('projects.notFound', {}, { defaultValue: 'Project not found' }),
    })
    return
  }

  // Idempotent: if a row already exists for (project, invitee) just
  // return it; the unique index enforces this at the DB layer.
  try {
    const created = await create('project_collaborators', {
      project_id: projectId,
      user_id: inviteeId,
      role: body.role,
      invited_at: new Date(),
      accepted_at: null,
    })
    res.status(201).json({ ...(created.data as Record<string, unknown>), email: body.email })
  } catch (error) {
    // Most likely unique-constraint violation (duplicate invite); fall back to returning existing row
    logger.warn('team.invite.create', error)
    const existing = (
      await findMany<Record<string, unknown>>('project_collaborators', {
        where: [
          { field: 'project_id', operator: '=', value: projectId },
          { field: 'user_id', operator: '=', value: inviteeId },
        ],
        limit: 1,
      })
    )[0]
    if (existing) {
      res.status(200).json({ ...existing, email: body.email })
      return
    }
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
  // Suppress unused-variable warning in TS-strict mode for `query` import alias
  void query
})

export default router
