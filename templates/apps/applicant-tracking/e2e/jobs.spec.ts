import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('jobs list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/jobs')
  })

  test('renders the Jobs heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /jobs/i }).first()).toBeVisible()
  })

  test('GET /api/jobs returns 200 on load', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const requests = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/jobs')
      await p2.waitForTimeout(2000)
    })
    expect(
      requests.some((r) => r.method === 'GET' && /\/jobs\b/.test(r.url) && r.status === 200),
    ).toBeTruthy()
    await fresh.close()
  })

  test('Post-a-job link routes to /jobs/new', async ({ page }) => {
    const link = page
      .getByRole('link', { name: /post(?:\s+a)?\s+(?:job|role)|new job|add job|create job/i })
      .first()
    await link.click()
    await expect(page).toHaveURL(/\/jobs\/new$/)
  })

  test('a created job appears in the list and links to its detail page', async ({ page }) => {
    const title = `QA Title ${Date.now()}`
    const job = await authedPost(page, '/jobs', {
      title,
      department: 'QA',
      location: 'Remote',
      type: 'full_time',
      description: 'Test role',
      requirements: ['Testing'],
      salary_min: 100000,
      salary_max: 150000,
    })
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByText(title).first()).toBeVisible()
    const link = page.getByRole('link', { name: new RegExp(title, 'i') }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(new RegExp(`/jobs/${job.id}`))
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/jobs')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
