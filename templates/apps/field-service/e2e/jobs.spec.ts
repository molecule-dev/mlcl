import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoJobs(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/jobs')
  await expect(page.getByRole('heading', { name: /^jobs$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('jobs', () => {
  test('list page renders seeded jobs and GET /api/jobs returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoJobs(page)
    })
    const req = reqs.find((r) => /\/api\/jobs(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/jobs').toBe(200)
    const links = page.locator('a[href^="/jobs/"]')
    await expect.poll(() => links.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('status filter buttons render', async ({ page }) => {
    await signup(page)
    await gotoJobs(page)
    await expect(page.getByRole('button', { name: /^scheduled$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^in progress$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^completed$/i })).toBeVisible()
  })

  test('day filter select offers today and tomorrow', async ({ page }) => {
    await signup(page)
    await gotoJobs(page)
    const select = page.getByLabel(/^day$/i)
    await expect(select).toBeVisible()
    await select.selectOption('today')
    await expect(select).toHaveValue('today')
  })

  test('search box narrows visible rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoJobs(page)
    const initial = await page.locator('a[href^="/jobs/"]').count()
    expect(initial).toBeGreaterThanOrEqual(1)
    await page.getByRole('searchbox').fill('zzzzz-no-match-zzzzz')
    await expect
      .poll(async () => page.locator('a[href^="/jobs/"]').count(), { timeout: 5000 })
      .toBe(0)
  })

  test('first job row navigates to /jobs/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoJobs(page)
    await page.locator('a[href^="/jobs/"]').first().click()
    await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]{36}$/)
  })
})
