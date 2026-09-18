import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, authedApi, captureNetwork } from './_helpers.js'

test.describe('Availability', () => {
  test('default state shows Mon-Fri active when no rules exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/availability')
    await expect(page.getByRole('heading', { name: /availability/i })).toBeVisible()
    for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      await expect(page.getByTestId(`availability-row-${d}`)).toBeVisible()
    }
  })

  test('save persists rules — read-after-write succeeds', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/availability')
    await expect(page.getByTestId('availability-start-Mon')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('availability-start-Mon').fill('10:00')
    await page.getByTestId('availability-end-Mon').fill('15:00')
    await page.evaluate(() => {
      const el = document.querySelector(
        '[data-testid="availability-toggle-Sat"]',
      ) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' })
        el.click()
      }
    })
    await page.getByTestId('availability-save').scrollIntoViewIfNeeded()
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('availability-save').click()
      await expect(page.getByTestId('availability-saved-at')).toBeVisible({ timeout: 10000 })
    })
    const writes = reqs.filter(
      (r) => /\/api\/availability/.test(r.url) && /PUT|POST|PATCH/.test(r.method),
    )
    expect(writes.length, 'PUT /api/availability/bulk should fire on save').toBeGreaterThan(0)

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/availability')
    expect(list.status()).toBe(200)
    const rules = (await list.json()) as Array<{
      day_of_week: number
      start_minute: number
      end_minute: number
    }>
    const monday = rules.find((r) => r.day_of_week === 1)
    expect(monday).toBeDefined()
    expect(monday!.start_minute).toBe(10 * 60)
    expect(monday!.end_minute).toBe(15 * 60)
    const saturday = rules.find((r) => r.day_of_week === 6)
    expect(saturday, 'Saturday rule was added').toBeDefined()
  })

  test('rules persist across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/availability')
    await expect(page.getByTestId('availability-start-Tue')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('availability-start-Tue').fill('11:00')
    await page.getByTestId('availability-save').scrollIntoViewIfNeeded()
    await page.getByTestId('availability-save').click()
    await expect(page.getByTestId('availability-saved-at')).toBeVisible({ timeout: 10000 })
    await page.reload()
    await expect(page.getByTestId('availability-start-Tue')).toHaveValue('11:00')
  })
})
