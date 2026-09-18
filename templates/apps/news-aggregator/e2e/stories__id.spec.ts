/**
 * Per-page coverage for /stories/:id. Cross-references e2e/observations/stories__id.md.
 * Detailed save-toggle flow lives in 02-home-and-stories.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/stories/:id', () => {
  test('story detail renders headline + Save button from /api/stories/:id', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-detail'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/stories/' + stories[0].id)
      await page.waitForResponse(
        (r) => r.url().includes(`/api/stories/${stories[0].id}`) && r.status() === 200,
      )
    })
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Save$|^Saved$/ }).first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/stories\//.test(r.url) && r.status === 200)).toBe(true)
  })

  test('back link returns to /home', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-back'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await page.goto(APP_BASE + '/stories/' + stories[0].id)
    await page.waitForResponse(
      (r) => r.url().includes(`/api/stories/${stories[0].id}`) && r.status() === 200,
    )
    await page
      .getByRole('link', { name: /back\s*to\s*home|^home$|^back$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/home/)
  })

  test('outbound "read on" link is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-out'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await page.goto(APP_BASE + '/stories/' + stories[0].id)
    await page.waitForResponse(
      (r) => r.url().includes(`/api/stories/${stories[0].id}/coverage`) && r.status() === 200,
    )
    // At least one external link should be on the coverage block. Auto-wait
    // since coverage rendering happens after the response handler runs.
    const externals = page.locator('a[target="_blank"]')
    await expect(externals.first()).toBeAttached({ timeout: 10_000 })
    await expect(externals.first()).toBeAttached()
  })

  test('story body / excerpt is rendered (non-empty)', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-body'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await page.goto(APP_BASE + '/stories/' + stories[0].id)
    await page.waitForResponse(
      (r) => r.url().includes(`/api/stories/${stories[0].id}`) && r.status() === 200,
    )
    // Body container should have substantive content beyond the headline.
    const article = page.locator('article').first()
    await expect(article).toBeVisible({ timeout: 10_000 })
    const text = (await article.innerText()).replace(/\s+/g, ' ').trim()
    expect(text.length).toBeGreaterThan(120)
  })

  test('Save button toggles aria-pressed and POSTs to /api/bookmarks', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-save'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await page.goto(APP_BASE + '/stories/' + stories[0].id)
    const btn = page.getByRole('button', { name: /^Save$|^Saved$/ }).first()
    await expect(btn).toBeVisible({ timeout: 15_000 })
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/bookmarks/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      btn.click(),
    ])
    expect(resp.status()).toBeLessThan(300)
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 })
  })

  test('coverage list (per-source framings) renders', async ({ page }) => {
    await signup(page, uniqueEmail('na-story-coverage'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await page.goto(APP_BASE + '/stories/' + stories[0].id)
    await page.waitForResponse(
      (r) => r.url().includes(`/api/stories/${stories[0].id}/coverage`) && r.status() === 200,
    )
    // The "How each outlet framed it" section / coverage list should
    // expose at least 1 external "read on …" link plus an excerpt.
    const coverageLinks = page.locator('a[target="_blank"]')
    await expect(coverageLinks.first()).toBeAttached({ timeout: 10_000 })
    await expect(coverageLinks.first()).toBeAttached()
  })
})
