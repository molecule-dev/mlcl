import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/plan-updated', () => {
  test('renders "Your plan has been updated" heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(
      page.getByRole('heading', { level: 2, name: /Your plan has been updated/i }),
    ).toBeVisible()
  })

  test('renders "Thank you" heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { level: 2, name: /Thank you/i })).toBeVisible()
  })

  test('"Return home" link points to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /Return home/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/')
  })

  test('makes no business-API calls (purely confirmation page)', async ({ page }) => {
    await signup(page)
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(
        page.getByRole('heading', { level: 2, name: /Your plan has been updated/i }),
      ).toBeVisible()
      await page.waitForLoadState('networkidle')
    })
    const journalCalls = reqs.filter((r) => r.url.includes('/api/journal'))
    expect(journalCalls, 'plan-updated should not hit /api/journal/*').toEqual([])
  })
})
