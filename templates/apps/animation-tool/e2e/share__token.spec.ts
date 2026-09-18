import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/share/:token (SharePreview)', () => {
  test('renders the Animation preview heading', async ({ page }) => {
    await page.goto(APP_BASE + '/share/preview-token-1')
    await expect(page.getByRole('heading', { name: /Animation preview/i, level: 1 })).toBeVisible()
  })

  test('public share preview does NOT call /api/projects (would 401 noisily)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/share/preview-token-1')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const projectsCall = reqs.find(
      (r) => /\/api\/projects(?:\?|$)/.test(r.url) && r.method === 'GET',
    )
    expect(projectsCall, 'public share preview must not hit /api/projects').toBeFalsy()
  })

  test('signed-in share view DOES call /api/projects to populate "Related animations"', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/share/preview-token-1')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const projectsCall = reqs.find(
      (r) => /\/api\/projects(?:\?|$)/.test(r.url) && r.method === 'GET',
    )
    expect(projectsCall, 'authed share preview hits /api/projects').toBeTruthy()
    expect(projectsCall!.status).toBeLessThan(300)
  })

  test('Try Vivace free link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/share/preview-token-1')
    await page.getByRole('link', { name: /Try Vivace free/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Play preview button toggles to Pause', async ({ page }) => {
    await page.goto(APP_BASE + '/share/preview-token-1')
    const btn = page.locator('[data-mol-id="share-play-toggle"]')
    await expect(btn).toContainText(/Play preview/i)
    await btn.click()
    await expect(btn).toContainText(/Pause preview/i)
  })

  test('Toggle playback aria-button flips its icon', async ({ page }) => {
    await page.goto(APP_BASE + '/share/preview-token-1')
    const btn = page.getByRole('button', { name: /Toggle playback/i })
    await expect(btn).toBeVisible()
    const before = (await btn.textContent()) ?? ''
    await btn.click()
    await page.waitForTimeout(200)
    const after = (await btn.textContent()) ?? ''
    expect(after, 'icon character should flip').not.toBe(before)
  })

  test('Sign in to comment link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/share/preview-token-1')
    await page.getByRole('link', { name: /Sign in to comment/i }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
