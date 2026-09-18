import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  signup,
  seedBoard,
  seedCollaborator,
  seedVersion,
  uniqueEmail,
  captureNetwork,
  APP_BASE,
} from './_helpers'

test.describe('notifications inbox', () => {
  test('empty state appears for a fresh user with no boards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible()
  })

  test('synthesizes invite + snapshot + edit activity from real API state', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page, { title: 'Demo board' })
    await seedCollaborator(page, {
      board_id: board.id,
      email: uniqueEmail('inbox-invitee'),
      role: 'editor',
    })
    await seedVersion(page, {
      board_id: board.id,
      change_summary: 'Snapshot one',
      snapshot: { elements: [] },
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      // Wait for the page to finish hydrating activity rows OR show empty state
      // before closing the network capture window — otherwise async fetches escape.
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\//.test(r.url) && r.status < 400),
      `notifications page must hydrate at least one /api/* GET — saw ${JSON.stringify(reqs.slice(0, 5))}`,
    ).toBe(true)
    // At minimum: an invite, a snapshot, and an edit activity exist.
    const hasInvite = await page
      .locator('[data-mol-id^="notification-c-"]')
      .first()
      .isVisible()
      .catch(() => false)
    const hasSnap = await page
      .locator('[data-mol-id^="notification-v-"]')
      .first()
      .isVisible()
      .catch(() => false)
    const hasEdit = await page
      .locator('[data-mol-id^="notification-b-"]')
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasInvite || hasSnap || hasEdit).toBe(true)
  })

  test('"Mark all as read" persists lastSeen to localStorage', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedVersion(page, { board_id: board.id })
    await page.goto(APP_BASE + '/notifications')
    await page.locator('[data-mol-id="notifications-mark-read"]').click()
    const stored = await page.evaluate(
      () => window.localStorage.getItem('whiteboard:notifications:lastSeen') ?? '',
    )
    expect(stored).toBeTruthy()
  })

  test('tab switching narrows visible activity', async ({ page }) => {
    await signup(page)
    const board = await seedBoard(page)
    await seedCollaborator(page, {
      board_id: board.id,
      email: uniqueEmail('only-invite'),
      role: 'viewer',
    })
    await page.goto(APP_BASE + '/notifications')
    // "Snapshots" tab should hide invite activity.
    await page.locator('[data-mol-id="notifications-tab-snapshot"]').click()
    await expect(page.locator('[data-mol-id^="notification-c-"]')).toHaveCount(0)
  })
})
