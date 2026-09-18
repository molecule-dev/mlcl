/**
 * Per-page coverage for /topics. Cross-references e2e/observations/topics.md.
 * Detailed follow-toggle flow lives in 03-topics-follow.spec.ts.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, pickTopic, signup, uniqueEmail } from './_helpers.js'

test.describe('/topics', () => {
  test('renders the page heading and the topic list from /api/topics', async ({ page }) => {
    await signup(page, uniqueEmail('na-topics-page'))
    // The topic under test comes from /api/topics — the same list the page
    // renders — so this holds once the demo topics are replaced.
    const topic = await pickTopic(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/topics')
      await expect(page.getByRole('link', { name: topic.label }).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.some((r) => /\/api\/topics/.test(r.url) && r.status === 200)).toBe(true)
  })

  test('topic card link navigates to /topics/:slug', async ({ page }) => {
    await signup(page, uniqueEmail('na-topics-nav'))
    const topic = await pickTopic(page)
    await page.goto(APP_BASE + '/topics')
    await expect(page.getByRole('link', { name: topic.label }).first()).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: topic.label }).first().click()
    await expect(page).toHaveURL(new RegExp(`/topics/${topic.slug}`))
  })

  test('a Follow button on the topics page exists', async ({ page }) => {
    await signup(page, uniqueEmail('na-topics-follow'))
    await page.goto(APP_BASE + '/topics')
    await expect(page.getByRole('button', { name: /^Follow$|^Following$/ }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('sidebar Today link from /topics returns to /home', async ({ page }) => {
    await signup(page, uniqueEmail('na-topics-back'))
    await page.goto(APP_BASE + '/topics')
    await page
      .getByRole('link', { name: /^Today$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })
  })
})
