import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiSignup, authedApi, createProject, addTrack } from './_helpers.js'

/**
 * API-level coverage for backend handlers that are not yet surfaced in the UI
 * (collaborators, effects, exports, instruments, midi_notes underscore route).
 *
 * These endpoints exist as part of the music-daw domain — they need to behave
 * correctly today so future UI work can build on a tested foundation. Each
 * test asserts real CRUD outcomes against the actual database (no mocks).
 */
test.describe('API handler coverage (no UI yet)', () => {
  test('GET /api/instruments returns the built-in library for an authed user', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const res = await api.get('/instruments')
    expect(res.ok(), `GET /api/instruments must succeed: ${res.status()}`).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body), 'instruments returned as array').toBe(true)
    // Library presets are seeded with NULL user_id; even a brand-new user must see them.
    expect(body.length, 'library presets are seeded and visible').toBeGreaterThan(0)
    for (const row of body as Array<Record<string, unknown>>) {
      expect(row.id, 'instrument has id').toBeTruthy()
      expect(row.name, 'instrument has name').toBeTruthy()
    }
  })

  test('POST /api/instruments creates a user-owned preset and GET shows union of library + own', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const baseline = (await (await api.get('/instruments')).json()) as Array<{ id: string }>
    const baselineCount = baseline.length

    const created = await api.post('/instruments', {
      name: `Test Synth ${Date.now()}`,
      category: 'synth',
      type: 'oscillator',
      settings: { osc: 'saw' },
    })
    expect(created.status(), 'POST instruments returns 201').toBe(201)
    const createdRow = (await created.json()) as { id: string }
    expect(createdRow.id, 'created instrument has id').toBeTruthy()

    const after = (await (await api.get('/instruments')).json()) as Array<{ id: string }>
    expect(after.length, 'list grew by exactly one row').toBe(baselineCount + 1)
    expect(
      after.some((r) => r.id === createdRow.id),
      'new preset appears in list',
    ).toBe(true)
  })

  test('GET /api/instruments without auth returns 401', async ({ request }) => {
    const res = await request.get(API_BASE + '/instruments')
    expect(res.status(), 'unauthenticated reads are rejected').toBe(401)
  })

  test('POST /api/effects creates an effect for a track and GET filters by track_id', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'FX Bus',
      type: 'audio',
    })

    const created = await api.post('/effects', {
      track_id: track.id,
      type: 'reverb',
      parameters: { wet: 0.4, decay: 2.5 },
      position: 0,
    })
    expect(created.status(), 'POST /api/effects returns 201').toBe(201)
    const fx = (await created.json()) as { id: string; track_id: string; enabled?: boolean }
    expect(fx.id, 'effect has id').toBeTruthy()
    expect(fx.track_id, 'effect track_id matches').toBe(track.id)

    const list = await api.get(`/effects?track_id=${track.id}`)
    expect(list.ok(), `GET /api/effects must succeed: ${list.status()}`).toBe(true)
    const items = (await list.json()) as Array<{ id: string }>
    expect(
      items.find((r) => r.id === fx.id),
      'created effect appears in track-scoped list',
    ).toBeTruthy()
  })

  test('PUT /api/effects/:id toggles enabled and persists', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, { name: 'FX2', type: 'audio' })
    const fx = (await (
      await api.post('/effects', {
        track_id: track.id,
        type: 'delay',
        parameters: {},
        position: 1,
      })
    ).json()) as { id: string }

    const upd = await api.put(`/effects/${fx.id}`, { enabled: false })
    expect(upd.ok(), 'PUT effect returns 2xx').toBe(true)

    const after = (await (await api.get(`/effects?track_id=${track.id}`)).json()) as Array<{
      id: string
      enabled?: boolean
    }>
    const stored = after.find((r) => r.id === fx.id)
    expect(stored, 'effect still listed after update').toBeTruthy()
    expect(stored!.enabled, 'enabled flag persisted as false').toBe(false)
  })

  test('DELETE /api/effects/:id removes the effect (read-after-delete)', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, { name: 'FX3', type: 'audio' })
    const fx = (await (
      await api.post('/effects', {
        track_id: track.id,
        type: 'eq',
        parameters: {},
        position: 0,
      })
    ).json()) as { id: string }

    const del = await api.delete(`/effects/${fx.id}`)
    expect(del.status(), 'DELETE returns 204').toBe(204)

    const after = (await (await api.get(`/effects?track_id=${track.id}`)).json()) as Array<{
      id: string
    }>
    expect(
      after.find((r) => r.id === fx.id),
      'effect gone from list',
    ).toBeFalsy()
  })

  test('POST /api/exports records a render job for the project', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)

    const created = await api.post('/exports', {
      project_id: proj.id,
      format: 'wav',
      quality: 'high',
      sample_rate: 48000,
    })
    expect(created.status(), 'POST /api/exports returns 201').toBe(201)
    const job = (await created.json()) as {
      id: string
      project_id: string
      status?: string
      format?: string
    }
    expect(job.id, 'export job has id').toBeTruthy()
    expect(job.project_id, 'export job tied to project').toBe(proj.id)
    expect(job.status, 'job status is recorded').toBeTruthy()
  })

  test('GET /api/exports?project_id= scopes to the user and project', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    await api.post('/exports', {
      project_id: proj.id,
      format: 'mp3',
      quality: 'medium',
      sample_rate: 44100,
    })

    const res = await api.get(`/exports?project_id=${proj.id}`)
    expect(res.ok(), 'GET exports returns 2xx').toBe(true)
    const items = (await res.json()) as Array<{ project_id: string }>
    expect(items.length, 'at least one export listed').toBeGreaterThanOrEqual(1)
    for (const row of items) expect(row.project_id, 'each row scoped to project').toBe(proj.id)
  })

  test('exports are isolated between users (cross-account read returns empty list)', async ({
    request,
  }) => {
    const a = await apiSignup(request)
    const apiA = authedApi(request, a.accessToken!)
    const projA = await createProject(request, a.accessToken!)
    await apiA.post('/exports', {
      project_id: projA.id,
      format: 'wav',
      quality: 'high',
      sample_rate: 44100,
    })

    const b = await apiSignup(request)
    const apiB = authedApi(request, b.accessToken!)
    const fromB = (await (
      await apiB.get(`/exports?project_id=${projA.id}`)
    ).json()) as Array<unknown>
    expect(fromB.length, "user B cannot see user A's exports").toBe(0)
  })

  test("GET /api/collaborators returns the inviter's pending invites", async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)

    const invited = await api.post('/collaborators', {
      project_id: proj.id,
      invitee_email: `pal-${Date.now()}@fugue.test`,
      role: 'editor',
    })
    expect(invited.status(), 'POST collaborator returns 201').toBe(201)
    const row = (await invited.json()) as { id: string; project_id: string; role: string }
    expect(row.project_id, 'collaborator on right project').toBe(proj.id)
    expect(row.role, 'role recorded').toBe('editor')

    const list = (await (await api.get(`/collaborators?project_id=${proj.id}`)).json()) as Array<{
      id: string
    }>
    expect(
      list.find((r) => r.id === row.id),
      'invite appears in list',
    ).toBeTruthy()
  })

  test('POST /api/collaborators rejects invites for projects the user does not own', async ({
    request,
  }) => {
    const owner = await apiSignup(request)
    const proj = await createProject(request, owner.accessToken!)

    const stranger = await apiSignup(request)
    const api = authedApi(request, stranger.accessToken!)
    const res = await api.post('/collaborators', {
      project_id: proj.id,
      invitee_email: 'noone@fugue.test',
      role: 'viewer',
    })
    expect(res.status(), 'cross-account invite refused').toBe(404)
  })

  test('DELETE /api/collaborators/:id removes the invite', async ({ request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    const invite = (await (
      await api.post('/collaborators', {
        project_id: proj.id,
        invitee_email: 'gone@fugue.test',
        role: 'viewer',
      })
    ).json()) as { id: string }

    const del = await api.delete(`/collaborators/${invite.id}`)
    expect(del.status(), 'DELETE returns 204').toBe(204)

    const list = (await (await api.get(`/collaborators?project_id=${proj.id}`)).json()) as Array<{
      id: string
    }>
    expect(
      list.find((r) => r.id === invite.id),
      'invite gone after delete',
    ).toBeFalsy()
  })

  test('the underscore alias /api/midi_notes still POSTs successfully (backwards compat)', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const proj = await createProject(request, u.accessToken!)
    const track = await addTrack(request, u.accessToken!, proj.id, {
      name: 'MIDI track',
      type: 'midi',
    })
    const clip = (await (
      await api.post('/clips', {
        track_id: track.id,
        name: 'C',
        start: 0,
        length: 4,
      })
    ).json()) as { id: string }

    const note = await api.post('/midi_notes', {
      clip_id: clip.id,
      pitch: 60,
      velocity: 100,
      start: 0,
      duration: 0.5,
    })
    expect(
      note.ok(),
      `POST /api/midi_notes (underscore alias) must succeed: ${note.status()}`,
    ).toBe(true)
    const row = (await note.json()) as { id: string; clip_id: string; pitch: number }
    expect(row.id, 'note has id').toBeTruthy()
    expect(row.clip_id, 'note tied to clip').toBe(clip.id)
    expect(row.pitch, 'pitch persisted').toBe(60)
  })
})
