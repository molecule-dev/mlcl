/**
 * /notifications — list scoped to the signed-in user, mark-as-read flips
 * read_at server-side, and other users' notifications never leak.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  seedNotification,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('notifications', () => {
  test('seeded notification appears on /notifications', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-list'))
    const { title } = await seedNotification(page, accessToken)

    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('mark-as-read flips read_at server-side', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-read'))
    const { id } = await seedNotification(page, accessToken)

    const markRead = await page.request.post(API_BASE + `/notifications/${id}/read`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(markRead.status()).toBeLessThan(400)

    const list = await page.request.get(API_BASE + '/notifications', {
      headers: authHeaders(accessToken),
    })
    const body = (await list.json()) as Array<{ id: string; read_at: string | null }>
    const found = body.find((n) => n.id === id)
    expect(found, 'notification should still be in the list').toBeTruthy()
    expect(found!.read_at, 'read_at must be populated after mark-read').toBeTruthy()
  })

  test('mark-all-read flips every notification for the current user', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('notif-readall'))
    await seedNotification(page, accessToken, 'one')
    await seedNotification(page, accessToken, 'two')

    const all = await page.request.post(API_BASE + '/notifications/read-all', {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(all.status()).toBeLessThan(400)

    const list = await page.request.get(API_BASE + '/notifications', {
      headers: authHeaders(accessToken),
    })
    const body = (await list.json()) as Array<{ read_at: string | null }>
    expect(body.length).toBeGreaterThanOrEqual(2)
    expect(body.every((n) => n.read_at)).toBe(true)
  })

  test('cross-tenant notifications never leak', async ({ page, browser }) => {
    const owner = await signup(page, uniqueEmail('notif-owner'))
    await seedNotification(page, owner.accessToken, `secret-${Date.now()}`)

    // Fresh context for the intruder — same-page re-signup hits /signup
    // while already authenticated and gets redirected away.
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    const intruder = await signup(pageB, uniqueEmail('notif-intruder'))
    const stolen = await pageB.request.get(API_BASE + '/notifications', {
      headers: authHeaders(intruder.accessToken),
    })
    const body = (await stolen.json()) as Array<{ title: string }>
    expect(body.every((n) => !n.title.startsWith('secret-'))).toBe(true)
    await ctxB.close()
  })
})
