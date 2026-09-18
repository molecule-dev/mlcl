import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('jobs list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/jobs')
  })

  test('renders a heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/jobs', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/jobs')
      await p2.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/jobs\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('a created+published job shows up in the listing', async ({ page }) => {
    // Seed via API: companies → jobs → publish.
    const company = await authedPost(page, '/companies', {
      name: `JobsList Co ${Date.now()}`,
      description: 'Seeded for the jobs.spec test.',
    })
    const companyId = (company?.data ?? company).id
    const title = `JobsList ${Date.now()}`
    const job = await authedPost(page, '/jobs', {
      title,
      description: 'Seeded role for the listing test.',
      location: 'Remote',
      type: 'full_time',
      company_id: companyId,
    })
    const jobId = (job?.data ?? job).id
    await authedPost(page, `/jobs/${jobId}/publish`, {})
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('typing in the search input keeps the page on /jobs', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.count().catch(() => 0)) {
      await search.fill('engineer')
      await page.waitForTimeout(400)
      await expect(page).toHaveURL(/\/jobs(?:\?|$)/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/jobs')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
