import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  whereUrl,
  authedApi,
  getRepository,
  uniqueEmail,
  getAuthCookieToken,
} from './_helpers.js'

/**
 * Cross-page user journey: a fresh user signs up and walks through every
 * primary feature of the Conduit CI/CD dashboard, end-to-end. Each step
 * verifies the backend invariant that proves the action took effect.
 */
test('user signs up, walks every primary feature, every action persists', async ({
  page,
  request,
}) => {
  const email = uniqueEmail('journey')

  // 1. Land on /, click Start free → /signup
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /Ship with certainty/i }).first()).toBeVisible()
  await page
    .getByRole('link', { name: /Start free/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)

  // 2. Sign up
  await page.getByLabel(/^Name$/i).fill('Journey Tester')
  await page.getByLabel(/^Email$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill('TestPass123!')
  await page.getByLabel(/Confirm password/i).fill('TestPass123!')
  const signupReqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page).toHaveURL(/\/pipelines/, { timeout: 15000 })
  })
  expect(whereUrl(signupReqs, /\/api\/users(?:\?|$)/, 'POST').length).toBeGreaterThan(0)
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

  // capture token for backend invariant checks. [M1-1] The JWT lives in the
  // httpOnly `token` cookie (no longer in localStorage), readable here via the
  // Playwright context.
  const token = await getAuthCookieToken(page)
  expect(token, 'auth token captured').toBeTruthy()
  const api = authedApi(request, token!)

  // 3. Pipelines list — has rows + a working detail link
  await expect(page.getByRole('heading', { name: /^Pipelines$/i })).toBeVisible()
  const firstPipelineLink = page.locator('a[href^="/pipelines/"]').first()
  await firstPipelineLink.waitFor({ timeout: 10000 })
  const pipelineHref = await firstPipelineLink.getAttribute('href')
  await firstPipelineLink.click()
  await expect(page).toHaveURL(new RegExp(pipelineHref!))
  await expect(page.getByRole('heading', { name: /^Stages$/i })).toBeVisible()

  // 4. Repositories list → first repo detail
  await page.goto(APP_BASE + '/repositories')
  const firstRepoLink = page.locator('a[href^="/repositories/"]').first()
  await firstRepoLink.waitFor({ timeout: 10000 })
  const repoHref = await firstRepoLink.getAttribute('href')
  await firstRepoLink.click()
  await expect(page).toHaveURL(new RegExp(repoHref!))
  // walk tabs — drive whichever branches this repository actually carries,
  // read from the same endpoint the page reads.
  const repoSlug = repoHref!.replace(/^.*\/repositories\//, '')
  const repo = await getRepository(page, token!, repoSlug)
  const branchName = (repo.branches ?? [])[0]?.name
  expect(branchName, 'repository exposes at least one branch').toBeTruthy()
  await page.getByRole('button', { name: /^Branches$/i }).click()
  await expect(page.getByText(branchName!, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: /^Overview$/i }).click()
  await expect(page.getByText(/Total builds/i)).toBeVisible()

  // 5. Environments
  await page.goto(APP_BASE + '/environments')
  await expect(page.getByRole('heading', { name: /^Environments$/i })).toBeVisible()
  await expect(page.locator('article').first()).toBeVisible()

  // 6. Artifacts — every download link points at /api/artifacts/:id/download
  await page.goto(APP_BASE + '/artifacts')
  const dlLinks = page.getByRole('link', { name: /Download/i })
  await dlLinks.first().waitFor({ timeout: 10000 })
  await expect(dlLinks.first()).toBeAttached()
  const dlHref = await dlLinks.first().getAttribute('href')
  expect(dlHref).toMatch(/^\/api\/artifacts\/.+\/download$/)

  // 7. Insights — DORA tiles + 14-day chart
  await page.goto(APP_BASE + '/insights')
  await expect(page.getByText(/Deploys \/ day/i)).toBeVisible()
  // Chart bars carry title="YYYY-MM-DD: NN.N%" tooltips. Bars with 0% have 0
  // height so visibility is unreliable — assert structure instead of paint.
  // Scoped to the chart section rather than a year prefix: computeInsights()
  // always emits the last 14 days relative to NOW, whatever year that is.
  const chart = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: /Pipeline success rate/i }) })
    .last()
  await expect(chart.locator('div[title]'), '14 daily bars rendered').toHaveCount(14)

  // 8. Notifications — Mark all as read fires a real POST and backend reflects it
  await page.goto(APP_BASE + '/notifications')
  const beforeNotifs = await api.get('/notifications')
  const beforeBody = await beforeNotifs.json()
  const beforeArr = Array.isArray(beforeBody)
    ? beforeBody
    : (beforeBody?.items ?? beforeBody?.notifications ?? [])
  expect(beforeArr.length, 'notifications seeded').toBeGreaterThan(0)
  const markReqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Mark all as read/i }).click()
    await page.waitForTimeout(2000)
  })
  expect(whereUrl(markReqs, /\/api\/notifications\/read-all/, 'POST').length).toBeGreaterThan(0)
  const afterNotifs = await api.get('/notifications')
  const afterBody = await afterNotifs.json()
  const afterArr = Array.isArray(afterBody)
    ? afterBody
    : (afterBody?.items ?? afterBody?.notifications ?? [])
  const stillUnread = afterArr.filter((n: { is_read?: boolean; read_at?: string | null }) => {
    if ('is_read' in n) return n.is_read === false
    if ('read_at' in n) return n.read_at === null
    return false
  })
  expect(stillUnread.length, 'no notification remains unread after mark-all').toBe(0)

  // 9. Settings — Account name change persists across reload
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^Account$/i }).click()
  const newName = 'Journey Persisted ' + Date.now()
  await page.getByLabel(/^Name$/i).fill(newName)
  const saveReqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Save changes/i }).click()
    await page.waitForTimeout(2000)
  })
  expect(whereUrl(saveReqs, /\/api\/me(?:\?|$)/, 'PUT').length).toBeGreaterThan(0)
  await page.reload()
  await page.getByRole('button', { name: /^Account$/i }).click()
  await expect(page.getByLabel(/^Name$/i)).toHaveValue(newName)

  // 10. Pricing — Free tile shows Current plan
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('button', { name: /Current plan/i })).toBeVisible()

  // 11. Auth invariant — log out (clear) and log back in works
  await page.context().clearCookies()
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/^Email$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill('TestPass123!')
  await page.getByRole('button', { name: /^Sign in$/i }).click()
  await expect(page).toHaveURL(/\/pipelines/, { timeout: 15000 })
})
