import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/studio', () => {
  test('Studio dashboard renders for an authenticated user (no console errors)', async ({
    page,
  }) => {
    await signup(page)
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/studio')
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle')
    })
    // The page tries /api/studio/{stats,videos} but those handlers are not
    // implemented — it MUST gracefully degrade to its built-in sample data
    // instead of crashing. We only require the page render + no fatal
    // console errors. (Studio analytics is a future enhancement; the
    // template ships a working visual that surfaces sample numbers.)
    const fatals = errs.filter(
      (e) =>
        !/favicon|net::ERR_|Failed to load resource|apple-mobile-web-app-capable|the server responded with a status/i.test(
          e,
        ),
    )
    expect(fatals, 'no fatal console errors on /studio').toEqual([])
    // Must show at least one stat label and the upload CTA.
    await expect(page.getByText(/watch time/i).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /upload video/i })).toBeVisible()
    // Studio does try to fetch the API at least once.
    expect(reqs.some((r) => /\/api\/studio\//.test(r.url))).toBe(true)
  })

  test('Upload CTA from /studio routes to /upload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/studio')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: /upload video/i }).click()
    await expect(page).toHaveURL(/\/upload/)
  })
})
