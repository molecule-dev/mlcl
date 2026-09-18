import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test.describe('/notifications (Notifications)', () => {
  test('Notifications page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page).toHaveURL(/\/notifications/)
    await expect(page.getByRole('heading', { name: /^notifications$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Empty placeholder shown for fresh user with no notifications', async ({ page }) => {
    await signup(page)
    const list = await api<unknown[]>(page, 'GET', '/notifications')
    expect(list.length, 'fresh user has zero notifications').toBe(0)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/no notifications/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Seeded notifications render as feed items', async ({ page }) => {
    await signup(page)
    await api(page, 'POST', '/notifications', {
      kind: 'dose_due',
      title: 'Take 8 AM dose',
      body: 'Lisinopril 10 mg',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/take 8 am dose/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Mark all read POSTs /notifications/:id/read for every unread row', async ({ page }) => {
    await signup(page)
    const a = await api<{ id: string }>(page, 'POST', '/notifications', {
      kind: 'refill_warning',
      title: 'Refill soon',
      body: 'Atorvastatin',
    })
    const b = await api<{ id: string }>(page, 'POST', '/notifications', {
      kind: 'dose_missed',
      title: 'Missed dose',
      body: 'Metformin',
    })
    await page.goto(APP_BASE + '/notifications')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /mark all read/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const reads = reqs.filter(
      (r) => /\/api\/notifications\/[^/]+\/read/.test(r.url) && r.method === 'POST',
    )
    expect(reads.length, 'one POST /notifications/:id/read per unread row').toBeGreaterThanOrEqual(
      2,
    )
    const after = await api<Array<{ id: string; read: boolean }>>(page, 'GET', '/notifications')
    const aRow = after.find((n) => n.id === a.id)
    const bRow = after.find((n) => n.id === b.id)
    expect(aRow?.read, 'notif A marked read').toBe(true)
    expect(bRow?.read, 'notif B marked read').toBe(true)
  })

  test('GET /api/notifications/:id returns one row (auth-scoped)', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/notifications', {
      kind: 'system_message',
      title: 'Welcome',
      body: 'You are signed up',
    })
    const fetched = await api<{ id: string }>(page, 'GET', `/notifications/${created.id}`)
    expect(fetched.id).toBe(created.id)
  })
})
