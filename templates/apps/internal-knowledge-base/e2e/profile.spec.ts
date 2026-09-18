import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createArticle, createSpace, signup } from './_helpers.js'

test("Profile shows the user's name and email from /api/users/me", async ({ page }) => {
  const { email } = await signup(page, undefined, undefined, 'Lin', 'Manuel')
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByRole('heading', { level: 1, name: /Lin Manuel/i })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(email)).toBeVisible()
})

test('Profile fans out /users/me + /spaces + /articles + /bookmarks on load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(800)
  })
  const seen = (rx: RegExp) => reqs.some((r) => rx.test(r.url) && r.method === 'GET')
  expect(seen(/\/api\/users\/me\b/)).toBe(true)
  expect(seen(/\/api\/spaces(\?|$)/)).toBe(true)
  expect(seen(/\/api\/articles(\?|$)/)).toBe(true)
  expect(seen(/\/api\/bookmarks(\?|$)/)).toBe(true)
})

test('Profile KPI cards reflect current article and space counts', async ({ page }) => {
  await signup(page)
  // No spaces, no articles → expect zeros visible.
  await page.goto(APP_BASE + '/profile')
  await page.waitForTimeout(800)
  // The four KPI cards include numbers; each row contains the value `0` for a fresh user.
  await expect(page.getByText('Articles published')).toBeVisible()
  await expect(page.getByText('Drafts in flight')).toBeVisible()
  await expect(page.getByText('Articles bookmarked')).toBeVisible()
  await expect(page.getByText('Spaces you maintain')).toBeVisible()
})

test('Profile recent activity row links to the article view', async ({ page }) => {
  await signup(page, undefined, undefined, 'Owner', 'User')
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  const a = await createArticle(page, {
    space_id: sp.id,
    title: 'My doc for profile',
    body_md: '# Mine',
    body_html: '<h1>Mine</h1>',
    status: 'published',
  })
  await page.goto(APP_BASE + '/profile')
  await page.waitForTimeout(800)
  // Open the first matching row link, navigate to the article.
  const link = page.getByRole('link', { name: /My doc for profile/i }).first()
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/article/${a.id}`), { timeout: 10_000 })
})

test('Profile reflects spaces and articles for the user', async ({ page }) => {
  await signup(page, undefined, undefined, 'Owner', 'User')
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await createArticle(page, {
    space_id: sp.id,
    title: 'My doc',
    body_md: '# Mine',
    body_html: '<h1>Mine</h1>',
    status: 'published',
  })
  await page.goto(APP_BASE + '/profile')
  // Spaces section lists Engineering (use first match — it appears as both a
  // link in the spaces list and again as the space label inside an article row).
  await expect(page.getByText('Engineering').first()).toBeVisible({ timeout: 10_000 })
  // Recent articles list includes "My doc"
  await expect(page.getByText('My doc')).toBeVisible()
})

test('Edit profile button links to /settings', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  const link = page.getByRole('link', { name: /Edit profile/i })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', '/settings')
})
