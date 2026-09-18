/**
 * Per-page coverage for /home. Cross-references e2e/observations/home.md.
 * Detailed feed flow lives in 02-home-and-stories.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickStory, pickTopic, signup, uniqueEmail } from './_helpers.js'

test.describe('/home', () => {
  test('signup lands on /home and renders sidebar nav', async ({ page }) => {
    await signup(page, uniqueEmail('na-home-page'))
    await expect(page).toHaveURL(/\/home/)
    await expect(page.getByRole('navigation', { name: /primary/i }).first()).toBeVisible()
  })

  test('topic chips and a real story headline render from the API', async ({ page }) => {
    await signup(page, uniqueEmail('na-home-feed'))
    // The chip and headline come from the same endpoints the page reads.
    const topic = await pickTopic(page)
    const story = await pickStory(page)
    // Reload inside captureNetwork to force the API fetches to fire while
    // the listener is attached. Otherwise the post-signup fetches finish
    // before the test can subscribe to them.
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await expect(page.getByRole('link', { name: topic.label }).first()).toBeVisible({
        timeout: 15_000,
      })
      await expect(page.getByText(story.headline).first()).toBeVisible({ timeout: 10_000 })
    })
    expect(reqs.some((r) => /\/api\/(stories|topics)/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('clicking a topic link routes to /topics/:slug', async ({ page }) => {
    await signup(page, uniqueEmail('na-home-topic'))
    const topic = await pickTopic(page)
    await expect(page.getByRole('link', { name: topic.label }).first()).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: topic.label }).first().click()
    await expect(page).toHaveURL(new RegExp(`/topics/${topic.slug}`))
  })

  test('user menu opens and shows Sign out', async ({ page }) => {
    await signup(page, uniqueEmail('na-home-menu'))
    await page
      .getByRole('button', { name: /open user menu/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible()
  })
})
