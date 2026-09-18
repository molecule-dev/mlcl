/**
 * Whiteboard persistence outcome tests.
 *
 * The host of the seed room is allowed to draw. Strokes go to a
 * `whiteboards` row and must survive a reload.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { api, signup } from './_helpers.js'

interface RoomRow {
  id: string
}
interface WhiteboardResponse {
  id: string
  strokes: Array<{ id: string; points: { x: number; y: number }[] }>
}
interface DashboardBundle {
  upcomingRoom: RoomRow | null
  upcomingRooms: RoomRow[]
}

test('POST /whiteboard/room/:roomId/stroke persists strokes across read', async ({ page }) => {
  await signup(page)
  const bundle = await api<DashboardBundle>(page, 'GET', '/me/dashboard')
  const room = bundle.upcomingRoom ?? bundle.upcomingRooms[0]
  if (!room) throw new Error('seed missing room')

  // Initial read — lazily creates the whiteboard row.
  const board0 = await api<WhiteboardResponse>(page, 'GET', `/whiteboard/room/${room.id}`)
  expect(Array.isArray(board0.strokes)).toBe(true)
  const initialCount = board0.strokes.length

  await api(page, 'POST', `/whiteboard/room/${room.id}/stroke`, {
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
    color: '#ff0000',
    width: 2,
  })

  const board1 = await api<WhiteboardResponse>(page, 'GET', `/whiteboard/room/${room.id}`)
  expect(board1.strokes.length, 'stroke persisted').toBe(initialCount + 1)
  const last = board1.strokes[board1.strokes.length - 1]
  expect(last.points).toEqual([
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ])
})

test('POST /whiteboard/room/:roomId/clear empties the strokes array', async ({ page }) => {
  await signup(page)
  const bundle = await api<DashboardBundle>(page, 'GET', '/me/dashboard')
  const room = bundle.upcomingRoom ?? bundle.upcomingRooms[0]
  if (!room) throw new Error('seed missing room')

  await api(page, 'POST', `/whiteboard/room/${room.id}/stroke`, {
    points: [{ x: 5, y: 6 }],
  })
  await api(page, 'POST', `/whiteboard/room/${room.id}/clear`)
  const board = await api<WhiteboardResponse>(page, 'GET', `/whiteboard/room/${room.id}`)
  expect(board.strokes).toEqual([])
})
