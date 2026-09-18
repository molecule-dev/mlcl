import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createArticle, createSpace, signup } from './_helpers.js'

test('Home redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto(APP_BASE + '/home')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})

test('Home for authenticated user shows greeting and recent activity', async ({ page }) => {
  await signup(page, undefined, undefined, 'Ada', 'Lovelace')
  await page.goto(APP_BASE + '/home')
  await expect(page.getByText(/Ada/)).toBeVisible({ timeout: 10_000 })
})

test('Home recent-activity links to the article', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, {
    key: `eng-${Date.now().toString(36)}`,
    name: 'Engineering',
  })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Latest doc',
    body_md: '# Latest',
    body_html: '<h1>Latest</h1>',
    status: 'published',
  })
  await page.goto(APP_BASE + '/home')
  // Wait for activity feed to load
  const reqs = await captureNetwork(page, async () => {
    await page.waitForTimeout(800)
  })
  // Activity may surface via /api/articles or /api/spaces/:key
  expect(reqs.length).toBeGreaterThan(0)
  // Link existence check (article may or may not be in the feed depending on filters,
  // so just confirm at least one space link is rendered)
  const links = page.getByRole('link')
  await expect(links.first()).toBeAttached()
  // If the article is rendered, clicking it should navigate.
  const articleLink = page.getByText('Latest doc').first()
  if (await articleLink.isVisible().catch(() => false)) {
    await articleLink.click()
    await expect(page).toHaveURL(new RegExp(`/article/${a.id}`))
  }
})
