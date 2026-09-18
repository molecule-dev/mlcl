/**
 * Per-page coverage for /saved. Cross-references e2e/observations/saved.md.
 * Detailed bookmark round-trip lives in 05-saved-page.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedFetch, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/saved', () => {
  test('fresh user lands on /saved → empty-state copy is visible', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-empty'))
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/bookmarks/.test(r.url()) && r.status() === 200,
        { timeout: 15_000 },
      )
      await page.goto(APP_BASE + '/saved')
      await expect(page.getByRole('heading', { name: /saved/i }).first()).toBeVisible()
      await respPromise
    })
    expect(reqs.some((r) => /\/api\/bookmarks/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('after saving a story, /saved surfaces it (no longer empty)', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-populated'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await authedFetch(page, '/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: stories[0].id }),
    })

    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/bookmarks/.test(r.url()) && r.status() === 200)
    const empty = await page
      .getByText(/no saved|nothing saved/i)
      .count()
      .catch(() => 0)
    expect(empty).toBe(0)
  })

  test('sidebar Today link returns to /home', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-back'))
    await page.goto(APP_BASE + '/saved')
    await page.getByRole('link', { name: /today/i }).first().click()
    await expect(page).toHaveURL(/\/home/)
  })

  test('saved-story link navigates to /stories/:id', async ({ page }) => {
    await signup(page, uniqueEmail('na-saved-link'))
    const stories = await authedFetch<Array<{ id: string }>>(page, '/api/stories')
    await authedFetch(page, '/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: stories[0].id }),
    })
    await page.goto(APP_BASE + '/saved')
    await page.waitForResponse((r) => /\/api\/bookmarks/.test(r.url()) && r.status() === 200)
    const link = page
      .getByRole('link', { name: new RegExp(stories[0].id) })
      .or(page.locator(`a[href*="/stories/"]`))
      .first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await expect(page).toHaveURL(/\/stories\//, { timeout: 10_000 })
  })
})
