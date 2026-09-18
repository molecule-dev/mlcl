/**
 * Per-page coverage for /sources/:slug. Cross-references e2e/observations/sources__slug.md.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickSource, signup, uniqueEmail } from './_helpers.js'

test.describe('/sources/:slug', () => {
  test('renders the source heading + Follow button from /api/sources/by-slug/:slug', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-source-detail'))
    // Whichever source the app holds — the demo sources get replaced.
    const source = await pickSource(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/sources/${source.slug}`)
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    })
    await expect(page.getByRole('button', { name: /^Follow$|^Following$/ }).first()).toBeVisible()
    expect(
      reqs.some(
        (r) => new RegExp(`/api/sources/by-slug/${source.slug}`).test(r.url) && r.status === 200,
      ),
    ).toBe(true)
  })

  test('Follow click toggles aria-pressed and POSTs to /api/sources/:slug/follow', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-source-follow'))
    const source = await pickSource(page)
    await page.goto(APP_BASE + `/sources/${source.slug}`)
    const btn = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(btn).toBeVisible({ timeout: 15_000 })
    // Arm the response listener BEFORE click so the in-flight POST is
    // captured even if the optimistic UI update wins the race.
    const [followResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new RegExp(`/api/sources/${source.slug}/follow`).test(r.url()) &&
          r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      btn.click(),
    ])
    expect(followResp.status()).toBe(200)
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 })
  })

  test('back link navigates to /sources', async ({ page }) => {
    await signup(page, uniqueEmail('na-source-back'))
    const source = await pickSource(page)
    await page.goto(APP_BASE + `/sources/${source.slug}`)
    await page
      .getByRole('link', { name: /^Sources$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/sources$/)
  })

  test('story-list link from /sources/:slug navigates to /stories/:id', async ({ page }) => {
    await signup(page, uniqueEmail('na-source-story'))
    const source = await pickSource(page)
    await page.goto(APP_BASE + `/sources/${source.slug}`)
    const storyLink = page.locator('a[href*="/stories/"]').first()
    await expect(storyLink).toBeVisible({ timeout: 15_000 })
    await storyLink.click()
    await expect(page).toHaveURL(/\/stories\//, { timeout: 10_000 })
  })
})
