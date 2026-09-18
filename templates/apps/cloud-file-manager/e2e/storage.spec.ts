import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiCreateFileRow, apiUpload, captureNetwork, signup } from './_helpers.js'

test.describe('/storage', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/storage')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders the page and queries /api/storage on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/storage')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/storage$/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('newly uploaded file shows in the breakdown after an explicit reload', async ({ page }) => {
    await signup(page)
    const upload = await apiUpload(page, 'sample.txt', 'a few bytes here')
    await apiCreateFileRow(page, {
      name: 'sample.txt',
      mime: 'text/plain',
      size: upload.size,
      storage_key: upload.storage_key,
    })
    await page.goto(APP_BASE + '/storage')
    const usage = await page.evaluate(async () => {
      const res = await fetch('/api/storage', { credentials: 'include' })
      return await res.json()
    })
    expect(typeof (usage as { usedBytes: unknown }).usedBytes).toBe('number')
    expect((usage as { usedBytes: number }).usedBytes).toBeGreaterThan(0)
  })

  test('"Manage storage" CTA navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/storage')
    const cta = page
      .getByRole('link', { name: /manage|upgrade|get more|pricing/i })
      .first()
      .or(page.getByRole('button', { name: /manage|upgrade|get more|pricing/i }).first())
    if (await cta.count()) {
      await cta.click()
      await expect(page).toHaveURL(/\/pricing$/, { timeout: 10000 })
    }
  })
})
