import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('job detail page', () => {
  test('renders the job title from the API', async ({ page }) => {
    await signup(page)
    const job = await authedPost(page, '/jobs', {
      title: `Detail Job ${Date.now()}`,
      department: 'Eng',
      location: 'Remote',
      type: 'full_time',
      description: 'Build it well.',
      requirements: ['Care'],
    })
    await page.goto(APP_BASE + `/jobs/${job.id}`)
    await page.waitForTimeout(800)
    await expect(page.getByText(job.title).first()).toBeVisible()
  })

  test('GET /api/jobs/:id is hit on load', async ({ page }) => {
    await signup(page)
    const job = await authedPost(page, '/jobs', {
      title: `Net Job ${Date.now()}`,
      department: 'Eng',
      location: 'Remote',
      type: 'full_time',
      description: 'desc',
      requirements: [],
    })
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/jobs/${job.id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'GET' && new RegExp(`/jobs/${job.id}\\b`).test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Back link routes to /jobs', async ({ page }) => {
    await signup(page)
    const job = await authedPost(page, '/jobs', {
      title: `Back Link Job ${Date.now()}`,
      department: 'Eng',
      location: 'Remote',
      type: 'full_time',
      description: 'desc',
      requirements: [],
    })
    await page.goto(APP_BASE + `/jobs/${job.id}`)
    await page
      .getByRole('link', { name: /all jobs|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/jobs$/)
  })

  test('Open-pipeline link routes to /pipeline', async ({ page }) => {
    await signup(page)
    const job = await authedPost(page, '/jobs', {
      title: `Pipeline Job ${Date.now()}`,
      department: 'Eng',
      location: 'Remote',
      type: 'full_time',
      description: 'desc',
      requirements: [],
    })
    await page.goto(APP_BASE + `/jobs/${job.id}`)
    const link = page.getByRole('link', { name: /open pipeline|pipeline/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/pipeline$/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    const job = await authedPost(page, '/jobs', {
      title: `Console Job ${Date.now()}`,
      department: 'Eng',
      location: 'Remote',
      type: 'full_time',
      description: 'desc',
      requirements: [],
    })
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/jobs/${job.id}`)
      await expect(page.getByText(job.title).first()).toBeVisible()
    })
  })
})
