import { beforeEach, describe, expect, it, vi } from 'vitest'

// project_members.role (owner/admin/member/viewer) was stored but the authorization layer only
// checked membership, so a *viewer* could create/edit/delete tasks and milestones. projectIfWritable
// now grants write access to the owner + writable-role members (owner/admin/member) and rejects
// viewers, while projectIfAccessible (reads) still admits any member.

const db = { findById: vi.fn(), findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))

import { projectIfAccessible, projectIfWritable } from '../handlers/_ownership.js'

const project = { id: 'p1', owner_id: 'owner-1' }

beforeEach(() => vi.clearAllMocks())

describe('projectIfWritable enforces the member role', () => {
  it('grants write to the project owner', async () => {
    db.findById.mockResolvedValue(project)
    expect(await projectIfWritable('owner-1', 'p1')).toEqual(project)
    expect(db.findMany).not.toHaveBeenCalled()
  })

  for (const role of ['admin', 'member', 'owner']) {
    it(`grants write to a ${role} member`, async () => {
      db.findById.mockResolvedValue(project)
      db.findMany.mockResolvedValue([{ project_id: 'p1', user_id: 'u2', role }])
      expect(await projectIfWritable('u2', 'p1')).toEqual(project)
    })
  }

  it('REJECTS a viewer member (read-only)', async () => {
    db.findById.mockResolvedValue(project)
    db.findMany.mockResolvedValue([{ project_id: 'p1', user_id: 'u2', role: 'viewer' }])
    expect(await projectIfWritable('u2', 'p1')).toBeNull()
  })

  it('rejects a non-member', async () => {
    db.findById.mockResolvedValue(project)
    db.findMany.mockResolvedValue([])
    expect(await projectIfWritable('u3', 'p1')).toBeNull()
  })
})

describe('projectIfAccessible still admits a viewer for reads', () => {
  it('grants read access to a viewer member', async () => {
    db.findById.mockResolvedValue(project)
    db.findMany.mockResolvedValue([{ project_id: 'p1', user_id: 'u2', role: 'viewer' }])
    expect(await projectIfAccessible('u2', 'p1')).toEqual(project)
  })
})
