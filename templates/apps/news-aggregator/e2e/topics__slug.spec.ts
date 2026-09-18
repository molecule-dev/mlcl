/**
 * Per-page coverage for /topics/:slug. Cross-references e2e/observations/topics__slug.md.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickTopic, signup, uniqueEmail } from './_helpers.js'

test.describe('/topics/:slug', () => {
  test('renders the topic header and a Follow button', async ({ page }) => {
    await signup(page, uniqueEmail('na-topic-detail'))
    // Whichever topic the app holds — the demo topics get replaced.
    const topic = await pickTopic(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/topics/${topic.slug}`)
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    })
    await expect(page.getByRole('button', { name: /^Follow$|^Following$/ }).first()).toBeVisible()
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('the back-link returns to /topics', async ({ page }) => {
    await signup(page, uniqueEmail('na-topic-back'))
    const topic = await pickTopic(page)
    await page.goto(APP_BASE + `/topics/${topic.slug}`)
    await page
      .getByRole('link', { name: /^Topics$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/topics$/)
  })

  test('clicking Follow toggles aria-pressed and posts to /api/topics/:slug/follow', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('na-topic-follow'))
    const topic = await pickTopic(page)
    await page.goto(APP_BASE + `/topics/${topic.slug}`)
    const btn = page.getByRole('button', { name: /^Follow$|^Following$/ }).first()
    await expect(btn).toBeVisible({ timeout: 15_000 })
    // Arm the response listener BEFORE click so the in-flight POST is
    // captured even if the optimistic UI update wins the race.
    const [followResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new RegExp(`/api/topics/${topic.slug}/follow`).test(r.url()) &&
          r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      btn.click(),
    ])
    expect(followResp.status()).toBe(200)
    await expect(btn).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 })
  })

  test('story-list link navigates to /stories/:id', async ({ page }) => {
    await signup(page, uniqueEmail('na-topic-story'))
    const topic = await pickTopic(page)
    await page.goto(APP_BASE + `/topics/${topic.slug}`)
    const storyLink = page.locator('a[href*="/stories/"]').first()
    await expect(storyLink).toBeVisible({ timeout: 15_000 })
    await storyLink.click()
    await expect(page).toHaveURL(/\/stories\//, { timeout: 10_000 })
  })
})
