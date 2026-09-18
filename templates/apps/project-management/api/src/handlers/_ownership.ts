/**
 * Per-user ownership helpers used by every project-scoped handler.
 *
 * Without these, GET /api/projects, GET /api/tasks, GET /api/milestones,
 * GET /api/members all return rows owned by anyone — a logged-in user
 * sees every other user's project/task/milestone, and PATCH/DELETE on
 * any of those ids succeed cross-user. The flagship is supposed to be
 * a tenant-isolated SaaS-style PM tool, so we enforce ownership at the
 * handler boundary.
 *
 * Membership rule: a user has access to a project if they own it
 * (`projects.owner_id = userId`) OR they sit in the project_members
 * table for it. Tasks and milestones inherit access from their project.
 *
 * @module
 */

import type { Response } from 'express'

import { findById, findMany } from '@molecule/api-database'

export interface ProjectRow {
  id: string
  owner_id: string
  user_id?: string
  name?: string
  status?: string
  created_at?: string
  updated_at?: string
}

interface MemberRow {
  project_id: string
  user_id: string
  role?: string
}

/**
 * Roles permitted to create/edit/delete project content. `viewer` is read-only — they can see the
 * project (via projectIfAccessible) but must not mutate tasks/milestones. Unknown roles are treated
 * as non-writable (fail closed). The project owner always writes regardless of any member row.
 */
const WRITABLE_ROLES = new Set(['owner', 'admin', 'member'])

interface TaskRow {
  id: string
  project_id: string
  created_by?: string
}

interface MilestoneRow {
  id: string
  project_id: string
}

export const getUserId = (res: Response): string | null =>
  (res.locals.session as { userId?: string } | undefined)?.userId ?? null

/**
 * Returns the set of project IDs the given user has access to,
 * combining direct ownership and project_members rows.
 */
export const accessibleProjectIds = async (userId: string): Promise<string[]> => {
  const owned = await findMany<ProjectRow>('projects', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
  })
  const memberships = await findMany<MemberRow>('project_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
  }).catch(() => [] as MemberRow[])
  const ids = new Set<string>()
  for (const p of owned) ids.add(p.id)
  for (const m of memberships) ids.add(m.project_id)
  return Array.from(ids)
}

/**
 * Returns the project row if the user has access (owner or member),
 * else null. Caller is responsible for issuing 404/403 to keep the
 * presence of other users' rows from leaking.
 */
export const projectIfAccessible = async (
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> => {
  const project = await findById<ProjectRow>('projects', projectId)
  if (!project) return null
  if (project.owner_id === userId) return project
  const memberships = await findMany<MemberRow>('project_members', {
    where: [
      { field: 'project_id', operator: '=', value: projectId },
      { field: 'user_id', operator: '=', value: userId },
    ],
  }).catch(() => [] as MemberRow[])
  return memberships.length > 0 ? project : null
}

/**
 * Returns the project row if the user may WRITE to it — the owner, or a member whose role is
 * writable (owner/admin/member). A `viewer` member gets read access via projectIfAccessible but is
 * rejected here, so viewers can't create/edit/delete tasks or milestones. Returns null otherwise.
 */
export const projectIfWritable = async (
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> => {
  const project = await findById<ProjectRow>('projects', projectId)
  if (!project) return null
  if (project.owner_id === userId) return project
  const memberships = await findMany<MemberRow>('project_members', {
    where: [
      { field: 'project_id', operator: '=', value: projectId },
      { field: 'user_id', operator: '=', value: userId },
    ],
  }).catch(() => [] as MemberRow[])
  const member = memberships[0]
  return member && WRITABLE_ROLES.has(String(member.role ?? 'member')) ? project : null
}

/** Same as projectIfAccessible but only owner counts. */
export const projectIfOwner = async (
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> => {
  const project = await findById<ProjectRow>('projects', projectId)
  if (!project) return null
  return project.owner_id === userId ? project : null
}

export const taskAccessible = async (
  userId: string,
  taskId: string,
): Promise<{ task: TaskRow; project: ProjectRow } | null> => {
  const task = await findById<TaskRow>('tasks', taskId)
  if (!task) return null
  const project = await projectIfAccessible(userId, task.project_id)
  if (!project) return null
  return { task, project }
}

/** Like taskAccessible but requires WRITE access on the task's project (viewers rejected). */
export const taskWritable = async (
  userId: string,
  taskId: string,
): Promise<{ task: TaskRow; project: ProjectRow } | null> => {
  const task = await findById<TaskRow>('tasks', taskId)
  if (!task) return null
  const project = await projectIfWritable(userId, task.project_id)
  if (!project) return null
  return { task, project }
}

export const milestoneAccessible = async (
  userId: string,
  milestoneId: string,
): Promise<{ milestone: MilestoneRow; project: ProjectRow } | null> => {
  const milestone = await findById<MilestoneRow>('milestones', milestoneId)
  if (!milestone) return null
  const project = await projectIfAccessible(userId, milestone.project_id)
  if (!project) return null
  return { milestone, project }
}

/** Like milestoneAccessible but requires WRITE access on the milestone's project (viewers rejected). */
export const milestoneWritable = async (
  userId: string,
  milestoneId: string,
): Promise<{ milestone: MilestoneRow; project: ProjectRow } | null> => {
  const milestone = await findById<MilestoneRow>('milestones', milestoneId)
  if (!milestone) return null
  const project = await projectIfWritable(userId, milestone.project_id)
  if (!project) return null
  return { milestone, project }
}
