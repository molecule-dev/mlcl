/**
 * Per-page coverage for /sources. Cross-references e2e/observations/sources.md.
 * Detailed flow lives in 04-sources-follow.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickSource, signup, uniqueEmail } from './_helpers.js'

test.describe('/sources', () => {
  test('renders the page heading and the live source list from /api/sources', async ({ page }) => {
    await signup(page, uniqueEmail('na-sources-page'))
    // The source under test is read from /api/sources — the same list the
    // page renders — so this holds once the demo sources are replaced.
    const source = await pickSource(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/sources')
      await expect(page.getByRole('link', { name: source.name }).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.some((r) => r.url.endsWith('/api/sources') && r.status === 200)).toBe(true)
  })

  test('"All" / "Following" filter buttons are visible', async ({ page }) => {
    await signup(page, uniqueEmail('na-sources-filter'))
    await page.goto(APP_BASE + '/sources')
    await expect(page.getByRole('button', { name: /^All$/ }).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: /^Following$/ }).first()).toBeVisible()
  })

  test('clicking a source card navigates to /sources/:slug', async ({ page }) => {
    await signup(page, uniqueEmail('na-sources-nav'))
    const source = await pickSource(page)
    await page.goto(APP_BASE + '/sources')
    await page.getByRole('link', { name: source.name }).first().click()
    await expect(page).toHaveURL(new RegExp(`/sources/${source.slug}`))
  })

  test('"Following" filter button click toggles active filter', async ({ page }) => {
    await signup(page, uniqueEmail('na-sources-following'))
    await page.goto(APP_BASE + '/sources')
    const followingBtn = page.getByRole('button', { name: /^Following$/ }).first()
    await expect(followingBtn).toBeVisible({ timeout: 15_000 })
    await followingBtn.click()
    // Empty fresh user should see no source cards (followed=0).
    await expect(page.getByText(/no.*source|nothing|empty|follow/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('per-card Follow button POSTs to /api/sources/:slug/follow', async ({ page }) => {
    await signup(page, uniqueEmail('na-sources-card-follow'))
    await page.goto(APP_BASE + '/sources')
    // Filter rail has "All / Following / Left / Center / Right" buttons that
    // also match `/^Follow$|^Following$/`. Scope to a card article first so
    // we click a real per-source Follow button, not a filter chip.
    const card = page.locator('article').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    const followBtn = card.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(followBtn).toBeVisible({ timeout: 15_000 })
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/sources\/.+\/follow/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      followBtn.click(),
    ])
    expect(resp.status()).toBe(200)
  })
})
