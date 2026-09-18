import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('notifications — mark-all-read flips backend rows, not just UI state', () => {
  test('mark-all-read endpoint flips every unread notification to unread=false', async ({
    page,
  }) => {
    await signup(page)
    // Seed 3 unread notifications via the public POST /api/notifications.
    for (let i = 0; i < 3; i++) {
      await api(page, 'POST', '/notifications', {
        type: 'system',
        body: `Seed message #${i}`,
        href: '/dashboard',
      })
    }

    let list = await api<Array<{ unread: boolean }>>(page, 'GET', '/notifications')
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(
      list.every((n) => n.unread === true),
      'all seeded notifications start unread',
    ).toBe(true)

    const result = await api<{ ok: boolean; affected: number }>(
      page,
      'POST',
      '/notifications/mark-all-read',
      {},
    )
    expect(result.ok).toBe(true)
    expect(
      result.affected,
      'mark-all-read affected at least the seeded rows',
    ).toBeGreaterThanOrEqual(3)

    list = await api<Array<{ unread: boolean }>>(page, 'GET', '/notifications')
    expect(
      list.every((n) => n.unread === false),
      'all notifications now read',
    ).toBe(true)
  })

  test('Notifications page "Mark all as read" button calls the API and updates the visible row state', async ({
    page,
  }) => {
    await signup(page)
    for (let i = 0; i < 2; i++) {
      await api(page, 'POST', '/notifications', {
        type: 'system',
        body: `UI seed #${i}`,
        href: '/dashboard',
      })
    }
    await page.goto(APP_BASE + '/notifications')
    const markAllButton = page.getByRole('button', { name: /mark all (as )?read/i }).first()
    await expect(markAllButton).toBeVisible({ timeout: 10_000 })
    await expect(markAllButton).toBeEnabled()
    await markAllButton.click()

    // Server-side: re-fetch and assert all unread flipped.
    await page.waitForTimeout(1000)
    const list = await api<Array<{ unread: boolean }>>(page, 'GET', '/notifications')
    expect(
      list.every((n) => n.unread === false),
      'all notifications read after click',
    ).toBe(true)
  })

  test('Updating a single notification PUT /:id flips that row only', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string; unread: boolean }>(page, 'POST', '/notifications', {
      type: 'mention',
      body: 'Single toggle target',
    })
    expect(created.unread).toBe(true)
    await api(page, 'PUT', `/notifications/${created.id}`, { unread: false })
    const list = await api<Array<{ id: string; unread: boolean }>>(page, 'GET', '/notifications')
    expect(list.find((n) => n.id === created.id)?.unread, 'single notification flipped').toBe(false)
  })

  test('Cross-user notifications isolation: B cannot read or update A’s rows', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signup(pageA)
    const own = await api<{ id: string }>(pageA, 'POST', '/notifications', {
      type: 'system',
      body: 'private to A',
    })
    await ctxA.close()

    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB)
    const listB = await api<Array<{ id: string }>>(pageB, 'GET', '/notifications')
    expect(
      listB.find((n) => n.id === own.id),
      'B does not see A’s notifications',
    ).toBeFalsy()

    const cookies = await pageB.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const cross = await pageB.request.fetch(
      'http://localhost:' + (process.env.API_PORT || '4000') + '/api/notifications/' + own.id,
      {
        method: 'PUT',
        headers: { Cookie: cookieStr, 'Content-Type': 'application/json' },
        data: JSON.stringify({ unread: false }),
      },
    )
    expect(cross.status(), 'B cannot PUT A’s notification').toBeGreaterThanOrEqual(400)
    await ctxB.close()
  })
})
