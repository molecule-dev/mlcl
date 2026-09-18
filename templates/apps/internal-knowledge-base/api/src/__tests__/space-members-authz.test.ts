/**
 * Regression test for [P5TPL-01] — cross-space IDOR in space-member deletion.
 *
 * The DELETE /spaces/:spaceId/members/:id handler authorizes the caller as an
 * admin of the *path* space, but the row removal must also be scoped to that
 * same space. Without the scope, a space-A admin can delete a member row that
 * belongs to space B simply by passing space B's member id (an IDOR).
 *
 * These tests drive the real Express router (with the real session-reading
 * `requireUser` helper) against a mocked DataStore so we observe the exact
 * find/delete calls the handler makes.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { findOne, deleteById } = vi.hoisted(() => ({
  findOne: vi.fn(),
  deleteById: vi.fn(async () => ({ data: null, affected: 1 })),
}))

vi.mock('@molecule/api-database', () => ({
  findOne,
  deleteById,
  findMany: vi.fn(async () => []),
  create: vi.fn(async () => ({ data: null, affected: 0 })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

// Valid uuids — the route param schemas reject non-uuid ids.
const SPACE_A = '11111111-1111-4111-8111-111111111111'
const SPACE_B = '22222222-2222-4222-8222-222222222222'
const ADMIN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MEMBER_IN_A = '33333333-3333-4333-8333-333333333333'
const MEMBER_IN_B = '44444444-4444-4444-8444-444444444444'

const spaces = [
  { id: SPACE_A, created_by_user_id: ADMIN_A },
  { id: SPACE_B, created_by_user_id: 'someone-else' },
]
const members = [
  { id: MEMBER_IN_A, space_id: SPACE_A, user_id: 'user-a', role: 'viewer', added_at: 'now' },
  { id: MEMBER_IN_B, space_id: SPACE_B, user_id: 'user-b', role: 'viewer', added_at: 'now' },
]

type Filter = { field: string; value: unknown }
const matchesAll = (row: Record<string, unknown>, filters: Filter[]) =>
  filters.every((f) => row[f.field] === f.value)

let server: Server
let baseUrl: string

beforeEach(async () => {
  findOne.mockImplementation(async (table: string, filters: Filter[]) => {
    if (table === 'spaces') return spaces.find((s) => matchesAll(s, filters)) ?? null
    if (table === 'space_members') return members.find((m) => matchesAll(m, filters)) ?? null
    return null
  })

  const { default: router } = await import('../handlers/space-members.js')
  const app = express()
  // Stand in for the auth middleware: ADMIN_A is the authenticated session.
  app.use((_req, res, next) => {
    res.locals.session = { userId: ADMIN_A }
    next()
  })
  app.use('/spaces/:spaceId/members', router)
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(async () => {
  vi.clearAllMocks()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('DELETE /spaces/:spaceId/members/:id authorization', () => {
  it('blocks a space-A admin from deleting a space-B member (cross-space IDOR) → 404, no deleteById', async () => {
    // Attacker is admin of SPACE_A, targets a member row that lives in SPACE_B.
    const res = await fetch(`${baseUrl}/spaces/${SPACE_A}/members/${MEMBER_IN_B}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(404)
    expect(deleteById).not.toHaveBeenCalled()
  })

  it('allows a same-space admin to delete a member of their own space → 204', async () => {
    const res = await fetch(`${baseUrl}/spaces/${SPACE_A}/members/${MEMBER_IN_A}`, {
      method: 'DELETE',
    })

    expect(res.status).toBe(204)
    expect(deleteById).toHaveBeenCalledTimes(1)
    expect(deleteById).toHaveBeenCalledWith('space_members', MEMBER_IN_A)
  })
})
