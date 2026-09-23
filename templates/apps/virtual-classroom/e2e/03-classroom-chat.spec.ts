/**
 * Classroom + chat persistence outcome tests.
 *
 * The seed room auto-created on signup is the host's room, so the
 * authenticated user is already a "room member" via host_id. We can
 * post chat messages, reload, and assert the messages persist via
 * the GET /chat/room/:roomId endpoint.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

interface RoomRow {
  id: string
  name: string
  status: string
  host_id: string
  course_id: string | null
}
interface ChatMessageRow {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
}
interface DashboardBundle {
  upcomingRoom: RoomRow | null
  upcomingRooms: RoomRow[]
}

async function seedRoom(page: import('@playwright/test').Page): Promise<RoomRow> {
  const bundle = await api<DashboardBundle>(page, 'GET', '/me/dashboard')
  const room = bundle.upcomingRoom ?? bundle.upcomingRooms[0]
  if (!room) throw new Error('seed did not create an upcoming room')
  return room
}

test('GET /rooms/:id returns the seeded host room', async ({ page }) => {
  await signup(page)
  const room = await seedRoom(page)
  const fetched = await api<RoomRow>(page, 'GET', `/rooms/${room.id}`)
  expect(fetched.id).toBe(room.id)
  expect(fetched.host_id).toBeTruthy()
})

test('POST /chat persists messages across reloads', async ({ page }) => {
  await signup(page)
  const room = await seedRoom(page)
  const content = `e2e chat ${Date.now()}`
  const created = await api<ChatMessageRow>(page, 'POST', '/chat', {
    room_id: room.id,
    content,
  })
  expect(created.content).toBe(content)
  expect(created.room_id).toBe(room.id)
  const after = await api<ChatMessageRow[]>(page, 'GET', `/chat/room/${room.id}`)
  expect(
    after.find((m) => m.id === created.id),
    'posted message in transcript',
  ).toBeTruthy()
})

test('Classroom UI loads the seeded room without crashing', async ({ page }) => {
  await signup(page)
  const room = await seedRoom(page)
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(APP_BASE + `/class/${room.id}`, { waitUntil: 'networkidle' })
  // chat input is the only on-page text input under the panel
  await expect(page.locator('input[type=text], textarea').first()).toBeVisible({ timeout: 10000 })
  expect(
    errs.filter((e) => !/favicon/i.test(e)),
    'no page errors on classroom',
  ).toEqual([])
})

test('Sending a chat message via the UI shows up after reload', async ({ page }) => {
  await signup(page)
  const room = await seedRoom(page)
  await page.goto(APP_BASE + `/class/${room.id}`, { waitUntil: 'networkidle' })
  const content = `ui-msg-${Date.now()}`
  // Find the chat input — the only text input in the chat panel
  const input = page.locator('input[type=text], input:not([type]), textarea').last()
  await input.fill(content)
  // Arm the POST wait BEFORE clicking so a fast round-trip can't be missed
  // (create→readback race: asserting only after the click left this test
  // reading the transcript before the POST had landed under load).
  const postResponse = page.waitForResponse(
    (r) => /\/api\/chat(\?|$)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 20000 },
  )
  // Click the send button (Material Symbols icon "send")
  await page
    .locator('button')
    .filter({ has: page.locator('text=send') })
    .first()
    .click()
  const resp = await postResponse
  expect(resp.status(), `POST /api/chat → ${resp.status()}`).toBeLessThan(400)
  // Poll (not a one-shot read) so a slow write→read path can't false-fail.
  await expect
    .poll(async () => {
      const transcript = await api<ChatMessageRow[]>(page, 'GET', `/chat/room/${room.id}`)
      return transcript.some((m) => m.content === content)
    })
    .toBe(true)
})
